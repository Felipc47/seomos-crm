import { describe, expect, it } from "vitest";
import {
  closureReasonLabel,
  isNegativeStage,
  isReasonForStage,
  reasonsForStage,
} from "@/lib/lead-closure";

describe("motivos de cierre del lead", () => {
  it("separa las salidas negativas de las demás etapas", () => {
    expect(isNegativeStage("unqualified")).toBe(true);
    expect(isNegativeStage("lost")).toBe(true);
    expect(isNegativeStage("won")).toBe(false);
    expect(isNegativeStage("open")).toBe(false);
  });

  it("no permite mezclar motivos de No calificado y No convertido", () => {
    expect(isReasonForStage("unqualified", "no_fit")).toBe(true);
    expect(isReasonForStage("unqualified", "no_response")).toBe(false);
    expect(isReasonForStage("lost", "no_response")).toBe(true);
    expect(isReasonForStage("lost", "wrong_contact")).toBe(false);
  });

  it("solo ofrece motivos en etapas negativas", () => {
    expect(reasonsForStage("open")).toEqual([]);
    expect(reasonsForStage("won")).toEqual([]);
    expect(reasonsForStage("unqualified").length).toBeGreaterThan(0);
    expect(reasonsForStage("lost").length).toBeGreaterThan(0);
  });

  it("presenta una etiqueta legible", () => {
    expect(closureReasonLabel("no_response")).toBe("No respondió");
    expect(closureReasonLabel("no_fit")).toBe("No cumple el perfil");
    expect(closureReasonLabel(null)).toBeNull();
  });
});
