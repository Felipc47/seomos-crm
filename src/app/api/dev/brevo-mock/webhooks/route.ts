import { mockGuard } from "@/lib/dev-guard";
import { brevoMock } from "@/server/dev/brevo-mock";
export async function POST(req: Request) {
  const blocked = mockGuard(); if (blocked) return blocked;
  if (!req.headers.get("api-key")?.startsWith("sms-mock-")) return new Response(null,{status:401});
  const body = await req.json();
  const allowedEvents = ["sent", "delivered", "reply", "softBounce", "hardBounce", "unsubscribed"];
  if (!Array.isArray(body.events) || body.events.length === 0 || body.events.some((event: unknown) => !allowedEvents.includes(String(event)))) return new Response(null,{status:400});
  if (body.channel !== "sms" || !body.headers?.some((h: {key:string}) => h.key === "Authorization")) return new Response(null,{status:400});
  brevoMock().hook = {url:body.url,headers:body.headers};
  return Response.json({id:98765},{status:201});
}
