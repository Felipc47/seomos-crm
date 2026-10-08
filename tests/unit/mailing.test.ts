import { createHmac } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
vi.mock("@/lib/env", () => ({ isMockEnabled: () => true, getEnv: () => ({ BETTER_AUTH_SECRET: "mailing-unit-secret-028", RESEND_API_KEY: "re_unit", RESEND_BASE_URL: "https://mock.invalid" }) }));
import { eligibleSubscriber, mailingStepsSchema, parseMailingCsv, renderMail, senderSchema, stepDueAt } from "@/lib/mailing";
import { readUnsubscribeToken, unsubscribeToken, verifyMailingWebhook } from "@/server/mailing/security";
import { MailingProviderError, sendMailingEmail } from "@/lib/resend/mailing";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("mailing independiente y consentimiento", () => {
    it("requiere permiso y excluye bajas y supresiones", () => {
        expect(eligibleSubscriber({ consentAt: null, unsubscribedAt: null, suppressedAt: null })).toBe(false);
        expect(eligibleSubscriber({ consentAt: new Date(), unsubscribedAt: null, suppressedAt: null })).toBe(true);
        expect(eligibleSubscriber({ consentAt: new Date(), unsubscribedAt: new Date(), suppressedAt: null })).toBe(false);
        expect(eligibleSubscriber({ consentAt: new Date(), unsubscribedAt: null, suppressedAt: new Date() })).toBe(false);
    });
    it("importa CSV citado, normaliza emails y no requiere teléfono", () => {
        expect(parseMailingCsv('email,nombre\nANA@example.com,"Ana, Pérez"\n', true)).toEqual([{ email: "ana@example.com", name: "Ana, Pérez", consent: true }]);
        expect(parseMailingCsv("correo;nombre\nbob@example.com;Bob", false)[0]?.consent).toBe(false);
        expect(() => parseMailingCsv('ana@example.com,"sin cierre', true)).toThrow();
    });
    it("limita remitente al dominio elegido y evita inyección de headers", () => {
        const sender = { action: "configure", domain: "correo.example.com", fromEmail: "hola@correo.example.com", fromName: "Empresa" };
        expect(senderSchema.safeParse(sender).success).toBe(true);
        expect(senderSchema.safeParse({ ...sender, fromEmail: "hola@otra.example.com" }).success).toBe(false);
        expect(senderSchema.safeParse({ ...sender, fromName: "Empresa\nBcc: ajeno" }).success).toBe(false);
    });
});
describe("reloj y contenido", () => {
    it("cuenta 7/14/21 días absolutos desde inscripción, incluso cruce de mes", () => {
        const start = new Date("2026-10-28T15:00:00Z");
        expect([7, 14, 21].map((d) => stepDueAt(start, d).toISOString())).toEqual(["2026-11-04T15:00:00.000Z", "2026-11-11T15:00:00.000Z", "2026-11-18T15:00:00.000Z"]);
        expect(mailingStepsSchema.safeParse([{ day: 7, subject: "X", body: "X" }, { day: 7, subject: "Y", body: "Y" }]).success).toBe(false);
    });
    it("personaliza, escapa HTML y añade baja sin código activo", () => {
        const mail = renderMail({ day: 7, subject: "Hola {{nombre}}", body: "Hola {{nombre}}\n<script>alert(1)</script>\nhttps://example.com" }, 'Ana <img src=x onerror="x">', "https://example.com/baja?token=x&y=z");
        expect(mail.html).not.toContain("<script>");
        expect(mail.html).not.toContain("<img");
        expect(mail.html).toContain("https://example.com/baja?token=x&amp;y=z");
        expect(mail.text).toContain("Dejar de recibir");
    });
});
describe("tokens y webhooks", () => {
    it("firma tenant, suscriptor y nonce; rechaza alteraciones", () => {
        const token = unsubscribeToken("org_a", "msu_1", "nonce");
        expect(readUnsubscribeToken(token)).toEqual(["org_a", "msu_1", "nonce"]);
        expect(readUnsubscribeToken(`x${token}`)).toBeNull();
        expect(readUnsubscribeToken(`${token.slice(0, -4)}oops`)).toBeNull();
    });
    it("verifica body crudo, timestamp y firma múltiple sin aceptar replay antiguo", () => {
        const key = Buffer.from("test-webhook-key-028-12345");
        const secret = `whsec_${key.toString("base64")}`;
        const body = '{"type":"email.delivered"}';
        const timestamp = "1780000000";
        const signature = createHmac("sha256", key).update(`evt_1.${timestamp}.${body}`).digest("base64");
        const headers = new Headers({ "svix-id": "evt_1", "svix-timestamp": timestamp, "svix-signature": `v1,invalid v1,${signature}` });
        expect(verifyMailingWebhook(body, headers, secret, Number(timestamp) * 1000)).toBe(true);
        expect(verifyMailingWebhook(`${body} `, headers, secret, Number(timestamp) * 1000)).toBe(false);
        expect(verifyMailingWebhook(body, headers, secret, Number(timestamp) * 1000 + 301000)).toBe(false);
    });
});
describe("proveedor tolerante", () => {
    const payload = { from: "Empresa <hola@example.com>", to: "ana@example.com", subject: "X", html: "X", text: "X" };
    it("rechaza respuestas incompletas sin inventar aceptación", async () => {
        vi.stubEnv("RESEND_API_KEY", "re_unit");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"other":true}', { status: 200 })));
        await expect(sendMailingEmail(payload, "mse_1")).rejects.toMatchObject({ uncertain: true, retryable: true });
    });
    it("maneja 429 sin exponer respuesta cruda ni secreto", async () => {
        vi.stubEnv("RESEND_API_KEY", "re_unit");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret-not-for-logs", { status: 429, headers: { "retry-after": "120" } })));
        try {
            await sendMailingEmail(payload, "mse_1");
            throw new Error("No rechazó");
        }
        catch (e) {
            expect(e).toBeInstanceOf(MailingProviderError);
            expect(e).toMatchObject({ safeMessage: "Resend respondió HTTP 429", retryable: true, uncertain: false, retryAfterSeconds: 120 });
        }
    });
});
