import { createHash } from "node:crypto";
import { isEmailConfigured } from "@/lib/env";
import { ResendError, sendResendEmail } from "@/lib/resend/client";
import { escapeEmailHtml } from "./new-lead";

export type PasswordResetDeliveryResult =
  | { status: "sent" }
  | { status: "failed" }
  | { status: "unconfigured" };

export function passwordResetIdempotencyKey(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex");
  return `password-reset/${digest}`;
}

export function buildPasswordResetEmail(input: {
  userName: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const name = input.userName.trim() || "Hola";
  const safeName = escapeEmailHtml(name);
  const safeUrl = escapeEmailHtml(input.url);
  const subject = "Restablece tu contraseña de Seomos CRM";
  return {
    subject,
    html: `<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#17251d"><div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #dce7df;border-radius:14px;overflow:hidden"><div style="padding:20px 24px;background:#102018;color:#fff"><strong style="color:#25D366">Seomos CRM</strong><h1 style="font-size:22px;margin:8px 0 0">Restablece tu contraseña</h1></div><div style="padding:24px"><p>Hola ${safeName},</p><p>Recibimos una solicitud para restablecer tu contraseña. Este enlace funciona una sola vez y vence en 60 minutos.</p><a href="${safeUrl}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:8px;background:#25D366;color:#082d18;text-decoration:none;font-weight:700">Crear nueva contraseña</a><p style="margin-top:24px;color:#52645a;font-size:13px">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá funcionando.</p></div></div></body></html>`,
    text: `Hola ${name},\n\nRecibimos una solicitud para restablecer tu contraseña de Seomos CRM. Este enlace funciona una sola vez y vence en 60 minutos:\n\n${input.url}\n\nSi no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá funcionando.`,
  };
}

/** Entrega un enlace sin persistir ni registrar correo, URL o token. */
export async function deliverPasswordResetEmail(input: {
  to: string;
  userName: string;
  url: string;
  token: string;
}): Promise<PasswordResetDeliveryResult> {
  if (!isEmailConfigured()) return { status: "unconfigured" };
  const content = buildPasswordResetEmail(input);
  try {
    await sendResendEmail({
      to: input.to,
      ...content,
      idempotencyKey: passwordResetIdempotencyKey(input.token),
    });
    return { status: "sent" };
  } catch (error) {
    const safeMessage =
      error instanceof ResendError
        ? error.safeMessage
        : "Fallo inesperado al enviar correo";
    console.error(`[email] restablecimiento falló: ${safeMessage}`);
    return { status: "failed" };
  }
}
