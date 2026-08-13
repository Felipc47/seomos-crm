import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  parseWebFormRequest,
  parseWebFormSubmission,
} from "@/server/web-forms/contract";
import {
  consumeWebFormRateLimit,
  resetWebFormRateLimitsForTests,
} from "@/server/web-forms/rate-limit";

beforeAll(() => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.BETTER_AUTH_SECRET = "secret-de-test-suficiente";
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 13).toString("base64");
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-token-test";
});

describe("contrato de formularios web", () => {
  it("normaliza el contrato canónico y descarta campos extra", () => {
    expect(
      parseWebFormSubmission({
        externalId: " entry-1 ",
        phone: "+57 (300) 123-4567",
        name: " Ana ",
        consent: "yes",
        password: "no debe persistirse",
      })
    ).toEqual({
      externalId: "entry-1",
      phone: "573001234567",
      name: "Ana",
      consent: true,
    });
  });

  it("acepta aliases de constructores WordPress", () => {
    const parsed = parseWebFormSubmission({
      submission_id: "cf7-99",
      "your-phone": "https://wa.me/573001112233",
      "your-name": "Ada Web",
      "your-email": "ada@example.com",
      "your-message": "Necesito SEO",
      utm_campaign: "brand",
      acceptance: "on",
    });
    expect(parsed).toMatchObject({
      externalId: "cf7-99",
      phone: "573001112233",
      name: "Ada Web",
      email: "ada@example.com",
      message: "Necesito SEO",
      campaign: "brand",
      consent: true,
    });
  });

  it("rechaza teléfono e identificador inválidos sin repetir valores", () => {
    expect(() =>
      parseWebFormSubmission({ externalId: "", phone: "secreto-123" })
    ).toThrowError("Campos inválidos: externalId");
    expect(() =>
      parseWebFormSubmission({ externalId: "entry-2", phone: "secreto-123" })
    ).toThrowError("Campos inválidos: phone");
  });

  it("produce el mismo resultado desde JSON y form-urlencoded", async () => {
    const json = new Request("http://local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalId: "same", phone: "+573001234567" }),
    });
    const form = new Request("http://local", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "submission_id=same&your-phone=%2B573001234567",
    });
    await expect(parseWebFormRequest(json)).resolves.toEqual(
      await parseWebFormRequest(form)
    );
  });

  it("limita cuerpos y content-types no admitidos", async () => {
    const unsupported = new Request("http://local", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hola",
    });
    await expect(parseWebFormRequest(unsupported)).rejects.toMatchObject({
      status: 415,
      code: "unsupported_media_type",
    });

    const huge = new Request("http://local", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "40000",
      },
      body: "{}",
    });
    await expect(parseWebFormRequest(huge)).rejects.toMatchObject({
      status: 413,
      code: "body_too_large",
    });
  });
});

describe("rate limit de formularios web", () => {
  beforeEach(resetWebFormRateLimitsForTests);

  it("acepta 120 intentos por minuto y reinicia la ventana", () => {
    for (let i = 0; i < 120; i++) {
      expect(consumeWebFormRateLimit("wfi_1", "127.0.0.1", 1_000)).toBe(true);
    }
    expect(consumeWebFormRateLimit("wfi_1", "127.0.0.1", 1_000)).toBe(false);
    expect(consumeWebFormRateLimit("wfi_1", "127.0.0.1", 61_001)).toBe(true);
  });
});

describe("secreto de formularios web", () => {
  it("se cifra, se compara en forma segura y no acepta otro valor", async () => {
    const { generateWebFormSecret, webFormSecretMatches } = await import(
      "@/server/web-forms/credentials"
    );
    const generated = generateWebFormSecret();
    expect(generated.encrypted.secretCipher).not.toContain(generated.secret);
    expect(webFormSecretMatches(generated.secret, generated.encrypted)).toBe(true);
    expect(webFormSecretMatches("wf_incorrecto", generated.encrypted)).toBe(false);
  });
});
