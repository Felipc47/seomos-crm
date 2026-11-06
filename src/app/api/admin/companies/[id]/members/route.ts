import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { mutateTeamMember, TeamMutationError } from "@/server/team";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Equipo de cualquier empresa, para el superadmin (asignación de roles). */
export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  if (!session.isSuperadmin) {
    return apiError(403, "forbidden", "Solo el superadmin administra empresas");
  }
  const { id } = await ctx.params;
  const db = getDb();
  const members = await db
    .select({
      id: schema.member.id,
      role: schema.member.role,
      name: schema.user.name,
      email: schema.user.email,
      createdAt: schema.member.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, id))
    .orderBy(schema.member.createdAt);
  return Response.json({
    members: members.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

const patchSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["owner", "agent_editor", "commercial", "marketing"]),
});

/** Cambia el rol de un miembro de cualquier empresa (superadmin). */
export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  if (!session.isSuperadmin) {
    return apiError(403, "forbidden", "Solo el superadmin administra empresas");
  }
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  try {
    await mutateTeamMember({
      actor: session, organizationId: id, memberId: body.data.memberId,
      change: { role: body.data.role }, asSuperadmin: true,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof TeamMutationError) return apiError(error.status, error.code, error.message);
    throw error;
  }
});
