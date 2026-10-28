import { mockGuard } from "@/lib/dev-guard";
import { brevoMock } from "@/server/dev/brevo-mock";
export async function POST(req: Request) {
  const blocked = mockGuard(); if (blocked) return blocked;
  if (!req.headers.get("api-key")?.startsWith("sms-mock-")) return new Response(null,{status:401});
  const state = brevoMock(), body = await req.json(), next = state.next; state.next = "";
  if (next === "auth") return new Response(null,{status:401});
  if (next === "rate_limit") return new Response(null,{status:429});
  if (next === "rejected") return new Response(null,{status:400});
  const messageId = 100000 + state.sends.length;
  state.sends.push({ recipient: body.recipient,content: body.content,tag: body.tag,messageId });
  if (state.earlyDelivery && state.hook) await fetch(state.hook.url,{ method:"POST",headers:Object.fromEntries(state.hook.headers.map(h => [h.key,h.value])),
    body: JSON.stringify({ msg_status:"delivered",to:body.recipient,messageId,tag:[body.tag],ts_event:Math.floor(Date.now()/1000) }) });
  if (next === "timeout") await new Promise(resolve => setTimeout(resolve,13000));
  if (next === "unavailable") return new Response(null,{status:503});
  if (next === "malformed") return new Response("unexpected");
  return Response.json({messageId},{status:201});
}
