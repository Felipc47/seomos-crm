"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Briefcase,
  BookOpen,
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
  AGENT_RESPONSE_LANGUAGES,
  type AgentResponseLanguage,
  INSTRUCTION_SECTIONS,
  MAX_TONE_PRESETS,
  TONE_PRESETS,
  type AgentInstructionSections,
  type InstructionSectionKey,
} from "@/lib/agent-behavior";
import { cn } from "@/lib/utils";
import { SchedulingSection } from "@/components/agent/scheduling-section";
import { FollowUpSection } from "@/components/agent/follow-up-section";
import { AgentDemoChat } from "@/components/agent/agent-demo-chat";
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
  responseLanguage: AgentResponseLanguage;
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
    <div className="h-full overflow-y-auto bg-surface-2/50">
      <header className="crm-page-header flex flex-wrap items-center gap-x-4 gap-y-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <p className="crm-eyebrow mb-2">Automatización · Inteligencia artificial</p>
          <h2 className="crm-heading">Agente de IA</h2>
          <p className="mt-2 text-[13px] text-mute">Tu equipo, con una forma propia de conversar.</p>
        </div>
        <div className="flex items-center gap-3 rounded-full border bg-surface px-4 py-2.5">
          {saved && <span className="text-xs text-success-fg">Guardado ✓</span>}
          <span className={cn("h-1.5 w-1.5 rounded-full", profile.enabled ? "bg-success" : "bg-faint")} />
          <span className="text-xs font-semibold">
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

      <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      {!aiConfigured && (
        <div className="rounded-xl border bg-surface p-5 text-center sm:p-6">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-brand" strokeWidth={1.8} />
          <p className="font-medium">Configura tu proveedor de IA para activar el agente</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Agrega <code className="rounded bg-secondary px-1">OPENROUTER_API_TOKEN</code> y{" "}
            <code className="rounded bg-secondary px-1">OPENROUTER_MODEL</code> a las variables
            de entorno de la instancia y reiníciala. Mientras tanto puedes dejar listo el
            comportamiento y el conocimiento aquí abajo.
          </p>
        </div>
      )}

      <div className={cn("grid gap-4", credits && "lg:grid-cols-[minmax(0,1fr)_260px]")}>
      {credits && (
        <section
          aria-label="Saldo de créditos de IA"
          className={cn(
            "order-2 flex flex-col justify-center gap-3 rounded-2xl border p-5",
            credits.balance === 0
              ? "border-warning-border bg-warning-bg"
              : "bg-surface"
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              credits.balance === 0
                ? "bg-warning/15 text-warning"
                : "bg-surface-2 text-mute"
            )}
          >
            <Coins className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="space-y-1.5">
              <h3 className="crm-eyebrow">
                Créditos de IA
              </h3>
              <span className="block font-display text-[28px] font-semibold tracking-tight tabular-nums">
                {credits.balance.toLocaleString("es-CO")} <span className="text-[12px] font-medium tracking-normal text-mute">disponibles</span>
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

      <section className="order-1 flex flex-col items-start gap-4 rounded-2xl border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#20252d] text-brand">
            <WandSparkles className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <p className="crm-eyebrow">Asistente de configuración</p>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[22px] font-semibold tracking-[-0.035em]">
            Configúralo con ayuda de IA
          </h3>
          <p className="mt-2 max-w-[58ch] text-[13px] leading-6 text-mute">
            Pega tu sitio o responde tres preguntas. Recibirás un borrador completo para
            revisar, sin guardar ni encender nada automáticamente.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full shrink-0 bg-surface sm:w-auto"
          disabled={!aiConfigured}
          data-help="agent-setup" onClick={() => setAssistantOpen(true)}
        >
          Configurar con IA <ArrowRight className="h-4 w-4 text-brand" />
        </Button>
        {!aiConfigured && (
          <span className="text-xs font-semibold text-warning-fg sm:max-w-[180px]">
            Disponible al configurar el proveedor de IA.
          </span>
        )}
      </section>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ProfileSection profile={profile} onSave={saveProfile} appliedDraft={appliedDraft} />
        <KbSection
          entries={entries}
          kbSize={kbSize}
          onChanged={() => void refetch()}
          appliedDraft={appliedDraft}
        />
        <div className="min-w-0 xl:col-span-2">
          <FollowUpSection />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <SchedulingSection />
        </div>
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
    <Card className="min-w-0 overflow-hidden rounded-2xl">
      <CardHeader className="mb-6 border-b bg-surface px-5 py-6 sm:px-6">
        <p className="crm-eyebrow mb-2">01 · Personalidad y entrenamiento</p>
        <CardTitle className="flex items-center gap-2.5 text-[21px] tracking-[-0.03em]">
          <Sparkles className="h-[18px] w-[18px] text-brand" strokeWidth={1.8} />
          Comportamiento
        </CardTitle>
        <CardDescription className="leading-relaxed">
          Cómo se presenta y actúa el agente al responder a tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-7 px-5 pb-5 sm:px-6 sm:pb-6">
        <div data-help="agent-identity" className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="agent-response-language">Idioma de respuesta</Label>
          <select
            id="agent-response-language"
            aria-describedby="agent-response-language-hint"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.responseLanguage}
            onChange={(e) => setForm({ ...form, responseLanguage: e.target.value as AgentResponseLanguage })}
          >
            {AGENT_RESPONSE_LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>{language.label}</option>
            ))}
          </select>
          <p id="agent-response-language-hint" className="text-xs text-muted-foreground">
            En español e inglés, responde en el idioma del cliente y cambia cuando él lo pida.
          </p>
        </div>

        <AgentDemoChat configuration={form} />

        <div data-help="agent-training" className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Tono</Label>
            <span
              className={cn(
                "text-[11px] font-semibold",
                toneFull ? "text-brand-text" : "text-mute"
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
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "bg-surface text-mute hover:border-foreground/20 hover:text-foreground",
                    blocked && "cursor-not-allowed opacity-40"
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
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
          <div className="overflow-hidden rounded-xl border">
            {INSTRUCTION_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.key];
              const value = form.instructionSections[section.key] ?? "";
              const filled = value.trim().length > 0;
              const open = openSection === section.key;
              return (
                <div
                  key={section.key}
                  className={cn(
                    "overflow-hidden border-b last:border-b-0 transition-colors",
                    open ? "bg-surface-2" : "bg-surface",
                    filled && !open && "border-border"
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSection(open ? null : section.key)}
                    className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-mute",
                        filled && "text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">
                        {section.title}
                      </span>
                      <span className="block truncate text-[11px] text-mute">
                        {filled
                          ? `${value.trim().length.toLocaleString("es-CO")} caracteres`
                          : section.description}
                      </span>
                    </span>
                    {filled && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-mute">
                        <span className="h-1 w-1 rounded-full bg-success" />
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
                "overflow-hidden border-b last:border-b-0 transition-colors",
                openSection === "escalation"
                  ? "bg-surface-2"
                  : "bg-surface",
                (form.escalationRules ?? "").trim() &&
                  openSection !== "escalation" &&
                  "border-border"
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
                className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-mute",
                    (form.escalationRules ?? "").trim() &&
                      "text-foreground"
                  )}
                >
                  <MessageCircleQuestion className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">
                    Escalado a humano
                  </span>
                  <span className="block truncate text-[11px] text-mute">
                    Cuándo pasar la conversación a una persona del equipo.
                  </span>
                </span>
                {(form.escalationRules ?? "").trim() && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-mute">
                    <span className="h-1 w-1 rounded-full bg-success" />
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
                  "overflow-hidden border-b last:border-b-0 transition-colors",
                  openSection === "legacy"
                    ? "bg-surface-2"
                    : "border-border bg-surface"
                )}
              >
                <button
                  type="button"
                  aria-expanded={openSection === "legacy"}
                  onClick={() =>
                    setOpenSection(openSection === "legacy" ? null : "legacy")
                  }
                  className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-mute">
                    <FileText className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">
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

        <div className="border-t pt-5">
          <Button data-help="agent-save" className="w-full sm:w-auto" onClick={() => void onSave(form)}>Guardar comportamiento</Button>
        </div>
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
    <Card className="min-w-0 overflow-hidden rounded-2xl">
      <CardHeader className="mb-6 border-b bg-surface px-5 py-6 sm:px-6">
        <p className="crm-eyebrow mb-2">02 · Conocimiento del negocio</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-48">
            <CardTitle className="flex items-center gap-2.5 text-[21px] tracking-[-0.03em]">
              <BookOpen className="h-[18px] w-[18px] shrink-0 text-brand" strokeWidth={1.8} />
              Knowledge base
            </CardTitle>
            <CardDescription className="mt-1.5 leading-relaxed">
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
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div data-help="knowledge-qa" className="space-y-3">
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
            data-help="knowledge-add"
            size="sm"
            onClick={() => void addQa()}
            disabled={!question.trim() || !answer.trim()}
          >
            <Plus className="h-4 w-4" /> Agregar P/R
          </Button>
        </div>

        <div data-help="knowledge-block" className="space-y-3 border-t pt-5">
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

        <ul data-help="knowledge-list" className="divide-y border-t">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-mute">
                {e.kind === "qa" ? <MessageCircleQuestion className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1 break-words text-sm leading-relaxed">
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
