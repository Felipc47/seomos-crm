import { and, asc, desc, eq, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { chatJson, type ChatMessage } from "@/lib/ai";
import { composeInstructions, composeTone } from "@/lib/agent-behavior";
import {
  addBusinessDays,
  atLocalTime,
  isBusinessDay,
  localMinutesOfDay,
} from "@/lib/business-days";
import { publish } from "@/server/events/bus";
import { isWindowOpen } from "@/server/inbox/window";
import { SendError, sendText } from "@/server/inbox/send";
import { sendTemplate, TemplateError } from "@/server/whatsapp/templates";
import {
  getCalendarSettings,
  getFollowUpSettings,
  type CalendarSettings,
  type FollowUpSettings,
} from "@/server/org-settings";

/**
 * Rutina de seguimiento automático (008), desacoplada del pipeline en 009:
 * el lead permanece en «En calificación» y el estado operativo vive en
 * follow_up_due_at/follow_up_attempts.
 *
 * Intento 1 (a las 12h o cuando pidió el cliente, dentro de la ventana de
 * atención) → intento 2 (+1 día hábil) → sin respuesta 1 día hábil después
 * → «No convertido» con motivo `no_response`.
 *
 * Qué se envía: con la ventana de 24h de WhatsApp abierta, un mensaje
 * contextual del LLM (con texto neutro de respaldo); cerrada, la plantilla
 * aprobada configurada en Ajustes — sin plantilla el intento se omite con
 * nota y la rutina avanza igual.
 */

/** Espera del primer intento cuando el cliente no dijo cuándo. */
export const FOLLOW_UP_DELAY_MS = 12 * 3600_000;

const DAY_MS = 24 * 3600_000;

/** Leads procesados por barrido (mismo espíritu que MAX_PER_SWEEP). */
const MAX_PER_SWEEP = 100;

const FOLLOW_UP_MARKER = "[SEGUIMIENTO]";

/** Respaldo si el proveedor LLM falla: el intento nunca se pierde por eso. */
const FALLBACK_TEXT =
  "¡Hola! Te escribo para retomar nuestra conversación. ¿Sigues interesado? Quedo pendiente.";

type AttentionSettings = Pick<
  CalendarSettings,
  "timezone" | "workStartMin" | "workEndMin"
>;

/**
 * Corre una fecha a la ventana de atención: si cae en día hábil dentro de la
 * jornada se respeta tal cual; si no, se mueve a la APERTURA del siguiente
 * momento hábil (sábado 3 p.m. → lunes 9:00 a.m.).
 */
export function nextAttentionSlot(d: Date, s: AttentionSettings): Date {
  let cur = new Date(d.getTime());
  for (let i = 0; i < 14; i++) {
    if (isBusinessDay(cur, s.timezone)) {
      const min = localMinutesOfDay(cur, s.timezone);
      if (min < s.workStartMin) return atLocalTime(cur, s.workStartMin, s.timezone);
      if (min < s.workEndMin) return cur;
    }
    cur = atLocalTime(
      new Date(cur.getTime() + DAY_MS),
      s.workStartMin,
      s.timezone
    );
  }
  return cur;
}

/** Siguiente intento: 1 día hábil después, misma hora, dentro de la ventana. */
function nextBusinessAttempt(from: Date, s: AttentionSettings): Date {
  return nextAttentionSlot(addBusinessDays(from, 1, s.timezone), s);
}

/** Etapa del sistema por kind: null si falta por una instalación antigua. */
async function stageByKind(
  organizationId: string,
  kind: "open" | "lost"
): Promise<{ id: string; name: string } | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.pipelineStage.id, name: schema.pipelineStage.name })
    .from(schema.pipelineStage)
    .where(
      and(
        eq(schema.pipelineStage.organizationId, organizationId),
        eq(schema.pipelineStage.kind, kind)
      )
    )
    .orderBy(asc(schema.pipelineStage.position))
    .limit(1);
  return rows[0] ?? null;
}

async function qualifyingStage(
  organizationId: string
): Promise<{ id: string; name: string } | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.pipelineStage.id, name: schema.pipelineStage.name })
    .from(schema.pipelineStage)
    .where(
      and(
        eq(schema.pipelineStage.organizationId, organizationId),
        eq(schema.pipelineStage.kind, "open")
      )
    )
    .orderBy(asc(schema.pipelineStage.position));
  return (
    rows.find((stage) => stage.name.toLowerCase() === "en calificación") ?? null
  );
}

/** Nota [IA] en la ficha del contacto: la rutina deja rastro auditable. */
async function appendNote(contactId: string, note: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.contact.id, notes: schema.contact.notes })
    .from(schema.contact)
    .where(eq(schema.contact.id, contactId))
    .limit(1);
  const contact = rows[0];
  if (!contact) return;
  const stamped = `[IA] ${note}`;
  await db
    .update(schema.contact)
    .set({
      notes: contact.notes ? `${contact.notes}\n${stamped}` : stamped,
      updatedAt: new Date(),
    })
    .where(eq(schema.contact.id, contact.id));
}

