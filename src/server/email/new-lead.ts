import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { scoped } from "@/lib/db/tenant";
import { deliverEmail, type EmailDeliveryResult } from "./delivery";

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailShell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#17251d"><div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #dce7df;border-radius:14px;overflow:hidden"><div style="padding:20px 24px;background:#102018;color:#fff"><strong style="color:#25D366">Seomos CRM</strong><h1 style="font-size:22px;margin:8px 0 0">${title}</h1></div><div style="padding:24px">${body}</div></div></body></html>`;
}

export function buildNewLeadEmail(input: {
  organizationName: string;
  contactName: string;
  serviceName: string | null;
  stageName: string;
  href: string;
}): { subject: string; html: string; text: string } {
  const contact = input.contactName || "Prospecto sin nombre";
  const context = [input.serviceName, input.stageName].filter(Boolean).join(" · ");
  const safeContact = escapeEmailHtml(contact);
  const safeOrg = escapeEmailHtml(input.organizationName);
  const safeContext = escapeEmailHtml(context);
  const safeHref = escapeEmailHtml(input.href);
  return {
    subject: `Nuevo prospecto: ${contact}`,
    html: emailShell(
      `Nuevo prospecto en ${safeOrg}`,
      `<p style="font-size:18px;margin-top:0"><strong>${safeContact}</strong></p><p style="color:#52645a">${safeContext}</p><a href="${safeHref}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:8px;background:#25D366;color:#082d18;text-decoration:none;font-weight:700">Abrir prospecto</a>`
    ),
    text: `Nuevo prospecto en ${input.organizationName}\n${contact}\n${context}\n\nAbrir: ${input.href}`,
  };
}

/** Recalcula destinatarios vigentes; llamarla tras creación o asignación es
 * seguro porque la clave lead/usuario deduplica administradores y responsable. */
export async function notifyNewLeadByEmail(input: {
  organizationId: string;
  leadId: string;
}): Promise<EmailDeliveryResult[]> {
  const db = getDb();
  const contextRows = await db
    .select({
      contactId: schema.contact.id,
      contactName: schema.contact.name,
      stageName: schema.pipelineStage.name,
      serviceName: schema.service.name,
      assigneeUserId: schema.member.userId,
      organizationName: schema.organization.name,
    })
    .from(schema.lead)
    .innerJoin(
      schema.contact,
      and(
        eq(schema.contact.id, schema.lead.contactId),
        eq(schema.contact.organizationId, input.organizationId)
      )
    )
    .innerJoin(
      schema.pipelineStage,
      and(
        eq(schema.pipelineStage.id, schema.lead.stageId),
        eq(schema.pipelineStage.organizationId, input.organizationId)
      )
    )
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, input.organizationId)
    )
    .leftJoin(
      schema.service,
      and(
        eq(schema.service.id, schema.lead.serviceId),
        eq(schema.service.organizationId, input.organizationId)
      )
    )
    .leftJoin(
      schema.member,
      and(
        eq(schema.member.id, schema.lead.assignedMemberId),
        eq(schema.member.organizationId, input.organizationId)
      )
    )
    .where(
      scoped(
        schema.lead.organizationId,
        input.organizationId,
        eq(schema.lead.id, input.leadId)
      )
    )
    .limit(1);
  const context = contextRows[0];
  if (!context) return [];

  const owners = await db
    .select({ userId: schema.user.id, email: schema.user.email })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(
      scoped(
        schema.member.organizationId,
        input.organizationId,
        eq(schema.member.role, "owner")
      )
    );
  const recipients = new Map(owners.map((owner) => [owner.userId, owner.email]));
  if (context.assigneeUserId && !recipients.has(context.assigneeUserId)) {
    const assigned = await db
      .select({ email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, context.assigneeUserId))
      .limit(1);
    if (assigned[0]) recipients.set(context.assigneeUserId, assigned[0].email);
  }

  const href = `${getEnv().APP_BASE_URL.replace(/\/$/, "")}/inbox?contact=${encodeURIComponent(context.contactId)}`;
  const content = buildNewLeadEmail({
    organizationName: context.organizationName,
    contactName: context.contactName,
    serviceName: context.serviceName,
    stageName: context.stageName,
    href,
  });
  return Promise.all(
    [...recipients].map(([userId, email]) =>
      deliverEmail({
        organizationId: input.organizationId,
        recipientUserId: userId,
        kind: "new_lead",
        leadId: input.leadId,
        idempotencyKey: `new-lead/${input.organizationId}/${input.leadId}/${userId}`,
        to: email,
        ...content,
      })
    )
  );
}

export async function notifyNewLeadByEmailSafely(input: {
  organizationId: string;
  leadId: string;
}): Promise<void> {
  try {
    await notifyNewLeadByEmail(input);
  } catch {
    // El lead/asignación es el dato primario. Ni siquiera un fallo local de BD
    // en la capa secundaria de email debe revertirlo.
    console.error(
      `[email] no se pudo preparar aviso de nuevo lead en ${input.organizationId}`
    );
  }
}
