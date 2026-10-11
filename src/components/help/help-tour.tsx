"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Crosshair, MessageCircleQuestion, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readHelpContext, type HelpTour as Tour, type HelpUiContext } from "@/lib/help-tours";

type Box = { top: number; left: number; width: number; height: number };
function visibleBox(element: HTMLElement): Box | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height || getComputedStyle(element).visibility === "hidden") return null;
  let top = Math.max(6, rect.top), left = Math.max(6, rect.left);
  let bottom = Math.min(innerHeight - 6, rect.bottom), right = Math.min(innerWidth - 6, rect.right);
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const bounds = parent.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
  }
  return bottom > top && right > left ? { top, left, width: right - left, height: bottom - top } : null;
}

export function HelpTour({ tour, index, onStep, onClose, onQuestion }: {
  tour: Tour; index: number; onStep: (index: number) => void; onClose: () => void; onQuestion: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const geometryKey = `${pathname}:${tour.id}:${index}`;
  const [highlight, setHighlight] = useState<{ key: string; box: Box | null; dockTop: boolean }>({ key: "", box: null, dockTop: false });
  const box = highlight.key === geometryKey ? highlight.box : null;
  const dockTop = highlight.key === geometryKey && highlight.dockTop;
  const [context, setContext] = useState<HelpUiContext | undefined>();
  const heading = useRef<HTMLHeadingElement>(null);
  const inScreen = pathname === tour.href;
  const completed = index >= tour.steps.length;
  const step = tour.steps[index];
  const lastStep = tour.steps[tour.steps.length - 1];
  const observesAi = ["pause-agent", "resume-agent", "handoff"].includes(tour.id);
  const blocked = inScreen && observesAi && index > 0 && ["unavailable", "blocked"].includes(context?.ai ?? "");

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); onClose(); } }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, inScreen, onClose]);

  useEffect(() => {
    if (!inScreen) return;
    let frame = 0;
    let revealed: HTMLElement | null = null;
    function update() {
      frame = 0;
      const nextContext = readHelpContext(pathname);
      setContext((previous) => JSON.stringify(previous) === JSON.stringify(nextContext) ? previous : nextContext);
      if (completed && tour.observed && lastStep?.completeWhen && !document.querySelector(lastStep.completeWhen)) {
        onStep(tour.steps.length - 1);
        return;
      }
      if (step?.completeWhen && document.querySelector(step.completeWhen)) { onStep(index + 1); return; }
      const element = step?.target
        ? [...document.querySelectorAll<HTMLElement>(step.target)].find((item) => item.getBoundingClientRect().width > 0 && item.getBoundingClientRect().height > 0)
        : undefined;
      if (element && revealed !== element) {
        if (revealed) resize.unobserve(revealed);
        revealed = element;
        resize.observe(element);
        element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
      const next = element ? visibleBox(element) : null;
      const nextHighlight = { key: geometryKey, box: next, dockTop: Boolean(next && next.top + next.height / 2 > innerHeight / 2) };
      setHighlight((previous) => JSON.stringify(previous) === JSON.stringify(nextHighlight) ? previous : nextHighlight);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-help-state", "data-help-ai", "data-help-window", "aria-checked", "disabled", "class"] });
    const resize = new ResizeObserver(schedule);
    resize.observe(document.documentElement);
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); document.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule); };
  }, [inScreen, pathname, step, completed, index, tour, lastStep, onStep, geometryKey]);

  const missing = inScreen && !completed && Boolean(step?.target) && !box;
  const title = !inScreen ? "Vamos a la pantalla correcta" : blocked
    ? context?.ai === "blocked" ? "Este chat está bloqueado" : "La IA no está disponible"
    : completed ? tour.observed ? "Estado comprobado" : "Recorrido terminado" : step?.title;
  const text = !inScreen ? `Esta tarea se hace en ${tour.href === "/inbox" ? "Bandeja" : tour.title}. Te llevaré allí y seguiremos con el primer paso.`
    : blocked ? context?.ai === "blocked"
      ? "Este contacto tiene bloqueados la IA y los envíos. No necesitas apagar el interruptor para detener las respuestas. Si quieres volver a atenderlo, revisa primero su bloqueo con el administrador."
      : "El interruptor está deshabilitado porque el agente general no está activado o la IA no está configurada. Mientras siga así, el agente no responderá automáticamente. Pide al administrador que revise la configuración si quieres reactivarlo."
    : completed ? tour.completion : step?.text;

  return <>
    {box && !completed && !blocked && <div data-testid="help-target-highlight" aria-hidden="true" className="pointer-events-none fixed z-[45] rounded-xl border-[3px] border-brand shadow-[0_0_0_5px_color-mix(in_srgb,var(--accent)_18%,transparent)] transition-[top,left,width,height] duration-150 motion-reduce:transition-none"
      style={{ top: box.top - 3, left: box.left - 3, width: box.width + 6, height: box.height + 6 }}>
      <span className="absolute -left-2 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow">{index + 1}</span>
    </div>}
    <section role="dialog" aria-label="Guía en pantalla" aria-describedby="help-tour-text" data-testid="help-tour" className={`fixed right-3 z-50 w-[calc(100%-1.5rem)] max-w-[360px] overflow-hidden rounded-2xl border border-brand/30 bg-surface shadow-2xl md:right-6 ${dockTop ? "top-3 md:top-6" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6"}`}>
      <header className="flex items-start gap-2 border-b bg-brand/5 px-4 py-3">
        <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{tour.title}</p><p className="mt-1 text-[11px] text-mute">{completed ? tour.observed ? "Comprobado en esta pantalla" : "Tú decides qué guardar o enviar" : `Paso ${index + 1} de ${tour.steps.length}`}</p></div>
        <button type="button" aria-label="Cerrar guía" onClick={onClose} className="-mr-1 rounded-lg p-1 text-mute hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" aria-hidden /></button>
      </header>
      <div className="max-h-[min(260px,40dvh)] overflow-y-auto px-4 py-4">
        <h3 ref={heading} tabIndex={-1} className="flex items-center gap-2 text-base font-bold outline-none">{completed && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" aria-hidden />}{title}</h3>
        <p id="help-tour-text" className="mt-2 text-sm leading-relaxed">{text}</p>
        {missing && !blocked && <p role="status" className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs text-mute">Todavía no veo este control. Espera a que cargue la pantalla; si no aparece, vuelve a Ayuda y cuéntame qué ves.</p>}
        {step?.waiting && inScreen && !completed && !blocked && <p role="status" className="mt-3 text-xs font-medium text-brand-text">{context?.ai === "loading" && observesAi ? "Consultando el estado de la IA…" : step.waiting}</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-3">
        <button type="button" onClick={onQuestion} className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1.5 text-xs font-semibold text-mute hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden />Tengo una duda</button>
        <div className="flex items-center gap-2">
          {index > 0 && !completed && !tour.steps[index - 1]?.completeWhen && <Button size="icon" variant="outline" aria-label="Paso anterior" onClick={() => onStep(index - 1)} className="h-8 w-8"><ArrowLeft className="h-3.5 w-3.5" aria-hidden /></Button>}
          {!inScreen ? <Button size="sm" onClick={() => router.push(tour.href)}>Ir a la pantalla<ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden /></Button>
            : completed || blocked ? <Button size="sm" onClick={onClose}>Terminar guía</Button>
            : !step?.completeWhen && <Button size="sm" disabled={missing} onClick={() => onStep(index + 1)}>{index === tour.steps.length - 1 ? "Entendido" : "Continuar"}<ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden /></Button>}
        </div>
      </footer>
    </section>
  </>;
}
