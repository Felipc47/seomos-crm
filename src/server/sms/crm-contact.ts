import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { ensureLeadActivity } from "@/server/inbox/lead-activity";
import { SmsError } from "./errors";

const { smsContact, contact } = schema;

export function smsCrmContactCondition(sms: Pick<typeof smsContact.$inferSelect, "crmContactId" | "phone">) {
  return sms.crmContactId ? eq(contact.id, sms.crmContactId) : eq(contact.phone, sms.phone.replace(/^\+/, ""));
}

export function smsCrmContactMatch(organizationId: string) {
  return scoped(contact.organizationId, organizationId,
    or(eq(contact.id, smsContact.crmContactId),
      and(isNull(smsContact.crmContactId), sql`'+' || ${contact.phone} = ${smsContact.phone}`)));
}

/** Link historical and manually created SMS contacts without changing SMS consent. */
export async function openSmsCrmContact(organizationId: string, smsId: string) {
  const result = await getDb().transaction(async tx => {
    const [sms] = await tx.select().from(smsContact)
      .where(scoped(smsContact.organizationId, organizationId, eq(smsContact.id, smsId))).for("update");
    if (!sms) throw new SmsError("not_found", "Contacto SMS no encontrado.", 404);

    const phone = sms.phone.replace(/^\+/, "");
    const [existing] = await tx.select().from(contact)
      .where(scoped(contact.organizationId, organizationId, smsCrmContactCondition(sms))).limit(1);
    if (existing && sms.crmContactId) return { contact: existing, created: false };

    const [created] = existing ? [] : await tx.insert(contact).values({
      id: newId("contact"), organizationId, phone, name: sms.name, consentSource: "manual",
    }).onConflictDoNothing({ target: [contact.organizationId, contact.phone] }).returning();

    const record = existing ?? created ?? (await tx.select().from(contact)
      .where(scoped(contact.organizationId, organizationId, eq(contact.phone, phone))).limit(1))[0];
    if (!record) throw new SmsError("not_found", "Ficha del contacto no disponible.", 404);
    await tx.update(smsContact).set({ crmContactId: record.id })
      .where(scoped(smsContact.organizationId, organizationId, eq(smsContact.id, sms.id)));
    return { contact: record, created: !!created };
  });
  if (result.created) {
    await ensureLeadActivity(organizationId, result.contact.id, new Date(), { notifyByEmail: false });
  }
  return result.contact;
}
