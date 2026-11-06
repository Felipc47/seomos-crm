import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { timezoneSchema } from "@/lib/timezone";
import { getCalendarSettings, saveOrganizationTimezone } from "@/server/org-settings";

export const dynamic = "force-dynamic";

export const GET = withAuth(async session => {
  const { timezone } = await getCalendarSettings(session.organizationId);
  return Response.json({ timezone });
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) return apiError(403, "forbidden", "Solo el administrador puede cambiar la zona horaria de la empresa");
  const body = await parseBody(req, z.object({ timezone: timezoneSchema }).strict());
  if (!body.ok) return body.response;
  await saveOrganizationTimezone(session.organizationId, body.data.timezone);
  return Response.json({ ok: true, timezone: body.data.timezone });
});
