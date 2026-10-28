import { withAuth, apiError, parseBody } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { smsSendInput } from "@/lib/sms";
import { sendSms } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";
export const dynamic = "force-dynamic";
export const POST = withAuth(async (session, req: Request) => {
  if (!canManageMailing(session.role)) return apiError(403,"forbidden","Sin permiso para esta operación SMS.");
  const body = await parseBody(req,smsSendInput); if (!body.ok) return body.response;
  try { return Response.json({ message: await sendSms(session.organizationId,body.data) }); }
  catch (e) { return smsApiError(e); }
});
