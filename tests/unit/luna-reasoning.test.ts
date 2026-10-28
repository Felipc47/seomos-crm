import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const output = z.object({ action: z.literal("reply"), text: z.string() });
const response = (content = '{"action":"reply","text":"Hola"}') => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ APP_BASE_URL: "http://localhost:3107", DATABASE_URL: "postgresql://test@localhost/test", BETTER_AUTH_SECRET: "luna-unit-test-secret", ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"), META_WEBHOOK_VERIFY_TOKEN: "luna-test-verify", OPENROUTER_API_TOKEN: "test-token", OPENROUTER_MODEL: "gpt-6-luna", OPENROUTER_JUDGE_MODEL: "gpt-5.6-luna", OPENROUTER_VISION_MODEL: "", OPENROUTER_REASONING_EFFORT: "xhigh" })) vi.stubEnv(key, value);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("razonamiento del modelo principal", () => {
  it("envía Luna reciente y el esfuerzo solicitado para responder mensajes", async () => {
    const mock = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", mock);
    const { chatJson } = await import("@/lib/ai");
    expect((await chatJson(output, [{ role: "user", content: "Hola" }])).ok).toBe(true);
    const body = JSON.parse(mock.mock.calls[0]![1].body);
    expect(body).toMatchObject({ model: "gpt-6-luna", reasoning_effort: "xhigh" });
    expect(body.temperature).toBeUndefined(); expect(body.tools).toBeUndefined();
  });
  it("sin configuración explícita conserva el request anterior", async () => {
    vi.stubEnv("OPENROUTER_REASONING_EFFORT", "");
    const mock = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", mock);
    const { chatJson } = await import("@/lib/ai"); await chatJson(output, [{ role: "user", content: "Hola" }]);
    expect(JSON.parse(mock.mock.calls[0]![1].body)).not.toHaveProperty("reasoning_effort");
  });
  it("el perfilado conserva su modelo y no hereda esfuerzo foreground", async () => {
    const mock = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", mock);
    const { chatJson } = await import("@/lib/ai"); await chatJson(output, [{ role: "user", content: "Perfil" }], { background: true });
    const body = JSON.parse(mock.mock.calls[0]![1].body);
    expect(body.model).toBe("gpt-5.6-luna"); expect(body).not.toHaveProperty("reasoning_effort");
  });
  it("no aplica parámetros a un modelo de visión distinto", async () => {
    vi.stubEnv("OPENROUTER_VISION_MODEL", "vision-pinned");
    const mock = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", mock);
    const { chatJson } = await import("@/lib/ai"); await chatJson(output, [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,dGVzdA==" } }] }]);
    const body = JSON.parse(mock.mock.calls[0]![1].body);
    expect(body.model).toBe("vision-pinned"); expect(body).not.toHaveProperty("reasoning_effort");
  });
  it("la visión que usa el modelo principal conserva su esfuerzo", async () => {
    const mock = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", mock);
    const { chatJson } = await import("@/lib/ai"); await chatJson(output, [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,dGVzdA==" } }] }]);
    expect(JSON.parse(mock.mock.calls[0]![1].body)).toMatchObject({ model: "gpt-6-luna", reasoning_effort: "xhigh" });
  });
  it("formato inesperado reintenta conservando el esfuerzo y recupera JSON envuelto", async () => {
    const mock = vi.fn().mockResolvedValueOnce(response("sin JSON")).mockResolvedValueOnce(response('Respuesta: ```json\n{"action":"reply","text":"Recuperado"}\n```')); vi.stubGlobal("fetch", mock);
    const { chatJson } = await import("@/lib/ai");
    expect(await chatJson(output, [{ role: "user", content: "Hola" }])).toMatchObject({ ok: true, data: { text: "Recuperado" } });
    expect(mock).toHaveBeenCalledTimes(2);
    for (const call of mock.mock.calls) expect(JSON.parse(call[1].body).reasoning_effort).toBe("xhigh");
  });
  it("rechaza valores de esfuerzo ajenos al contrato sin enviarlos al proveedor", async () => {
    vi.stubEnv("OPENROUTER_REASONING_EFFORT", "ultra-inventado");
    const { getEnv } = await import("@/lib/env"); expect(() => getEnv()).toThrow(/OPENROUTER_REASONING_EFFORT/);
  });
});
