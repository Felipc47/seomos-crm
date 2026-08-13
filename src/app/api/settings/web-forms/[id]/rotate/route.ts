import { and, eq } from "drizzle-orm";
import { apiError, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { canManageOrgSettings } from "@/lib/permissions";
import { generateWebFormSecret } from "@/server/web-forms/credentials";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const POST = withAuth(
  async (session, _req: Request, context: Params) => {
    if (!canManageOrgSettings(session.role)) {
      return apiError(403, "forbidden", "Solo el admin puede rotar secretos");
    }
    const { id } = await context.params;
    const { secret, encrypted } = generateWebFormSecret();
    const updated = await getDb()
      .update(schema.webFormIntegration)
      .set({ ...encrypted, updatedAt: new Date() })
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
    return Response.json({ secret });
  }
);
