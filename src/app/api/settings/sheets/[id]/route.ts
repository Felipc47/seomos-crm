import { apiError, parseBody, withAuth } from "@/lib/api";
import { isOrgAdmin } from "@/lib/permissions";
import { sheetsPatch, SheetsError } from "@/lib/sheets-contacts";
import { updateSource } from "@/server/sheets/service";
export const dynamic = "force-dynamic";
export const PATCH = withAuth(async (session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona las integraciones.");
  const body = await parseBody(req, sheetsPatch); if (!body.ok) return body.response;
  try {
  const source = await updateSource(session.organizationId, (await ctx.params).id, body.data);
  return source ? Response.json({ source }) : apiError(404, "not_found", "Conexión no encontrada.");
  } catch (error) { return apiError(422, "sheets_error", error instanceof SheetsError ? error.message : "No se pudo guardar la configuración."); }
});
