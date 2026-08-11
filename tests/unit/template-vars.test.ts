import { describe, expect, it } from "vitest";
import {
  distinctVariableIndexes,
  exampleValues,
  parseStoredVariables,
  resolveTemplateVariables,
  validateTemplateVariables,
  type TemplateVariable,
} from "@/server/whatsapp/template-vars";

const ctx = {
  contactName: "Ana Pérez",
  phone: "573001112233",
  email: "ana@ejemplo.com",
  notes: "Interesada en el plan pro",
  serviceName: "SEO",
  stageName: "En calificación",
};

describe("validateTemplateVariables (018)", () => {
  const map = (...sources: TemplateVariable["source"][]): TemplateVariable[] =>
    sources.map((source) =>
      source === "fixed" ? { source, value: "fijo" } : { source }
    );

  it("mapeo completo y contiguo → válido", () => {
    expect(
      validateTemplateVariables(
        "Hola {{1}}, vimos tu interés en {{2}}. {{3}}",
        map("first_name", "service", "fixed")
      )
    ).toBeNull();
  });

  it("variable repetida cuenta una sola vez", () => {
    expect(
      validateTemplateVariables("{{1}} y de nuevo {{1}}", map("first_name"))
    ).toBeNull();
  });

  it("variables no contiguas → inválido", () => {
    expect(
      validateTemplateVariables("{{1}} y {{3}}", map("first_name", "service"))
    ).toMatch(/consecutivas/);
  });

  it("más de 5 variables → inválido", () => {
    expect(
      validateTemplateVariables(
        "{{1}}{{2}}{{3}}{{4}}{{5}}{{6}}",
        map("name", "name", "name", "name", "name", "name")
      )
    ).toMatch(/Máximo 5/);
  });

  it("mapeo incompleto o sobrante → inválido", () => {
    expect(
      validateTemplateVariables("{{1}} {{2}}", map("first_name"))
    ).toMatch(/2 variable/);
    expect(validateTemplateVariables("sin variables", map("name"))).toMatch(
      /quita el mapeo/
    );
  });

  it("fijo sin valor → inválido", () => {
    expect(
      validateTemplateVariables("{{1}}", [{ source: "fixed", value: "  " }])
    ).toMatch(/valor fijo/);
  });

  it("legacy (sin mapeo): una {{1}} vale, dos variables no", () => {
    expect(validateTemplateVariables("Hola {{1}}", null)).toBeNull();
    expect(validateTemplateVariables("Hola {{1}} {{2}}", null)).toMatch(
      /fuente de datos/
    );
    expect(validateTemplateVariables("Hola {{2}}", null)).toMatch(/\{\{1\}\}/);
  });
});

describe("resolveTemplateVariables (018)", () => {
  it("resuelve cada fuente con los datos del contacto/lead", () => {
    const result = resolveTemplateVariables(
      [
        { source: "first_name" },
        { source: "service" },
        { source: "fixed", value: "10%" },
        { source: "email" },
      ],
      ctx
    );
    expect(result).toEqual({
      ok: true,
      values: ["Ana", "SEO", "10%", "ana@ejemplo.com"],
    });
  });

  it("dato vacío → respaldo", () => {
    const result = resolveTemplateVariables(
      [{ source: "service", fallback: "nuestros servicios" }],
      { ...ctx, serviceName: null }
    );
    expect(result).toEqual({ ok: true, values: ["nuestros servicios"] });
  });

  it("dato vacío SIN respaldo → error con la variable y su fuente", () => {
    const result = resolveTemplateVariables(
      [{ source: "first_name" }, { source: "email" }],
      { ...ctx, email: null }
    );
    expect(result).toEqual({ ok: false, missing: "{{2}} (correo)" });
  });
});

describe("exampleValues / distinctVariableIndexes / parseStoredVariables", () => {
  it("genera ejemplos por fuente (el fijo usa su valor)", () => {
    expect(
      exampleValues([
        { source: "first_name" },
        { source: "fixed", value: "2x1" },
      ])
    ).toEqual(["Ana", "2x1"]);
  });

  it("índices distintos ordenados", () => {
    expect(distinctVariableIndexes("{{2}} {{1}} {{2}}")).toEqual([1, 2]);
  });

  it("jsonb crudo válido → mapeo tipado; corrupto → null", () => {
    expect(
      parseStoredVariables([{ source: "service", fallback: "x" }])
    ).toEqual([{ source: "service", value: null, fallback: "x" }]);
    expect(parseStoredVariables([{ source: "otra_cosa" }])).toBeNull();
    expect(parseStoredVariables("basura")).toBeNull();
    expect(parseStoredVariables([])).toBeNull();
  });
});