function publishBoardChange(organizationId: string, conversationId?: string) {
  if (!conversationId) return;
  publish(organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: conversationId } },
  });
}

/**
 * Arma la rutina para un contacto: lead → «En calificación» y primer intento
 * programado (lo pedido por el cliente, o ahora + 12h) dentro de la ventana
 * de atención. Devuelve el momento del intento (null si no hay lead).
 */
export async function armFollowUp(input: {
  organizationId: string;
  contactId: string;
  requestedAt?: Date | null;
  now?: Date;
}): Promise<Date | null> {
  const db = getDb();
  const now = input.now ?? new Date();
  const lead = await db
    .select({ id: schema.lead.id })
    .from(schema.lead)
    .where(eq(schema.lead.contactId, input.contactId))
    .limit(1);
  if (!lead[0]) return null;
  const stage = await qualifyingStage(input.organizationId);

  const settings = await getCalendarSettings(input.organizationId);
  const base =
    input.requestedAt && input.requestedAt.getTime() > now.getTime()
      ? input.requestedAt
      : new Date(now.getTime() + FOLLOW_UP_DELAY_MS);
  const due = nextAttentionSlot(base, settings);

  await db
    .update(schema.lead)
    .set({
      ...(stage ? { stageId: stage.id } : {}),
      followUpDueAt: due,
      followUpAttempts: 0,
      closureReason: null,
      closedAt: null,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(schema.lead.id, lead[0].id));
  return due;
}

/** Desarma la rutina sin mover el lead (p. ej. lo sacaron de la etapa a mano). */
export async function disarmFollowUp(contactId: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.lead)
    .set({ followUpDueAt: null, followUpAttempts: 0, updatedAt: new Date() })
    .where(eq(schema.lead.contactId, contactId));
}

/**
 * El cliente respondió: cancela la rutina en el punto en que esté. La etapa
 * comercial no cambia porque el seguimiento ya no es una columna.
 */
