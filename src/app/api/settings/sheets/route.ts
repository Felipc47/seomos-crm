import { apiError, parseBody, withAuth } from "@/lib/api";
import { isOrgAdmin } from "@/lib/permissions";
import { sheetsInput, SheetsError } from "@/lib/sheets-contacts";
import { createSource, listSources } from "@/server/sheets/service";
export const dynamic = "force-dynamic";
export const GET = withAuth(async session => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona las integraciones.");
  return Response.json({ sources: await listSources(session.organizationId) });
});
export const POST = withAuth(async (session, req: Request) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona las integraciones.");
  const body = await parseBody(req, sheetsInput); if (!body.ok) return body.response;
  try { return Response.json({ source: await createSource(session.organizationId, { ...body.data, intervalMinutes: body.data.intervalMinutes ?? 5 }) }, { status: 201 }); }
  catch (err) { return apiError(422, "sheets_error", err instanceof SheetsError ? err.message : "No se pudo conectar la hoja."); }
});
