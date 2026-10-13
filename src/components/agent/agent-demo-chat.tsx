"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SlideOver } from "@/components/ui/slide-over";
import { AGENT_RESPONSE_LANGUAGES } from "@/lib/agent-behavior";
import { MAX_DEMO_TURNS, type DemoReply } from "@/lib/agent-demo";
import type { AgentProfileDraft } from "@/lib/agent-profile-input";
import { cn } from "@/lib/utils";

type Configuration = Omit<AgentProfileDraft, "tonePresets"> & { tonePresets?: string[]; enabled?: boolean };
type DemoMessage = { role: "user" | "assistant"; content: string | null; actionLabel?: string | null };

export function AgentDemoChat({ configuration }: { configuration: Configuration }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Prueba tu agente</p>
          <p className="mt-1 text-xs text-muted-foreground">Conversa aquí con su configuración, sin necesitar WhatsApp.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <MessageSquare className="h-4 w-4" /> Abrir chat demo
        </Button>
      </div>
      {open && <DemoConversation configuration={configuration} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DemoConversation({ configuration, onClose }: { configuration: Configuration; onClose: () => void }) {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const turns = messages.filter((message) => message.role === "user").length;
  const limited = turns >= MAX_DEMO_TURNS;
  const language = AGENT_RESPONSE_LANGUAGES.find((item) => item.id === (configuration.responseLanguage ?? "es"))?.label;

  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  async function send() {
    const message = text.trim();
    if (!message || activeRequest.current || ended || limited) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const { enabled: _enabled, ...draft } = configuration;
      const response = await fetch("/api/agent/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          configuration: draft,
          history: messages.filter((item) => item.content).map((item) => ({ role: item.role, content: item.content })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? "No pudimos obtener una respuesta. Puedes reintentar.");
        return;
      }
      const reply = data as DemoReply;
      setMessages((current) => [...current, { role: "user", content: message }, { role: "assistant", content: reply.message, actionLabel: reply.actionLabel }]);
      setEnded(reply.ended);
      setText("");
    } catch {
      setError("No pudimos obtener una respuesta. Tu mensaje sigue aquí para reintentar.");
    } finally {
      clearTimeout(timeout);
      activeRequest.current = null;
      setLoading(false);
    }
  }

  function reset() {
    if (loading) return;
    setMessages([]);
    setText("");
    setEnded(false);
    setError(null);
  }

  return (
    <SlideOver onClose={onClose} ariaLabel="Chat demo del agente">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-5 sm:px-6">
        <MessageSquare className="h-5 w-5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Chat demo</h2>
          <p className="truncate text-xs text-muted-foreground">{configuration.name || "Tu agente"} · {language}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar chat demo"><X className="h-5 w-5" /></Button>
      </header>
      <div className="shrink-0 border-b bg-secondary/40 px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
        Usa el comportamiento actual del formulario y el conocimiento guardado. Las acciones son simuladas: no envía mensajes a WhatsApp ni crea contactos o citas.
      </div>
      <div ref={log} role="log" aria-label="Conversación demo" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed p-5 text-center">
            <p className="text-sm font-medium">Escribe como lo haría un cliente</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Puedes probar saludos, preguntas del negocio, objeciones y cambios de idioma.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={cn("max-w-[92%] rounded-xl border p-3 text-sm", message.role === "user" ? "ml-auto bg-brand/10" : "bg-surface")}>
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{message.role === "user" ? "Tú" : configuration.name || "Agente"}</p>
            {message.content && <p className="break-words whitespace-pre-wrap leading-6">{message.content}</p>}
            {message.actionLabel && <p className="mt-2 border-t pt-2 text-xs leading-5 text-muted-foreground">{message.actionLabel}</p>}
          </div>
        ))}
        {loading && <p role="status" className="text-sm text-muted-foreground">El agente está escribiendo…</p>}
      </div>
      <footer className="shrink-0 space-y-3 border-t px-4 py-4 sm:px-6">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {(ended || limited) && <p role="status" className="text-xs text-muted-foreground">{ended ? "Derivación simulada. Reinicia para probar otra conversación." : "Llegaste al límite de esta prueba. Reinicia para empezar otra conversación."}</p>}
        <label htmlFor="agent-demo-message" className="sr-only">Mensaje para el agente demo</label>
        <Textarea
          id="agent-demo-message"
          data-slide-over-autofocus
          className="text-base sm:text-sm"
          rows={2}
          maxLength={4000}
          placeholder="Escribe tu mensaje de prueba…"
          value={text}
          disabled={loading || ended || limited}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={loading || messages.length === 0} onClick={reset}><RotateCcw className="h-4 w-4" /> Reiniciar demo</Button>
          <Button type="button" disabled={loading || ended || limited || !text.trim()} onClick={() => void send()}><Send className="h-4 w-4" /> Enviar prueba</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{turns}/{MAX_DEMO_TURNS} turnos · Historial temporal, se borra al cerrar.</p>
      </footer>
    </SlideOver>
  );
}
