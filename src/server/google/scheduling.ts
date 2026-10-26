import { getMeeting, saveMeeting } from "@/server/meetings/repository";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isGoogleConfigured } from "@/lib/env";
import { GoogleApiError, refreshAccessToken } from "@/lib/google/client";
import {
  createCalendarEvent,
  queryFreeBusy,
  type BusyInterval,
  type CalendarEvent,
} from "@/lib/google/calendar";
import { publish } from "@/server/events/bus";
import { getCalendarSettings } from "@/server/org-settings";
import {
  getGoogleConnection,
  markGoogleReconnectRequired,
} from "./credentials";

/**
 * Agendamiento de reuniones (004): guarda en el CRM y, con conexión válida,
 * crea además el evento con Meet e invitaciones en Google Calendar.
 */

export class ScheduleError extends Error {
  code:
    | "invalid_date"
    | "meeting_busy"
    | "not_connected"
    | "reconnect_required"
    | "contact_not_found"
    | "slot_taken"
    | "google_error";

  constructor(code: ScheduleError["code"], message: string) {
    super(message);
    this.name = "ScheduleError";
    this.code = code;
  }
}

export type ScheduledMeeting = Omit<CalendarEvent, "htmlLink"> & {
  htmlLink: string | null;
  calendarSynced: boolean;
};

