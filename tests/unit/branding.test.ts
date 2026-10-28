import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  accentForeground,
  accentCssVariables,
  isValidHex,
  normalizeBranding,
  resolveAccentSet,
} from "@/lib/branding";

describe("white-label: acento", () => {
  it("mantiene legibles acciones y hover con acentos personalizados en ambos temas", () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((offset) => {
        const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    for (const color of ["#e84b1d", "#f14c0c", "#ff9500", "#797979", "#30bd00", "#3f5972", "#ffffff", "#111111"]) {
      const css = accentCssVariables(color);
      expect(css).toContain(":root,.dark{");
      for (const state of ["accent", "accent-hover"]) {
        const bg = css.match(new RegExp(`--${state}:(#[a-f0-9]{6});`))![1]!;
        const fg = css.match(new RegExp(`--${state}-contrast:(#[a-f0-9]{6});`))![1]!;
        expect(fg).toBe("#ffffff");
        expect(accentForeground(bg)).toBe("#ffffff");
        const values = [luminance(bg), luminance(fg)].sort((a, b) => b - a);
        expect((values[0]! + 0.05) / (values[1]! + 0.05)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("preset devuelve el set exacto del handoff", () => {
    expect(resolveAccentSet("#3f5972")).toEqual(ACCENT_PRESETS["#3f5972"]!.set);
    expect(resolveAccentSet("#5f5470").soft).toBe("#e6e1ec");
  });

  it("color personalizado deriva hover/soft/tint/text", () => {
    const s = resolveAccentSet("#7a3b5e");
    expect(isValidHex(s.hover)).toBe(true);
    expect(isValidHex(s.soft)).toBe(true);
    expect(isValidHex(s.tint)).toBe(true);
    expect(s.hover).not.toBe(s.accent);
  });

  it("color demasiado claro se oscurece para contraste con texto blanco", () => {
    const s = resolveAccentSet("#ffee88"); // amarillo pálido, ilegible con blanco
    expect(s.accent).not.toBe("#ffee88");
    // el resultado debe ser notablemente más oscuro
    const lum = parseInt(s.accent.slice(1, 3), 16);
    expect(lum).toBeLessThan(0xd0);
  });

  it("hex inválido cae al default", () => {
    expect(resolveAccentSet("rojo")).toEqual(ACCENT_PRESETS["#3f5972"]!.set);
  });
});

describe("white-label: normalización", () => {
  it("nombre vacío o nulo → default de marca; se recorta a 30", () => {
    expect(normalizeBranding(null).name).toBe("Seomos CRM");
    expect(normalizeBranding({ name: "   " }).name).toBe("Seomos CRM");
    expect(normalizeBranding({ name: "x".repeat(50) }).name).toHaveLength(30);
  });

  it("acento inválido → default de marca (naranja Seomos)", () => {
    expect(normalizeBranding({ accent: "azul" }).accent).toBe("#e84b1d");
    expect(normalizeBranding({ accent: "#3F6B66" }).accent).toBe("#3f6b66");
  });
});
