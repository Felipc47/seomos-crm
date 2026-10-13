import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AGENT_RESPONSE_LANGUAGE_IDS, composeResponseLanguage } from "@/lib/agent-behavior";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import type { schema } from "@/lib/db";

function prompt(responseLanguage?: "es" | "en" | "es-en") {
  return buildAgentSystemPrompt({
    profile: { name: "Asesor", responseLanguage, greeting: "Hola", instructions: "Responde en español", tonePresets: [] } as unknown as typeof schema.agentProfile.$inferSelect,
    kb: [], stages: [{ name: "Calificado" }],
  });
}

describe("idioma de respuesta del agente", () => {
  it("conserva español para perfiles nuevos y heredados", () => {
    expect(prompt()).toContain("Responde SIEMPRE en español neutro");
    expect(prompt("es")).toContain("Responde SIEMPRE en español neutro");
  });
  it("inglés sustituye la regla fija y prevalece sobre textos heredados", () => {
    expect(prompt("en")).toContain("Responde SIEMPRE en inglés natural");
    expect(prompt("en")).not.toContain("Respondes SIEMPRE en español neutro");
    expect(prompt("en")).toContain("prevalece sobre instrucciones del negocio");
    expect(prompt("en")).toContain("adaptando el saludo sugerido");
  });
  it("bilingüe sigue cambios y peticiones sin duplicar respuestas", () => {
    expect(prompt("es-en")).toContain("idioma del último mensaje del cliente");
    expect(prompt("es-en")).toContain("No dupliques");
    expect(prompt("es-en")).toContain("sin contexto usa español");
  });
  it("protege el contrato de acciones y las citas de evidencia", () => {
    for (const mode of AGENT_RESPONSE_LANGUAGE_IDS) {
      expect(composeResponseLanguage(mode)).toContain("text, reply, farewell y seguimientos");
      expect(composeResponseLanguage(mode)).toContain("citas literales");
      expect(prompt(mode)).toContain('"action":"move_stage"');
      expect(prompt(mode)).toContain("Calificado");
    }
  });
  it("el contrato admite solo las tres opciones", () => {
    const contract = z.enum(AGENT_RESPONSE_LANGUAGE_IDS);
    for (const mode of AGENT_RESPONSE_LANGUAGE_IDS) expect(contract.safeParse(mode).success).toBe(true);
    for (const invalid of ["fr", "", "EN", null]) expect(contract.safeParse(invalid).success).toBe(false);
  });
});
