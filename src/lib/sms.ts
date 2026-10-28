import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function usPhone(value: string): string | null {
  const phone = parsePhoneNumberFromString(value);
  return phone?.isValid() && phone.country === "US" ? phone.number : null;
}
const phone = z.string().trim().max(30).transform((v, ctx) => {
  const normalized = usPhone(v);
  if (!normalized) { ctx.addIssue({ code: "custom", message: "Usa un número válido de Estados Unidos con +1." }); return z.NEVER; }
  return normalized;
});
export const smsContactInput = z.object({
  name: z.string().trim().min(1).max(150), phone,
  consentEvidence: z.string().trim().min(10).max(1000),
}).strict();
export const smsSendInput = z.object({
  contactId: z.string().max(100), content: z.string().trim().min(1).max(1600),
  operationId: z.string().uuid(),
}).strict();
export const smsSenderInput = z.object({
  sender: phone, approvalEvidence: z.string().trim().min(10).max(1000),
  approved: z.literal(true),
}).strict();
export type SmsStatus = "sending" | "accepted" | "sent" | "delivered" | "failed" | "uncertain" | "received";
export const SMS_STATUS_LABEL: Record<SmsStatus, string> = {
  sending: "Enviando", accepted: "Aceptado por Brevo", sent: "Enviado", delivered: "Entregado",
  failed: "Fallido", uncertain: "Resultado incierto · no reenviar", received: "Recibido",
};
// GSM 03.38 extension characters occupy two septets. Unicode uses UTF-16 units.
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const EXT = "^{}\\[~]|€\f";
export function smsSegments(content: string) {
  const unicode = [...content].some(c => !GSM.includes(c) && !EXT.includes(c));
  const units = unicode ? content.length : [...content].reduce((n,c) => n + (EXT.includes(c) ? 2 : 1), 0);
  return { unicode, segments: Math.max(1, Math.ceil(units / (units <= (unicode ? 70 : 160) ? (unicode ? 70 : 160) : (unicode ? 67 : 153)))) };
}
export function isSmsStop(text: string) {
  return /^(stop|stopall|unsubscribe|cancel|end|quit|baja|salir|parar)[.!\s]*$/i.test(text.trim());
}
export function nextSmsStatus(current: SmsStatus, event: string): SmsStatus {
  if (current === "delivered" || current === "received") return current;
  if (event === "delivered") return "delivered";
  if (["hard_bounce", "soft_bounce", "rej", "rejected", "skip", "bl", "blocked"].includes(event)) return "failed";
  if (current === "failed") return current;
  if (event === "sent" && current !== "sent") return "sent";
  if (event === "accepted" && !["sent", "accepted"].includes(current)) return "accepted";
  return current;
}
