"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Briefcase,
  CalendarClock,
  Check,
  ChevronDown,
  Coins,
  FileText,
  Hand,
  ListChecks,
  MessageCircleQuestion,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import {
  INSTRUCTION_SECTIONS,
  MAX_TONE_PRESETS,
  TONE_PRESETS,
  type AgentInstructionSections,
  type InstructionSectionKey,
} from "@/lib/agent-behavior";
import { cn } from "@/lib/utils";
import { SchedulingSection } from "@/components/agent/scheduling-section";
import { FollowUpSection } from "@/components/agent/follow-up-section";
import { AgentSetupAssistant } from "@/components/agent/agent-setup-assistant";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { AgentConfigurationDraft } from "@/server/ai/config-assistant";

type Profile = {
  enabled: boolean;
  name: string;
  tone: string | null;
  tonePresets: string[];
  instructions: string | null;
  instructionSections: AgentInstructionSections;
  escalationRules: string | null;
  greeting: string | null;
};

type AiCredits = {
  balance: number;
  agentTurnCost: number;
  followUpCost: number;
};

/** Icono por sección de entrenamiento (solo presentación). */
const SECTION_ICONS: Record<InstructionSectionKey, LucideIcon> = {
  presentacion: Hand,
  negocio: Briefcase,
  calificacion: ListChecks,
  precios: BadgeDollarSign,
  agendamiento: CalendarClock,
  reglas: ShieldAlert,
};

type KbEntry = {
  id: string;
  kind: "qa" | "block";
  question: string | null;
  answer: string | null;
  content: string | null;
};

