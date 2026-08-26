import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isEmailConfigured: vi.fn(() => true),
  sendResendEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isEmailConfigured: mocks.isEmailConfigured,
}));

vi.mock("@/lib/resend/client", () => ({
  ResendError: class ResendError extends Error {
    constructor(public readonly safeMessage: string) {
      super(safeMessage);
    }
  },
  sendResendEmail: mocks.sendResendEmail,
}));

import {
  buildPasswordResetEmail,
  deliverPasswordResetEmail,
  passwordResetIdempotencyKey,
} from "@/server/email/password-reset";

describe("password reset email", () => {
  beforeEach(() => {
    mocks.isEmailConfigured.mockReturnValue(true);
    mocks.sendResendEmail.mockReset();
  });

  it("escapa nombre y URL en HTML sin alterar el texto plano", () => {
    const email = buildPasswordResetEmail({
      userName: `<Ada & "Co">`,
      url: "https://crm.example/reset?token=a&callback=b",
    });

    expect(email.subject).toBe("Restablece tu contraseña de Seomos CRM");
    expect(email.html).toContain("&lt;Ada &amp; &quot;Co&quot;&gt;");
    expect(email.html).toContain("token=a&amp;callback=b");
    expect(email.html).not.toContain(`<Ada & "Co">`);
    expect(email.text).toContain(`<Ada & "Co">`);
    expect(email.text).toContain("https://crm.example/reset?token=a&callback=b");
    expect(email.text).toContain("60 minutos");
  });

  it("deriva una clave idempotente estable sin incluir el token", () => {
    const token = "secreto-recuperacion-123";
    const first = passwordResetIdempotencyKey(token);
    const second = passwordResetIdempotencyKey(token);

    expect(first).toBe(second);
    expect(first).toMatch(/^password-reset\/[a-f0-9]{64}$/);
    expect(first).not.toContain(token);
    expect(first.length).toBeLessThanOrEqual(256);
  });

  it("degrada sin lanzar ni registrar el error crudo del proveedor", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sendResendEmail.mockRejectedValueOnce(
      new Error("payload secreto del proveedor")
    );

    await expect(
      deliverPasswordResetEmail({
        to: "ada@example.com",
        userName: "Ada",
        url: "https://crm.example/reset",
        token: "token-secreto",
      })
    ).resolves.toEqual({ status: "failed" });
    expect(log).toHaveBeenCalledWith(
      "[email] restablecimiento falló: Fallo inesperado al enviar correo"
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "payload secreto del proveedor"
    );
    log.mockRestore();
  });

  it("no intenta entrega cuando Resend no está configurado", async () => {
    mocks.isEmailConfigured.mockReturnValueOnce(false);
    await expect(
      deliverPasswordResetEmail({
        to: "ada@example.com",
        userName: "Ada",
        url: "https://crm.example/reset",
        token: "token-secreto",
      })
    ).resolves.toEqual({ status: "unconfigured" });
    expect(mocks.sendResendEmail).not.toHaveBeenCalled();
  });
});
