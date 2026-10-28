import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import type { schema } from "@/lib/db";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(), connection: vi.fn(), refresh: vi.fn(), busy: vi.fn(), create: vi.fn(),
  reconnect: vi.fn(), settings: vi.fn(), getMeeting: vi.fn(), saveMeeting: vi.fn(),
  rows: [] as unknown[][], conditions: [] as unknown[],
}));
vi.mock("@/lib/env", () => ({ isGoogleConfigured: mocks.configured }));
vi.mock("@/server/google/credentials", () => ({ getGoogleConnection: mocks.connection, markGoogleReconnectRequired: mocks.reconnect }));
vi.mock("@/lib/google/client", async (original) => ({ ...await original<typeof import("@/lib/google/client")>(), refreshAccessToken: mocks.refresh }));
vi.mock("@/lib/google/calendar", () => ({ queryFreeBusy: mocks.busy, createCalendarEvent: mocks.create }));
vi.mock("@/server/org-settings", () => ({ getCalendarSettings: mocks.settings }));
vi.mock("@/server/meetings/repository", () => ({ getMeeting: mocks.getMeeting, saveMeeting: mocks.saveMeeting }));
vi.mock("@/server/events/bus", () => ({ publish: vi.fn() }));
vi.mock("@/lib/db", async (original) => ({
  ...await original<typeof import("@/lib/db")>(),
  getDb: () => ({
    select: () => {
      const rows = mocks.rows.shift() ?? [];
      const chain = { from: () => chain, where: (condition: unknown) => { mocks.conditions.push(condition); return chain; }, limit: async () => rows };
      return chain;
    },
    update: () => ({ set: () => ({ where: async (condition: unknown) => { mocks.conditions.push(condition); } }) }),
  }),
}));

import { GoogleApiError } from "@/lib/google/client";
import { scheduleMeeting } from "@/server/google/scheduling";

const input = { organizationId: "org_A", contactId: "ct_A", prospectEmail: "ana@example.test", startIso: "2099-11-05T15:00:00Z" };
const profile = { name: "Asesor", instructions: "No agendes sin Google", tonePresets: [] } as unknown as typeof schema.agentProfile.$inferSelect;

beforeEach(() => {
  vi.clearAllMocks(); mocks.rows.length = 0; mocks.conditions.length = 0;
  mocks.rows.push([{ id: "ct_A", name: "Ana", phone: "573001234567", email: null, notes: null }], []);
  mocks.configured.mockReturnValue(true);
  mocks.connection.mockResolvedValue(null);
  mocks.getMeeting.mockResolvedValue(null);
  mocks.saveMeeting.mockResolvedValue({ id: "mtg_local" });
  mocks.settings.mockResolvedValue({ defaultTitle: "Diagnóstico", defaultDurationMin: 45, internalInvitees: [], timezone: "America/Bogota" });
  mocks.refresh.mockResolvedValue("mock-access"); mocks.busy.mockResolvedValue([]);
  mocks.create.mockResolvedValue({ id: "google-event", htmlLink: "https://calendar.google.com/event", meetLink: "https://meet.google.com/mock", start: input.startIso, end: "2099-11-05T15:45:00Z" });
});