export async function scheduleMeeting(input: {
  organizationId: string;
  contactId: string;
  prospectEmail: string;
  startIso: string;
  durationMin?: number;
  title?: string;
}): Promise<ScheduledMeeting> {
  const db = getDb();

  const contactRows = await db
    .select()
    .from(schema.contact)
    .where(
      scoped(
        schema.contact.organizationId,
        input.organizationId,
        eq(schema.contact.id, input.contactId)
      )
    )
    .limit(1);
  const contact = contactRows[0];
  if (!contact) {
    throw new ScheduleError("contact_not_found", "Contacto no encontrado");
  }

  const existing = await getMeeting(input.organizationId, input.contactId);
  if (existing?.reminderStatus === "sending") throw new ScheduleError("meeting_busy", "La confirmación se está enviando; intenta de nuevo en unos minutos.");
  if (!Number.isFinite(new Date(input.startIso).getTime()) || new Date(input.startIso) <= new Date()) throw new ScheduleError("invalid_date", "La reunión debe tener una fecha y hora futuras");

  const connection = isGoogleConfigured()
    ? await getGoogleConnection(input.organizationId)
    : null;

  const settings = await getCalendarSettings(input.organizationId);
  const title = input.title?.trim() || settings.defaultTitle;
  const durationMin = input.durationMin ?? settings.defaultDurationMin;
  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + durationMin * 60_000);

  // Invitados: prospecto + internos (sin duplicados, sin la cuenta anfitriona
  // — Google la agrega sola como organizador).
  const attendees = Array.from(
    new Set(
      [input.prospectEmail, ...settings.internalInvitees]
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && e !== connection?.accountEmail.toLowerCase())
    )
  );

  let event: CalendarEvent | null = null;
  if (connection?.status === "connected") {
    try {
      const accessToken = await refreshAccessToken(connection.refreshToken);

      // Anti-sobreposición: si el calendario ya tiene algo en [start, end), no
      // se crea el evento. Un fallo transitorio del freeBusy no bloquea el
      // agendamiento. Si faltan permisos, solo se registra en el CRM sin
      // afirmar que se creó un evento en Google.
      try {
        const busy = await queryFreeBusy({
          accessToken,
          timeMinIso: start.toISOString(),
          timeMaxIso: end.toISOString(),
        });
        if (busy.length > 0) {
          throw new ScheduleError(
            "slot_taken",
            "Ese horario ya tiene una reunión agendada"
          );
        }
      } catch (err) {
        if (err instanceof ScheduleError) throw err;
        if (err instanceof GoogleApiError && (err.isScopeError || err.isAuthError)) {
          throw err;
        }
        console.warn("[agenda] freeBusy falló; se agenda sin verificar:", err);
      }

      event = await createCalendarEvent({
        accessToken,
        summary: title,
        description: `Agendada desde Seomos CRM para ${contact.name} (${contact.phone}).`,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        attendees,
      });
    } catch (err) {
      if (err instanceof ScheduleError) throw err;
      if (err instanceof GoogleApiError && (err.isAuthError || err.isScopeError)) {
        await markGoogleReconnectRequired(input.organizationId);
        // Una conexión vencida no impide registrar la reunión en el CRM.
      } else {
        throw new ScheduleError(
          "google_error",
          err instanceof Error ? err.message : "Fallo al crear el evento"
        );
      }
    }
  }

  const meeting = await saveMeeting({ organizationId: input.organizationId, contactId: input.contactId,
    title, startAt: start, meetLink: event?.meetLink ?? null, timezone: settings.timezone,
    source: event ? "google" : "manual", googleEventId: event?.id ?? null,
  });

  // Rastro en el contacto: correo capturado + nota de la reunión.
  // Siempre en la zona del negocio (el contenedor corre en UTC).
  const when = start.toLocaleString("es-CO", {
    timeZone: settings.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const meetPart = event?.meetLink ? ` — ${event.meetLink}` : "";
  const note = `[Reunión] ${when} · ${title}${meetPart}`;
  await db
    .update(schema.contact)
    .set({
      email: contact.email ?? input.prospectEmail,
      notes: contact.notes ? `${contact.notes}\n${note}` : note,
      updatedAt: new Date(),
    })
    .where(
      scoped(
        schema.contact.organizationId,
        input.organizationId,
        eq(schema.contact.id, input.contactId)
      )
    );

  // El panel de detalles escucha conversation.updated para refrescarse.
  const conv = await db
    .select({ id: schema.conversation.id })
    .from(schema.conversation)
    .where(
      scoped(
        schema.conversation.organizationId,
        input.organizationId,
        eq(schema.conversation.contactId, input.contactId)
      )
    )
    .limit(1);
  if (conv[0]) {
    // Marca de reunión agendada: el agente la usa para no re-agendar si el
    // modelo repite schedule_meeting (p. ej. tras un "¡Gracias!").
    await db
      .update(schema.conversation)
      .set({ meetingScheduledFor: start, updatedAt: new Date() })
      .where(scoped(schema.conversation.organizationId, input.organizationId, eq(schema.conversation.id, conv[0].id)));
    publish(input.organizationId, {
      type: "conversation.updated",
      data: { conversation: { id: conv[0].id } },
    });
  }

  return event
    ? { ...event, calendarSynced: true }
    : { id: meeting.id, htmlLink: null, meetLink: null, start: start.toISOString(), end: end.toISOString(), calendarSynced: false };
}

/**
 * Franjas ocupadas del calendario conectado en una ventana. Para el agente:
 * los llamadores degradan a lista vacía si Google falla (best-effort).
 */
export async function getBusyIntervals(
  organizationId: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<BusyInterval[]> {
  if (!isGoogleConfigured()) return [];
  const connection = await getGoogleConnection(organizationId);
  if (!connection || connection.status !== "connected") return [];
  try {
    const accessToken = await refreshAccessToken(connection.refreshToken);
    return await queryFreeBusy({ accessToken, timeMinIso, timeMaxIso });
  } catch (err) {
    // Sin permiso de disponibilidad el agente opera a ciegas: se marca la
    // conexión para reconectar; el agendamiento en el CRM sigue disponible.
    if (err instanceof GoogleApiError && (err.isScopeError || err.isAuthError)) {
      await markGoogleReconnectRequired(organizationId);
      console.error(
        "[agenda] la conexión de Google NO tiene el permiso de disponibilidad (freeBusy). Reconecta en Ajustes → Calendario y MARCA la casilla de disponibilidad en la pantalla de Google."
      );
    }
    throw err;
  }
}
