import { withAuth, apiError } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { refreshSmsConnection } from "@/server/sms/connections";
import { smsApiError } from "@/server/sms/errors";
export const dynamic = "force-dynamic";
export const POST = withAuth(async session => {
  if (!canManageOrgSettings(session.role)) return apiError(403, "forbidden", "Solo el administrador puede verificar Brevo.");
  try {
    const connection = await refreshSmsConnection(session.organizationId);
    return connection ? Response.json({ connection }, { headers: { "Cache-Control": "no-store" } }) : apiError(409, "sms_disconnected", "No hay conexión de Brevo guardada.");
  } catch (error) { return smsApiError(error); }
});
