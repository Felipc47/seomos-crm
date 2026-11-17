import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { setSmsAgentEnabled } from "@/server/sms/service";
import { smsApiError } from "@/server/sms/errors";

export const dynamic = "force-dynamic";
const input = z.object({ enabled: z.boolean() }).strict();
type Params = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  if (!canManageMailing(session.role)) return apiError(403, "forbidden", "Sin permiso para operar SMS.");
  const parsed = await parseBody(req, input);
  if (!parsed.ok) return parsed.response;
  try {
    const { id } = await ctx.params;
    return Response.json({ contact: await setSmsAgentEnabled(session.organizationId, id, parsed.data.enabled) });
  } catch (error) { return smsApiError(error); }
});
