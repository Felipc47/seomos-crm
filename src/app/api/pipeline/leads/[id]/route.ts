import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isNegativeStage, isReasonForStage } from "@/lib/lead-closure";
import { publish } from "@/server/events/bus";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  stageId: z.string().min(1),
  position: z.number().int().min(0),
  closureReason: z.string().max(60).nullable().optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const stage = await db
    .select({
      id: schema.pipelineStage.id,
      kind: schema.pipelineStage.kind,
    })
    .from(schema.pipelineStage)
    .where(
      scoped(
        schema.pipelineStage.organizationId,
        session.organizationId,
        eq(schema.pipelineStage.id, body.data.stageId)
      )
    )
    .limit(1);
  if (!stage[0]) return apiError(422, "invalid_stage", "Etapa inexistente");
  if (
    isNegativeStage(stage[0].kind) &&
    !isReasonForStage(stage[0].kind, body.data.closureReason)
  ) {
    return apiError(
      422,
      "closure_reason_required",
      `Selecciona un motivo válido para ${stage[0].kind === "lost" ? "No convertido" : "No calificado"}`
    );
  }

  const now = new Date();
  const terminal =
    stage[0].kind === "won" ||
    stage[0].kind === "lost" ||
    stage[0].kind === "unqualified";

  const updated = await db
    .update(schema.lead)
    .set({
      stageId: body.data.stageId,
      position: body.data.position,
      closureReason: isNegativeStage(stage[0].kind)
        ? body.data.closureReason
        : null,
      closedAt: terminal ? now : null,
      // Cualquier movimiento manual expresa una decisión del operador y
      // cancela una rutina pendiente.
      followUpDueAt: null,
      followUpAttempts: 0,
      updatedAt: now,
    })
    .where(
      scoped(
        schema.lead.organizationId,
        session.organizationId,
        eq(schema.lead.id, id)
      )
    )
    .returning();
  if (!updated[0]) return apiError(404, "not_found", "Lead no encontrado");

  // Notifica a la bandeja para que la etapa se refleje en vivo (panel de
  // detalles y punto de etapa de la lista) sin recargar.
  const convRows = await db
    .select({ id: schema.conversation.id })
    .from(schema.conversation)
    .where(
      and(
        eq(schema.conversation.organizationId, session.organizationId),
        eq(schema.conversation.contactId, updated[0].contactId),
        eq(schema.conversation.isTest, false)
      )
    )
    .limit(1);
  if (convRows[0]) {
    publish(session.organizationId, {
      type: "conversation.updated",
      data: { conversation: { id: convRows[0].id } },
    });
  }

  return Response.json({ lead: updated[0] });
});
