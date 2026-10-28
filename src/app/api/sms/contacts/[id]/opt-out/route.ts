import { withAuth, apiError } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { optOutSms } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";
export const POST = withAuth(async (s, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!canManageMailing(s.role)) return apiError(403,"forbidden","Sin permiso para esta operación SMS.");
  try { return Response.json({ contact: await optOutSms(s.organizationId,(await ctx.params).id) }); }
  catch (e) { return smsApiError(e); }
});
