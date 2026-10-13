import { timingSafeEqual } from "node:crypto";
import { getEnv, isMockEnabled } from "@/lib/env";
import { sweepMeetingReminders } from "@/server/meetings/runner";

export const dynamic = "force-dynamic";

/** Cron exclusivo por minuto; el barrido general permanece como recuperación. */
async function handle(req: Request): Promise<Response> {
  const secret = getEnv().AGENT_SWEEP_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const supplied = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret ?? "");
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return new Response(null, { status: 404 });
  }
  let now = new Date();
  if (isMockEnabled()) {
    const override = new URL(req.url).searchParams.get("now");
    const parsed = override ? new Date(override) : null;
    if (parsed && Number.isFinite(parsed.getTime())) now = parsed;
  }
  try {
    return Response.json({ ok: true, meetings: await sweepMeetingReminders(now) });
  } catch {
    return Response.json({ ok: false, error: "No se pudo completar el barrido de reuniones" }, { status: 503 });
  }
}
export const POST = handle;
export const GET = handle;
