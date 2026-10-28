import { withAuth, apiError } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { smsSnapshot } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";
export const dynamic = "force-dynamic";
export const GET = withAuth(async (session, req: Request) => {
  if (!canManageMailing(session.role)) return apiError(403,"forbidden","Sin permiso para operar SMS.");
  const id = new URL(req.url).searchParams.get("contactId") ?? undefined;
  if (id && id.length > 100) return apiError(422,"invalid_contact","Contacto inválido.");
  try { return Response.json(await smsSnapshot(session.organizationId,id),{ headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return smsApiError(e); }
});
