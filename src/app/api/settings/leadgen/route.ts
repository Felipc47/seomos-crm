import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getLeadgenSettings,
  saveLeadgenSettings,
} from "@/server/org-settings";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { preferredContactChannel } from "@/server/leadgen/preferred-greeting";
import { canManageOrgSettings } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Configuración compartida por Meta Lead Ads y Google Sheets. */
export const GET = withAuth(async (session) => {
  const org = session.organizationId;
  const [settings, channel] = await Promise.all([getLeadgenSettings(org), preferredContactChannel(org)]);
  return Response.json({ settings: { ...settings, channel } });
});

const putSchema = z.object({
  greetingTemplateId: z.string().trim().min(1).nullable().optional(),
  channel: z.enum(["sms", "whatsapp"]).optional(),
}).strict().refine((data) => Object.keys(data).length > 0);

export const PUT = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) {
    return apiError(403, "forbidden", "Solo el admin de la empresa puede configurar esto");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;
  const org = session.organizationId;
  const { greetingTemplateId, channel } = body.data;
  const db = getDb();
  if (greetingTemplateId) {
    const [template] = await db.select({ id: schema.template.id }).from(schema.template)
      .where(scoped(schema.template.organizationId, org, eq(schema.template.id, greetingTemplateId),
        eq(schema.template.status, "approved"))).limit(1);
    if (!template) return apiError(422, "invalid_template", "Selecciona una plantilla aprobada de esta empresa.");
  }
  if (channel !== undefined) {
    const [profile] = await db.update(schema.agentProfile).set({ preferredContactChannel: channel, updatedAt: new Date() })
      .where(scoped(schema.agentProfile.organizationId, org)).returning({ id: schema.agentProfile.id });
    if (!profile) return apiError(404, "not_found", "Perfil del agente no encontrado.");
  }
  if (greetingTemplateId !== undefined) await saveLeadgenSettings(org, { greetingTemplateId });
  return Response.json({ ok: true });
});
