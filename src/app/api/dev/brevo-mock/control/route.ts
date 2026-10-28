import { mockGuard } from "@/lib/dev-guard";
import { brevoMock } from "@/server/dev/brevo-mock";
import { z } from "zod";
export async function GET() { const blocked = mockGuard(); if (blocked) return blocked; return Response.json({sends:brevoMock().sends}); }
export async function POST(req: Request) {
  const blocked = mockGuard(); if (blocked) return blocked;
  const p = z.object({next:z.enum(["","auth","rate_limit","rejected","unavailable","malformed","timeout"]).optional(),earlyDelivery:z.boolean().optional(),reset:z.boolean().optional()}).strict().safeParse(await req.json());
  if (!p.success) return new Response(null,{status:422});
  const state = brevoMock(); if (p.data.reset) { state.sends = [];state.next="";state.earlyDelivery=false; }
  if (p.data.next !== undefined) state.next=p.data.next;
  if (p.data.earlyDelivery !== undefined) state.earlyDelivery=p.data.earlyDelivery;
  return Response.json({ok:true});
}
