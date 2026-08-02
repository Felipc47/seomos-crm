import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isAiConfigured } from "@/lib/env";
import { isWindowOpen } from "@/server/inbox/window";
import { scheduleAgentTurn } from "@/server/ai/pipeline";

export type PendingAgentTurnReason =
  | "queued"
  | "ai_unavailable"
  | "agent_disabled"
  | "conversation_inactive"
  | "window_closed"
  | "no_pending_message";

export type PendingAgentTurnResult = {
  queued: boolean;
  reason: PendingAgentTurnReason;
};

export type PendingAgentTurnState = {
  aiConfigured: boolean;
  agentEnabled: boolean;
  conversationEnabled: boolean;
  handoffActive: boolean;
  blocked?: boolean;
  windowOpen: boolean;
  lastDirection: "in" | "out" | null;
};

/**
 * Decisión pura y conservadora: solo un último mensaje entrante significa que
 * hay algo por atender. El pipeline vuelve a leer todo antes de enviar.
 */
export function decidePendingAgentTurn(
  state: PendingAgentTurnState
): PendingAgentTurnResult {
  if (!state.aiConfigured) {
    return { queued: false, reason: "ai_unavailable" };
  }
  if (!state.agentEnabled) {
    return { queued: false, reason: "agent_disabled" };
  }
  if (!state.conversationEnabled || state.handoffActive || state.blocked) {
    return { queued: false, reason: "conversation_inactive" };
  }
  if (!state.windowOpen) {
    return { queued: false, reason: "window_closed" };
  }
  if (state.lastDirection !== "in") {
    return { queued: false, reason: "no_pending_message" };
  }
  return { queued: true, reason: "queued" };
}

/**
 * Revalida organización, disponibilidad, ventana y último mensaje después de
 * persistir la activación. Encola sin bloquear la respuesta HTTP durante el
 * turno del LLM.
 */
export async function queuePendingAgentTurn(
  organizationId: string,
  conversationId: string
): Promise<PendingAgentTurnResult> {
  const db = getDb();
  const [conversationRows, profileRows, lastRows] = await Promise.all([
    db
      .select({
        aiEnabled: schema.conversation.aiEnabled,
        handoffAt: schema.conversation.handoffAt,
        lastInboundAt: schema.conversation.lastInboundAt,
        blockedAt: schema.contact.blockedAt,
      })
      .from(schema.conversation)
      .innerJoin(
        schema.contact,
        eq(schema.conversation.contactId, schema.contact.id)
      )
      .where(
        scoped(
          schema.conversation.organizationId,
          organizationId,
          eq(schema.conversation.id, conversationId),
          eq(schema.conversation.isTest, false)
        )
      )
      .limit(1),
    db
      .select({ enabled: schema.agentProfile.enabled })
      .from(schema.agentProfile)
      .where(
        scoped(schema.agentProfile.organizationId, organizationId)
      )
      .limit(1),
    db
      .select({ direction: schema.message.direction })
      .from(schema.message)
      .where(
        scoped(
          schema.message.organizationId,
          organizationId,
          eq(schema.message.conversationId, conversationId)
        )
      )
      .orderBy(desc(schema.message.createdAt))
      .limit(1),
  ]);

  const conversation = conversationRows[0];
  const decision = decidePendingAgentTurn({
    aiConfigured: isAiConfigured(),
    agentEnabled: profileRows[0]?.enabled ?? false,
    conversationEnabled: conversation?.aiEnabled ?? false,
    handoffActive: Boolean(conversation?.handoffAt),
    blocked: Boolean(conversation?.blockedAt),
    windowOpen: isWindowOpen(conversation?.lastInboundAt ?? null),
    lastDirection: lastRows[0]?.direction ?? null,
  });

  if (decision.queued) {
    scheduleAgentTurn(conversationId, { immediate: true });
  }
  return decision;
}
