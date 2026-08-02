import { apiError, withAuth } from "@/lib/api";
import {
  InboxAssignmentError,
  listAssignmentOptions,
} from "@/server/inbox/assignment";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  try {
    return Response.json(
      await listAssignmentOptions(session.organizationId, session.userId)
    );
  } catch (error) {
    if (
      error instanceof InboxAssignmentError &&
      error.code === "membership_not_found"
    ) {
      return apiError(404, error.code, error.message);
    }
    throw error;
  }
});
