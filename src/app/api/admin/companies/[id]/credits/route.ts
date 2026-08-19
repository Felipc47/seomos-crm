import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { grantAiCredits } from "@/server/ai/credits";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const grantSchema = z.object({
  amount: z.number().int().min(1).max(100_000),
});

/** Recarga manual de la billetera; no representa dinero ni una suscripción. */
export const POST = withAuth(async (session, req: Request, ctx: Params) => {
  if (!session.isSuperadmin) {
    return apiError(403, "forbidden", "Solo el superadmin recarga créditos");
  }
  const body = await parseBody(req, grantSchema);
  if (!body.ok) return body.response;
  const { id } = await ctx.params;

  const db = getDb();
  const rows = await db
    .select({ deletedAt: schema.organization.deletedAt })
    .from(schema.organization)
    .where(eq(schema.organization.id, id))
    .limit(1);
  const organization = rows[0];
  if (!organization) {
    return apiError(404, "not_found", "Empresa no encontrada");
  }
  if (organization.deletedAt) {
    return apiError(
      409,
      "company_deleted",
      "Restaura la empresa antes de recargar créditos"
    );
  }

  const credits = await grantAiCredits({
    organizationId: id,
    amount: body.data.amount,
    actorUserId: session.userId,
  });
  return Response.json({ credits });
});
