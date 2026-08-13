import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { canManageOrgSettings } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    serviceId: z.string().trim().min(1).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Envía al menos un cambio");

export const PATCH = withAuth(
  async (session, req: Request, context: Params) => {
    if (!canManageOrgSettings(session.role)) {
      return apiError(403, "forbidden", "Solo el admin puede gestionar integraciones");
    }
    const { id } = await context.params;
    const body = await parseBody(req, patchSchema);
    if (!body.ok) return body.response;
    const db = getDb();
    if (body.data.serviceId) {
      const service = await db
        .select({ id: schema.service.id })
        .from(schema.service)
        .where(
          scoped(
            schema.service.organizationId,
            session.organizationId,
            eq(schema.service.id, body.data.serviceId)
          )
        )
        .limit(1);
      if (!service[0]) {
        return apiError(422, "invalid_service", "Servicio no válido");
      }
    }
    const updated = await db
      .update(schema.webFormIntegration)
      .set({ ...body.data, updatedAt: new Date() })
      .where(
        and(
          eq(
            schema.webFormIntegration.organizationId,
            session.organizationId
          ),
          eq(schema.webFormIntegration.id, id)
        )
      )
      .returning({ id: schema.webFormIntegration.id });
    if (!updated[0]) {
      return apiError(404, "not_found", "Integración no encontrada");
    }
    return Response.json({ ok: true });
  }
);
