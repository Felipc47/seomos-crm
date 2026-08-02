import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  InboxAssignmentError,
  transferAssigneeSchema,
  transferConversationAssignee,
} from "@/server/inbox/assignment";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const body = await parseBody(req, transferAssigneeSchema);
  if (!body.ok) return body.response;
  const { id } = await ctx.params;

  try {
    return Response.json(
      await transferConversationAssignee({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        conversationId: id,
        memberId: body.data.memberId,
      })
    );
  } catch (error) {
    if (error instanceof InboxAssignmentError) {
      if (error.code === "not_found") {
        return apiError(404, error.code, error.message);
      }
      if (
        error.code === "invalid_assignee" ||
        error.code === "assignment_unavailable"
      ) {
        return apiError(422, error.code, error.message);
      }
    }
    throw error;
  }
});
