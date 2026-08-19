import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  INSTRUCTION_SECTION_KEYS,
  MAX_TONE_PRESETS,
  TONE_PRESET_IDS,
  type InstructionSectionKey,
  type TonePresetId,
} from "@/lib/agent-behavior";
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
      name: p.name,
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

const putSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  tone: z.string().max(1000).nullable().optional(),
  tonePresets: z
    .array(z.enum(TONE_PRESET_IDS as [TonePresetId, ...TonePresetId[]]))
    .max(MAX_TONE_PRESETS)
    .optional(),
  // Holgado a propósito: un playbook comercial completo cabe varias veces
  // (~8k tokens). El costo por turno lo gobierna el modelo elegido.
  instructions: z.string().max(128000).nullable().optional(),
  instructionSections: z
    .record(
      z.enum(
        INSTRUCTION_SECTION_KEYS as [
          InstructionSectionKey,
          ...InstructionSectionKey[],
        ]
      ),
      z.string().max(64000)
    )
    .optional(),
  escalationRules: z.string().max(8000).nullable().optional(),
  greeting: z.string().max(2000).nullable().optional(),
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!canEditAgent(session.role)) {
    return apiError(403, "forbidden", "Tu rol no tiene acceso a la configuración del agente");
  }
  const body = await parseBody(req, putSchema);
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
