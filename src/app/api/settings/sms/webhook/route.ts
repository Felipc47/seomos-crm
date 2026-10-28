import { withAuth, apiError } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { setupSmsWebhook } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";
export const POST = withAuth(async s => {
  if (!canManageOrgSettings(s.role)) return apiError(403,"forbidden","Solo el administrador puede configurar Brevo.");
  try { return Response.json({ connection: await setupSmsWebhook(s.organizationId) }); }
  catch (e) { return smsApiError(e); }
});
