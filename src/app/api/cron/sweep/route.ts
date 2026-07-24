import { timingSafeEqual } from "node:crypto";
import { getEnv, isMockEnabled } from "@/lib/env";
import { sweepPendingConversations } from "@/server/ai/sweep";
import { sweepFollowUps } from "@/server/ai/follow-up";

/**
 * Endpoint del barrido de recuperación, pensado para un cron externo
 * (tarea programada de Coolify). Protegido por AGENT_SWEEP_SECRET vía
 * `Authorization: Bearer <secreto>`. Sin secreto configurado, o con secreto
 * incorrecto, responde 404 (no revela la existencia del endpoint).
 */
export const dynamic = "force-dynamic";

function isAuthorized(req: Request, secret: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  // Comparación en tiempo constante; longitudes distintas → no autorizado.
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request): Promise<Response> {
  const secret = getEnv().AGENT_SWEEP_SECRET;
  if (!secret || !isAuthorized(req, secret)) {
    return new Response(null, { status: 404 });
  }
  // 008: viaje en el tiempo SOLO en el entorno de pruebas interno (mocks) —
  // los self-tests simulan "12 horas después" sin esperar de verdad. En
  // producción el parámetro se ignora por completo.
  let now = new Date();
  if (isMockEnabled()) {
    const override = new URL(req.url).searchParams.get("now");
    const parsed = override ? new Date(override) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) now = parsed;
  }
  const result = await sweepPendingConversations(now);
  const followUps = await sweepFollowUps(now);
  return Response.json({ ok: true, ...result, followUps });
}

export const POST = handle;
export const GET = handle;
