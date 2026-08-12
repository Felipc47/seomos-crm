import { z } from "zod";
import { getEnv, isEmailConfigured } from "@/lib/env";

const responseSchema = z.object({ id: z.string().trim().min(1) });
const recipientSchema = z.string().trim().email();

export class ResendError extends Error {
  constructor(public readonly safeMessage: string) {
    super(safeMessage);
    this.name = "ResendError";
  }
}

export type ResendEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

/** Única frontera con Resend. Nunca incluye el body del proveedor en errores. */
export async function sendResendEmail(
  input: ResendEmail
): Promise<{ id: string }> {
  if (!isEmailConfigured()) {
    throw new ResendError("Resend no está configurado");
  }
  const parsedTo = recipientSchema.safeParse(input.to);
  if (!parsedTo.success) throw new ResendError("Destinatario inválido");
  if (
    input.idempotencyKey.length < 1 ||
    input.idempotencyKey.length > 256
  ) {
    throw new ResendError("Clave idempotente inválida");
  }

  const env = getEnv();
  const base = env.RESEND_BASE_URL.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/emails`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY!}`,
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL!}>`,
        to: [parsedTo.data],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    throw new ResendError(
      error instanceof DOMException && error.name === "TimeoutError"
        ? "Timeout al contactar Resend"
        : "No se pudo contactar Resend"
    );
  }

  if (!response.ok) {
    throw new ResendError(`Resend respondió HTTP ${response.status}`);
  }
  const body = await response.json().catch(() => null);
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new ResendError("Respuesta inválida de Resend");
  return parsed.data;
}
