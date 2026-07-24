import { describe, expect, it } from "vitest";
import { nextAttentionSlot } from "@/server/ai/follow-up";

/** Bogotá (UTC-5, sin DST): jornada 9:00–17:30, lunes a viernes. */
const S = { timezone: "America/Bogota", workStartMin: 9 * 60, workEndMin: 17 * 60 + 30 };

/** Fecha local Bogotá → instante UTC. */
function bogota(iso: string): Date {
  return new Date(`${iso}-05:00`);
}

describe("nextAttentionSlot (ventana de atención)", () => {
  it("dentro de la jornada de un día hábil: se respeta tal cual", () => {
    const d = bogota("2026-07-22T10:15:00"); // miércoles
    expect(nextAttentionSlot(d, S).getTime()).toBe(d.getTime());
  });

  it("día hábil antes de abrir → misma jornada a la apertura", () => {
    const d = bogota("2026-07-22T06:30:00"); // miércoles 6:30 a.m.
    expect(nextAttentionSlot(d, S).getTime()).toBe(
      bogota("2026-07-22T09:00:00").getTime()
    );
  });

  it("día hábil tras el cierre → apertura del día siguiente", () => {
    const d = bogota("2026-07-22T20:00:00"); // miércoles 8 p.m.
    expect(nextAttentionSlot(d, S).getTime()).toBe(
      bogota("2026-07-23T09:00:00").getTime()
    );
  });

  it("viernes en la noche → lunes a la apertura", () => {
    const d = bogota("2026-07-24T21:00:00"); // viernes 9 p.m.
    expect(nextAttentionSlot(d, S).getTime()).toBe(
      bogota("2026-07-27T09:00:00").getTime()
    );
  });

  it("sábado al mediodía → lunes a la apertura", () => {
    const d = bogota("2026-07-25T12:00:00"); // sábado
    expect(nextAttentionSlot(d, S).getTime()).toBe(
      bogota("2026-07-27T09:00:00").getTime()
    );
  });

  it("justo al cierre (17:30) ya NO entra en la jornada", () => {
    const d = bogota("2026-07-22T17:30:00"); // miércoles 5:30 p.m. exacto
    expect(nextAttentionSlot(d, S).getTime()).toBe(
      bogota("2026-07-23T09:00:00").getTime()
    );
  });
});
