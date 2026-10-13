import { afterEach, describe, expect, it, vi } from "vitest";
import { graphRequest, MetaApiError } from "@/lib/meta/client";
vi.mock("@/lib/env", () => ({ getEnv: () => ({ META_GRAPH_BASE_URL: "https://meta.test", META_GRAPH_API_VERSION: "v25.0" }) }));
afterEach(() => vi.unstubAllGlobals());
describe("deadline de confirmación de reuniones", () => {
  it("corta el transporte bloqueado y devuelve un error incierto sin secretos", async () => {
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener("abort", () => reject(new Error("Timeout")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = AbortSignal.timeout(25);
    const error = await graphRequest("phone/messages", { method: "POST", token: "fictitious-only", body: {}, signal }).catch(err => err);
    expect(error).toBeInstanceOf(MetaApiError);
    if (!(error instanceof MetaApiError)) throw new Error("Se esperaba error de transporte Meta");
    expect(error.status).toBe(0);
    expect(error.message).not.toContain("fictitious-only");
    expect(fetchMock.mock.calls[0]?.[1].signal).toBe(signal);
  });
});
