import { apiError, parseBody, withAuth } from "@/lib/api";
import { demoRequestSchema } from "@/lib/agent-demo";
import { canEditAgent } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { answerAgentDemo } from "@/server/ai/demo";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (session, req: Request) => {
  if (!canEditAgent(session.role)) return apiError(403, "forbidden", "Tu rol no puede probar la configuración del agente");
  const body = await parseBody(req, demoRequestSchema);
  if (!body.ok) return body.response;
  if (!checkRateLimit(`agent-demo:${session.organizationId}:${session.userId}`, { windowMs: 60000, max: 20 }).allowed) {
    return apiError(429, "demo_rate_limit", "Espera un minuto antes de seguir probando el agente");
  }
  const result = await answerAgentDemo(session.organizationId, body.data);
  if (!result.ok) {
    if (result.error === "profile_not_found") return apiError(404, "not_found", "Perfil del agente no encontrado");
    if (result.error === "not_configured") return apiError(503, "ai_not_configured", "Configura el proveedor de IA para probar el agente");
    return apiError(503, "demo_failed", "El agente no pudo responder esta vez. Tu mensaje sigue aquí para reintentar.");
  }
  return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
});
