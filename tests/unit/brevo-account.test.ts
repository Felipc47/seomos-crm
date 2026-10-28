import { afterEach, describe, expect, it, vi } from "vitest";
import { getSmsAccount, parseSmsAccount } from "@/lib/brevo/account";
const env = vi.hoisted(() => ({ mock: false }));
vi.mock("@/lib/env", () => ({ isMockEnabled: () => env.mock, getEnv: () => ({ APP_BASE_URL: "http://localhost:3110" }) }));
afterEach(() => { vi.unstubAllGlobals(); env.mock = false; });
describe("Brevo SMS connection", () => {
  it("projects identity and SMS credits without returning provider secrets", () => {
    const account = parseSmsAccount({ email: "admin@example.test", companyName: "Example", plan: [{ type: "sms", credits: 25 }, { type: "subscription", credits: 500 }], marketingAutomation: { key: "secret" } });
    expect(account).toEqual({ email: "admin@example.test", companyName: "Example", smsCredits: 25 });
    expect(JSON.stringify(account)).not.toContain("secret");
  });
  it("keeps zero balance distinct from unavailable balance", () => {
    expect(parseSmsAccount({ email: "a@example.test", plan: [{ type: "sms", credits: 0 }] }).smsCredits).toBe(0);
    expect(parseSmsAccount({ email: "a@example.test", plan: [] }).smsCredits).toBeNull();
    expect(parseSmsAccount({ email: "a@example.test", plan: [{ type: "sms" }] }).smsCredits).toBeNull();
  });
  it.each([{}, { email: "broken" }, { email: "a@example.test", plan: [{ type: "sms", credits: -1 }] }])("rejects malformed account %j", raw => { expect(() => parseSmsAccount(raw)).toThrow("brevo_invalid_response"); });
  it("only calls the fixed provider host with no redirects or retries", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ email: "a@example.test" })); vi.stubGlobal("fetch", fetcher);
    await getSmsAccount("fictitious-key");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("https://api.brevo.com/v3/account", expect.objectContaining({ redirect: "error", cache: "no-store", headers: { "api-key": "fictitious-key", accept: "application/json" } }));
  });
  it("mock mode routes every key to the local provider", async () => {
    env.mock = true;
    const fetcher = vi.fn().mockResolvedValue(Response.json({ email: "a@example.test" })); vi.stubGlobal("fetch", fetcher);
    await getSmsAccount("could-be-live-key");
    expect(fetcher.mock.calls[0]![0]).toBe("http://localhost:3110/api/dev/brevo-mock/account");
  });
  it.each([[401, "auth"], [403, "auth"], [429, "rate_limit"], [503, "unavailable"]])("sanitizes HTTP %s without exposing response/key", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive provider body", { status: Number(status) })));
    await expect(getSmsAccount("private-key")).rejects.toMatchObject({ code, message: `brevo_${code}` });
  });
  it("handles invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive provider body")));
    await expect(getSmsAccount("private-key")).rejects.toMatchObject({ code: "invalid_response", message: "brevo_invalid_response" });
  });
  it("does not retry on timeout or connection failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("private-key")); vi.stubGlobal("fetch", fetcher);
    await expect(getSmsAccount("private-key")).rejects.toMatchObject({ code: "unavailable", message: "brevo_unavailable" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
