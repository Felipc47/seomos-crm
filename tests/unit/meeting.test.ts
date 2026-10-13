import { describe, expect, it } from "vitest";
import { isMeetingTemplate, meetingConfirmationText, meetingDueAt, meetingInputSchema, meetingLocalInput, meetingLocalToIso } from "@/lib/meeting";

describe("reunión y confirmación 033", () => {
  it("resta exactamente 45 minutos incluso al cambiar de día", () => {
    expect(meetingDueAt(new Date("2026-10-14T00:15:00Z")).toISOString()).toBe("2026-10-13T23:30:00.000Z");
  });
  it("interpreta la hora en la zona empresarial y no la del navegador", () => {
    expect(meetingLocalToIso("2026-10-14T10:00", "America/Bogota")).toBe("2026-10-14T15:00:00.000Z");
    expect(meetingLocalInput("2026-10-14T15:00:00Z", "America/Bogota")).toBe("2026-10-14T10:00");
    expect(meetingLocalToIso("2026-10-14T10:00", "Asia/Kolkata")).toBe("2026-10-14T04:30:00.000Z");
    expect(() => meetingLocalToIso("2026-03-08T02:30", "America/New_York")).toThrow(/no existe/);
  });
  it("confirma fecha/hora/enlace sin afirmar asistencia del lead", () => {
    const text = meetingConfirmationText("Ana", { startAt: new Date("2026-10-14T15:00:00Z"), timezone: "America/Bogota", meetLink: "https://meet.google.com/abc-defg-hij" });
    expect(text).toContain("Ana"); expect(text).toContain("10:00"); expect(text).toContain("abc-defg-hij"); expect(text).toContain("¿Nos confirmas");
    expect(text).not.toContain("\n");
  });
  it("rechaza enlaces ejecutables, inseguros, credenciales y tenant impuesto", () => {
    const input = { startIso: "2026-10-14T15:00:00Z", meetLink: "https://meet.google.com/abc" };
    expect(meetingInputSchema.safeParse(input).success).toBe(true);
    for (const meetLink of ["javascript:alert(1)", "http://example.com", "https://user:password@example.com"]) expect(meetingInputSchema.safeParse({ ...input, meetLink }).success).toBe(false);
    expect(meetingInputSchema.safeParse({ ...input, organizationId: "other" }).success).toBe(false);
  });
  it("solo acepta plantilla aprobada utility con un parámetro de reunión", () => {
    const template = { status: "approved", category: "UTILITY", body: "Tu reunión: {{1}}. ¿Asistirás?" };
    expect(isMeetingTemplate(template)).toBe(true);
    for (const change of [{ status: "pending" }, { category: "MARKETING" }, { body: "Hola" }, { body: "{{1}} {{2}}" }, { headerKind: "image" }, { variables: [{ source: "name" }] }]) expect(isMeetingTemplate({ ...template, ...change })).toBe(false);
    expect(isMeetingTemplate({ ...template, variables: [] })).toBe(true);
  });
});