export async function cancelFollowUpOnInbound(
  _organizationId: string,
  contactId: string
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({
      leadId: schema.lead.id,
      dueAt: schema.lead.followUpDueAt,
      attempts: schema.lead.followUpAttempts,
    })
    .from(schema.lead)
    .where(eq(schema.lead.contactId, contactId))
    .limit(1);
  const lead = rows[0];
  if (!lead) return;
  if (!lead.dueAt && lead.attempts === 0) return;
  await db
    .update(schema.lead)
    .set({
      followUpDueAt: null,
      followUpAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(schema.lead.id, lead.leadId));
}

/** Conversación real (no sandbox) del contacto. */
async function realConversation(contactId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.conversation)
    .where(
      and(
        eq(schema.conversation.contactId, contactId),
        eq(schema.conversation.isTest, false)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Mensaje contextual del LLM para retomar la conversación (solo con la
 * ventana de 24h abierta). Cualquier hipo del proveedor degrada al texto
 * neutro de respaldo — el intento jamás se pierde por el LLM.
 */
async function composeFollowUpText(
  organizationId: string,
  conversationId: string
): Promise<string> {
  const db = getDb();
  const profileRows = await db
    .select()
    .from(schema.agentProfile)
    .where(eq(schema.agentProfile.organizationId, organizationId))
    .limit(1);
  const profile = profileRows[0];
  const history = await db
    .select({ direction: schema.message.direction, text: schema.message.text })
    .from(schema.message)
    .where(eq(schema.message.conversationId, conversationId))
    .orderBy(desc(schema.message.createdAt))
    .limit(12);
  history.reverse();

  const transcript = history
    .filter((m) => m.text)
    .map((m) => `${m.direction === "in" ? "CLIENTE" : "AGENTE"}: ${m.text}`)
    .join("\n");

  const followUpTone = composeTone(profile?.tonePresets, profile?.tone);
  const followUpInstructions = composeInstructions(
    profile?.instructionSections,
    profile?.instructions
  );
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        `${FOLLOW_UP_MARKER} Eres "${profile?.name ?? "el asistente"}", el asistente de WhatsApp de este negocio. El cliente pidió que lo contactaran más tarde o dejó la conversación pendiente, y llegó el momento de retomarla.`,
        followUpTone ? `Tono: ${followUpTone}` : null,
        followUpInstructions
          ? `Instrucciones del negocio:\n${followUpInstructions}`
          : null,
        `Escribe UN solo mensaje breve y natural de seguimiento para WhatsApp: saluda, retoma el tema pendiente de la conversación y facilita que responda. No inventes datos ni ofertas.`,
        `Respondes ÚNICAMENTE un objeto JSON: {"text":"..."} — sin markdown ni texto adicional.`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      role: "user",
      content: transcript
        ? `CONVERSACIÓN PREVIA:\n${transcript}\n\nEscribe el mensaje de seguimiento.`
        : "No hay historial visible. Escribe un mensaje de seguimiento breve y amable.",
    },
  ];

  const result = await chatJson(z.object({ text: z.string().min(1) }), messages);
  if (!result.ok) {
    console.warn(`[seguimiento] LLM falló (${result.error}); uso respaldo`);
    return FALLBACK_TEXT;
  }
  return result.data.text;
}

type DueLead = {
  leadId: string;
  contactId: string;
  organizationId: string;
  dueAt: Date | null;
  attempts: number;
  stageName: string;
  optedOutAt: Date | null;
  blockedAt: Date | null;
  contactName: string;
};

/**
 * Envía un intento. Devuelve una nota describiendo lo que pasó (para la ficha)
 * o null si el envío fue normal.
 */
async function sendAttempt(input: {
  lead: DueLead;
  conversation: typeof schema.conversation.$inferSelect;
  settings: FollowUpSettings;
  attemptNo: number;
  now: Date;
}): Promise<string | null> {
  const { lead, conversation, settings, attemptNo } = input;
  // La ventana se evalúa con el `now` del barrido (no el reloj real): así el
  // viaje en el tiempo de los self-tests simula exactamente la producción.
  if (isWindowOpen(conversation.lastInboundAt, input.now)) {
    const text = await composeFollowUpText(lead.organizationId, conversation.id);
    try {
      await sendText({
        conversationId: conversation.id,
        organizationId: lead.organizationId,
        text,
        aiGenerated: true,
      });
      return null;
    } catch (err) {
      // Carrera: la ventana se cerró entre el chequeo y el envío → plantilla.
      if (!(err instanceof SendError && err.code === "window_closed")) throw err;
    }
  }
  if (!settings.templateId) {
    return `Seguimiento ${attemptNo}: omitido — no hay plantilla de seguimiento configurada en Ajustes del agente y la ventana de 24h está cerrada.`;
  }
  try {
    const firstName = lead.contactName.split(/\s+/)[0] || "Hola";
    await sendTemplate({
      organizationId: lead.organizationId,
      conversationId: conversation.id,
      templateId: settings.templateId,
      variable: firstName,
    });
    return null;
  } catch (err) {
    const detail =
      err instanceof TemplateError || err instanceof SendError
        ? err.message
        : "error inesperado";
    console.error(`[seguimiento] plantilla falló (${lead.leadId}):`, err);
    return `Seguimiento ${attemptNo}: la plantilla no se pudo enviar (${detail}).`;
  }
}

/**
 * Barrido del seguimiento (invocado por el cron junto al de recuperación).
 *
 * (a) Detecta conversaciones SIN entrantes cuyo primer mensaje saliente tiene
 *     ≥12h, con el lead aún en «Nuevo» → «En calificación» + rutina armada.
 * (b) Procesa intentos vencidos con claim atómico (dos barridos concurrentes
 *     no duplican el mensaje) y cierra en «No convertido» al agotarse.
 */
export async function sweepFollowUps(
  now: Date = new Date()
): Promise<{ entered: number; attempts: number; closed: number }> {
  const db = getDb();
  const settingsCache = new Map<
    string,
    { followUp: FollowUpSettings; attention: CalendarSettings }
  >();
  const orgSettings = async (organizationId: string) => {
    let hit = settingsCache.get(organizationId);
    if (!hit) {
      hit = {
        followUp: await getFollowUpSettings(organizationId),
        attention: await getCalendarSettings(organizationId),
      };
      settingsCache.set(organizationId, hit);
    }
    return hit;
  };

  // (a) Entrada del flujo «no contestó».
  let entered = 0;
  const threshold = new Date(now.getTime() - FOLLOW_UP_DELAY_MS);
  const silent = await db
    .select({
      conversationId: schema.conversation.id,
      organizationId: schema.conversation.organizationId,
      contactId: schema.conversation.contactId,
      leadId: schema.lead.id,
      stageId: schema.lead.stageId,
    })
    .from(schema.conversation)
    .innerJoin(
      schema.contact,
      eq(schema.conversation.contactId, schema.contact.id)
    )
    .innerJoin(schema.lead, eq(schema.lead.contactId, schema.contact.id))
    .where(
      and(
        eq(schema.conversation.isTest, false),
        eq(schema.conversation.aiEnabled, true),
        isNull(schema.conversation.handoffAt),
        isNull(schema.conversation.lastInboundAt),
        lte(schema.conversation.lastMessageAt, threshold),
        isNull(schema.contact.optedOutAt),
        isNull(schema.contact.blockedAt),
        isNull(schema.lead.followUpDueAt),
        eq(schema.lead.followUpAttempts, 0)
      )
    )
    .limit(MAX_PER_SWEEP);

  for (const c of silent) {
    const { followUp, attention } = await orgSettings(c.organizationId);
    if (!followUp.enabled) continue;
    // Solo leads que siguen en la PRIMERA etapa abierta (típicamente «Nuevo»):
    // un cliente ganado que recibe una campaña no debe entrar a la rutina.
    const firstOpen = await stageByKind(c.organizationId, "open");
    if (!firstOpen || firstOpen.id !== c.stageId) continue;
    const qualifying = await qualifyingStage(c.organizationId);

    const due = nextAttentionSlot(now, attention);
    await db
      .update(schema.lead)
      .set({
        ...(qualifying ? { stageId: qualifying.id } : {}),
        followUpDueAt: due,
        followUpAttempts: 0,
        closureReason: null,
        closedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schema.lead.id, c.leadId), isNull(schema.lead.followUpDueAt))
      );
    await appendNote(
      c.contactId,
      "Sin respuesta al primer mensaje: entra a la rutina de seguimiento."
    );
    publishBoardChange(c.organizationId, c.conversationId);
    entered++;
  }

  // (b) Intentos vencidos.
  let attempts = 0;
  let closed = 0;
  const due = await db
    .select({
      leadId: schema.lead.id,
      contactId: schema.lead.contactId,
      organizationId: schema.lead.organizationId,
      dueAt: schema.lead.followUpDueAt,
      attempts: schema.lead.followUpAttempts,
      stageName: schema.pipelineStage.name,
      optedOutAt: schema.contact.optedOutAt,
      blockedAt: schema.contact.blockedAt,
      contactName: schema.contact.name,
    })
    .from(schema.lead)
    .innerJoin(
      schema.pipelineStage,
      eq(schema.lead.stageId, schema.pipelineStage.id)
    )
    .innerJoin(schema.contact, eq(schema.lead.contactId, schema.contact.id))
    .where(lte(schema.lead.followUpDueAt, now))
    .limit(MAX_PER_SWEEP);

  for (const l of due) {
    const { followUp, attention } = await orgSettings(l.organizationId);
    // Apagado: se deja el due intacto — al reactivar, la rutina continúa.
    if (!followUp.enabled) continue;

    // Claim atómico: solo quien logra poner due=NULL procesa este intento.
    const claimed = await db
      .update(schema.lead)
      .set({ followUpDueAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.lead.id, l.leadId),
          eq(schema.lead.followUpDueAt, l.dueAt!)
        )
      )
      .returning({ id: schema.lead.id });
    if (!claimed[0]) continue;

    // El operador lo movió fuera de «En calificación» → desarmar.
    if (l.stageName.toLowerCase() !== "en calificación") {
      await disarmFollowUp(l.contactId);
      continue;
    }

    const conversation = await realConversation(l.contactId);
    // Sin conversación, baja del contacto o un humano al mando → cancelar.
    if (
      !conversation ||
      l.optedOutAt ||
      l.blockedAt ||
      conversation.handoffAt ||
      !conversation.aiEnabled
    ) {
      await disarmFollowUp(l.contactId);
      continue;
    }
    // Si el cliente respondió antes del claim, el ingest ya canceló la rutina
    // (due=NULL) y el claim atómico habría fallado — no hace falta más chequeo.

    if (l.attempts >= 2) {
      // Rutina agotada → «No convertido» con un motivo reportable.
      const target = await stageByKind(l.organizationId, "lost");
      await db
        .update(schema.lead)
        .set({
          ...(target ? { stageId: target.id } : {}),
          followUpDueAt: null,
          followUpAttempts: 0,
          closureReason: "no_response",
          closedAt: now,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        })
        .where(eq(schema.lead.id, l.leadId));
      await appendNote(
        l.contactId,
        "Sin respuesta tras dos seguimientos: pasa a No convertido."
      );
      publishBoardChange(l.organizationId, conversation.id);
      closed++;
      continue;
    }

    const attemptNo = l.attempts + 1;
    const note = await sendAttempt({
      lead: l,
      conversation,
      settings: followUp,
      attemptNo,
      now,
    });
    if (note) await appendNote(l.contactId, note);

    const next = nextBusinessAttempt(now, attention);
    await db
      .update(schema.lead)
      .set({
        followUpDueAt: next,
        followUpAttempts: attemptNo,
        updatedAt: new Date(),
      })
      .where(eq(schema.lead.id, l.leadId));
    publishBoardChange(l.organizationId, conversation.id);
    attempts++;
  }

  return { entered, attempts, closed };
}
