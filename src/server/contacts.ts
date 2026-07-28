import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { parseStoredProfile } from "@/server/ai/lead-profile";

export function serializeContact(c: typeof schema.contact.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    aiProfile: parseStoredProfile(c.aiProfile),
    aiProfileAt: c.aiProfileAt?.toISOString() ?? null,
    archivedAt: c.archivedAt?.toISOString() ?? null,
    // Cumplimiento de la política de Meta (006).
    optedOutAt: c.optedOutAt?.toISOString() ?? null,
    optedOutReason: c.optedOutReason,
    consentSource: c.consentSource,
    consentGrantedAt: c.consentGrantedAt?.toISOString() ?? null,
  };
}

export async function getContactById(
  organizationId: string,
  contactId: string
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.contact)
    .where(
      scoped(
        schema.contact.organizationId,
        organizationId,
        eq(schema.contact.id, contactId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Etapa actual del lead del contacto (si existe). */
export async function getContactStage(
  organizationId: string,
  contactId: string
) {
  const db = getDb();
  const rows = await db
    .select({
      stage: schema.pipelineStage,
      lead: schema.lead,
      service: {
        id: schema.service.id,
        name: schema.service.name,
      },
      assignee: {
        memberId: schema.member.id,
        name: schema.user.name,
      },
    })
    .from(schema.lead)
    .innerJoin(
      schema.pipelineStage,
      eq(schema.lead.stageId, schema.pipelineStage.id)
    )
    .leftJoin(
      schema.service,
      and(
        eq(schema.service.id, schema.lead.serviceId),
        eq(schema.service.organizationId, organizationId)
      )
    )
    .leftJoin(
      schema.member,
      and(
        eq(schema.member.id, schema.lead.assignedMemberId),
        eq(schema.member.organizationId, organizationId)
      )
    )
    .leftJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(
      scoped(
        schema.lead.organizationId,
        organizationId,
        eq(schema.lead.contactId, contactId)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    service:
      row.service?.id && row.service.name
        ? { id: row.service.id, name: row.service.name }
        : null,
    assignee:
      row.assignee?.memberId && row.assignee.name
        ? {
            memberId: row.assignee.memberId,
            name: row.assignee.name,
          }
        : null,
  };
}
