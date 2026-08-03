import { describe, expect, it } from "vitest";
import {
  buildAgentSystemPrompt,
  extractMetaAdsOrigin,
} from "@/server/ai/prompts";
import type { schema } from "@/lib/db";

type AgentProfile = typeof schema.agentProfile.$inferSelect;

const profile = {
  id: "agp_test",
  organizationId: "org_test",
  name: "Juan José",
  tone: null,
  instructions: "Pregunta el nombre si no lo conoces.",
  escalationRules: null,
  greeting: null,
} as unknown as AgentProfile;

function renderPrompt(extra: {
  contactName?: string | null;
  leadOrigin?: string | null;
}) {
  return buildAgentSystemPrompt({
    profile,
    kb: [],
    stages: [{ name: "Nuevo" }, { name: "Calificado" }],
    services: [],
    ...extra,
  });
}

describe("contexto del contacto en el system prompt", () => {
  it("con nombre de Lead Ads: ordena saludarlo por su nombre y no preguntarlo", () => {
    const prompt = renderPrompt({ contactName: "Laura Gómez" });
    expect(prompt).toContain("DATOS YA CONOCIDOS DE ESTE PROSPECTO");
    expect(prompt).toContain("Nombre: Laura Gómez");
    expect(prompt).toContain("NUNCA se lo preguntes");
  });

  it("con origen de campaña: ordena no preguntar por el anuncio", () => {
    const prompt = renderPrompt({
      leadOrigin: "Servicio: Desarrollo web · Campaña: Webs Julio",
    });
    expect(prompt).toContain(
      "Origen: Servicio: Desarrollo web · Campaña: Webs Julio"
    );
    expect(prompt).toContain("NO le preguntes por qué anuncio");
  });

  it("sin datos (chat directo por WhatsApp): no inyecta el bloque y el agente pregunta el nombre", () => {
    const prompt = renderPrompt({});
    expect(prompt).not.toContain("DATOS YA CONOCIDOS DE ESTE PROSPECTO");
  });
});

describe("extractMetaAdsOrigin", () => {
  it("extrae la línea [Meta Ads] y descarta el id del form", () => {
    const notes = [
      "Nota del operador: cliente serio",
      "[Meta Ads] Servicio: Desarrollo web · Campaña: Webs Julio · Anuncio: Video 1 · Form: 1234567890",
    ].join("\n");
    expect(extractMetaAdsOrigin(notes)).toBe(
      "Servicio: Desarrollo web · Campaña: Webs Julio · Anuncio: Video 1"
    );
  });

  it("usa la línea MÁS reciente cuando hay varias campañas", () => {
    const notes = [
      "[Meta Ads] Campaña: Vieja",
      "[Meta Ads] Campaña: Nueva",
    ].join("\n");
    expect(extractMetaAdsOrigin(notes)).toBe("Campaña: Nueva");
  });

  it("devuelve null sin nota de Meta Ads o sin notas", () => {
    expect(extractMetaAdsOrigin("solo notas del operador")).toBeNull();
    expect(extractMetaAdsOrigin(null)).toBeNull();
    expect(extractMetaAdsOrigin("")).toBeNull();
  });

  it("conserva el marcador genérico cuando el form no traía campaña", () => {
    expect(extractMetaAdsOrigin("[Meta Ads] Lead de formulario")).toBe(
      "Lead de formulario"
    );
  });
});
