import { authenticateSmsWebhook, ingestSmsEvent } from "@/server/sms/service";
import { parseSmsEvent } from "@/lib/brevo/events";
export const dynamic = "force-dynamic";
export async function POST(req: Request, ctx: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId: org } = await ctx.params;
    if (org.length > 100 || !await authenticateSmsWebhook(org,req.headers.get("authorization"))) return new Response(null,{status:404});
    if (Number(req.headers.get("content-length")) > 65536) return new Response(null,{status:413});
    const reader = req.body?.getReader(); if (!reader) return new Response(null,{status:422});
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const {done,value} = await reader.read(); if (done) break;
      size += value.length; if (size > 65536) { await reader.cancel(); return new Response(null,{status:413}); } chunks.push(value); }
    let raw: unknown; try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return new Response(null,{status:422}); }
    const event = parseSmsEvent(raw); if (!event) return Response.json({ ignored: true });
    await ingestSmsEvent(org,event); return Response.json({ ok: true });
  } catch { return new Response(null,{status:503}); }
}
