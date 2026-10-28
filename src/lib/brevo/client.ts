import { z } from "zod";
import { getEnv, isMockEnabled } from "@/lib/env";
import { smsSegments } from "@/lib/sms";

export class SmsProviderError extends Error {
  constructor(public code: "auth" | "rate_limit" | "rejected" | "uncertain" | "unavailable") { super(`sms_${code}`); }
}
async function call(key: string, path: string, payload: unknown, method = "POST") {
  const base = isMockEnabled() ? `${getEnv().APP_BASE_URL}/api/dev/brevo-mock` : "https://api.brevo.com/v3";
  let r: Response;
  try {
    r = await fetch(`${base}${path}`, { method, headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(12000), redirect: "error", cache: "no-store" });
  } catch { throw new SmsProviderError("uncertain"); }
  if (r.status === 401 || r.status === 403) throw new SmsProviderError("auth");
  if (r.status === 429) throw new SmsProviderError("rate_limit");
  // Server failures can occur after acceptance: never retry a chargeable write.
  if (r.status >= 500 || r.status === 408) throw new SmsProviderError("uncertain");
  if (!r.ok) throw new SmsProviderError("rejected");
  if (r.status === 204) return {};
  try { const raw = await r.text(); if (raw.length > 50000) throw new Error(); return JSON.parse(raw) as unknown; }
  catch { throw new SmsProviderError("uncertain"); }
}
const id = z.union([z.string().min(1).max(150), z.number().int().safe().positive()]).transform(String);
export async function sendBrevoSms(key: string, input: { recipient: string; sender: string; content: string; tag: string }) {
  const raw = await call(key, "/transactionalSMS/send", { ...input, type: "transactional", unicodeEnabled: smsSegments(input.content).unicode });
  const parsed = z.object({ messageId: id }).safeParse(raw);
  if (!parsed.success) throw new SmsProviderError("uncertain");
  return parsed.data.messageId;
}
export async function registerSmsWebhook(key: string, url: string, token: string) {
  const raw = await call(key, "/webhooks", {
    url, type: "transactional", channel: "sms", description: "SEOMOS CRM SMS",
    // Subscription names differ from callback msg_status: `reply` -> `replied`.
    // SMS uses `unsubscribe` (singular), unlike email `unsubscribed`.
    // SMS-specific names verified with a successful live API registration.
    events: ["sent", "accepted", "delivered", "reply", "softBounce", "hardBounce", "unsubscribe"],
    headers: [{ key: "Authorization", value: `Bearer ${token}` }],
  });
  const parsed = z.object({ id }).safeParse(raw);
  if (!parsed.success) throw new SmsProviderError("uncertain");
  return parsed.data.id;
}
