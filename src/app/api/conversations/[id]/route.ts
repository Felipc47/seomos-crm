import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { publish } from "@/server/events/bus";
import { serializeConversation, getConversation, updateConversation } from "@/server/inbox/queries";
import {
  queuePendingAgentTurn,
  type PendingAgentTurnResult,
} from "@/server/ai/pending-turn";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  aiEnabled: z.boolean().optional(),
  reactivate: z.boolean().optional(),
  markRead: z.boolean().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const updated = await updateConversation(session.organizationId, id, body.data);
  if (!updated.ok) {
    if (updated.error === "pin_limit") {
      return apiError(422, "pin_limit", "Solo puedes anclar hasta 3 chats");
    }
    return apiError(404, "not_found", "Conversación no encontrada");
  }

  // Encender o reactivar también recupera el último entrante pendiente. La
  // llamada solo agenda: el LLM y el envío ocurren fuera de esta respuesta.
  let agentTurn: PendingAgentTurnResult | null = null;
  if (body.data.reactivate || body.data.aiEnabled === true) {
    agentTurn = await queuePendingAgentTurn(session.organizationId, id);
  }

  const row = await getConversation(session.organizationId, id);
  if (row) {
    const dto = serializeConversation(
      row.conversation,
      row.contact,
      null,
      row.stageName,
      {
        service:
          row.serviceId && row.serviceName
            ? { id: row.serviceId, name: row.serviceName }
            : null,
        assignee:
          row.assigneeMemberId && row.assigneeName
            ? { memberId: row.assigneeMemberId, name: row.assigneeName }
            : null,
      }
    );
    publish(session.organizationId, {
      type: "conversation.updated",
      data: { conversation: dto },
    });
    return Response.json({ conversation: dto, agentTurn });
  }
  return Response.json({ conversation: null, agentTurn });
});
