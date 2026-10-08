import { isNull } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, getSql, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";
const accessSchema = z.object({ enabled: z.boolean() }).strict();

export const PATCH = withAuth(async (session, req: Request, context: { params: Promise<{ id: string }> }) => {
  if (!session.isSuperadmin) return apiError(403, "forbidden", "Solo el superadmin habilita Mailing");
  const body = await parseBody(req, accessSchema);
  if (!body.ok) return body.response;
  const { id } = await context.params;
  // Serializar con el despachador y DNS: tras deshabilitar no queda un envío en curso.
  const connection = await getSql().reserve();
  const [lock] = await connection`select pg_try_advisory_lock(280028) as acquired`;
  if (!lock?.acquired) {
    connection.release();
    return apiError(409, "busy", "Hay un envío en curso. Intenta nuevamente en unos segundos.");
  }
  try {
    const [org] = await getDb().update(schema.organization)
      .set({ mailingEnabled: body.data.enabled })
      .where(scoped(schema.organization.id, id, isNull(schema.organization.deletedAt)))
      .returning({ id: schema.organization.id, mailingEnabled: schema.organization.mailingEnabled });
    if (!org) return apiError(404, "not_found", "Empresa no disponible");
    return Response.json({ company: org });
  } finally {
    await connection`select pg_advisory_unlock(280028)`;
    connection.release();
  }
});
