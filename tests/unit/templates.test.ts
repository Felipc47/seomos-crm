import { describe, expect, it } from "vitest";
import {
  countVariables,
  renderBody,
  validateBodyVariables,
  validateTemplateHeader,
} from "@/server/whatsapp/templates";

describe("countVariables / validateBodyVariables (FR-050)", () => {
  it("sin variables → 0, válido", () => {
    expect(countVariables("Hola, seguimos disponibles.")).toBe(0);
    expect(validateBodyVariables("Hola, seguimos disponibles.")).toBeNull();
  });

  it("una variable {{1}} → 1, válido (con y sin espacios)", () => {
    expect(countVariables("Hola {{1}}, ¿retomamos?")).toBe(1);
    expect(countVariables("Hola {{ 1 }}, ¿retomamos?")).toBe(1);
    expect(validateBodyVariables("Hola {{1}}, ¿retomamos?")).toBeNull();
  });

  it("dos variables → inválido (acotamiento v1)", () => {
    expect(countVariables("Hola {{1}}, tu pedido {{2}} llegó")).toBe(2);
    expect(
      validateBodyVariables("Hola {{1}}, tu pedido {{2}} llegó")
    ).toMatch(/una sola variable/);
  });

  it("variable {{2}} sola → inválida (debe ser {{1}})", () => {
    expect(validateBodyVariables("Tu pedido {{2}} llegó")).toMatch(/\{\{1\}\}/);
  });
});

describe("renderBody", () => {
  it("sustituye la variable por el valor", () => {
    expect(renderBody("Hola {{1}}, ¿retomamos?", "María")).toBe(
      "Hola María, ¿retomamos?"
    );
  });

  it("sin valor → variable vacía", () => {
    expect(renderBody("Hola {{1}}!")).toBe("Hola !");
  });
});

describe("validateTemplateHeader (016 — encabezado multimedia)", () => {
  const MB = 1024 * 1024;

  it("imagen JPG/PNG dentro del tope → válida", () => {
    expect(
      validateTemplateHeader({ kind: "image", mime: "image/jpeg", size: 4 * MB })
    ).toBeNull();
    expect(
      validateTemplateHeader({ kind: "image", mime: "image/png", size: 100 })
    ).toBeNull();
  });

  it("imagen en formato no permitido → inválida", () => {
    expect(
      validateTemplateHeader({ kind: "image", mime: "image/webp", size: 100 })
    ).toMatch(/JPG o PNG/);
    expect(
      validateTemplateHeader({ kind: "image", mime: "application/pdf", size: 100 })
    ).toMatch(/JPG o PNG/);
  });

  it("imagen sobre 5 MB → inválida", () => {
    expect(
      validateTemplateHeader({ kind: "image", mime: "image/jpeg", size: 5 * MB + 1 })
    ).toMatch(/supera el máximo/);
  });

  it("documento PDF dentro del tope → válido (mime con parámetros incluido)", () => {
    expect(
      validateTemplateHeader({ kind: "document", mime: "application/pdf", size: 15 * MB })
    ).toBeNull();
    expect(
      validateTemplateHeader({
        kind: "document",
        mime: "application/pdf; charset=binary",
        size: 100,
      })
    ).toBeNull();
  });

  it("documento no-PDF o sobre 16 MB → inválido", () => {
    expect(
      validateTemplateHeader({ kind: "document", mime: "application/msword", size: 100 })
    ).toMatch(/PDF/);
    expect(
      validateTemplateHeader({ kind: "document", mime: "application/pdf", size: 16 * MB + 1 })
    ).toMatch(/supera el máximo/);
  });

  it("archivo vacío → inválido", () => {
    expect(
      validateTemplateHeader({ kind: "image", mime: "image/png", size: 0 })
    ).toMatch(/vacío/);
  });
});
