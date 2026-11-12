import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { sweepSheets } from "@/server/sheets/service";
export const dynamic = "force-dynamic";
async function handle(req: Request) {
  const secret = getEnv().AGENT_SWEEP_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const provided = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret ?? "");
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return new Response(null, { status: 404 });
  try { return Response.json({ ok: true, sheets: await sweepSheets() }); }
  catch { return Response.json({ ok: false, error: "No se pudo completar el ciclo de Sheets." }, { status: 503 }); }
}
export const POST = handle;
export const GET = handle;
