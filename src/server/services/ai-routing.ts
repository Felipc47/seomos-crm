import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { publish } from "@/server/events/bus";
import { notifyUser } from "@/server/notifications";
import {
  isEligibleServiceAssignee,
  type ServiceCatalogEntry,
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
 * Aplica una clasificación de servicio producida por IA.
 *
 * - Solo completa leads que todavía no tienen servicio.
 * - El servicio y el miembro se vuelven a resolver dentro del tenant.
 * - La asignación del miembro usa un UPDATE separado con `IS NULL`: una
 *   transferencia humana concurrente o previa siempre gana.
 * - La notificación es secundaria y jamás revierte la clasificación.
 */
export async function routeUnclassifiedLeadByService(input: {
  organizationId: string;
  contactId: string;
  conversationId: string;
  serviceId: string;
}): Promise<{ applied: boolean; assigned: boolean }> {
  const db = getDb();
  const services = await db
    .select({
      id: schema.service.id,
      name: schema.service.name,
      assignedMemberId: schema.service.assignedMemberId,
      memberOrganizationId: schema.member.organizationId,
      memberRole: schema.member.role,
      assignedUserId: schema.member.userId,
    })
    .from(schema.service)
    .leftJoin(
      schema.member,
      eq(schema.member.id, schema.service.assignedMemberId)
    )
    .where(
      and(
        eq(schema.service.organizationId, input.organizationId),
        eq(schema.service.id, input.serviceId)
      )
    )
    .limit(1);
  const service = services[0];
  if (!service) return { applied: false, assigned: false };

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

  let assigned = false;
  if (
    service.assignedMemberId &&
    isEligibleServiceAssignee(
      service.memberOrganizationId && service.memberRole
        ? {
            organizationId: service.memberOrganizationId,
            role: service.memberRole,
          }
        : null,
      input.organizationId
    )
  ) {
    const assignedRows = await db
      .update(schema.lead)
      .set({
        assignedMemberId: service.assignedMemberId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.lead.organizationId, input.organizationId),
          eq(schema.lead.id, lead.id),
          isNull(schema.lead.assignedMemberId)
        )
      )
      .returning({ id: schema.lead.id });
    assigned = Boolean(assignedRows[0]);
  }

  publish(input.organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: input.conversationId } },
  });

  if (assigned && service.assignedUserId) {
    try {
      const contacts = await db
        .select({ name: schema.contact.name })
        .from(schema.contact)
        .where(
          and(
            eq(schema.contact.organizationId, input.organizationId),
            eq(schema.contact.id, input.contactId)
          )
        )
        .limit(1);
      await notifyUser({
        userId: service.assignedUserId,
        organizationId: input.organizationId,
        type: "lead_assigned",
        title: "Nuevo prospecto asignado",
        body: `${contacts[0]?.name ?? "Prospecto"} · ${service.name}`,
        href: `/inbox?contact=${input.contactId}`,
      });
    } catch (err) {
      console.error(
        `[servicio-ia] no se pudo notificar la asignación del contacto ${input.contactId}:`,
        err
      );
    }
  }

  return { applied: true, assigned };
}
