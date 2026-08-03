import { describe, expect, it } from "vitest";
import {
  composeInstructions,
  composeTone,
  INSTRUCTION_SECTIONS,
  MAX_TONE_PRESETS,
  TONE_PRESETS,
} from "@/lib/agent-behavior";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import type { schema } from "@/lib/db";

describe("composeTone", () => {
  it("compone hasta 2 presets con su explicación", () => {
    const tone = composeTone(["cercano", "directo"], null);
    expect(tone).toContain("cercano");
    expect(tone).toContain("directo");
    expect(tone).toContain("va al grano");
  });

  it("agrega los matices libres después de los presets", () => {
    const tone = composeTone(["profesional"], "usa emojis con moderación");
    expect(tone).toContain("profesional");
    expect(tone).toContain("Matices: usa emojis con moderación");
  });

  it("funciona solo con texto libre (retrocompatible)", () => {
    expect(composeTone([], "cercano y directo, con usted")).toBe(
      "cercano y directo, con usted"
    );
    expect(composeTone(null, "con usted")).toBe("con usted");
  });

  it("ignora ids desconocidos y duplicados, y corta en el máximo", () => {
    expect(composeTone(["inventado"], null)).toBeNull();
    const tone = composeTone(["cercano", "cercano"], null);
    expect(tone?.match(/cercano/g)?.length).toBe(1); // deduplicado
    const many = composeTone(
      TONE_PRESETS.map((p) => p.id),
      null
    );
    const labels = TONE_PRESETS.filter((p) =>
      many?.includes(p.label.toLowerCase())
    );
    expect(labels.length).toBe(MAX_TONE_PRESETS);
  });

  it("devuelve null sin presets ni texto", () => {
    expect(composeTone([], null)).toBeNull();
    expect(composeTone(null, "  ")).toBeNull();
  });
});

describe("composeInstructions", () => {
  it("compone las secciones con encabezado en orden canónico", () => {
    const text = composeInstructions(
      {
        precios: "No compartas precios sin que pregunten.",
        presentacion: "Saluda y pide el nombre.",
      },
      null
    );
    expect(text).toContain("## Presentación y saludo\nSaluda y pide el nombre.");
    expect(text).toContain(
      "## Precios y cotizaciones\nNo compartas precios sin que pregunten."
    );
    expect(text!.indexOf("Presentación")).toBeLessThan(
      text!.indexOf("Precios")
    );
  });

  it("anexa el texto libre heredado bajo su propio encabezado", () => {
    const text = composeInstructions(
      { negocio: "Vendemos páginas web." },
      "Regla vieja importante."
    );
    expect(text).toContain("## Otras instrucciones\nRegla vieja importante.");
  });

  it("solo texto heredado → va sin encabezado (retrocompatible)", () => {
    expect(composeInstructions({}, "Documento completo.")).toBe(
      "Documento completo."
    );
    expect(composeInstructions(null, "Documento completo.")).toBe(
      "Documento completo."
    );
  });

  it("ignora secciones vacías o de solo espacios y devuelve null sin nada", () => {
    expect(composeInstructions({ precios: "   " }, null)).toBeNull();
    expect(composeInstructions({}, null)).toBeNull();
  });

  it("cada clave definida tiene título y placeholder de guía", () => {
    for (const section of INSTRUCTION_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(3);
      expect(section.placeholder.length).toBeGreaterThan(10);
    }
  });
});

describe("cableado en el system prompt del agente", () => {
  it("los presets de tono y las secciones llegan compuestos al prompt", () => {
    const profile = {
      id: "agp_test",
      organizationId: "org_test",
      name: "Juan José",
      tone: "usa emojis con moderación",
      tonePresets: ["cercano", "directo"],
      instructions: "Regla heredada.",
      instructionSections: {
        precios: "No compartas precios sin que pregunten.",
      },
      escalationRules: null,
      greeting: null,
    } as unknown as typeof schema.agentProfile.$inferSelect;
    const prompt = buildAgentSystemPrompt({
      profile,
      kb: [],
      stages: [{ name: "Nuevo" }],
      services: [],
    });
    expect(prompt).toContain("Tono: cercano");
    expect(prompt).toContain("directo");
    expect(prompt).toContain("Matices: usa emojis con moderación");
    expect(prompt).toContain(
      "## Precios y cotizaciones\nNo compartas precios sin que pregunten."
    );
    expect(prompt).toContain("## Otras instrucciones\nRegla heredada.");
  });
});
