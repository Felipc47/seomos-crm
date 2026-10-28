import { z } from "zod";
import { getEnv, isMockEnabled } from "@/lib/env";

export type SmsAccount = { email: string; companyName: string; smsCredits: number | null };
export class BrevoError extends Error {
  constructor(public code: "auth" | "rate_limit" | "unavailable" | "invalid_response") {
    super(`brevo_${code}`);
    this.name = "BrevoError";
  }
}

const accountSchema = z.object({
  email: z.string().email().max(254),
  companyName: z.string().max(200).optional(),
  plan: z.array(z.object({
    type: z.string(),
    credits: z.number().finite().int().nonnegative().optional(),
  })).max(100).optional(),
});

/** Only project account identity and SMS balance. /account may also contain secrets. */
export function parseSmsAccount(raw: unknown): SmsAccount {
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) throw new BrevoError("invalid_response");
  const plans = parsed.data.plan?.filter(p => p.type === "sms") ?? [];
  return {
    email: parsed.data.email,
    companyName: parsed.data.companyName ?? "",
    smsCredits: plans.length && plans.every(p => p.credits !== undefined)
      ? plans.reduce((sum, p) => sum + p.credits!, 0) : null,
  };
}

/** Fixed provider host; no redirects, retries, configurable production URL or SMS writes. */
export async function getSmsAccount(apiKey: string): Promise<SmsAccount> {
  const url = isMockEnabled()
    ? `${getEnv().APP_BASE_URL}/api/dev/brevo-mock/account`
    : "https://api.brevo.com/v3/account";
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(12000), redirect: "error", cache: "no-store",
    });
  } catch { throw new BrevoError("unavailable"); }
  if (response.status === 401 || response.status === 403) throw new BrevoError("auth");
  if (response.status === 429) throw new BrevoError("rate_limit");
  if (!response.ok) throw new BrevoError("unavailable");
  // Never include provider body, key, account raw JSON or error details in a log/error.
  try {
    const text = await response.text();
    if (text.length > 100000) throw new BrevoError("invalid_response");
    return parseSmsAccount(JSON.parse(text));
  } catch { throw new BrevoError("invalid_response"); }
}
