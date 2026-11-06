import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE, isValidTimezone, localDateKey, timezoneOptions, timezoneSchema } from "@/lib/timezone";
import { meetingLocalToIso } from "@/lib/meeting";

describe("zona horaria por empresa", () => {
  it("usa Bogotá por defecto y ofrece zonas mundiales", () => {
    expect(DEFAULT_TIMEZONE).toBe("America/Bogota");
    const values = timezoneOptions("America/New_York").map(option => option.value);
    expect(values).toEqual(expect.arrayContaining(["America/Bogota", "America/New_York", "UTC", "Asia/Tokyo", "Europe/Madrid"]));
    expect(new Set(values).size).toBe(values.length);
  });
  it("valida identificadores y rechaza offsets fijos, zonas inexistentes y texto excesivo", () => {
    for (const zone of ["America/Bogota", "America/New_York", "UTC", "Asia/Kolkata", "Etc/GMT+5"]) expect(isValidTimezone(zone)).toBe(true);
    for (const zone of ["", "Florida", "America/Invalid", "+05:00", "EST", "x".repeat(101)]) expect(timezoneSchema.safeParse(zone).success).toBe(false);
    expect(timezoneSchema.parse(" America/Bogota ")).toBe("America/Bogota");
  });
  it("agrupa días de mensajes en la zona de empresa y no la de ejecución", () => {
    const at = "2026-07-02T04:30:00Z";
    expect(localDateKey(at, "America/Bogota")).toBe("2026-07-01");
    expect(localDateKey(at, "America/New_York")).toBe("2026-07-02");
  });
  it("Florida cambia estacionalmente y Bogotá conserva UTC-5", () => {
    expect(meetingLocalToIso("2027-01-15T09:00", "America/New_York")).toBe("2027-01-15T14:00:00.000Z");
    expect(meetingLocalToIso("2027-07-15T09:00", "America/New_York")).toBe("2027-07-15T13:00:00.000Z");
    expect(meetingLocalToIso("2027-07-15T09:00", "America/Bogota")).toBe("2027-07-15T14:00:00.000Z");
    expect(() => meetingLocalToIso("2027-03-14T02:30", "America/New_York")).toThrow("no existe");
  });
});
