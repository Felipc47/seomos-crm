"use client";

import { useEffect, useRef } from "react";
import { sseClient, type EventHandlers } from "@/lib/sse-client";

export type { EventHandlers } from "@/lib/sse-client";

/**
 * Suscripción SSE compartida entre los componentes de la pestaña (contrato
 * sse.md). EventSource reconecta solo; el servidor no garantiza replay, así
 * que cada consumidor debe refetch con `since=` al reconectar (onReconnect).
 */
export function useEvents(handlers: EventHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => sseClient.subscribe(() => handlersRef.current), []);
}
