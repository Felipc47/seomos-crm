import { eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { newId } from "@/lib/db/ids";
import { meetingDueAt, type MeetingDto } from "@/lib/meeting";
import { publish } from "@/server/events/bus";

export class MeetingBusyError extends Error {}
export type MeetingRow = typeof schema.meeting.$inferSelect;
export function serializeMeeting(row: MeetingRow): MeetingDto {
  return {
    id: row.id, title: row.title, startIso: row.startAt.toISOString(), meetLink: row.meetLink,
    timezone: row.timezone, source: row.source, reminderEnabled: row.reminderEnabled,
    reminderDueAt: row.reminderDueAt.toISOString(), reminderStatus: row.reminderStatus,
    reminderSentAt: row.reminderSentAt?.toISOString() ?? null, reminderError: row.reminderError,
  };
}
export async function getMeeting(organizationId: string, contactId: string) {
  const rows = await getDb().select().from(schema.meeting).where(scoped(schema.meeting.organizationId, organizationId, eq(schema.meeting.contactId, contactId))).limit(1);
  return rows[0] ?? null;
}
export async function publishMeeting(organizationId: string, contactId: string) {
  const rows = await getDb().select({ id: schema.conversation.id }).from(schema.conversation)
    .where(scoped(schema.conversation.organizationId, organizationId, eq(schema.conversation.contactId, contactId)));
  for (const row of rows) publish(organizationId, { type: "conversation.updated", data: { conversation: { id: row.id } } });
}

export async function saveMeeting(input: {
  organizationId: string; contactId: string; title: string; startAt: Date; meetLink: string | null;
  timezone: string; source: MeetingRow["source"]; googleEventId?: string | null; reminderEnabled?: boolean;
}) {
  const db = getDb();
  // Bloquear el contacto serializa también dos primeras inserciones concurrentes.
  const row = await db.transaction(async (tx) => {
    const contacts = await tx.select({ id: schema.contact.id }).from(schema.contact)
      .where(scoped(schema.contact.organizationId, input.organizationId, eq(schema.contact.id, input.contactId))).for("update");
    if (!contacts[0]) throw new Error("Contacto no encontrado");
    const rows = await tx.select().from(schema.meeting)
      .where(scoped(schema.meeting.organizationId, input.organizationId, eq(schema.meeting.contactId, input.contactId))).for("update");
    const current = rows[0];
    if (current?.reminderStatus === "sending") throw new MeetingBusyError("La confirmación se está enviando. Intenta de nuevo en unos minutos.");
    const enabled = input.reminderEnabled ?? true;
    const changed = !current || current.reminderStatus === "cancelled" || current.startAt.getTime() !== input.startAt.getTime() || current.meetLink !== input.meetLink;
    const alreadyAttempted = current && ["sent", "uncertain", "skipped"].includes(current.reminderStatus);
    const status = !changed && alreadyAttempted ? current.reminderStatus : !enabled ? "disabled" : "pending";
    const values = {
      title: input.title, startAt: input.startAt, meetLink: input.meetLink, timezone: input.timezone,
      source: input.source, googleEventId: input.googleEventId ?? current?.googleEventId ?? null,
      reminderEnabled: enabled, reminderDueAt: meetingDueAt(input.startAt), reminderStatus: status as MeetingRow["reminderStatus"],
      reminderClaimedAt: null,
      reminderSentAt: changed ? null : current?.reminderSentAt ?? null,
      reminderMessageId: changed ? null : current?.reminderMessageId ?? null,
      reminderError: changed ? null : current?.reminderError ?? null, updatedAt: new Date(),
    };
    const saved = current
      ? await tx.update(schema.meeting).set(values).where(scoped(schema.meeting.organizationId, input.organizationId, eq(schema.meeting.id, current.id))).returning()
      : await tx.insert(schema.meeting).values({ ...values, id: newId("meeting"), organizationId: input.organizationId, contactId: input.contactId }).returning();
    await tx.update(schema.conversation).set({ meetingScheduledFor: input.startAt, updatedAt: new Date() })
      .where(scoped(schema.conversation.organizationId, input.organizationId, eq(schema.conversation.contactId, input.contactId)));
    // Reunión agendada: detener el seguimiento de venta que podría cerrar al prospecto por falta de respuesta.
    await tx.update(schema.lead).set({ followUpDueAt: null, updatedAt: new Date() })
      .where(scoped(schema.lead.organizationId, input.organizationId, eq(schema.lead.contactId, input.contactId)));
    return saved[0]!;
  });
  await publishMeeting(input.organizationId, input.contactId);
  return row;
}
export async function cancelMeeting(organizationId: string, contactId: string) {
  await getDb().transaction(async (tx) => {
    await tx.select({ id: schema.contact.id }).from(schema.contact)
      .where(scoped(schema.contact.organizationId, organizationId, eq(schema.contact.id, contactId))).for("update");
    const current = await tx.select().from(schema.meeting).where(scoped(schema.meeting.organizationId, organizationId, eq(schema.meeting.contactId, contactId))).for("update");
    if (current[0]?.reminderStatus === "sending") throw new MeetingBusyError("La confirmación se está enviando. Intenta de nuevo en unos minutos.");
    if (!current[0]) return;
    await tx.update(schema.meeting).set({ reminderEnabled: false, reminderStatus: "cancelled", updatedAt: new Date() })
      .where(scoped(schema.meeting.organizationId, organizationId, eq(schema.meeting.contactId, contactId), ne(schema.meeting.reminderStatus, "sending")));
    await tx.update(schema.conversation).set({ meetingScheduledFor: null, updatedAt: new Date() })
      .where(scoped(schema.conversation.organizationId, organizationId, eq(schema.conversation.contactId, contactId)));
  });
  await publishMeeting(organizationId, contactId);
}
