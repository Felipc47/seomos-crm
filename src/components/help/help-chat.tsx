"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowUpRight, BookOpen, Crosshair, Loader2, MessageCircleQuestion, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHelpGuides, getHelpScreen, getHelpSuggestions, helpGuideLink, type HelpAccess, type HelpGuide, type HelpGuideLink } from "@/lib/help-guides";
import { getHelpTour, readHelpContext } from "@/lib/help-tours";
import { HelpTour } from "@/components/help/help-tour";
import { HelpLibrary } from "@/components/help/help-library";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; guides?: HelpGuideLink[]; notice?: string | null };
type Reply = { answer: string; guides: HelpGuideLink[]; mode: "ai" | "guide"; notice: string | null };
const welcome: Message = { role: "assistant", content: "¿Qué quieres hacer? Cuéntamelo y lo hacemos juntos: te muestro dónde hacer clic y avanzamos un paso a la vez." };

export function HelpChat({ role, isSuperadmin, mailingEnabled }: HelpAccess) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "library">("chat");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [activeTour, setActiveTour] = useState<{ id: string; index: number } | null>(null);
  const [tourVisible, setTourVisible] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const lastReply = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const guides = useMemo(() => getHelpGuides({ role, isSuperadmin, mailingEnabled }), [role, isSuperadmin, mailingEnabled]);
  const screen = getHelpScreen(pathname, guides);
  const suggestions = getHelpSuggestions(pathname, guides);
  const tour = useMemo(() => {
    const guide = guides.find((item) => item.id === activeTour?.id);
    return guide ? getHelpTour(guide) : null;
  }, [guides, activeTour?.id]);
  const tourStep = useCallback((index: number) => setActiveTour((previous) => previous ? { ...previous, index } : null), []);
  const endTour = useCallback(() => {
    setTourVisible(false); setActiveTour(null);
    launcher.current?.focus();
  }, []);
  const questionDuringTour = useCallback(() => { setTourVisible(false); setOpen(true); }, []);

  function startTour(guide: HelpGuide) {
    setActiveTour({ id: guide.id, index: 0 }); setTourVisible(true); setOpen(false);
  }

  function selectGuide(guide: HelpGuide) {
    request.current?.abort(); request.current = null;
    setBusy(false); setError(null); setRetryQuestion(null); setQuestion("");
    setActiveTour(null); setTourVisible(false); setView("chat");
    setMessages((previous) => [...previous, { role: "user" as const, content: guide.question }, { role: "assistant" as const, content: guide.summary, guides: [helpGuideLink(guide)] }].slice(-21));
  }

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
    if (!open || !scroll.current) return;
    if (!busy && !error && lastReply.current) {
      scroll.current.scrollTop += lastReply.current.getBoundingClientRect().top - scroll.current.getBoundingClientRect().top - 8;
    } else scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, busy, error, open]);

  useEffect(() => {
    if (open && !busy) input.current?.focus();
  }, [open, busy, view]);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (pathname !== "/inbox") return;
    const button = launcher.current;
    if (!button) return;
    let composer: HTMLElement | null = null;
    let frame = 0;
    const resizeObserver = new ResizeObserver(schedule);

    function measure() {
      frame = 0;
      const nextComposer = document.querySelector<HTMLElement>('[data-help="composer"]');
      if (nextComposer !== composer) {
        if (composer) resizeObserver.unobserve(composer);
        composer = nextComposer;
        if (composer) resizeObserver.observe(composer);
      }
      const bounds = composer?.getBoundingClientRect();
      // Keep help above the complete composer, including growing drafts and attachments.
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        button?.style.setProperty("--help-launcher-bottom", `${Math.max(0, window.innerHeight - bounds.top + 12)}px`);
      } else {
        button?.style.removeProperty("--help-launcher-bottom");
      }
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(measure);
    }

    const mountObserver = new MutationObserver(schedule);
    mountObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mountObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      button.style.removeProperty("--help-launcher-bottom");
    };
  }, [pathname]);

  function reset() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setMessages([welcome]);
    setQuestion("");
    setError(null);
    setRetryQuestion(null);
    setActiveTour(null);
    setTourVisible(false);
    setView("chat");
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
        body: JSON.stringify({ question: text, pathname: screen.pathname, history, context: readHelpContext(pathname) }),
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
        className={cn("fixed bottom-[max(calc(5.5rem+env(safe-area-inset-bottom)),var(--help-launcher-bottom,0px))] right-4 z-30 flex h-12 items-center gap-2 rounded-full border border-brand/30 bg-surface px-4 text-sm font-bold text-foreground shadow-lg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-[max(1.5rem,var(--help-launcher-bottom,0px))] md:right-6", (open || tourVisible) && "pointer-events-none opacity-0")}
      >
        <MessageCircleQuestion className="h-5 w-5 text-brand" aria-hidden />
        Ayuda
      </button>
      {open && (
        <section id="crm-help-chat" role="dialog" aria-label="Asistente de ayuda" aria-describedby="crm-help-description"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-[min(640px,calc(100dvh-8rem))] w-[calc(100%-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl md:bottom-6 md:right-6 md:h-[min(640px,calc(100dvh-3rem))]">
          <header className="flex shrink-0 items-center gap-3 border-b bg-surface-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand"><Sparkles className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">Asistente de ayuda</h2>
              <p id="crm-help-description" className="truncate text-xs text-mute">Te guío en {screen.title}</p>
            </div>
            <button type="button" onClick={reset} aria-label="Nueva conversación de ayuda" title="Nueva conversación" className="rounded-lg p-2 text-mute hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><RotateCcw className="h-4 w-4" aria-hidden /></button>
            <button type="button" onClick={close} aria-label="Cerrar ayuda" className="rounded-lg p-2 text-mute hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="h-5 w-5" aria-hidden /></button>
          </header>
          <nav aria-label="Modo de ayuda" className="flex shrink-0 gap-1 border-b px-3 py-2">
            <button type="button" onClick={() => setView("chat")} aria-pressed={view === "chat"} className={cn("flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors", view === "chat" ? "bg-surface-2 text-brand" : "text-mute hover:bg-surface-2")}>Preguntar</button>
            <button type="button" onClick={() => setView("library")} aria-pressed={view === "library"} className={cn("flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors", view === "library" ? "bg-surface-2 text-brand" : "text-mute hover:bg-surface-2")}>Funciones del CRM</button>
          </nav>
          {view === "library" ? <HelpLibrary guides={guides} onSelect={selectGuide} /> : <>
          {tour && activeTour && <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-surface-2 px-4 py-2.5"><p className="min-w-0 truncate text-xs text-mute">Guía en pausa · {tour.title}</p><button type="button" onClick={() => { setOpen(false); setTourVisible(true); }} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand"><Play className="h-3.5 w-3.5" aria-hidden />Retomar guía</button></div>}
          <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div role="log" aria-label="Conversación de ayuda" aria-live="polite" aria-relevant="additions" className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} ref={index === messages.length - 1 && message.role === "assistant" ? lastReply : undefined} className={cn("flex flex-col gap-2", message.role === "user" && "items-end")}>
                  <span className="text-[11px] font-semibold text-mute">{message.role === "user" ? "Tú" : "Asistente"}</span>
                  <div className={cn("max-w-full rounded-2xl px-3.5 py-3 text-sm leading-relaxed", message.role === "user" ? "max-w-[90%] rounded-tr-sm bg-surface-2" : "w-full rounded-tl-sm bg-surface-2")}>
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
                    {message.guides?.map((replyGuide) => guides.find((allowed) => allowed.id === replyGuide.id)).filter((guide): guide is HelpGuide => Boolean(guide)).map((guide) => (
                      <div key={guide.id} className="mt-3 border-t border-border pt-3">
                        <p className="mb-2 flex items-start gap-2 text-xs font-bold"><BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />{guide.title}</p>
                        {guide.href !== "/forgot-password" && <Button type="button" onClick={() => startTour(guide)} className="mb-2 w-full justify-center gap-2 rounded-xl text-xs"><Crosshair className="h-4 w-4" aria-hidden />Guíame en pantalla</Button>}
                        {guide.requirements?.length ? <div className="mb-2 rounded-lg border border-border p-2.5 text-xs leading-relaxed"><p className="mb-1 font-bold">Antes de empezar</p>{guide.requirements.map((requirement) => <p key={requirement}>{requirement}</p>)}</div> : null}
                        <details open className="group text-xs"><summary className="cursor-pointer rounded py-1.5 font-semibold text-mute outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">Ver instrucciones</summary><ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] text-foreground">
                          {guide.steps.map((step, stepIndex) => <li key={stepIndex} className="pl-0.5">{step}</li>)}
                        </ol></details>
                        {guide.result && <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs leading-relaxed"><span className="font-bold">Resultado esperado: </span>{guide.result}</p>}
                        {guide.troubleshooting?.length ? <details className="mt-2 text-xs"><summary className="cursor-pointer py-1.5 font-semibold text-mute">Si no funciona</summary><ul className="list-disc space-y-2 pl-4 leading-relaxed">{guide.troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
                        <Link href={guide.href} onClick={close} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand underline-offset-4 hover:underline">Ir a {guide.title}<ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden /></Link>
                      </div>
                    ))}
                    {message.notice && <p className="mt-3 border-t border-border pt-2 text-xs text-mute">{message.notice}</p>}
                  </div>
                </div>
              ))}
            </div>
            {messages.length === 1 && <div className="mt-5 space-y-2"><p className="text-xs font-semibold text-mute">Puedes empezar con…</p>{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)} disabled={busy} className="block w-full rounded-xl border border-border px-3 py-2.5 text-left text-[13px] transition-colors hover:border-brand/40 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring">{suggestion}</button>)}</div>}
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
            <p className="mt-2 px-1 text-[11px] text-mute">Yo te señalo el camino. Tú haces los clics y decides cuándo guardar o enviar.</p>
          </form>
          </>}
        </section>
      )}
      {tourVisible && tour && activeTour && <HelpTour tour={tour} index={activeTour.index} onStep={tourStep} onClose={endTour} onQuestion={questionDuringTour} />}
    </>
  );
}
