"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowUpRight, BookOpen, Loader2, MessageCircleQuestion, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHelpGuides, getHelpScreen, getHelpSuggestions, type HelpAccess, type HelpGuideLink } from "@/lib/help-guides";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; guides?: HelpGuideLink[]; notice?: string | null };
type Reply = { answer: string; guides: HelpGuideLink[]; mode: "ai" | "guide"; notice: string | null };
const welcome: Message = { role: "assistant", content: "Hola, soy tu asistente de ayuda. Cuéntame qué quieres hacer en el CRM y te guío paso a paso." };

export function HelpChat(access: HelpAccess) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const guides = getHelpGuides(access);
  const screen = getHelpScreen(pathname, guides);
  const suggestions = getHelpSuggestions(pathname, guides);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, busy, error, open]);

  useEffect(() => {
    if (open && !busy) input.current?.focus();
  }, [open, busy]);

  useEffect(() => () => request.current?.abort(), []);

  function reset() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setMessages([welcome]);
    setQuestion("");
    setError(null);
    setRetryQuestion(null);
    input.current?.focus();
  }

  async function send(raw: string, retry = false) {
    const text = raw.trim();
    if (!text || text.length > 1_000 || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const history = messages.slice(1, retry ? -1 : undefined).slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 1_600) }));
    if (!retry) setMessages((previous) => [...previous, { role: "user" as const, content: text }].slice(-21));
    setQuestion("");
    setBusy(true);
    setError(null);
    setRetryQuestion(null);
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/help/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ question: text, pathname: screen.pathname, history }),
      });
      const body = await response.json() as Reply & { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || "No se pudo responder. Inténtalo de nuevo.");
      if (typeof body.answer !== "string" || !Array.isArray(body.guides)) throw new Error("No se pudo leer la respuesta. Inténtalo de nuevo.");
      if (request.current !== controller) return;
      setMessages((previous) => [...previous, { role: "assistant" as const, content: body.answer, guides: body.guides, notice: body.notice }].slice(-21));
    } catch (caught) {
      if (request.current !== controller) return;
      setError(controller.signal.aborted ? "La respuesta está tardando demasiado. Tu pregunta sigue aquí para reintentar." : caught instanceof TypeError ? "No se pudo conectar. Tu pregunta sigue aquí para reintentar." : caught instanceof Error ? caught.message : "No se pudo responder. Inténtalo de nuevo.");
      setRetryQuestion(text);
      setQuestion(text);
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
        input.current?.focus();
      }
    }
  }

  return (
    <>
      <button
        ref={launcher} type="button" onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar ayuda" : "Abrir ayuda"} aria-expanded={open} aria-controls="crm-help-chat"
        className={cn("fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 items-center gap-2 rounded-full border border-brand/30 bg-surface px-4 text-sm font-bold text-foreground shadow-lg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-[88px] md:right-6", open && "pointer-events-none opacity-0")}
      >
        <MessageCircleQuestion className="h-5 w-5 text-brand" aria-hidden />
        Ayuda
      </button>
      {open && (
        <section id="crm-help-chat" role="dialog" aria-label="Asistente de ayuda" aria-describedby="crm-help-description"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-[min(640px,calc(100dvh-8rem))] w-[calc(100%-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl md:bottom-6 md:right-6 md:h-[min(640px,calc(100dvh-3rem))]">
          <header className="flex shrink-0 items-center gap-3 border-b bg-surface-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><Sparkles className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">Asistente de ayuda</h2>
              <p id="crm-help-description" className="truncate text-xs text-mute">Te guío en {screen.title}</p>
            </div>
            <button type="button" onClick={reset} aria-label="Nueva conversación de ayuda" title="Nueva conversación" className="rounded-lg p-2 text-mute hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><RotateCcw className="h-4 w-4" aria-hidden /></button>
            <button type="button" onClick={close} aria-label="Cerrar ayuda" className="rounded-lg p-2 text-mute hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="h-5 w-5" aria-hidden /></button>
          </header>
          <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div role="log" aria-label="Conversación de ayuda" aria-live="polite" aria-relevant="additions" className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn("flex flex-col gap-2", message.role === "user" && "items-end")}>
                  <span className="text-[11px] font-semibold text-mute">{message.role === "user" ? "Tú" : "Asistente"}</span>
                  <div className={cn("max-w-full rounded-2xl px-3.5 py-3 text-sm leading-relaxed", message.role === "user" ? "max-w-[90%] rounded-tr-sm bg-brand/10" : "w-full rounded-tl-sm bg-surface-2")}>
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
                    {message.guides?.filter((guide) => guides.some((allowed) => allowed.id === guide.id)).map((guide) => (
                      <div key={guide.id} className="mt-3 border-t border-border pt-3">
                        <p className="mb-2 flex items-start gap-2 text-xs font-bold"><BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />{guide.title}</p>
                        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-foreground">
                          {guide.steps.map((step, stepIndex) => <li key={stepIndex} className="pl-0.5">{step}</li>)}
                        </ol>
                        <Link href={guide.href} onClick={close} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand underline-offset-4 hover:underline">Ir a {guide.title}<ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden /></Link>
                      </div>
                    ))}
                    {message.notice && <p className="mt-3 border-t border-border pt-2 text-xs text-mute">{message.notice}</p>}
                  </div>
                </div>
              ))}
            </div>
            {messages.length === 1 && <div className="mt-5 space-y-2"><p className="text-xs font-semibold text-mute">Puedes empezar con…</p>{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)} disabled={busy} className="block w-full rounded-xl border border-border px-3 py-2.5 text-left text-[13px] transition-colors hover:border-brand/40 hover:bg-brand/5 focus-visible:ring-2 focus-visible:ring-ring">{suggestion}</button>)}</div>}
            {busy && <p role="status" className="mt-4 flex items-center gap-2 text-xs text-mute"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Buscando cómo ayudarte…</p>}
            {error && <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"><p>{error}</p>{retryQuestion && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void send(retryQuestion, true)} disabled={busy}>Reintentar pregunta</Button>}</div>}
          </div>
          <form className="shrink-0 border-t p-3" onSubmit={(event) => { event.preventDefault(); void send(question); }}>
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-brand/50">
              <label htmlFor="crm-help-question" className="sr-only">Tu pregunta sobre el CRM</label>
              <textarea ref={input} id="crm-help-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1_000} rows={2} placeholder="¿Cómo puedo…?" disabled={busy}
                className="min-h-12 min-w-0 flex-1 resize-none bg-transparent p-1 text-[16px] leading-6 outline-none placeholder:text-mute disabled:opacity-60 md:text-sm"
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(question); } }} />
              <Button type="submit" size="icon" aria-label="Enviar pregunta" disabled={busy || !question.trim()} className="h-9 w-9 shrink-0 rounded-lg"><ArrowUp className="h-4 w-4" aria-hidden /></Button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-mute">Te guío paso a paso. Tú decides qué guardar o enviar.</p>
          </form>
        </section>
      )}
    </>
  );
}
