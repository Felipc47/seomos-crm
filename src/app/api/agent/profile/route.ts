import { apiError, parseBody, withAuth } from "@/lib/api";
import { agentProfileUpdateSchema } from "@/lib/agent-profile-input";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isAiConfigured } from "@/lib/env";
import { canEditAgent } from "@/lib/permissions";
import {
  AGENT_TURN_CREDIT_COST,
  FOLLOW_UP_CREDIT_COST,
  getAiCreditSummary,
} from "@/server/ai/credits";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  if (!canEditAgent(session.role)) {
    return apiError(403, "forbidden", "Tu rol no tiene acceso a la configuración del agente");
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.agentProfile)
    .where(scoped(schema.agentProfile.organizationId, session.organizationId))
    .limit(1);
  const p = rows[0];
  if (!p) return apiError(404, "not_found", "Perfil del agente no encontrado");
  const credits = await getAiCreditSummary(session.organizationId);
  return Response.json({
    profile: {
      enabled: p.enabled,
      mission: p.mission,
      missionDetails: p.missionDetails,
      ecommerceUrl: p.ecommerceUrl,
      schedulingWarmupEnabled: p.schedulingWarmupEnabled,
      schedulingWarmupMessages: p.schedulingWarmupMessages,
      name: p.name,
      responseLanguage: p.responseLanguage,
      tone: p.tone,
      tonePresets: p.tonePresets ?? [],
      instructions: p.instructions,
      instructionSections: p.instructionSections ?? {},
      escalationRules: p.escalationRules,
      greeting: p.greeting,
    },
    aiConfigured: isAiConfigured(),
    credits: {
      balance: credits.balance,
      agentTurnCost: AGENT_TURN_CREDIT_COST,
      followUpCost: FOLLOW_UP_CREDIT_COST,
    },
  });
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!canEditAgent(session.role)) {
    return apiError(403, "forbidden", "Tu rol no tiene acceso a la configuración del agente");
  }
  const body = await parseBody(req, agentProfileUpdateSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const updated = await db
    .update(schema.agentProfile)
    .set({ ...body.data, updatedAt: new Date() })
    .where(scoped(schema.agentProfile.organizationId, session.organizationId))
    .returning();
  if (!updated[0]) return apiError(404, "not_found", "Perfil no encontrado");
  return Response.json({ ok: true });
});
