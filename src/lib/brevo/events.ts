import { createHash } from "node:crypto";
import { z } from "zod";
import { usPhone } from "@/lib/sms";
const input = z.object({
  msg_status: z.string().max(40), to: z.string().max(30),
  messageId: z.union([z.number().int().safe().nonnegative(), z.string().max(150)]),
  ts_event: z.union([z.number().finite(), z.string().max(30)]).optional(),
  date: z.string().max(40).optional(), reply: z.string().max(1600).optional(),
  tag: z.union([z.string().max(100), z.array(z.string().max(100)).max(10)]).optional(),
});
export type SmsWebhookEvent = {
  status: string; phone: string; messageId: string; reply: string | null;
  timestamp: string; tags: string[];
};
export function parseSmsEvent(raw: unknown): SmsWebhookEvent | null {
  const p = input.safeParse(raw); if (!p.success) return null;
  const phone = usPhone(p.data.to.startsWith("+") ? p.data.to : `+${p.data.to}`);
  const timestamp = p.data.ts_event === undefined ? p.data.date : String(p.data.ts_event);
  if (!phone || !timestamp || (p.data.msg_status === "replied" && !p.data.reply?.trim())) return null;
  return { status: p.data.msg_status, phone, messageId: String(p.data.messageId),
    reply: p.data.reply?.trim() ?? null, timestamp, tags: typeof p.data.tag === "string" ? [p.data.tag] : p.data.tag ?? [] };
}
export function smsEventKey(e: SmsWebhookEvent) {
  // `id` in Brevo's body identifies the webhook, not the event.
  return createHash("sha256").update(JSON.stringify([e.messageId,e.phone,e.status,e.reply,e.timestamp])).digest("hex");
}
