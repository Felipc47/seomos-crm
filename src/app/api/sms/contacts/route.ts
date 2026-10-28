import { withAuth, apiError, parseBody } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { smsContactInput } from "@/lib/sms";
import { createSmsContact } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";
export const dynamic = "force-dynamic";
export const POST = withAuth(async (session, req: Request) => {
  if (!canManageMailing(session.role)) return apiError(403,"forbidden","Sin permiso para esta operación SMS.");
  const body = await parseBody(req,smsContactInput); if (!body.ok) return body.response;
  try { return Response.json({ contact: await createSmsContact(session.organizationId,body.data) }); }
  catch (e) { return smsApiError(e); }
});
