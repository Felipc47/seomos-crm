import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  bulkConversationActionSchema,
  deleteConversations,
  ModerationError,
  reportConversations,
  setConversationsBlocked,
} from "@/server/inbox/moderation";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, bulkConversationActionSchema);
  if (!body.ok) return body.response;

  try {
    switch (body.data.action) {
      case "delete": {
        const result = await deleteConversations(
          session.organizationId,
          body.data.conversationIds
        );
        return Response.json({ ok: true, affected: result.affected });
      }
      case "block":
      case "unblock": {
        const result = await setConversationsBlocked({
          organizationId: session.organizationId,
          userId: session.userId,
          conversationIds: body.data.conversationIds,
          blocked: body.data.action === "block",
        });
        return Response.json({ ok: true, ...result });
      }
      case "report": {
        const result = await reportConversations({
          organizationId: session.organizationId,
          userId: session.userId,
          conversationIds: body.data.conversationIds,
          reason: body.data.reason,
          notes: body.data.notes,
        });
        return Response.json({
          ok: true,
          affected: result.affected,
          scope: "internal",
        });
      }
    }
  } catch (error) {
    if (error instanceof ModerationError) {
      const status =
        error.code === "not_found"
          ? 404
          : error.code === "meta_unavailable"
            ? 502
            : 422;
      return apiError(status, error.code, error.message);
    }
    throw error;
  }
});
