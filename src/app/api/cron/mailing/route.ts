import { timingSafeEqual } from "node:crypto";
import { getEnv, isMockEnabled } from "@/lib/env";
import { sweepMailing } from "@/server/mailing/runner";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const secret = getEnv().AGENT_SWEEP_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const provided = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret ?? "");
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return new Response(null, { status: 404 });
  }
  let now = new Date();
  if (isMockEnabled()) {
    const override = new URL(req.url).searchParams.get("now");
    if (override) {
      const parsed = new Date(override);
      if (!Number.isNaN(parsed.getTime())) now = parsed;
    }
  }
  try {
    return Response.json({ ok: true, mailing: await sweepMailing(now) });
  } catch {
    console.error("[mailing] no se pudo completar el ciclo de correo");
    return Response.json({ ok: false, error: "No se pudo completar el ciclo de correo" }, { status: 503 });
  }
}

export const POST = handle;
export const GET = handle;
