import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scheduleAgentTurn } from "@/server/ai/pipeline";
import { WINDOW_MS } from "@/server/inbox/window";

/**
 * Barrido de recuperación (FR-021 extendido): re-encola el turno del agente
 * para las conversaciones que quedaron con un mensaje entrante SIN responder.
 *
 * El pipeline agenda turnos en memoria (setTimeout + Map): un reinicio del
 * contenedor, un despliegue o un rato con el agente apagado pierde esos turnos
 * y nada los recupera. Este barrido —invocado por un cron— cierra ese hueco.
 *
 * Solo encola conversaciones genuinamente pendientes (el último mensaje es
 * entrante) para no gastar turnos inútiles. El pipeline vuelve a comprobar el
 * historial antes de responder, además de perfil activo, handoff y ventana.
 */

const MAX_PER_SWEEP = 200;

export async function sweepPendingConversations(
  now: Date = new Date()
): Promise<{ scanned: number; queued: number }> {
  const db = getDb();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  // Candidatas: conversaciones reales, con IA activa, sin handoff y con la
  // ventana de 24h aún abierta (lastInboundAt nulo no cumple gt → excluido).
  const candidates = await db
    .select({ id: schema.conversation.id })
    .from(schema.conversation)
    .where(
      and(
        eq(schema.conversation.isTest, false),
        eq(schema.conversation.aiEnabled, true),
        isNull(schema.conversation.handoffAt),
        gt(schema.conversation.lastInboundAt, windowStart)
      )
    )
    .limit(MAX_PER_SWEEP);

  let queued = 0;
  for (const c of candidates) {
    const last = await db
      .select({ direction: schema.message.direction })
      .from(schema.message)
      .where(eq(schema.message.conversationId, c.id))
      .orderBy(desc(schema.message.createdAt))
      .limit(1);
    // Pendiente = el último mensaje es entrante (nadie respondió después).
    if (last[0]?.direction === "in") {
      scheduleAgentTurn(c.id);
      queued++;
    }
  }

  return { scanned: candidates.length, queued };
}