describe("agendamiento independiente de Google", () => {
  it("ofrece la acción y reglas aunque Google esté desconectado", () => {
    const prompt = buildAgentSystemPrompt({ profile, kb: [], stages: [], calendarAvailable: false, scheduling: { nowLabel: "hoy", minStartLabel: "miércoles 9 am", workHoursLabel: "lunes a viernes", timezone: "America/Bogota", utcOffset: "-05:00", availabilityLabel: "miércoles: 9 am a 5 pm" } });
    expect(prompt).toContain('"action":"schedule_meeting"');
    expect(prompt).toContain("NUNCA es un requisito");
    expect(prompt).toContain("HORARIOS PROPUESTOS");
    expect(prompt).not.toContain("DISPONIBILIDAD REAL del calendario");
    expect(prompt).toContain("NO prometas invitación por correo");
    expect(prompt).toContain("Primera disponibilidad: miércoles 9 am");
  });
  it("mantiene el aislamiento de las conversaciones históricas de prueba", () => {
    const prompt = buildAgentSystemPrompt({ profile, kb: [], stages: [], schedulingAvailable: false });
    expect(prompt).not.toContain("schedule_meeting");
  });
  it("guarda local sin llamadas a Google y siempre con el tenant", async () => {
    const result = await scheduleMeeting(input);
    expect(result).toMatchObject({ id: "mtg_local", calendarSynced: false, meetLink: null, htmlLink: null });
    expect(mocks.saveMeeting).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org_A", contactId: "ct_A", source: "manual", googleEventId: null, meetLink: null }));
    expect(mocks.refresh).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    const dialect = new PgDialect();
    for (const condition of mocks.conditions) expect(dialect.sqlToQuery(condition as Parameters<PgDialect["sqlToQuery"]>[0]).params).toContain("org_A");
  });
  it("funciona sin credenciales de integración configuradas", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await scheduleMeeting(input)).calendarSynced).toBe(false);
    expect(mocks.connection).not.toHaveBeenCalled(); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("una conexión que requiere reconexión guarda local", async () => {
    mocks.connection.mockResolvedValue({ status: "reconnect_required", accountEmail: "owner@test.local" });
    expect((await scheduleMeeting(input)).calendarSynced).toBe(false);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each([new GoogleApiError("Revocado", 400, "invalid_grant"), new GoogleApiError("insufficient permissions", 403)])("credenciales rechazadas degradan a CRM", async (error) => {
    mocks.connection.mockResolvedValue({ status: "connected", accountEmail: "owner@test.local", refreshToken: "mock-refresh" });
    mocks.refresh.mockRejectedValue(error);
    expect((await scheduleMeeting(input)).calendarSynced).toBe(false);
    expect(mocks.reconnect).toHaveBeenCalledWith("org_A"); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("con Google conectado conserva invitaciones y Meet", async () => {
    mocks.connection.mockResolvedValue({ status: "connected", accountEmail: "owner@test.local", refreshToken: "mock-refresh" });
    expect(await scheduleMeeting(input)).toMatchObject({ calendarSynced: true, id: "google-event", meetLink: "https://meet.google.com/mock" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ attendees: ["ana@example.test"] }));
    expect(mocks.saveMeeting).toHaveBeenCalledWith(expect.objectContaining({ source: "google", googleEventId: "google-event" }));
  });
  it("si freeBusy rechaza la autorización no intenta crear un evento a ciegas", async () => {
    mocks.connection.mockResolvedValue({ status: "connected", accountEmail: "owner@test.local", refreshToken: "mock-refresh" });
    mocks.busy.mockRejectedValue(new GoogleApiError("Unauthorized", 401));
    expect((await scheduleMeeting(input)).calendarSynced).toBe(false);
    expect(mocks.reconnect).toHaveBeenCalledWith("org_A"); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("un conflicto real de Google no se convierte en reserva local", async () => {
    mocks.connection.mockResolvedValue({ status: "connected", accountEmail: "owner@test.local", refreshToken: "mock-refresh" });
    mocks.busy.mockResolvedValue([{ start: input.startIso, end: "2099-11-05T16:00:00Z" }]);
    await expect(scheduleMeeting(input)).rejects.toMatchObject({ code: "slot_taken" });
    expect(mocks.saveMeeting).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("un fallo de creación no afirma que la reunión existe", async () => {
    mocks.connection.mockResolvedValue({ status: "connected", accountEmail: "owner@test.local", refreshToken: "mock-refresh" });
    mocks.create.mockRejectedValue(new GoogleApiError("Unavailable", 503));
    await expect(scheduleMeeting(input)).rejects.toMatchObject({ code: "google_error" });
    expect(mocks.saveMeeting).not.toHaveBeenCalled();
  });
  it("no agenda contactos ajenos, fechas pasadas ni mientras se envía la confirmación", async () => {
    mocks.rows.length = 0; mocks.rows.push([]);
    await expect(scheduleMeeting(input)).rejects.toMatchObject({ code: "contact_not_found" });
    mocks.rows.push([{ id: "ct_A" }]);
    await expect(scheduleMeeting({ ...input, startIso: "2000-01-01T10:00:00Z" })).rejects.toMatchObject({ code: "invalid_date" });
    mocks.rows.push([{ id: "ct_A" }]); mocks.getMeeting.mockResolvedValue({ reminderStatus: "sending" });
    await expect(scheduleMeeting(input)).rejects.toMatchObject({ code: "meeting_busy" });
    expect(mocks.saveMeeting).not.toHaveBeenCalled();
  });
});
