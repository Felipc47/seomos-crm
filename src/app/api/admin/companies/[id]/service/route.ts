import { isNull, sql } from "drizzle-orm";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { SERVICE_NOTICES, serviceChangeSchema } from "@/lib/company-service";

export const dynamic = "force-dynamic";

/** Control de instancia: el actor superadmin puede administrar otros tenants. */
export const PATCH = withAuth(async (session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!session.isSuperadmin) return apiError(403, "forbidden", "Solo el superadmin administra el servicio de las empresas");
  const { id } = await ctx.params;
  const body = await parseBody(req, serviceChangeSchema);
  if (!body.ok) return body.response;
  const change = body.data;
  if (!change.enabled && id === session.organizationId) {
    return apiError(403, "own_organization", "Mantén activa tu propia organización para conservar el control del servicio");
  }
  const rows = await getDb().update(schema.organization).set(change.enabled ? {
    suspendedAt: null, suspensionReason: null, suspensionMessage: null,
  } : {
    suspendedAt: sql`coalesce(${schema.organization.suspendedAt}, now())`, suspensionReason: change.reason,
    suspensionMessage: change.message ?? SERVICE_NOTICES[change.reason].message,
  }).where(scoped(schema.organization.id, id, isNull(schema.organization.deletedAt)))
    .returning({ suspendedAt: schema.organization.suspendedAt });
  if (!rows[0]) return apiError(404, "not_found", "Empresa no encontrada o eliminada");
  return Response.json({ ok: true, enabled: change.enabled });
});
