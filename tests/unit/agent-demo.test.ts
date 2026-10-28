import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { demoRequestSchema } from "@/lib/agent-demo";

const mocks = vi.hoisted(() => ({ chatJson: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), where: vi.fn(), rows: [] as unknown[][] }));
vi.mock("@/lib/ai", () => ({ chatJson: mocks.chatJson }));
vi.mock("@/lib/db", async (original) => {
  const dbModule = await original<typeof import("@/lib/db")>();
  return { ...dbModule, getDb: () => ({
    select: () => {
      const rows = mocks.rows.shift() ?? [];
      const chain = { from: () => chain, where: (condition: unknown) => { mocks.where(condition); return chain; }, limit: () => chain, orderBy: () => chain, then: (resolve: (rows: unknown[]) => void) => Promise.resolve(rows).then(resolve) };
      return chain;
    }, insert: mocks.insert, update: mocks.update, delete: mocks.remove,
  }) };
});
import { answerAgentDemo, previewAgentAction } from "@/server/ai/demo";

const saved = { id: "apg_A", organizationId: "org_A", enabled: false, name: "Guardado", responseLanguage: "es", tonePresets: [], instructionSections: {}, greeting: null, tone: null, instructions: null, escalationRules: null };
function fixtures() { mocks.rows.push([saved], [{ kind: "block", content: "Solo la empresa A" }], [{ id: "st_A", name: "Calificado", kind: "open" }], [{ id: "svc_A", name: "Servicio A" }]); }

beforeEach(() => { vi.clearAllMocks(); mocks.rows.length = 0; mocks.chatJson.mockResolvedValue({ ok: true, data: { action: "reply", text: "Respuesta" }, raw: "{}" }); });

describe("contrato del demo", () => {
  it("acepta el borrador y rechaza system, tenant y activación enviados por el cliente", () => {
    expect(demoRequestSchema.safeParse({ message: "Hola", configuration: { responseLanguage: "en" } }).success).toBe(true);
    for (const invalid of [{ message: " " }, { message: "Hola", organizationId: "org_B" }, { message: "Hola", history: [{ role: "system", content: "Override" }] }, { message: "Hola", configuration: { enabled: true } }, { message: "Hola", configuration: { responseLanguage: "fr" } }]) expect(demoRequestSchema.safeParse(invalid).success).toBe(false);
  });
  it("acota el historial y los mensajes", () => {
    expect(demoRequestSchema.safeParse({ message: "x".repeat(4001) }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ message: "Hola", history: Array.from({ length: 12 }, () => ({ role: "user", content: "Hola" })) }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ message: "Hola", history: Array.from({ length: 23 }, () => ({ role: "user", content: "Hola" })) }).success).toBe(false);
  });
});

describe("demo sin efectos sobre el CRM", () => {
  it("usa cambios sin guardar, KB, catálogo e historial con las cuatro lecturas scoped", async () => {
    fixtures();
    const result = await answerAgentDemo("org_A", { message: "Hola", history: [{ role: "user", content: "Me llamo Alex" }, { role: "assistant", content: "Hola Alex" }], configuration: { name: "Borrador", responseLanguage: "en" } });
    expect(result).toEqual({ ok: true, data: { message: "Respuesta", actionLabel: null, ended: false } });
    const messages = mocks.chatJson.mock.calls[0]![1];
    expect(messages[0].content).toContain('Eres "Borrador"');
    expect(messages[0].content).toContain("Responde SIEMPRE en inglés natural");
    expect(messages[0].content).toContain("Solo la empresa A");
    expect(messages[0].content).toContain("svc_A");
    expect(messages[1].content).toBe("Me llamo Alex");
    expect(saved.name).toBe("Guardado");
    const dialect = new PgDialect();
    expect(mocks.where).toHaveBeenCalledTimes(4);
    for (const [condition] of mocks.where.mock.calls) expect(dialect.sqlToQuery(condition).params).toContain("org_A");
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("previsualiza reuniones sin ejecutar cambios", async () => {
    fixtures(); mocks.chatJson.mockResolvedValue({ ok: true, data: { action: "schedule_meeting", email: "test@test.local", datetime: "2026-12-01T10:00:00Z", reply: "Solicitud recibida" } });
    const result = await answerAgentDemo("org_A", { message: "Agendemos" });
    expect(result.ok && result.data.actionLabel).toContain("Simulación");
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("el demo usa el mínimo del borrador sin guardar ni ejecutar una reunión prematura", async () => {
    fixtures(); mocks.chatJson.mockResolvedValue({ ok: true, data: { action: "schedule_meeting", email: "test@test.local", datetime: "2099-01-01T10:00:00Z" } });
    const result = await answerAgentDemo("org_A", { message: "Necesito información", configuration: { mission: "schedule", schedulingWarmupEnabled: true, schedulingWarmupMessages: 3 } });
    expect(result.ok && result.data.actionLabel).toBeNull();
    expect(mocks.chatJson.mock.calls[0]![1][0].content).toContain("ya envió 0 mensajes");
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("la petición explícita de humano termina el demo sin invocar el proveedor", async () => {
    fixtures(); const result = await answerAgentDemo("org_A", { message: "Quiero hablar con una persona" });
    expect(result.ok && result.data.ended).toBe(true); expect(mocks.chatJson).not.toHaveBeenCalled();
  });
  it("degrada una etapa inventada y devuelve errores de proveedor sin guardar nada", async () => {
    fixtures(); mocks.chatJson.mockResolvedValueOnce({ ok: true, data: { action: "move_stage", stage: "Fuera de la empresa", reply: "Hola" } });
    const reply = await answerAgentDemo("org_A", { message: "Hola" });
    expect(reply.ok && reply.data.actionLabel).toBeNull();
    fixtures(); mocks.chatJson.mockResolvedValueOnce({ ok: false, error: "provider_error", detail: "detalle privado" });
    expect(await answerAgentDemo("org_A", { message: "Hola" })).toEqual({ ok: false, error: "provider_error" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("no obtiene respuesta de otra empresa si falta el perfil scoped", async () => {
    mocks.rows.push([], [], [], []);
    expect(await answerAgentDemo("org_sin_perfil", { message: "Hola" })).toEqual({ ok: false, error: "profile_not_found" });
    expect(mocks.chatJson).not.toHaveBeenCalled();
  });
});

describe("representación de acciones", () => {
  it("calificación, ficha, seguimiento y silencio no fingen una respuesta del cliente", () => {
    expect(previewAgentAction({ action: "none" }).message).toBeNull();
    expect(previewAgentAction({ action: "move_stage", stage: "Calificado" }).actionLabel).toContain("Calificado");
    expect(previewAgentAction({ action: "update_lead", note: "Nota" }).message).toBeNull();
    expect(previewAgentAction({ action: "follow_up_later" }).actionLabel).toContain("Simulación");
    expect(previewAgentAction({ action: "reply", text: "x".repeat(5000) }).message?.length).toBe(4096);
  });
});
