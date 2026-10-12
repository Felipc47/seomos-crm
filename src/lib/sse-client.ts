export type EventHandlers = {
  onMessageNew?: (data: { conversationId: string; message: unknown }) => void;
  onMessageStatus?: (data: {
    conversationId: string;
    messageId: string;
    status: string;
  }) => void;
  onConversationUpdated?: (data: { conversation: unknown }) => void;
  onLabRun?: (data: {
    runId: string;
    status: string;
    progress: { done: number; total: number };
    score?: number | null;
  }) => void;
  onCampaignProgress?: (data: {
    campaignId: string;
    status: string;
    progress: { total: number; pending: number; sent: number; failed: number };
  }) => void;
  onNotificationNew?: (data: { notification: unknown }) => void;
  /** Se llama tras RECONECTAR (no en la conexión inicial): catch-up con refetch. */
  onReconnect?: () => void;
};

const handlersByEvent = {
  "message.new": "onMessageNew",
  "message.status": "onMessageStatus",
  "conversation.updated": "onConversationUpdated",
  "lab.run": "onLabRun",
  "campaign.progress": "onCampaignProgress",
  "notification.new": "onNotificationNew",
} as const satisfies Record<string, Exclude<keyof EventHandlers, "onReconnect">>;

type EventSourceClient = Pick<EventTarget, "addEventListener"> &
  Pick<EventSource, "close">;
type Subscriber = { readHandlers: () => EventHandlers };

/** Una conexión por pestaña; se abre sólo cuando un componente se suscribe. */
export function createSseClient(
  createSource: () => EventSourceClient = () => new EventSource("/api/events")
) {
  const subscribers = new Set<Subscriber>();
  let source: EventSourceClient | null = null;
  let closeVersion = 0;

  const notify = (run: (handlers: EventHandlers) => void) => {
    for (const subscriber of Array.from(subscribers)) {
      if (!subscribers.has(subscriber)) continue;
      try {
        run(subscriber.readHandlers());
      } catch {
        // Un consumidor no debe impedir que los demás reciban el evento.
      }
    }
  };

  const connect = () => {
    const currentSource = createSource();
    source = currentSource;
    let hadError = false;

    for (const [event, handler] of Object.entries(handlersByEvent)) {
      currentSource.addEventListener(event, (ev) => {
        if (source !== currentSource) return;
        let data: unknown;
        try {
          data = JSON.parse((ev as MessageEvent<string>).data);
        } catch {
          return; // Evento malformado: no interrumpir la suscripción.
        }
        notify((handlers) => handlers[handler]?.(data as never));
      });
    }

    currentSource.addEventListener("error", () => {
      if (source === currentSource) hadError = true;
    });
    currentSource.addEventListener("open", () => {
      if (source !== currentSource || !hadError) return;
      hadError = false;
      notify((handlers) => handlers.onReconnect?.());
    });
  };

  return {
    subscribe(readHandlers: () => EventHandlers) {
      const subscriber = { readHandlers };
      closeVersion += 1;
      subscribers.add(subscriber);
      if (!source) connect();

      return () => {
        if (!subscribers.delete(subscriber) || subscribers.size > 0) return;
        const version = ++closeVersion;
        // StrictMode desmonta y remonta efectos en el mismo turno. Reutilizar
        // la conexión también evita abrir otra al cambiar de pantalla.
        queueMicrotask(() => {
          if (version !== closeVersion || subscribers.size > 0) return;
          source?.close();
          source = null;
        });
      };
    },
  };
}

// Importar el módulo durante SSR no accede a EventSource ni abre conexiones.
export const sseClient = createSseClient();
