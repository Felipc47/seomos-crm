import { scheduleAgentTurn } from "@/server/ai/pipeline";
import { isAiConfigured } from "@/lib/env";

/**
 * Punto de enganche del turno del agente tras la ingesta de un mensaje
 * entrante REAL. Las conversaciones históricas marcadas como prueba no pasan
 * por este disparador.
 */
export async function maybeRunAgentTurn(
  conversationId: string
): Promise<void> {
  if (!isAiConfigured()) return;
  scheduleAgentTurn(conversationId);
}
