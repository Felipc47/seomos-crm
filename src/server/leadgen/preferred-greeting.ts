import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { usPhone } from "@/lib/sms";
import { sendSms, SmsError } from "@/server/sms/service";
import { renderSmsTemplate } from "@/server/sms/templates";
import { sendTemplate } from "@/server/whatsapp/templates";
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
  const [smsContact] = await db.select().from(schema.smsContact)
    .where(scoped(schema.smsContact.organizationId, org, eq(schema.smsContact.phone, smsPhone))).limit(1);
  if (smsContact?.optedOutAt) {
    throw new SmsError("opted_out", "Saludo SMS omitido: el contacto se dio de baja.");
  }
  if (!smsContact?.consentEvidence) {
    throw new SmsError("missing_sms_consent", "Saludo SMS omitido: falta consentimiento. Revisa la fuente en Ajustes → SMS.");
  }
  const content = await renderSmsTemplate(org, input.templateId, contact);

  const dispatchId = await reserveTemplateDispatch({ organizationId: org, contactId: contact.id,
    templateId: input.templateId, automaticGreeting: true });
  try {
    const result = await sendSms(org, { contactId: smsContact.id, content,
      operationId: greetingOperationId(org, contact.id) }, { source: "automation" });
    if (["failed", "uncertain"].includes(result.status)) throw new SmsError("sms_not_confirmed", "El envío SMS falló o quedó sin confirmar. Revisa el estado en Bandeja.");
    await db.update(schema.templateDispatch).set({ status: "sent", updatedAt: new Date() })
      .where(scoped(schema.templateDispatch.organizationId, org, eq(schema.templateDispatch.id, dispatchId)));
    return "sms";
  } catch (error) {
    await finishTemplateDispatch(org, dispatchId, null);
    throw error;
  }
}
