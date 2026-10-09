import { apiError, parseBody, withAuth } from "@/lib/api";
import { answerHelpQuestion, helpRequestSchema } from "@/server/ai/help-assistant";
import { isMailingEnabled } from "@/server/mailing/access";

export const dynamic = "force-dynamic";

// Guardrail local por proceso, sin historial ni información de conversaciones.
const requests = new Map<string, { count: number; resetAt: number }>();
export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, helpRequestSchema);
  if (!body.ok) return body.response;
  const now = Date.now();
  for (const [key, bucket] of requests) if (bucket.resetAt <= now) requests.delete(key);
  const key = `${session.organizationId}:${session.userId}`;
  const bucket = requests.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (bucket.count >= 12) {
    return apiError(429, "help_rate_limit", "Espera un minuto antes de enviar más preguntas. Puedes seguir leyendo las guías del chat.");
  }
  bucket.count += 1;
  requests.set(key, bucket);
  const reply = await answerHelpQuestion(body.data, {
    role: session.role, isSuperadmin: session.isSuperadmin,
    mailingEnabled: await isMailingEnabled(session.organizationId),
  });
  return Response.json(reply, { headers: { "Cache-Control": "no-store" } });
});
