"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Globe2,
  LoaderCircle,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import type {
  AgentConfigurationDraft,
  AgentConfigurationGoal,
} from "@/server/ai/config-assistant";
import { INSTRUCTION_SECTIONS, TONE_PRESETS } from "@/lib/agent-behavior";
import { cn } from "@/lib/utils";
import { SlideOver } from "@/components/ui/slide-over";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AssistantResponse = {
  draft: AgentConfigurationDraft;
  website: {
    used: boolean;
    finalUrl: string | null;
    warning: string | null;
  };
};

const GOALS: { id: AgentConfigurationGoal; label: string; description: string }[] = [
  { id: "sales", label: "Vender", description: "Recomendar y llevar al siguiente paso" },
  { id: "qualify", label: "Calificar", description: "Entender si el prospecto encaja" },
  { id: "support", label: "Resolver dudas", description: "Orientar y escalar soporte" },
  { id: "schedule", label: "Agendar", description: "Preparar y proponer reuniones" },
  { id: "inform", label: "Informar", description: "Explicar servicios y condiciones" },
];

export function AgentSetupAssistant({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (draft: AgentConfigurationDraft) => void;
}) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [goal, setGoal] = useState<AgentConfigurationGoal>("qualify");
  const [limits, setLimits] = useState("");
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"context" | "website" | "generation" | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function generate() {
    if (!websiteUrl.trim() && !businessDescription.trim()) {
      setError("Agrega el sitio web o cuéntanos brevemente qué hace el negocio.");
      setErrorKind("context");
      requestAnimationFrame(() => document.getElementById("assistant-website")?.focus());
      return;
    }
    setError(null);
    setErrorKind(null);
    setLoading(true);
    const response = await fetch("/api/agent/config-assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ websiteUrl, businessDescription, goal, limits }),
    }).catch(() => null);

    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      const websiteError = ["unsafe_url", "invalid_url"].includes(data?.error?.code ?? "");
      setError(
        data?.error?.message ??
          "No pudimos preparar el borrador. Revisa tu conexión e intenta de nuevo."
      );
      setErrorKind(websiteError ? "website" : "generation");
      setLoading(false);
      if (websiteError) {
        requestAnimationFrame(() => document.getElementById("assistant-website")?.focus());
      }
      return;
    }

    const data = (await response.json()) as AssistantResponse;
    setResult(data);
    setLoading(false);
  }

  function applyDraft() {
    if (!result) return;
    onApply(result.draft);
    setResult(null);
    onClose();
  }

  return (
    <SlideOver onClose={onClose} ariaLabel="Configurar agente con IA">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3.5 sm:px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <WandSparkles className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] font-bold leading-tight">
            Configurar con IA
          </h2>
          <p className="mt-0.5 truncate text-xs text-mute">
            {result ? "Revisa antes de usar el borrador" : "Un sitio o una descripción corta bastan"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar asistente">
          <X className="h-5 w-5" />
        </Button>
      </header>

      {result ? (
        <DraftPreview result={result} onBack={() => setResult(null)} onApply={applyDraft} />
      ) : (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            <div className="mb-6 max-w-[65ch]">
              <h3 className="text-balance font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                Cuéntanos lo esencial. La IA ordena el resto.
              </h3>
              <p className="mt-2 text-sm leading-6 text-mute">
                Prepararemos nombre, saludo, tonos, reglas y conocimiento. Nada se guarda ni
                enciende hasta que tú lo revises.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="assistant-website" className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-brand" /> Sitio web
                  <span className="font-normal text-mute">(opcional)</span>
                </Label>
                <Input
                  id="assistant-website"
                  autoFocus
                  data-slide-over-autofocus
                  inputMode="url"
                  autoComplete="url"
                  placeholder="tuempresa.com"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  aria-invalid={errorKind === "context" || errorKind === "website"}
                  aria-describedby={error ? "assistant-error" : undefined}
                />
                <p className="text-[11.5px] leading-relaxed text-mute">
                  Leemos una sola página pública. No usamos áreas privadas ni guardamos una copia.
                </p>
              </div>

              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">o</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assistant-description">¿Qué ofrece el negocio?</Label>
                <Textarea
                  id="assistant-description"
                  rows={4}
                  placeholder="Ej.: instalamos paneles solares para hogares en Bogotá y hacemos asesoría personalizada…"
                  value={businessDescription}
                  onChange={(event) => setBusinessDescription(event.target.value)}
                  aria-invalid={errorKind === "context"}
                  aria-describedby={error ? "assistant-error" : undefined}
                />
                <p className="text-[11.5px] text-mute">
                  Si agregas el sitio, úsalo para aclarar lo más importante o déjalo vacío.
                </p>
              </div>

              <fieldset className="space-y-2.5">
                <legend className="text-sm font-bold">¿Qué debe lograr principalmente?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {GOALS.map((option) => {
                    const selected = goal === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setGoal(option.id)}
                        className={cn(
                          "flex min-h-[66px] items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft",
                          selected
                            ? "border-brand/40 bg-brand-tint"
                            : "bg-surface-2 hover:border-border-strong"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            selected ? "border-brand bg-brand text-white" : "border-border-strong"
                          )}
                        >
                          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span>
                          <span className="block text-[13px] font-bold">{option.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-mute">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="assistant-limits">
                  ¿Qué nunca debe prometer o hacer? <span className="font-normal text-mute">(opcional)</span>
                </Label>
                <Textarea
                  id="assistant-limits"
                  rows={3}
                  placeholder="Ej.: no confirmar precios ni disponibilidad sin consultar al equipo"
                  value={limits}
                  onChange={(event) => setLimits(event.target.value)}
                />
              </div>

            </div>
          </main>

          <footer className="shrink-0 border-t bg-surface px-4 py-3.5 sm:px-5">
            {error && (
              <div
                id="assistant-error"
                role="alert"
                className="mb-3 flex items-start gap-2.5 rounded-xl border border-danger-border bg-danger-bg p-3 text-[12px] leading-5 text-danger-fg"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button className="w-full" size="lg" onClick={() => void generate()} disabled={loading}>
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Analizando y preparando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Crear borrador
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-faint">
              Normalmente toma menos de un minuto.
            </p>
          </footer>
        </>
      )}
    </SlideOver>
  );
}

function DraftPreview({
  result,
  onBack,
  onApply,
}: {
  result: AssistantResponse;
  onBack: () => void;
  onApply: () => void;
}) {
  const draft = result.draft;
  const toneLabels = draft.tonePresets.map(
    (id) => TONE_PRESETS.find((preset) => preset.id === id)?.label ?? id
  );

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="flex items-start gap-3 rounded-xl bg-success-bg p-3.5 text-success-fg">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/15">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-sm font-bold">Borrador completo</p>
            <p className="mt-0.5 text-[12px] leading-5">{draft.summary}</p>
          </div>
        </div>

        {result.website.warning && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg p-3 text-[12px] leading-5 text-warning-fg"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.website.warning}</span>
          </div>
        )}

        <section className="mt-6 border-b pb-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[18px] font-extrabold">{draft.name}</h3>
              <p className="mt-1 text-sm leading-5 text-mute">{draft.greeting}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {toneLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-bold text-brand"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <h3 className="font-display text-[15px] font-bold">Instrucciones preparadas</h3>
          <p className="mt-1 text-xs text-mute">Abre una sección para revisar el texto completo.</p>
          <div className="mt-3 divide-y rounded-xl border bg-surface-2">
            {INSTRUCTION_SECTIONS.map((section) => (
              <details key={section.key} className="group px-3.5 py-3 open:bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 pr-1 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft">
                  <span>{section.title}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-mute">
                  {draft.instructionSections[section.key]}
                </p>
              </details>
            ))}
            <details className="group px-3.5 py-3 open:bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 pr-1 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft">
                <span>Escalado a humano</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-mute">
                {draft.escalationRules}
              </p>
            </details>
          </div>
        </section>

        <section className="border-t pt-5">
          <h3 className="font-display text-[15px] font-bold">Conocimiento del negocio</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-[12px] leading-5 text-mute">
            {draft.knowledgeBlock}
          </p>
        </section>
      </main>

      <footer className="shrink-0 border-t bg-surface px-4 py-3.5 sm:px-5">
        <div className="flex gap-2.5">
          <Button variant="secondary" size="lg" onClick={onBack} aria-label="Volver a editar respuestas">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button className="min-w-0 flex-1" size="lg" onClick={onApply}>
            Usar este borrador
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-faint">
          Rellenará los campos; todavía podrás editarlos antes de guardar.
        </p>
      </footer>
    </>
  );
}
