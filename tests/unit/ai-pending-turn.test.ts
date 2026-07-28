import { describe, expect, it } from "vitest";
import {
  decidePendingAgentTurn,
  type PendingAgentTurnState,
} from "@/server/ai/pending-turn";

const READY_PENDING: PendingAgentTurnState = {
  aiConfigured: true,
  agentEnabled: true,
  conversationEnabled: true,
  handoffActive: false,
  windowOpen: true,
  lastDirection: "in",
};

describe("decidePendingAgentTurn", () => {
  it("encola cuando el último mensaje entrante sigue pendiente", () => {
    expect(decidePendingAgentTurn(READY_PENDING)).toEqual({
      queued: true,
      reason: "queued",
    });
  });

  it("no encola si ya existe una respuesta saliente", () => {
    expect(
      decidePendingAgentTurn({ ...READY_PENDING, lastDirection: "out" })
    ).toEqual({
      queued: false,
      reason: "no_pending_message",
    });
  });

  it("no encola una conversación sin historial", () => {
    expect(
      decidePendingAgentTurn({ ...READY_PENDING, lastDirection: null })
    ).toEqual({
      queued: false,
      reason: "no_pending_message",
    });
  });

  it("no encola texto libre con la ventana cerrada", () => {
    expect(
      decidePendingAgentTurn({ ...READY_PENDING, windowOpen: false })
    ).toEqual({
      queued: false,
      reason: "window_closed",
    });
  });

  it("no encola si la conversación sigue apagada o con handoff", () => {
    expect(
      decidePendingAgentTurn({
        ...READY_PENDING,
        conversationEnabled: false,
      })
    ).toEqual({
      queued: false,
      reason: "conversation_inactive",
    });
    expect(
      decidePendingAgentTurn({ ...READY_PENDING, handoffActive: true })
    ).toEqual({
      queued: false,
      reason: "conversation_inactive",
    });
  });

  it("distingue proveedor ausente y agente global apagado", () => {
    expect(
      decidePendingAgentTurn({ ...READY_PENDING, aiConfigured: false })
    ).toEqual({
      queued: false,
      reason: "ai_unavailable",
    });
    expect(
      decidePendingAgentTurn({ ...READY_PENDING, agentEnabled: false })
    ).toEqual({
      queued: false,
      reason: "agent_disabled",
    });
  });
});
