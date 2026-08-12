import { describe, expect, it } from "vitest";
import { canViewDashboard } from "@/lib/permissions";
import {
  addCalendarDays,
  DashboardRangeError,
  dateInTimezone,
  dashboardRangeDays,
  isIsoCalendarDate,
  resolveDashboardRange,
  validDashboardTimezone,
} from "@/server/dashboard/range";

describe("rango del Dashboard", () => {
  const now = new Date("2026-08-12T04:30:00.000Z");

  it("calcula hoy en la zona del negocio y no en UTC", () => {
    expect(dateInTimezone(now, "America/Bogota")).toBe("2026-08-11");
    expect(dateInTimezone(now, "UTC")).toBe("2026-08-12");
  });

  it("usa 7 días inclusivos como rango predeterminado", () => {
    expect(
      resolveDashboardRange({ timezone: "America/Bogota", now })
    ).toEqual({ preset: "7d", from: "2026-08-05", to: "2026-08-11" });
  });

  it.each([
    ["today", "2026-08-11", "2026-08-11"],
    ["30d", "2026-07-13", "2026-08-11"],
    ["90d", "2026-05-14", "2026-08-11"],
  ])("resuelve el preset %s", (preset, from, to) => {
    expect(
      resolveDashboardRange({ preset, timezone: "America/Bogota", now })
    ).toEqual({ preset, from, to });
  });

  it("hace aritmética de calendario sobre mes, año y bisiesto", () => {
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addCalendarDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(dashboardRangeDays("2028-02-28", "2028-03-01")).toBe(3);
  });

  it.each(["", "2026-2-01", "2026-02-30", "texto"])(
    "rechaza fecha imposible: %s",
    (value) => expect(isIsoCalendarDate(value)).toBe(false)
  );

  it("acepta personalizado inclusivo", () => {
    expect(
      resolveDashboardRange({
        preset: "custom",
        from: "2026-07-01",
        to: "2026-07-31",
        timezone: "America/Bogota",
        now,
      })
    ).toEqual({ preset: "custom", from: "2026-07-01", to: "2026-07-31" });
  });

  it.each([
    [{ preset: "custom", from: "", to: "2026-08-11" }, "Selecciona"],
    [
      { preset: "custom", from: "2026-08-12", to: "2026-08-11" },
      "posterior",
    ],
    [
      { preset: "custom", from: "2025-01-01", to: "2026-08-11" },
      "366",
    ],
    [{ preset: "infinito" }, "no existe"],
  ])("rechaza rango inválido", (input, message) => {
    expect(() =>
      resolveDashboardRange({
        ...input,
        timezone: "America/Bogota",
        now,
      })
    ).toThrowError(new RegExp(message));
  });

  it("degrada una zona inválida a la zona por defecto", () => {
    expect(validDashboardTimezone("Marte/Olympus")).toBe("America/Bogota");
  });

  it("expone un error tipado para convertirlo en 422", () => {
    expect(() => addCalendarDays("mal", 1)).toThrow(DashboardRangeError);
  });
});

describe("permiso del Dashboard", () => {
  it.each(["owner", "commercial", "marketing", "member"])(
    "permite el rol comercial %s",
    (role) => expect(canViewDashboard(role)).toBe(true)
  );

  it.each(["agent_editor", "unknown"])("rechaza el rol %s", (role) => {
    expect(canViewDashboard(role)).toBe(false);
  });
});
