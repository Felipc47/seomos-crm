import { asc, eq, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { getOrCreateConversation } from "@/server/inbox/ingest";
import { ensureLeadActivity } from "@/server/inbox/lead-activity";
import { notifyNewLeadByEmail } from "@/server/email/new-lead";
import { getLeadgenSettings } from "@/server/org-settings";
import { sendTemplate } from "@/server/whatsapp/templates";
import { InitialGreetingSkipped } from "@/server/whatsapp/template-dispatch";
import { publish } from "@/server/events/bus";
import { isCompanyServiceActive } from "@/server/company-service";

type Row = typeof schema.sheetsRow.$inferSelect;
async function runFlow(row: Row) {
  const org = row.organizationId, db = getDb();
  if (!row.contactId || !row.flowServiceId) return { failed: false, result: "Omitido: contacto o servicio eliminado." };
  const [contact] = await db.select().from(schema.contact).where(scoped(schema.contact.organizationId, org, eq(schema.contact.id, row.contactId))).limit(1);
  const [service] = await db.select().from(schema.service).where(scoped(schema.service.organizationId, org, eq(schema.service.id, row.flowServiceId))).limit(1);
  if (!contact || !service) return { failed: false, result: "Omitido: contacto o servicio no disponible." };
  const { leadId } = await ensureLeadActivity(org, contact.id, row.createdAt, { notifyByEmail: false });
  if (!leadId) return { failed: true, result: "No hay una etapa abierta para crear el lead. Revisa el pipeline." };
  await db.update(schema.lead).set({ serviceId: service.id, updatedAt: new Date() })
    .where(scoped(schema.lead.organizationId, org, eq(schema.lead.id, leadId), isNull(schema.lead.serviceId)));
  const [lead] = await db.select({ serviceId: schema.lead.serviceId }).from(schema.lead).where(scoped(schema.lead.organizationId, org, eq(schema.lead.id, leadId))).limit(1);
  // Existing assignment may be a human decision or another integration. Do not overwrite it.
  if (lead?.serviceId !== service.id) return { failed: false, result: "Omitido: el contacto ya tiene otro servicio." };
  const conversation = await getOrCreateConversation(org, contact.id);
  let failed = false;
  const results: string[] = [];
  try {
    const emails = await notifyNewLeadByEmail({ organizationId: org, leadId });
    const [incomplete] = emails.length ? await db.select({ id: schema.emailDelivery.id }).from(schema.emailDelivery).where(scoped(schema.emailDelivery.organizationId, org, eq(schema.emailDelivery.leadId, leadId), eq(schema.emailDelivery.kind, "new_lead"), ne(schema.emailDelivery.status, "sent"))).limit(1) : [];
    if (incomplete || emails.some(email => email.status === "failed" || email.status === "unconfigured")) {
      failed = true; results.push("Correo no enviado: revisa la configuración y el registro de avisos.");
    } else results.push(emails.length ? "Avisos por correo procesados sin duplicar." : "Avisos por correo desactivados o sin destinatarios.");
  } catch { failed = true; results.push("No se pudo preparar el aviso por correo."); }
  try {
    const templateId = service.greetingTemplateId ?? (await getLeadgenSettings(org)).greetingTemplateId;
    if (!templateId) results.push("Servicio sin plantilla de saludo configurada.");
    else {
      await sendTemplate({ organizationId: org, conversationId: conversation.id, templateId, variable: contact.name?.split(/\s+/)[0] || "Hola", automaticGreeting: true, timeoutMs: 15000 });
      results.push("Plantilla enviada.");
    }
  } catch (error) {
    if (error instanceof InitialGreetingSkipped) results.push(error.message);
    else { failed = true; results.push("No se confirmó el envío de la plantilla. Revisa la conversación y la conexión; no se reenviará automáticamente."); }
  }
  publish(org, { type: "conversation.updated", data: { conversation: { id: conversation.id } } });
  return { failed, result: results.join(" ") };
}

/** Resumes persistent work even when the sheet is temporarily unavailable. Provider
 * idempotency lives outside this lease, so a crash after sending cannot duplicate. */
export async function drainSheetFlows(organizationId: string, sourceId: string, token: string, deadline: number, allowPaused = false) {
  const db = getDb();
  const pending = await db.select().from(schema.sheetsRow).where(scoped(schema.sheetsRow.organizationId, organizationId, eq(schema.sheetsRow.sourceId, sourceId), eq(schema.sheetsRow.flowState, "pending"))).orderBy(asc(schema.sheetsRow.createdAt)).limit(50);
  for (const row of pending) {
    if (Date.now() > deadline - 30000 || !await isCompanyServiceActive(organizationId)) break;
    const [source] = await db.select().from(schema.sheetsSource).where(scoped(schema.sheetsSource.organizationId, organizationId, eq(schema.sheetsSource.id, sourceId), eq(schema.sheetsSource.claimToken, token))).limit(1);
    if (!source || (!source.enabled && !allowPaused)) break;
    // Re-read state because a settings change can cancel unstarted work.
    const [current] = await db.select({ state: schema.sheetsRow.flowState }).from(schema.sheetsRow).where(scoped(schema.sheetsRow.organizationId, organizationId, eq(schema.sheetsRow.id, row.id))).limit(1);
    if (current?.state !== "pending") continue;
    let outcome;
    try { outcome = await runFlow(row); }
    catch { outcome = { failed: true, result: "No se pudo completar el flujo. El contacto se conserva para revisión." }; }
    await db.update(schema.sheetsRow).set({ flowState: outcome.failed ? "failed" : "done", flowResult: outcome.result, flowCompletedAt: new Date() })
      .where(scoped(schema.sheetsRow.organizationId, organizationId, eq(schema.sheetsRow.id, row.id), eq(schema.sheetsRow.flowState, "pending")));
  }
}
