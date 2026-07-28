import { and, asc, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

/** Datos completos del kanban: etapas ordenadas + tarjetas con su contacto. */
export const GET = withAuth(async (session) => {
  const db = getDb();

  const stages = await db
    .select()
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, session.organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  const leads = await db
    .select({
      lead: schema.lead,
      contact: schema.contact,
      conversationId: schema.conversation.id,
      serviceId: schema.service.id,
      serviceName: schema.service.name,
      assigneeMemberId: schema.member.id,
      assigneeName: schema.user.name,
    })
    .from(schema.lead)
    .innerJoin(schema.contact, eq(schema.lead.contactId, schema.contact.id))
    .leftJoin(
      schema.conversation,
      and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.conversation.isTest, false)
      )
    )
    .leftJoin(
      schema.service,
      and(
        eq(schema.service.id, schema.lead.serviceId),
        eq(schema.service.organizationId, session.organizationId)
      )
    )
    .leftJoin(
      schema.member,
      and(
        eq(schema.member.id, schema.lead.assignedMemberId),
        eq(schema.member.organizationId, session.organizationId)
      )
    )
    .leftJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(scoped(schema.lead.organizationId, session.organizationId))
    .orderBy(asc(schema.lead.position));

  return Response.json({
    stages: stages.map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      kind: s.kind,
    })),
    leads: leads.map((r) => ({
      id: r.lead.id,
      stageId: r.lead.stageId,
      position: r.lead.position,
      lastActivityAt: r.lead.lastActivityAt?.toISOString() ?? null,
      followUpDueAt: r.lead.followUpDueAt?.toISOString() ?? null,
      followUpAttempts: r.lead.followUpAttempts,
      closureReason: r.lead.closureReason,
      closedAt: r.lead.closedAt?.toISOString() ?? null,
      contact: {
        id: r.contact.id,
        name: r.contact.name,
        phone: r.contact.phone,
      },
      conversationId: r.conversationId,
      service:
        r.serviceId && r.serviceName
          ? { id: r.serviceId, name: r.serviceName }
          : null,
      assignee:
        r.assigneeMemberId && r.assigneeName
          ? { memberId: r.assigneeMemberId, name: r.assigneeName }
          : null,
    })),
  });
});
