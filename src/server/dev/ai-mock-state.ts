/**
 * Estado en memoria del ai-mock (solo dev/test): permite forzar los caminos
 * infelices del proveedor de IA desde el guion de self-test.
 */

type AiMockState = {
  /** Contadores observables para probar que un guard evita al proveedor. */
  chatCalls: number;
  /** Solo metadatos de solicitudes de prueba; nunca mensajes ni credenciales. */
  chatRequests: { model: string | null; reasoningEffort: string | null }[];
  transcriptionCalls: number;
  /** Turnos de chat que deben fallar antes de volver a funcionar. */
  failNextChat: number;
  /** Transcripciones que deben fallar antes de volver a funcionar. */
  failNextTranscriptions: number;
  /** Turnos de chat CON IMAGEN que el "modelo" debe rechazar. */
  failNextVision: number;
};

const globalForAiMock = globalThis as unknown as {
  __aiMockState?: AiMockState;
};

export function getAiMockState(): AiMockState {
  if (!globalForAiMock.__aiMockState) {
    globalForAiMock.__aiMockState = {
      chatCalls: 0,
      chatRequests: [],
      transcriptionCalls: 0,
      failNextChat: 0,
      failNextTranscriptions: 0,
      failNextVision: 0,
    };
  }
  return globalForAiMock.__aiMockState;
}
