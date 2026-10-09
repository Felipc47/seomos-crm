import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findHelpGuides, getHelpGuides, getHelpScreen, getHelpSuggestions, type HelpAccess } from "@/lib/help-guides";
import { answerHelpQuestion, helpRequestSchema } from "@/server/ai/help-assistant";

const admin: HelpAccess = { role: "owner", isSuperadmin: true, mailingEnabled: true };
const commercial: HelpAccess = { role: "commercial", isSuperadmin: false, mailingEnabled: false };
const input = { question: "¿Cómo cambio la etapa de un prospecto?", pathname: "/pipeline", history: [] };
function completion(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("documentación de ayuda según acceso e intención", () => {
  it("orienta sobre etapas, DNS y automatizaciones sin depender de acentos", () => {
    const guides = getHelpGuides(admin);
    expect(findHelpGuides("cambiar etapa prospecto", "/pipeline", guides)[0]?.id).toBe("pipeline");
    expect(findHelpGuides("verificar remitente DNS", "/mailing", guides)[0]?.id).toBe("mailing-dns");
    expect(findHelpGuides("automatizar correos a los 7 14 21 dias", "/mailing", guides)[0]?.id).toBe("mailing-sequence");
    expect(findHelpGuides("cotizacion de bitcoin", "/inbox", guides)).toEqual([]);
  });
  it("excluye administración, agente y mailing deshabilitado para comerciales", () => {
    const guides = getHelpGuides(commercial);
    expect(guides.some((guide) => guide.id === "contacts")).toBe(true);
    expect(guides.some((guide) => ["agent", "team", "companies", "mailing", "mailing-dns", "mailing-sequence"].includes(guide.id))).toBe(false);
    expect(getHelpScreen("/companies?secret=abc", guides).pathname).toBe("");
    expect(getHelpSuggestions("/inbox", guides)).toContain("¿Cómo respondo a un cliente?");
  });
  it("el editor solo recibe la operación de bandeja, agente y cuenta", () => {
    const guides = getHelpGuides({ role: "agent_editor", isSuperadmin: false, mailingEnabled: true });
    expect(guides.map((guide) => guide.id)).toEqual(["inbox", "whatsapp-window", "handoff", "agent", "knowledge", "profile", "password"]);
  });
  it("marketing recibe Mailing operativo cuando está habilitado, sin configurar DNS", () => {
    const guides = getHelpGuides({ role: "marketing", isSuperadmin: false, mailingEnabled: true });
    expect(guides.some((guide) => guide.id === "mailing")).toBe(true);
    expect(guides.some((guide) => guide.id === "mailing-dns")).toBe(false);
  });
  it("rechaza historial excesivo, pregunta vacía y permisos enviados por el cliente", () => {
    expect(helpRequestSchema.safeParse({ ...input, question: " " }).success).toBe(false);
    expect(helpRequestSchema.safeParse({ ...input, history: Array.from({ length: 7 }, () => ({ role: "user", content: "hola" })) }).success).toBe(false);
    expect(helpRequestSchema.safeParse({ ...input, role: "owner" }).success).toBe(false);
  });
});

describe("respuesta fundamentada y degradación del proveedor", () => {
  beforeEach(() => {
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5433/test");
    vi.stubEnv("BETTER_AUTH_SECRET", "help-test-secret-sufficient");
    vi.stubEnv("ENCRYPTION_KEY", Buffer.alloc(32, 3).toString("base64"));
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "test-verify");
    vi.stubEnv("OPENROUTER_API_TOKEN", "test-token");
    vi.stubEnv("OPENROUTER_MODEL", "test-model");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("extrae JSON envuelto y solo expone enlaces del catálogo autorizado", async () => {
    const fetch = vi.fn().mockResolvedValue(completion('Respuesta:\n```json\n{"answer":"Puedes cambiar la etapa en el tablero.","guideIds":["pipeline"]}\n```'));
    vi.stubGlobal("fetch", fetch);
    const reply = await answerHelpQuestion(input, commercial);
    expect(reply.mode).toBe("ai");
    expect(reply.guides[0]?.href).toBe("/pipeline");
    const payload = JSON.parse(fetch.mock.calls[0]![1]!.body as string);
    expect(payload.messages[0].content).not.toContain('"id":"companies"');
    expect(payload.messages[0].content).not.toContain('"id":"mailing"');
    expect(payload.messages[0].content).toContain("No ejecutas acciones");
  });
  it("no acepta IDs administrativos inventados para comerciales", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion('{"answer":"Abre empresas","guideIds":["companies"]}')));
    const reply = await answerHelpQuestion(input, commercial);
    expect(reply.mode).toBe("guide");
    expect(reply.guides[0]?.id).toBe("pipeline");
    expect(reply.guides.some((guide) => guide.href === "/companies")).toBe(false);
  });
  it("rechaza URLs y markup propuestos por el modelo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion('{"answer":"Ve a https://example.com","guideIds":["pipeline"]}')));
    const reply = await answerHelpQuestion(input, commercial);
    expect(reply.mode).toBe("guide");
    expect(reply.answer).not.toContain("example.com");
  });
  it("sin IA sigue mostrando pasos y no llama a un proveedor", async () => {
    vi.stubEnv("OPENROUTER_API_TOKEN", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const reply = await answerHelpQuestion(input, commercial);
    expect(reply.mode).toBe("guide");
    expect(reply.guides[0]?.steps.length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("tres formatos inválidos terminan en ayuda útil y un seguimiento conserva el tema", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(completion("respuesta inválida")));
    vi.stubGlobal("fetch", fetch);
    const reply = await answerHelpQuestion({ question: "¿Y después?", pathname: "/pipeline", history: [{ role: "user", content: input.question }] }, commercial);
    expect(reply.mode).toBe("guide");
    expect(reply.guides[0]?.id).toBe("pipeline");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
