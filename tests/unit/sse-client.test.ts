import { describe, expect, it, vi } from "vitest";
import { createSseClient, type EventHandlers } from "@/lib/sse-client";

class FakeEventSource extends EventTarget {
  close = vi.fn();

  emit(type: string, data?: unknown) {
    this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) }));
  }
}

function setup() {
  const sources: FakeEventSource[] = [];
  const createSource = vi.fn(() => {
    const source = new FakeEventSource();
    sources.push(source);
    return source;
  });
  return { client: createSseClient(createSource), sources, createSource };
}

describe("SSE compartido por pestaña", () => {
  it("se crea sin EventSource disponible (SSR) y abre una sola conexión para todos los consumidores", () => {
    expect(() => createSseClient()).not.toThrow();
    const { client, createSource } = setup();
    expect(createSource).not.toHaveBeenCalled();
    for (let i = 0; i < 4; i += 1) client.subscribe(() => ({}));
    expect(createSource).toHaveBeenCalledTimes(1);
  });

  it("entrega todos los tipos de evento a cada consumidor suscrito", () => {
    const { client, sources } = setup();
    const handlers = (): EventHandlers => ({
      onMessageNew: vi.fn(),
      onMessageStatus: vi.fn(),
      onConversationUpdated: vi.fn(),
      onLabRun: vi.fn(),
      onCampaignProgress: vi.fn(),
      onNotificationNew: vi.fn(),
    });
    const first = handlers();
    const second = handlers();
    client.subscribe(() => first);
    client.subscribe(() => second);

    const events = [
      ["message.new", "onMessageNew", { conversationId: "cv_1", message: { id: "msg_1" } }],
      ["message.status", "onMessageStatus", { conversationId: "cv_1", messageId: "msg_1", status: "read" }],
      ["conversation.updated", "onConversationUpdated", { conversation: { id: "cv_1" } }],
      ["lab.run", "onLabRun", { runId: "run_1", status: "done", progress: { done: 1, total: 1 } }],
      ["campaign.progress", "onCampaignProgress", { campaignId: "cp_1", status: "sending", progress: { total: 2, pending: 1, sent: 1, failed: 0 } }],
      ["notification.new", "onNotificationNew", { notification: { id: "nt_1" } }],
    ] as const;
    for (const [event, handler, payload] of events) {
      sources[0]!.emit(event, payload);
      expect(first[handler]).toHaveBeenCalledWith(payload);
      expect(second[handler]).toHaveBeenCalledWith(payload);
      expect(first[handler]).toHaveBeenCalledTimes(1);
      expect(second[handler]).toHaveBeenCalledTimes(1);
    }
  });

  it("usa los callbacks actuales sin reemplazar la conexión", () => {
    const { client, sources, createSource } = setup();
    const previous = vi.fn();
    const current = vi.fn();
    let handlers: EventHandlers = { onMessageNew: previous };
    client.subscribe(() => handlers);
    handlers = { onMessageNew: current };
    sources[0]!.emit("message.new", { conversationId: "cv_1", message: {} });
    expect(previous).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
    expect(createSource).toHaveBeenCalledTimes(1);
  });

  it("mantiene la conexión hasta la última baja y cierra sólo una vez", async () => {
    const { client, sources } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = client.subscribe(() => ({ onNotificationNew: first }));
    const unsubscribeSecond = client.subscribe(() => ({ onNotificationNew: second }));
    unsubscribeFirst();
    await Promise.resolve();
    expect(sources[0]!.close).not.toHaveBeenCalled();
    sources[0]!.emit("notification.new", { notification: {} });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribeSecond();
    unsubscribeSecond();
    await Promise.resolve();
    expect(sources[0]!.close).toHaveBeenCalledTimes(1);
  });

  it("reutiliza la conexión durante el desmontaje y remontaje de StrictMode", async () => {
    const { client, sources, createSource } = setup();
    const unsubscribe = client.subscribe(() => ({}));
    unsubscribe();
    const callback = vi.fn();
    const unsubscribeAgain = client.subscribe(() => ({ onMessageNew: callback }));
    await Promise.resolve();
    expect(createSource).toHaveBeenCalledTimes(1);
    expect(sources[0]!.close).not.toHaveBeenCalled();
    sources[0]!.emit("message.new", { conversationId: "cv_1", message: {} });
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribeAgain();
    await Promise.resolve();
    expect(sources[0]!.close).toHaveBeenCalledTimes(1);
  });

  it("tras cerrar abre una conexión nueva e ignora eventos de la anterior", async () => {
    const { client, sources, createSource } = setup();
    const callback = vi.fn();
    client.subscribe(() => ({}))();
    await Promise.resolve();
    client.subscribe(() => ({ onMessageNew: callback }));
    expect(createSource).toHaveBeenCalledTimes(2);
    sources[0]!.emit("message.new", { conversationId: "cv_old", message: {} });
    expect(callback).not.toHaveBeenCalled();
    sources[1]!.emit("message.new", { conversationId: "cv_new", message: {} });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cada consumidor activo hace catch-up una vez al reconectar, nunca en el primer open", () => {
    const { client, sources, createSource } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = client.subscribe(() => ({ onReconnect: first }));
    client.subscribe(() => ({ onReconnect: second }));
    const source = sources[0]!;
    source.emit("open");
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    source.emit("error");
    source.emit("error");
    source.emit("open");
    source.emit("open");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribe();
    source.emit("error");
    source.emit("open");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(createSource).toHaveBeenCalledTimes(1);
  });

  it("hace catch-up con el callback nuevo y para consumidores que se suscriben durante una caída", () => {
    const { client, sources } = setup();
    const previous = vi.fn();
    const current = vi.fn();
    const newConsumer = vi.fn();
    let handlers: EventHandlers = { onReconnect: previous };
    client.subscribe(() => handlers);
    sources[0]!.emit("error");
    handlers = { onReconnect: current };
    client.subscribe(() => ({ onReconnect: newConsumer }));
    sources[0]!.emit("open");
    expect(previous).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
    expect(newConsumer).toHaveBeenCalledTimes(1);
  });

  it("ignora JSON malformado y aísla fallos de consumidores sin perder eventos o catch-up", () => {
    const { client, sources } = setup();
    const throws = () => { throw new Error("fallo de un consumidor"); };
    const onMessageNew = vi.fn();
    const onReconnect = vi.fn();
    client.subscribe(() => ({ onMessageNew: throws, onReconnect: throws }));
    client.subscribe(() => ({ onMessageNew, onReconnect }));
    sources[0]!.dispatchEvent(new MessageEvent("message.new", { data: "{" }));
    expect(onMessageNew).not.toHaveBeenCalled();
    const payload = { conversationId: "cv_1", message: {} };
    sources[0]!.emit("message.new", payload);
    sources[0]!.emit("error");
    sources[0]!.emit("open");
    expect(onMessageNew).toHaveBeenCalledTimes(1);
    expect(onMessageNew).toHaveBeenCalledWith(payload);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});
