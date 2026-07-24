import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getFollowUpSettings,
  saveFollowUpSettings,
} from "@/server/org-settings";
import { canManageOrgSettings } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Settings de la rutina de seguimiento automático (008). */
export const GET = withAuth(async (session) => {
  const settings = await getFollowUpSettings(session.organizationId);
  return Response.json({ settings });
});

const putSchema = z.object({
  enabled: z.boolean(),
  templateId: z.string().trim().min(1).nullable(),
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) {
    return apiError(403, "forbidden", "Solo el admin de la empresa puede configurar esto");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;
  await saveFollowUpSettings(session.organizationId, body.data);
  return Response.json({ ok: true });
});
