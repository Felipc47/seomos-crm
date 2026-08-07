import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { publish } from "@/server/events/bus";
import { notifyUser } from "@/server/notifications";
import {
  hasExplicitServiceIntent,
  isEligibleServiceAssignee,
  type ServiceCatalogEntry,
  type ServiceIntentHistoryMessage,
} from "@/server/services/assignment";

export type ServiceRoutingOption = ServiceCatalogEntry;

/** Catálogo mínimo que puede ver la IA; siempre acotado a la organización. */
export async function listServiceRoutingOptions(
  organizationId: string
): Promise<ServiceRoutingOption[]> {
  const db = getDb();
  return db
    .select({ id: schema.service.id, name: schema.service.name })
    .from(schema.service)
    .where(eq(schema.service.organizationId, organizationId));
}

/**
 * Asigna el comercial del servicio del lead cuando la conversación real ya
 * está DERIVADA a atención humana. Es la única puerta de asignación
 * automática: mientras la IA atiende sola, el lead queda sin responsable.
 *
 * - Solo actúa con handoff activo en la conversación real (nunca sandbox).
 * - Solo completa leads sin responsable: una transferencia humana previa o
 *   concurrente siempre gana (UPDATE con `IS NULL`).
 * - El miembro se re-valida dentro del tenant antes de asignar.
 * - La notificación es secundaria y jamás revierte la asignación.
 */
export async function assignLeadOnHumanHandoff(input: {
  organizationId: string;
  contactId: string;
}): Promise<{ assigned: boolean }> {
  const db = getDb();
  const rows = await db
    .select({
      leadId: schema.lead.id,
      serviceName: schema.service.name,
      serviceMemberId: schema.service.assignedMemberId,
      memberOrganizationId: schema.member.organizationId,
      memberRole: schema.member.role,
      assignedUserId: schema.member.userId,
      contactName: schema.contact.name,
      conversationId: schema.conversation.id,
    })
    .from(schema.lead)
    .innerJoin(
      schema.service,
      and(
        eq(schema.service.id, schema.lead.serviceId),
        eq(schema.service.organizationId, input.organizationId)
      )
    )
    .innerJoin(
      schema.member,
      eq(schema.member.id, schema.service.assignedMemberId)
    )
    .innerJoin(schema.contact, eq(schema.contact.id, schema.lead.contactId))
    .innerJoin(
      schema.conversation,
      and(
        eq(schema.conversation.organizationId, input.organizationId),
        eq(schema.conversation.contactId, schema.lead.contactId),
        eq(schema.conversation.isTest, false)
      )
    )
    .where(
      and(
        eq(schema.lead.organizationId, input.organizationId),
        eq(schema.lead.contactId, input.contactId),
        isNull(schema.lead.assignedMemberId),
        isNotNull(schema.conversation.handoffAt)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row || !row.serviceMemberId) return { assigned: false };
  if (
    !isEligibleServiceAssignee(
      { organizationId: row.memberOrganizationId, role: row.memberRole },
      input.organizationId
    )
  ) {
    return { assigned: false };
  }

  const updated = await db
    .update(schema.lead)
    .set({ assignedMemberId: row.serviceMemberId, updatedAt: new Date() })
    .where(
      and(
        eq(schema.lead.organizationId, input.organizationId),
        eq(schema.lead.id, row.leadId),
        isNull(schema.lead.assignedMemberId)
      )
    )
    .returning({ id: schema.lead.id });
  if (!updated[0]) return { assigned: false };

  publish(input.organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: row.conversationId } },
  });

  try {
    await notifyUser({
      userId: row.assignedUserId,
      organizationId: input.organizationId,
      type: "lead_assigned",
      title: "Nuevo prospecto asignado",
      body: `${row.contactName} · ${row.serviceName}`,
      href: `/inbox?contact=${input.contactId}`,
    });
  } catch (err) {
    console.error(
      `[asignación] no se pudo notificar la derivación del contacto ${input.contactId}:`,
      err
    );
  }

  return { assigned: true };
}

/**
 * Aplica una clasificación de servicio producida por IA.
 *
 * - Solo completa leads que todavía no tienen servicio.
 * - El servicio se vuelve a resolver dentro del tenant.
 * - NO asigna comercial: la asignación ocurre únicamente al derivar la
 *   conversación a atención humana (assignLeadOnHumanHandoff). Si la
 *   conversación YA estaba derivada cuando llega la clasificación, la
 *   asignación se completa aquí mismo para mantener el invariante.
 */
export async function routeUnclassifiedLeadByService(input: {
  organizationId: string;
  contactId: string;
  conversationId: string;
  serviceId: string;
  serviceEvidence: string | null | undefined;
  history: readonly ServiceIntentHistoryMessage[];
  allowUnquotedVisualEvidence?: boolean;
}): Promise<{ applied: boolean; assigned: boolean }> {
  const db = getDb();
  const services = await db
    .select({
      id: schema.service.id,
      name: schema.service.name,
    })
    .from(schema.service)
    .where(
      and(
        eq(schema.service.organizationId, input.organizationId),
        eq(schema.service.id, input.serviceId)
      )
    )
    .limit(1);
  const service = services[0];
  if (!service) return { applied: false, assigned: false };
  if (
    !hasExplicitServiceIntent({
      evidence: input.serviceEvidence,
      service,
      history: input.history,
      allowUnquotedVisualEvidence: input.allowUnquotedVisualEvidence,
    })
  ) {
    return { applied: false, assigned: false };
  }

  const classified = await db
    .update(schema.lead)
    .set({ serviceId: service.id, updatedAt: new Date() })
    .where(
      and(
        eq(schema.lead.organizationId, input.organizationId),
        eq(schema.lead.contactId, input.contactId),
        isNull(schema.lead.serviceId)
      )
    )
    .returning({ id: schema.lead.id });
  const lead = classified[0];
  if (!lead) return { applied: false, assigned: false };

  // Conversación ya derivada y sin responsable: la clasificación tardía
  // completa la asignación pendiente. Sin handoff, no asigna nada.
  const { assigned } = await assignLeadOnHumanHandoff({
    organizationId: input.organizationId,
    contactId: input.contactId,
  });

  publish(input.organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: input.conversationId } },
  });

  return { applied: true, assigned };
}
