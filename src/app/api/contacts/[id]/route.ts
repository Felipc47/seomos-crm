import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isNegativeStage, isReasonForStage } from "@/lib/lead-closure";
import {
  getContactById,
  getContactStage,
  serializeContact,
} from "@/server/contacts";
import { publish } from "@/server/events/bus";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const contact = await getContactById(session.organizationId, id);
  if (!contact) return apiError(404, "not_found", "Contacto no encontrado");
  const stageRow = await getContactStage(session.organizationId, id);
  return Response.json({
    contact: serializeContact(contact),
    stage: stageRow
      ? {
          id: stageRow.stage.id,
          name: stageRow.stage.name,
          position: stageRow.stage.position,
          kind: stageRow.stage.kind,
        }
      : null,
    lead: stageRow
      ? {
          id: stageRow.lead.id,
          followUpDueAt: stageRow.lead.followUpDueAt?.toISOString() ?? null,
          followUpAttempts: stageRow.lead.followUpAttempts,
          closureReason: stageRow.lead.closureReason,
          closedAt: stageRow.lead.closedAt?.toISOString() ?? null,
          service: stageRow.service,
          assignee: stageRow.assignee,
        }
      : null,
  });
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(
      /^\d{7,15}$/,
      "Teléfono en dígitos, con código de país (ej. 573001234567)"
    )
    .optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  /** Edición unificada del prospecto (011). Si llega, contacto y lead se
   * guardan en una única transacción. */
  stageId: z.string().min(1).optional(),
  closureReason: z.string().max(60).nullable().optional(),
  archived: z.boolean().optional(),
  /** Baja del contacto (006). Se puede QUITAR a mano (false) cuando el
   * cliente vuelve a dar permiso, y marcar a mano si lo pidió por otra vía. */
  optedOut: z.boolean().optional(),
  /** Consentimiento confirmado por el operador para mensajes de marketing. */
  consentGranted: z.boolean().optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const current = await getContactById(session.organizationId, id);
  if (!current) return apiError(404, "not_found", "Contacto no encontrado");

  const db = getDb();
  const stageRow = await getContactStage(session.organizationId, id);
  let targetStage = stageRow?.stage ?? null;

  if (body.data.phone !== undefined && body.data.phone !== current.phone) {
    const duplicate = await db
      .select({ id: schema.contact.id })
      .from(schema.contact)
      .where(
        scoped(
          schema.contact.organizationId,
          session.organizationId,
          eq(schema.contact.phone, body.data.phone)
        )
      )
      .limit(1);
    if (duplicate[0]) {
      return apiError(
        409,
        "duplicate",
        "Ya existe un contacto con ese número de WhatsApp"
      );
    }
  }

  if (body.data.stageId !== undefined) {
    if (!stageRow) {
      return apiError(
        422,
        "lead_not_found",
        "Este contacto aún no tiene un prospecto asociado"
      );
    }
    const stages = await db
      .select()
      .from(schema.pipelineStage)
      .where(
        scoped(
          schema.pipelineStage.organizationId,
          session.organizationId,
          eq(schema.pipelineStage.id, body.data.stageId)
        )
      )
      .limit(1);
    if (!stages[0]) {
      return apiError(422, "invalid_stage", "Etapa inexistente");
    }
    targetStage = stages[0];

    const reason =
      body.data.closureReason ??
      (body.data.stageId === stageRow.lead.stageId
        ? stageRow.lead.closureReason
        : null);
    if (
      isNegativeStage(targetStage.kind) &&
      !isReasonForStage(targetStage.kind, reason)
    ) {
      return apiError(
        422,
        "closure_reason_required",
        `Selecciona un motivo válido para ${
          targetStage.kind === "lost" ? "No convertido" : "No calificado"
        }`
      );
    }
  }

  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };
  if (body.data.name !== undefined) set.name = body.data.name;
  if (body.data.phone !== undefined) set.phone = body.data.phone;
  if (body.data.email !== undefined) set.email = body.data.email;
  if (body.data.notes !== undefined) set.notes = body.data.notes;
  if (body.data.archived !== undefined) {
    set.archivedAt = body.data.archived ? new Date() : null;
  }
  if (body.data.optedOut !== undefined) {
    set.optedOutAt = body.data.optedOut ? new Date() : null;
    set.optedOutReason = body.data.optedOut
      ? "Marcada por el operador"
      : null;
  }
  if (body.data.consentGranted !== undefined) {
    set.consentGrantedAt = body.data.consentGranted ? new Date() : null;
  }

  let updatedContact = current;
  let updatedLead = stageRow?.lead ?? null;

  try {
    await db.transaction(async (tx) => {
      const contacts = await tx
        .update(schema.contact)
        .set(set)
        .where(
          scoped(
            schema.contact.organizationId,
            session.organizationId,
            eq(schema.contact.id, id)
          )
        )
        .returning();
      if (!contacts[0]) throw new ContactDisappearedError();
      updatedContact = contacts[0];

      if (
        body.data.stageId === undefined ||
        !stageRow ||
        !targetStage
      ) {
        return;
      }

      const stageChanged = body.data.stageId !== stageRow.lead.stageId;
      const nextReason = isNegativeStage(targetStage.kind)
        ? (body.data.closureReason ?? stageRow.lead.closureReason)
        : null;
      const reasonChanged = nextReason !== stageRow.lead.closureReason;
      if (!stageChanged && !reasonChanged) return;

      let position = stageRow.lead.position;
      if (stageChanged) {
        const tail = await tx
          .select({ position: schema.lead.position })
          .from(schema.lead)
          .where(
            scoped(
              schema.lead.organizationId,
              session.organizationId,
              eq(schema.lead.stageId, targetStage.id)
            )
          )
          .orderBy(desc(schema.lead.position))
          .limit(1);
        position = (tail[0]?.position ?? -1) + 1;
      }

      const terminal =
        targetStage.kind === "won" ||
        targetStage.kind === "lost" ||
        targetStage.kind === "unqualified";
      const leads = await tx
        .update(schema.lead)
        .set({
          stageId: targetStage.id,
          position,
          closureReason: nextReason,
          closedAt: stageChanged
            ? terminal
              ? now
              : null
            : stageRow.lead.closedAt,
          // Solo un movimiento manual cancela la rutina de seguimiento.
          followUpDueAt: stageChanged
            ? null
            : stageRow.lead.followUpDueAt,
          followUpAttempts: stageChanged
            ? 0
            : stageRow.lead.followUpAttempts,
          updatedAt: now,
        })
        .where(
          scoped(
            schema.lead.organizationId,
            session.organizationId,
            eq(schema.lead.id, stageRow.lead.id)
          )
        )
        .returning();
      if (!leads[0]) throw new ContactDisappearedError();
      updatedLead = leads[0];
    });
  } catch (error) {
    if (error instanceof ContactDisappearedError) {
      return apiError(404, "not_found", "Contacto no encontrado");
    }
    if (isUniqueViolation(error)) {
      return apiError(
        409,
        "duplicate",
        "Ya existe un contacto con ese número de WhatsApp"
      );
    }
    throw error;
  }

  const conversation = await db
    .select({ id: schema.conversation.id })
    .from(schema.conversation)
    .where(
      and(
        eq(schema.conversation.organizationId, session.organizationId),
        eq(schema.conversation.contactId, id),
        eq(schema.conversation.isTest, false)
      )
    )
    .limit(1);
  if (conversation[0]) {
    publish(session.organizationId, {
      type: "conversation.updated",
      data: { conversation: { id: conversation[0].id } },
    });
  }

  return Response.json({
    contact: serializeContact(updatedContact),
    stage: targetStage
      ? {
          id: targetStage.id,
          name: targetStage.name,
          position: targetStage.position,
          kind: targetStage.kind,
        }
      : null,
    lead: updatedLead
      ? {
          id: updatedLead.id,
          followUpDueAt: updatedLead.followUpDueAt?.toISOString() ?? null,
          followUpAttempts: updatedLead.followUpAttempts,
          closureReason: updatedLead.closureReason,
          closedAt: updatedLead.closedAt?.toISOString() ?? null,
          service: stageRow?.service ?? null,
          assignee: stageRow?.assignee ?? null,
        }
      : null,
  });
});

class ContactDisappearedError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    cause?: { code?: string };
  };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

/**
 * Borrado permanente: elimina el contacto y, por cascada de BD, su lead del
 * pipeline, su conversación y todos los mensajes. Irreversible.
 */
export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const db = getDb();
  const deleted = await db
    .delete(schema.contact)
    .where(
      scoped(
        schema.contact.organizationId,
        session.organizationId,
        eq(schema.contact.id, id)
      )
    )
    .returning({ id: schema.contact.id });
  if (!deleted[0]) return apiError(404, "not_found", "Contacto no encontrado");
  return Response.json({ ok: true });
});
