import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/server/org-settings";
import { canManageOrgSettings } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const settings = await getNotificationSettings(session.organizationId);
  return Response.json({ settings });
});

const putSchema = z.object({
  enabled: z.boolean(),
  newLeadEmailsEnabled: z.boolean(),
  weeklyDigestEnabled: z.boolean(),
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) {
    return apiError(
      403,
      "forbidden",
      "Solo el admin de la empresa puede configurar esto"
    );
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;

  const data = body.data as NotificationSettings;
  await saveNotificationSettings(session.organizationId, data);
  return Response.json({ ok: true });
});

