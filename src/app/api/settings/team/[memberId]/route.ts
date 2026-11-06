import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { isOrgAdmin } from "@/lib/permissions";
import { mutateTeamMember, TeamMutationError } from "@/server/team";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ memberId: string }> };
const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  role: z.enum(["owner", "agent_editor", "commercial", "marketing"]).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "Indica un cambio");

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el admin puede modificar el equipo");
  const { memberId } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;
  try {
    const result = await mutateTeamMember({ actor: session, organizationId: session.organizationId, memberId, change: body.data });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof TeamMutationError) return apiError(error.status, error.code, error.message);
    throw error;
  }
});

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el admin puede eliminar miembros");
  const { memberId } = await ctx.params;
  try {
    await mutateTeamMember({ actor: session, organizationId: session.organizationId, memberId, remove: true });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof TeamMutationError) return apiError(error.status, error.code, error.message);
    throw error;
  }
});
