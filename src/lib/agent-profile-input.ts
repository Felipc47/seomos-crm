import { z } from "zod";
import {
  AGENT_RESPONSE_LANGUAGE_IDS,
  INSTRUCTION_SECTION_KEYS,
  MAX_TONE_PRESETS,
  TONE_PRESET_IDS,
  type InstructionSectionKey,
  type TonePresetId,
} from "@/lib/agent-behavior";

export const agentProfileUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  responseLanguage: z.enum(AGENT_RESPONSE_LANGUAGE_IDS).optional(),
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

export const agentProfileDraftSchema = agentProfileUpdateSchema.omit({ enabled: true }).strict();
export type AgentProfileDraft = z.infer<typeof agentProfileDraftSchema>;
