import { asc, eq, gt, isNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isMeetingTemplate, meetingConfirmationDetails, meetingConfirmationText } from "@/lib/meeting";
import { getCalendarSettings } from "@/server/org-settings";
import { isWindowOpen } from "@/server/inbox/window";
import { SendError, sendText } from "@/server/inbox/send";
import { sendTemplate, TemplateError } from "@/server/whatsapp/templates";
import { publishMeeting, type MeetingRow } from "./repository";

async function finish(row: MeetingRow, state: "sent" | "skipped" | "uncertain", error: string | null, now: Date, messageId?: string) {
  await getDb().update(schema.meeting).set({
    reminderStatus: state, reminderError: error, updatedAt: new Date(),
    ...(messageId ? { reminderMessageId: messageId, reminderSentAt: now } : {}),
  }).where(scoped(schema.meeting.organizationId, row.organizationId, eq(schema.meeting.id, row.id), eq(schema.meeting.reminderStatus, "sending")));
  await publishMeeting(row.organizationId, row.contactId);
}

/** Discovery global solo de tenants; toda consulta de dominio posterior es scoped(). */
export async function sweepMeetingReminders(now = new Date()) {
  const db = getDb();
  const organizations = await db.select({ id: schema.organization.id }).from(schema.organization).where(isNull(schema.organization.deletedAt));
  const result = { sent: 0, skipped: 0, uncertain: 0 };
  const deadline = Date.now() + 40_000;
  let budget = 100;
  for (const org of organizations) {
    if (budget <= 0 || Date.now() >= deadline) break;
    // Un proceso caído pudo enviar a Meta antes de caer: jamás reenviar a ciegas.
    const stalled = await db.update(schema.meeting).set({ reminderStatus: "uncertain", reminderError: "El envío quedó interrumpido; revisa el chat antes de confirmar manualmente.", updatedAt: new Date() })
      .where(scoped(schema.meeting.organizationId, org.id, eq(schema.meeting.reminderStatus, "sending"), lte(schema.meeting.reminderClaimedAt, new Date(Date.now() - 5 * 60_000)))).returning();
    result.uncertain += stalled.length;
    for (const row of stalled) await publishMeeting(org.id, row.contactId);
    const expired = await db.update(schema.meeting).set({ reminderStatus: "skipped", reminderError: "La reunión ya comenzó; no se envió una confirmación tardía.", updatedAt: new Date() })
      .where(scoped(schema.meeting.organizationId, org.id, eq(schema.meeting.reminderStatus, "pending"), lte(schema.meeting.startAt, now))).returning();
    result.skipped += expired.length;
    for (const row of expired) await publishMeeting(org.id, row.contactId);
    const candidates = await db.select({ id: schema.meeting.id }).from(schema.meeting)
      .where(scoped(schema.meeting.organizationId, org.id, eq(schema.meeting.reminderStatus, "pending"), eq(schema.meeting.reminderEnabled, true), lte(schema.meeting.reminderDueAt, now), gt(schema.meeting.startAt, now)))
      .orderBy(asc(schema.meeting.reminderDueAt)).limit(100);
    for (const candidate of candidates) {
      if (budget <= 0 || Date.now() >= deadline) break;
      // Claim committed ANTES de red. Cambios/cancelaciones rechazan sending.
      const claimed = await db.update(schema.meeting).set({ reminderStatus: "sending", reminderClaimedAt: new Date(), updatedAt: new Date() })
        .where(scoped(schema.meeting.organizationId, org.id, eq(schema.meeting.id, candidate.id), eq(schema.meeting.reminderStatus, "pending"), eq(schema.meeting.reminderEnabled, true), lte(schema.meeting.reminderDueAt, now), gt(schema.meeting.startAt, now))).returning();
      const row = claimed[0];
      if (!row) continue;
      budget--;
      let attemptingDelivery = false;
      try {
        const contacts = await db.select().from(schema.contact).where(scoped(schema.contact.organizationId, org.id, eq(schema.contact.id, row.contactId))).limit(1);
        const contact = contacts[0];
        const conversations = await db.select().from(schema.conversation).where(scoped(schema.conversation.organizationId, org.id, eq(schema.conversation.contactId, row.contactId), eq(schema.conversation.isTest, false))).limit(1);
        const conversation = conversations[0];
        let reason = !contact ? "Contacto no disponible." : contact.optedOutAt ? "El prospecto solicitó no recibir mensajes." : contact.blockedAt ? "El prospecto está bloqueado." : contact.archivedAt || conversation?.archivedAt ? "El prospecto o el chat está archivado." : !conversation ? "No hay una conversación real de WhatsApp." : null;
        if (!reason && contact && conversation) {
          let messageId: string;
          if (isWindowOpen(conversation.lastInboundAt, now)) {
            attemptingDelivery = true;
            ({ messageId } = await sendText({ organizationId: org.id, conversationId: conversation.id, text: meetingConfirmationText(contact.name, row), timeoutMs: 20_000 }));
          } else {
            const settings = await getCalendarSettings(org.id);
            const templates = settings.meetingReminderTemplateId ? await db.select().from(schema.template).where(scoped(schema.template.organizationId, org.id, eq(schema.template.id, settings.meetingReminderTemplateId))).limit(1) : [];
            const template = templates[0];
            if (!template || !isMeetingTemplate(template)) {
              reason = "Ventana de 24h cerrada: configura una plantilla de confirmación UTILITY aprobada en Agente → Agendamiento.";
              await finish(row, "skipped", reason, now); result.skipped++; continue;
            }
            attemptingDelivery = true;
            ({ messageId } = await sendTemplate({ organizationId: org.id, conversationId: conversation.id, templateId: template.id, variable: meetingConfirmationDetails(row), timeoutMs: 20_000 }));
          }
          await finish(row, "sent", null, now, messageId); result.sent++;
        } else {
          await finish(row, "skipped", reason, now); result.skipped++;
        }
      } catch (err) {
        // Guardas locales y rechazos inequívocos no aceptaron envío. Transporte,
        // persistencia posterior o resultado inesperado podrían haberlo aceptado.
        const safeReject = (err instanceof SendError && !["meta_unavailable", "meta_error"].includes(err.code)) || (err instanceof TemplateError && !["meta_unavailable", "meta_error"].includes(err.code));
        const state = !attemptingDelivery || safeReject ? "skipped" : "uncertain";
        const error = state === "uncertain" ? "No se pudo confirmar el resultado del envío. Revisa el chat; no se reintentará automáticamente." : "No se pudo enviar la confirmación. Revisa la conexión y los permisos de WhatsApp.";
        await finish(row, state, error, now); result[state]++;
      }
    }
  }
  return result;
}
