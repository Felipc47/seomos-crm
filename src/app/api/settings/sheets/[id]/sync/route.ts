import { apiError, withAuth } from "@/lib/api";
import { isOrgAdmin } from "@/lib/permissions";
import { getSource, syncSource } from "@/server/sheets/service";
export const dynamic = "force-dynamic";
export const POST = withAuth(async (session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona las integraciones.");
  const id = (await ctx.params).id;
  if (!await getSource(session.organizationId, id)) return apiError(404, "not_found", "Conexión no encontrada.");
  const result = await syncSource(session.organizationId, id, true);
  if (!result.started) return apiError(409, "busy", "Esta hoja ya se está sincronizando. Espera a que termine.");
  if (result.error) return apiError(422, "sheets_error", result.error);
  return Response.json(result);
});
