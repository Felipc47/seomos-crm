import { z } from "zod";

export const MEETING_NOTICE_MS = 45 * 60_000;
export const meetingInputSchema = z.object({
  startIso: z.string().datetime({ offset: true }),
  meetLink: z.string().trim().max(1000).refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch { return false; }
  }, "Usa un enlace HTTPS sin credenciales").nullable().default(null).transform(value => value || null),
  title: z.string().trim().min(1).max(120).default("Reunión"),
  reminderEnabled: z.boolean().default(true),
}).strict();

export type MeetingDto = {
  id: string; title: string; startIso: string; meetLink: string | null;
  timezone: string; source: "google" | "manual" | "legacy";
  reminderEnabled: boolean; reminderDueAt: string;
  reminderStatus: "pending" | "sending" | "sent" | "skipped" | "uncertain" | "disabled" | "cancelled";
  reminderSentAt: string | null; reminderError: string | null;
};

export function meetingDueAt(start: Date): Date {
  return new Date(start.getTime() - MEETING_NOTICE_MS);
}

export function formatMeetingTime(start: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: timezone, dateStyle: "medium", timeStyle: "short",
  }).format(start);
}

export function meetingConfirmationDetails(meeting: { startAt: Date; timezone: string; meetLink: string | null }): string {
  // Meta no admite saltos de línea en valores de parámetros de plantilla.
  return `${formatMeetingTime(meeting.startAt, meeting.timezone)} (${meeting.timezone})${meeting.meetLink ? ` · Enlace: ${meeting.meetLink}` : ""}`;
}

export function meetingConfirmationText(name: string, meeting: Parameters<typeof meetingConfirmationDetails>[0]): string {
  return `Hola, ${name}. Te recordamos nuestra reunión: ${meetingConfirmationDetails(meeting)}. ¿Nos confirmas si podrás asistir?`;
}

/** Una variable legacy contiene TODOS los datos; el mapeo de contacto no debe reemplazarla. */
export function isMeetingTemplate(template: { status: string; category: string; body: string; headerKind?: string | null; variables?: unknown }): boolean {
  const matches = [...template.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)];
  const variables = template.variables;
  const noMapping = !variables || (Array.isArray(variables) && variables.length === 0);
  return template.status === "approved" && template.category === "UTILITY" && !template.headerKind && noMapping && matches.length === 1 && matches[0]?.[1] === "1";
}

export function meetingLocalInput(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

/** Interpretar datetime-local en la zona de la empresa, independientemente del navegador. */
export function meetingLocalToIso(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error("Selecciona una fecha y hora válidas");
  const wallTime = Date.parse(`${local}:00Z`);
  let instant = wallTime;
  for (let i = 0; i < 4; i++) {
    const formatted = meetingLocalInput(new Date(instant).toISOString(), timezone);
    const delta = wallTime - Date.parse(`${formatted}:00Z`);
    if (delta === 0) return new Date(instant).toISOString();
    instant += delta;
  }
  throw new Error("Esa hora no existe en la zona horaria de la empresa");
}
