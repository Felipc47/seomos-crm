import { and, asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { notifyNewLeadByEmailSafely } from "@/server/email/new-lead";

/**
 * Actividad de lead al recibir un mensaje (US2): si el contacto no tiene lead,
 * se crea en la primera etapa del pipeline; si lo tiene, se actualiza su
 * última actividad.
 */
export async function onLeadActivity(
  organizationId: string,
  contactId: string,
  at: Date
): Promise<string | null> {
  return (
    await ensureLeadActivity(organizationId, contactId, at, {
      notifyByEmail: true,
    })
  ).leadId;
}

export async function ensureLeadActivity(
  organizationId: string,
  contactId: string,
  at: Date,
  options: { notifyByEmail: boolean }
): Promise<{ leadId: string | null; created: boolean }> {
  const db = getDb();

  const existing = await db
    .select({ id: schema.lead.id })
    .from(schema.lead)
    .where(
      and(
        eq(schema.lead.organizationId, organizationId),
        eq(schema.lead.contactId, contactId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.lead)
      .set({ lastActivityAt: at, updatedAt: new Date() })
      .where(
        and(
          eq(schema.lead.organizationId, organizationId),
          eq(schema.lead.id, existing[0].id)
        )
      );
    return { leadId: existing[0].id, created: false };
  }

  const firstStage = await db
    .select({ id: schema.pipelineStage.id })
    .from(schema.pipelineStage)
    .where(
      and(
        eq(schema.pipelineStage.organizationId, organizationId),
        eq(schema.pipelineStage.kind, "open")
      )
    )
    .orderBy(asc(schema.pipelineStage.position))
    .limit(1);
  if (!firstStage[0]) return { leadId: null, created: false };

  const maxPos = await db
    .select({ max: sql<number>`coalesce(max(${schema.lead.position}), -1)` })
    .from(schema.lead)
    .where(
      and(
        eq(schema.lead.organizationId, organizationId),
        eq(schema.lead.stageId, firstStage[0].id)
      )
    );

  const inserted = await db
    .insert(schema.lead)
    .values({
      id: newId("lead"),
      organizationId,
      contactId,
      stageId: firstStage[0].id,
      position: (maxPos[0]?.max ?? -1) + 1,
      lastActivityAt: at,
    })
    .onConflictDoNothing({ target: [schema.lead.contactId] })
    .returning({ id: schema.lead.id });
  if (inserted[0]) {
    if (options.notifyByEmail) {
      await notifyNewLeadByEmailSafely({
        organizationId,
        leadId: inserted[0].id,
      });
    }
    return { leadId: inserted[0].id, created: true };
  }

  // Otra ingesta pudo crear el lead entre la lectura y el INSERT.
  const concurrent = await db
    .select({ id: schema.lead.id })
    .from(schema.lead)
    .where(
      and(
        eq(schema.lead.organizationId, organizationId),
        eq(schema.lead.contactId, contactId)
      )
    )
    .limit(1);
  return { leadId: concurrent[0]?.id ?? null, created: false };
}
