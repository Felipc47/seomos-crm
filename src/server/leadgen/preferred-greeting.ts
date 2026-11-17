import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { usPhone } from "@/lib/sms";
import { sendSms, SmsError } from "@/server/sms/service";
import { parseStoredVariables, resolveTemplateVariables } from "@/server/whatsapp/template-vars";
import { loadVariableContext, renderBody, sendTemplate } from "@/server/whatsapp/templates";
import { reserveTemplateDispatch, finishTemplateDispatch } from "@/server/whatsapp/template-dispatch";

export async function preferredContactChannel(organizationId: string): Promise<"whatsapp" | "sms"> {
  const [profile] = await getDb().select({ channel: schema.agentProfile.preferredContactChannel })
    .from(schema.agentProfile).where(scoped(schema.agentProfile.organizationId, organizationId)).limit(1);
  return profile?.channel ?? "whatsapp";
}

function greetingOperationId(organizationId: string, contactId: string): string {
  const hex = createHash("sha256").update(`lead-greeting:${organizationId}:${contactId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Use the existing approved service template for the selected channel. */
export async function sendPreferredGreeting(input: {
  organizationId: string; contactId: string; conversationId: string;
  templateId: string; timeoutMs?: number;
}): Promise<"whatsapp" | "sms"> {
  const org = input.organizationId;
  const channel = await preferredContactChannel(org);
  const db = getDb();
  const [contact] = await db.select().from(schema.contact)
    .where(scoped(schema.contact.organizationId, org, eq(schema.contact.id, input.contactId))).limit(1);
  if (!contact) throw new Error("Contacto no encontrado");
  if (channel === "whatsapp") {
    await sendTemplate({ organizationId: org, conversationId: input.conversationId,
      templateId: input.templateId, variable: contact.name.split(/\s+/)[0] || "Hola",
      automaticGreeting: true, timeoutMs: input.timeoutMs });
    return "whatsapp";
  }

  const smsPhone = usPhone(`+${contact.phone.replace(/^\+/, "")}`);
  if (!smsPhone) throw new SmsError("invalid_phone", "El lead no tiene un número SMS válido de Estados Unidos.");
  const [smsContact, template, organization] = await Promise.all([
    db.select().from(schema.smsContact).where(scoped(schema.smsContact.organizationId, org, eq(schema.smsContact.phone, smsPhone))).limit(1).then(rows => rows[0]),
    db.select().from(schema.template).where(scoped(schema.template.organizationId, org, eq(schema.template.id, input.templateId))).limit(1).then(rows => rows[0]),
    db.select({ name: schema.organization.name }).from(schema.organization).where(eq(schema.organization.id, org)).limit(1).then(rows => rows[0]),
  ]);
  if (!smsContact?.consentEvidence || smsContact.optedOutAt) throw new SmsError("opted_out", "El lead no tiene consentimiento SMS activo.");
  if (!template || template.status !== "approved") throw new Error("La plantilla de bienvenida no está aprobada.");
  const mapping = parseStoredVariables(template.variables);
  let values: string[] | undefined;
  if (mapping) {
    const resolved = resolveTemplateVariables(mapping, await loadVariableContext(org, contact));
    if (!resolved.ok) throw new Error(`Falta ${resolved.missing} para personalizar el SMS.`);
    values = resolved.values;
  }
  const body = renderBody(template.body, values ?? contact.name.split(/\s+/)[0] ?? "Hola").trim();
  if (!body || /\{\{\s*\d+\s*\}\}/.test(body)) throw new Error("La plantilla SMS no se pudo completar.");
  const brand = organization?.name?.trim() || "Empresa";
  const branded = body.toLocaleLowerCase().includes(brand.toLocaleLowerCase()) ? body : `${brand}: ${body}`;
  const content = /\bSTOP\b/i.test(branded) ? branded : `${branded}\nResponde STOP para salir.`;
  if (content.length > 1600) throw new Error("La plantilla SMS supera el límite permitido.");

  const dispatchId = await reserveTemplateDispatch({ organizationId: org, contactId: contact.id,
    templateId: template.id, automaticGreeting: true });
  try {
    const result = await sendSms(org, { contactId: smsContact.id, content,
      operationId: greetingOperationId(org, contact.id) }, { source: "automation" });
    if (["failed", "uncertain"].includes(result.status)) throw new Error("El SMS no confirmó su envío; revisa el resultado en Bandeja.");
    await db.update(schema.templateDispatch).set({ status: "sent", updatedAt: new Date() })
      .where(scoped(schema.templateDispatch.organizationId, org, eq(schema.templateDispatch.id, dispatchId)));
    return "sms";
  } catch (error) {
    await finishTemplateDispatch(org, dispatchId, null);
    throw error;
  }
}
