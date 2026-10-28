import { withAuth, apiError, parseBody } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { smsSenderInput } from "@/lib/sms";
import { configureSmsSender } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";
export const dynamic = "force-dynamic";
export const POST = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) return apiError(403,"forbidden","Sin permiso para esta operación SMS.");
  const body = await parseBody(req,smsSenderInput); if (!body.ok) return body.response;
  try { return Response.json({ connection: await configureSmsSender(session.organizationId,body.data) }); }
  catch (e) { return smsApiError(e); }
});