export function AgentClient() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [credits, setCredits] = useState<AiCredits | null>(null);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [kbSize, setKbSize] = useState<{ chars: number; warnAt: number; warning: boolean } | null>(null);
  const [saved, setSaved] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [appliedDraft, setAppliedDraft] = useState<{
    version: number;
    draft: AgentConfigurationDraft;
  } | null>(null);

  const refetch = useCallback(async () => {
    const [p, kb, size] = await Promise.all([
      fetch("/api/agent/profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/kb").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/kb/size").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null, null]);
    if (p) {
      setProfile(p.profile);
      setAiConfigured(p.aiConfigured);
      setCredits(p.credits);
    }
    if (kb) setEntries(kb.entries);
    if (size) setKbSize(size);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  async function saveProfile(patch: Partial<Profile>) {
    const res = await fetch("/api/agent/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    // Un rechazo del servidor (p. ej. texto demasiado largo) debe verse:
    // antes se mostraba "Guardado ✓" y el refetch revertía lo escrito.
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      toast(
        data?.error?.message ??
          "No se pudo guardar: revisa la longitud de los campos"
      );
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    void refetch();
  }

  function applyAssistantDraft(draft: AgentConfigurationDraft) {
    setAppliedDraft((current) => ({
      version: (current?.version ?? 0) + 1,
      draft,
    }));
    toast("Borrador aplicado. Revísalo y guárdalo cuando esté listo.");
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b bg-surface px-4 py-3 md:px-[30px] md:py-[18px]">
        <Sparkles className="h-[22px] w-[22px] text-brand" strokeWidth={2} />
        <h2 className="font-display text-[22px] font-bold">Agente de IA</h2>
        <div className="ml-auto flex items-center gap-3">
          {saved && <span className="text-xs text-primary">Guardado ✓</span>}
          <span className="text-[13px] font-bold">
            {profile.enabled ? "Encendido" : "Apagado"}
          </span>
          <Switch
            checked={profile.enabled}
            disabled={!aiConfigured}
            aria-label="Agente encendido"
            onCheckedChange={() =>
              void saveProfile({ enabled: !profile.enabled })
            }
          />
        </div>
      </header>

      {!aiConfigured && (
        <div className="mx-6 mt-6 rounded-lg border border-brand-soft bg-brand-tint p-6 text-center">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary" />
          <p className="font-medium">Configura tu proveedor de IA para activar el agente</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Agrega <code className="rounded bg-secondary px-1">OPENROUTER_API_TOKEN</code> y{" "}
            <code className="rounded bg-secondary px-1">OPENROUTER_MODEL</code> a las variables
            de entorno de la instancia y reiníciala. Mientras tanto puedes dejar listo el
            comportamiento y el conocimiento aquí abajo.
          </p>
        </div>
      )}

      {credits && (
        <section
          aria-label="Saldo de créditos de IA"
          className={cn(
            "mx-6 mt-6 flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center",
            credits.balance === 0
              ? "border-warning-border bg-warning-bg"
              : "bg-surface"
          )}
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              credits.balance === 0
                ? "bg-warning/15 text-warning"
                : "bg-brand-tint text-brand"
            )}
          >
            <Coins className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="font-display text-[15px] font-bold">
                Créditos de IA
              </h3>
              <span className="text-[15px] font-extrabold tabular-nums">
                {credits.balance.toLocaleString("es-CO")} disponibles
              </span>
            </div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-text-3">
              1 por intervención completa · 1 por seguimiento con IA
            </p>
          </div>
          {credits.balance === 0 && (
            <p className="max-w-xs text-[12px] font-semibold leading-relaxed text-warning-fg">
              El agente entregará los chats a una persona hasta que el
              superadministrador recargue el saldo.
            </p>
          )}
        </section>
      )}

      <section className="mx-6 mt-6 flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand-tint p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
          <WandSparkles className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[16px] font-extrabold">
            Configúralo con ayuda de IA
          </h3>
          <p className="mt-1 max-w-[68ch] text-[13px] leading-5 text-mute">
            Pega tu sitio o responde tres preguntas. Recibirás un borrador completo para
            revisar, sin guardar ni encender nada automáticamente.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full shrink-0 bg-surface sm:w-auto"
          disabled={!aiConfigured}
          onClick={() => setAssistantOpen(true)}
        >
          Configurar con IA <ArrowRight className="h-4 w-4" />
        </Button>
        {!aiConfigured && (
          <span className="text-xs font-semibold text-warning-fg sm:max-w-[180px]">
            Disponible al configurar el proveedor de IA.
          </span>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 p-6 lg:grid-cols-2">
        <ProfileSection profile={profile} onSave={saveProfile} appliedDraft={appliedDraft} />
        <KbSection
          entries={entries}
          kbSize={kbSize}
          onChanged={() => void refetch()}
          appliedDraft={appliedDraft}
        />
        <div className="lg:col-span-2">
          <FollowUpSection />
        </div>
        <div className="lg:col-span-2">
          <SchedulingSection />
        </div>
      </div>
      <AgentSetupAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onApply={applyAssistantDraft}
      />
    </div>
  );
}

function ProfileSection({
  profile,
  onSave,
  appliedDraft,
}: {
  profile: Profile;
  onSave: (patch: Partial<Profile>) => Promise<void>;
  appliedDraft: { version: number; draft: AgentConfigurationDraft } | null;
}) {
  const [form, setForm] = useState(profile);
  const [openSection, setOpenSection] = useState<string | null>(null);
  useEffect(() => setForm(profile), [profile]);
  useEffect(() => {
    if (!appliedDraft) return;
    const draft = appliedDraft.draft;
    setForm((current) => ({
      ...current,
      name: draft.name,
      greeting: draft.greeting,
      tonePresets: draft.tonePresets,
      tone: draft.tone,
      instructionSections: draft.instructionSections,
      escalationRules: draft.escalationRules,
    }));
    setOpenSection(null);
  }, [appliedDraft]);

  function togglePreset(id: string) {
    const selected = form.tonePresets.includes(id);
    if (selected) {
      setForm({
        ...form,
        tonePresets: form.tonePresets.filter((p) => p !== id),
      });
      return;
    }
    if (form.tonePresets.length >= MAX_TONE_PRESETS) return;
    setForm({ ...form, tonePresets: [...form.tonePresets, id] });
  }

  function setSection(key: InstructionSectionKey, value: string) {
    setForm({
      ...form,
      instructionSections: { ...form.instructionSections, [key]: value },
    });
  }

  const toneFull = form.tonePresets.length >= MAX_TONE_PRESETS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comportamiento</CardTitle>
        <CardDescription>
          Cómo se presenta y actúa el agente al responder a tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Nombre del agente</Label>
            <Input
              id="agent-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-greeting">Saludo</Label>
            <Input
              id="agent-greeting"
              placeholder="Saludo para conversaciones nuevas"
              value={form.greeting ?? ""}
              onChange={(e) => setForm({ ...form, greeting: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Tono</Label>
            <span
              className={cn(
                "text-[11px] font-semibold",
                toneFull ? "text-brand" : "text-mute"
              )}
            >
              {form.tonePresets.length}/{MAX_TONE_PRESETS} elegidos
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tonos preestablecidos">
            {TONE_PRESETS.map((preset) => {
              const selected = form.tonePresets.includes(preset.id);
              const blocked = !selected && toneFull;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  title={preset.hint}
                  onClick={() => togglePreset(preset.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft",
                    selected
                      ? "border-brand/40 bg-brand-tint text-brand shadow-sm"
                      : "bg-surface-2 text-foreground hover:border-foreground/20",
                    blocked && "cursor-not-allowed opacity-40"
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-mute">
            Combina hasta {MAX_TONE_PRESETS}. Pasa el cursor sobre cada tono
            para ver qué significa.
          </p>
          <Input
            id="agent-tone"
            placeholder="Matices propios (opcional): p. ej. usa emojis con moderación"
            value={form.tone ?? ""}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Entrenamiento del agente</Label>
          <p className="-mt-0.5 text-[11.5px] text-mute">
            Divide las instrucciones por tema: el agente recibe cada sección
            con su contexto y es mucho más fácil de mantener.
          </p>
          <div className="space-y-2">
            {INSTRUCTION_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.key];
              const value = form.instructionSections[section.key] ?? "";
              const filled = value.trim().length > 0;
              const open = openSection === section.key;
              return (
                <div
                  key={section.key}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-colors",
                    open ? "border-brand/35 bg-background" : "bg-surface-2",
                    filled && !open && "border-brand/20"
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSection(open ? null : section.key)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border bg-surface text-mute shadow-sm",
                        filled && "border-brand/25 text-brand"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">
                        {section.title}
                      </span>
                      <span className="block truncate text-[11px] text-mute">
                        {filled
                          ? `${value.trim().length.toLocaleString("es-CO")} caracteres`
                          : section.description}
                      </span>
                    </span>
                    {filled && (
                      <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand">
                        Listo
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-faint transition-transform",
                        open && "rotate-180 text-brand"
                      )}
                      strokeWidth={2.2}
                    />
                  </button>
                  {open && (
                    <div className="border-t px-3 pb-3 pt-2.5">
                      <p className="mb-2 text-[11.5px] text-mute">
                        {section.description}
                      </p>
                      <Textarea
                        aria-label={section.title}
                        rows={8}
                        placeholder={section.placeholder}
                        value={value}
                        onChange={(e) => setSection(section.key, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div
              className={cn(
                "overflow-hidden rounded-xl border transition-colors",
                openSection === "escalation"
                  ? "border-brand/35 bg-background"
                  : "bg-surface-2",
                (form.escalationRules ?? "").trim() &&
                  openSection !== "escalation" &&
                  "border-brand/20"
              )}
            >
              <button
                type="button"
                aria-expanded={openSection === "escalation"}
                onClick={() =>
                  setOpenSection(
                    openSection === "escalation" ? null : "escalation"
                  )
                }
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border bg-surface text-mute shadow-sm",
                    (form.escalationRules ?? "").trim() &&
                      "border-brand/25 text-brand"
                  )}
                >
                  <MessageCircleQuestion className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">
                    Escalado a humano
                  </span>
                  <span className="block truncate text-[11px] text-mute">
                    Cuándo pasar la conversación a una persona del equipo.
                  </span>
                </span>
                {(form.escalationRules ?? "").trim() && (
                  <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand">
                    Listo
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-faint transition-transform",
                    openSection === "escalation" && "rotate-180 text-brand"
                  )}
                  strokeWidth={2.2}
                />
              </button>
              {openSection === "escalation" && (
                <div className="border-t px-3 pb-3 pt-2.5">
                  <Textarea
                    id="agent-escalation"
                    aria-label="Escalado a humano"
                    rows={4}
                    placeholder="Cuándo pasar la conversación a un humano…"
                    value={form.escalationRules ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, escalationRules: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {((form.instructions ?? "").trim() !== "" ||
              openSection === "legacy") && (
              <div
                className={cn(
                  "overflow-hidden rounded-xl border transition-colors",
                  openSection === "legacy"
                    ? "border-brand/35 bg-background"
                    : "bg-surface-2 border-brand/20"
                )}
              >
                <button
                  type="button"
                  aria-expanded={openSection === "legacy"}
                  onClick={() =>
                    setOpenSection(openSection === "legacy" ? null : "legacy")
                  }
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border bg-surface text-brand shadow-sm">
                    <FileText className="h-4 w-4" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">
                      Otras instrucciones (texto libre)
                    </span>
                    <span className="block truncate text-[11px] text-mute">
                      {`${(form.instructions ?? "").trim().length.toLocaleString("es-CO")} caracteres — puedes repartirlo en las secciones de arriba`}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-faint transition-transform",
                      openSection === "legacy" && "rotate-180 text-brand"
                    )}
                    strokeWidth={2.2}
                  />
                </button>
                {openSection === "legacy" && (
                  <div className="border-t px-3 pb-3 pt-2.5">
                    <Textarea
                      id="agent-instructions"
                      aria-label="Otras instrucciones"
                      rows={14}
                      value={form.instructions ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, instructions: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button onClick={() => void onSave(form)}>Guardar comportamiento</Button>
      </CardContent>
    </Card>
  );
}

function KbSection({
  entries,
  kbSize,
  onChanged,
  appliedDraft,
}: {
  entries: KbEntry[];
  kbSize: { chars: number; warnAt: number; warning: boolean } | null;
  onChanged: () => void;
  appliedDraft: { version: number; draft: AgentConfigurationDraft } | null;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [block, setBlock] = useState("");
  useEffect(() => {
    if (appliedDraft) setBlock(appliedDraft.draft.knowledgeBlock);
  }, [appliedDraft]);

  async function addQa() {
    if (!question.trim() || !answer.trim()) return;
    await fetch("/api/kb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "qa", question, answer }),
    }).catch(() => null);
    setQuestion("");
    setAnswer("");
    onChanged();
  }

  async function addBlock() {
    if (!block.trim()) return;
    await fetch("/api/kb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "block", content: block }),
    }).catch(() => null);
    setBlock("");
    onChanged();
  }

  async function remove(id: string) {
    await fetch(`/api/kb/${id}`, { method: "DELETE" }).catch(() => null);
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge base</CardTitle>
            <CardDescription>
              La única fuente de verdad del agente: lo que no está aquí, no lo
              afirma.
            </CardDescription>
          </div>
          {kbSize && (
            <Badge variant={kbSize.warning ? "warning" : "secondary"}>
              {kbSize.chars.toLocaleString("es-CO")} caracteres
            </Badge>
          )}
        </div>
        {kbSize?.warning && (
          <p className="text-xs text-[color:var(--warning-fg)]">
            El conocimiento se acerca al límite del contexto del modelo (v1 lo
            inyecta completo en cada turno). Considera depurar entradas.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Nueva pregunta / respuesta</p>
          <Input
            placeholder="Pregunta (p. ej. ¿Hacen envíos?)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Textarea
            placeholder="Respuesta"
            rows={2}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => void addQa()}
            disabled={!question.trim() || !answer.trim()}
          >
            <Plus className="h-4 w-4" /> Agregar P/R
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Nuevo bloque de texto libre</p>
          <Textarea
            placeholder="Horarios, direcciones, políticas…"
            rows={3}
            value={block}
            onChange={(e) => setBlock(e.target.value)}
          />
          <Button size="sm" onClick={() => void addBlock()} disabled={!block.trim()}>
            <Plus className="h-4 w-4" /> Agregar bloque
          </Button>
        </div>

        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-2 rounded-md border p-3">
              <div className="min-w-0 flex-1 text-sm">
                {e.kind === "qa" ? (
                  <>
                    <p className="font-medium">{e.question}</p>
                    <p className="mt-0.5 text-muted-foreground">{e.answer}</p>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-muted-foreground">{e.content}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar entrada"
                onClick={() => void remove(e.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {entries.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Sin entradas todavía: agrega lo que el agente debe saber.
            </p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
