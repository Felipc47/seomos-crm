import { z } from "zod";
import { withAuth, apiError, parseBody } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { smsConnectionSnapshot, saveSmsConnection, disconnectSms } from "@/server/sms/connections";
import { smsApiError } from "@/server/sms/errors";
export const dynamic = "force-dynamic";
const input = z.object({ apiKey: z.string().trim().min(20).max(500).regex(/^[A-Za-z0-9_-]+$/) }).strict();
export const GET = withAuth(async session => {
  if (!canManageOrgSettings(session.role)) return apiError(403, "forbidden", "Solo el administrador puede gestionar SMS.");
  try { return Response.json({ connection: await smsConnectionSnapshot(session.organizationId) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return smsApiError(error); }
});
export const PUT = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) return apiError(403, "forbidden", "Solo el administrador puede conectar Brevo.");
  const body = await parseBody(req, input);
  if (!body.ok) return body.response;
  try { return Response.json({ connection: await saveSmsConnection(session.organizationId, body.data.apiKey) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return smsApiError(error); }
});
export const DELETE = withAuth(async session => {
  if (!canManageOrgSettings(session.role)) return apiError(403, "forbidden", "Solo el administrador puede desconectar Brevo.");
  try { await disconnectSms(session.organizationId); return Response.json({ ok: true }); }
  catch (error) { return smsApiError(error); }
});
