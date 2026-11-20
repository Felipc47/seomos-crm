import { smsCrmContactCondition } from "./crm-contact";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isEligibleServiceAssignee } from "@/server/services/assignment";
import { notifyUser } from "@/server/notifications";
import { notifyNewLeadByEmailSafely } from "@/server/email/new-lead";

/** Deriva el hilo SMS una sola vez. La asignación nunca reactiva la IA. */
export async function handoffSms(org: string, smsContactId: string, reason: string): Promise<void> {
  const db = getDb();
  const [sms] = await db.update(schema.smsContact)
    .set({ aiEnabled: false, handoffAt: new Date(), handoffReason: reason })
    .where(scoped(schema.smsContact.organizationId, org,
      eq(schema.smsContact.id, smsContactId), eq(schema.smsContact.aiEnabled, true), isNull(schema.smsContact.handoffAt)))
    .returning({ phone: schema.smsContact.phone, name: schema.smsContact.name, crmContactId: schema.smsContact.crmContactId });
  if (!sms) return;

  try {
    const [lead] = await db.select({
      id: schema.lead.id, assignedMemberId: schema.lead.assignedMemberId,
      serviceName: schema.service.name, serviceMemberId: schema.service.assignedMemberId,
      contactName: schema.contact.name,
    }).from(schema.lead)
      .innerJoin(schema.contact, and(eq(schema.contact.id, schema.lead.contactId), eq(schema.contact.organizationId, org)))
      .leftJoin(schema.service, and(eq(schema.service.id, schema.lead.serviceId), eq(schema.service.organizationId, org)))
      .where(and(eq(schema.lead.organizationId, org), smsCrmContactCondition(sms)))
      .limit(1);

    let memberId = lead?.assignedMemberId ?? null;
    if (!memberId && lead?.serviceMemberId) {
      const [candidate] = await db.select({ organizationId: schema.member.organizationId, role: schema.member.role })
        .from(schema.member).where(eq(schema.member.id, lead.serviceMemberId)).limit(1);
      if (candidate && isEligibleServiceAssignee(candidate, org)) {
        const [assigned] = await db.update(schema.lead)
          .set({ assignedMemberId: lead.serviceMemberId, updatedAt: new Date() })
          .where(and(eq(schema.lead.organizationId, org), eq(schema.lead.id, lead.id), isNull(schema.lead.assignedMemberId)))
          .returning({ assignedMemberId: schema.lead.assignedMemberId });
        memberId = assigned?.assignedMemberId ?? lead.serviceMemberId;
      }
    }
    const recipients = memberId
      ? await db.select({ userId: schema.member.userId }).from(schema.member)
          .where(and(eq(schema.member.organizationId, org), eq(schema.member.id, memberId)))
      : await db.select({ userId: schema.member.userId }).from(schema.member)
          .where(and(eq(schema.member.organizationId, org), inArray(schema.member.role, ["owner", "admin"])));
    await Promise.allSettled(recipients.map(recipient => notifyUser({
      userId: recipient.userId, organizationId: org, type: "lead_assigned",
      title: "SMS para atención humana", body: `${lead?.contactName ?? sms.name} · ${lead?.serviceName ?? "SMS"}`,
      href: `/inbox?channel=sms&sms=${encodeURIComponent(smsContactId)}`,
    })));
    if (lead && memberId) await notifyNewLeadByEmailSafely({ organizationId: org, leadId: lead.id });
  } catch (error) {
    console.error("[sms-handoff] no se pudo asignar o notificar:", error instanceof Error ? error.name : "unknown");
  }
}
