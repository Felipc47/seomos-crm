"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlarmClock,
  Columns3,
  LayoutList,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  closureReasonLabel,
  isNegativeStage,
  type LeadClosureReason,
} from "@/lib/lead-closure";
import type { StageDto } from "@/lib/types";
import { cn, formatPhone } from "@/lib/utils";
import { stageColor } from "@/lib/stage-colors";
import { ContactAvatar } from "@/components/avatar";
import { useViewPreference } from "@/components/use-view-preference";
import { useToast } from "@/components/ui/toast";
import {
  ViewToggle,
  type ViewOption,
} from "@/components/ui/view-toggle";
import { formatTime } from "@/components/inbox/helpers";
import { StageManager } from "./stage-manager";
import { LeadClosureDialog } from "./lead-closure-dialog";

export type BoardLead = {
  id: string;
  stageId: string;
  position: number;
  lastActivityAt: string | null;
  followUpDueAt: string | null;
  followUpAttempts: number;
  closureReason: string | null;
  closedAt: string | null;
  contact: { id: string; name: string; phone: string };
  conversationId: string | null;
};

const PIPELINE_VIEWS = ["board", "list"] as const;
type PipelineView = (typeof PIPELINE_VIEWS)[number];

const PIPELINE_VIEW_OPTIONS: readonly ViewOption<PipelineView>[] = [
  { value: "board", label: "Tablero", icon: Columns3 },
  { value: "list", label: "Lista", icon: LayoutList },
];

export function PipelineClient() {
  const [stages, setStages] = useState<StageDto[]>([]);
  const [leads, setLeads] = useState<BoardLead[]>([]);
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);
  const [managing, setManaging] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingMove, setPendingMove] = useState<{
    lead: BoardLead;
    stage: StageDto;
    position: number;
  } | null>(null);
  const [moving, setMoving] = useState(false);
  const [view, setView] = useViewPreference<PipelineView>(
    "seomos.pipeline.view",
    "board",
    PIPELINE_VIEWS
  );
  const toast = useToast();

  // Mouse y touch por separado: en táctil el drag se activa con long-press
  // (delay) para no pelear con el scroll horizontal del tablero.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    })
  );

  const refetch = useCallback(async () => {
    const res = await fetch("/api/pipeline/board").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { stages: StageDto[]; leads: BoardLead[] };
    setStages(data.stages);
    setLeads(data.leads);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  function onDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  }

  async function persistMove(
    lead: BoardLead,
    stage: StageDto,
    position: number,
    closureReason?: LeadClosureReason
  ) {
    setMoving(true);
    const previous = leads;
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              stageId: stage.id,
              position,
              closureReason: closureReason ?? null,
              closedAt:
                stage.kind === "won" || isNegativeStage(stage.kind)
                  ? new Date().toISOString()
                  : null,
              followUpDueAt: null,
              followUpAttempts: 0,
            }
          : item
      )
    );
    const res = await fetch(`/api/pipeline/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stageId: stage.id,
        position,
        closureReason: closureReason ?? null,
      }),
    }).catch(() => null);
    setMoving(false);
    setPendingMove(null);
    if (!res?.ok) {
      setLeads(previous);
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      toast(data?.error?.message ?? "No se pudo actualizar la etapa");
      return;
    }
    void refetch();
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overStage = event.over ? String(event.over.id) : null;
    if (!overStage) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stageId === overStage) return;
    const stage = stages.find((item) => item.id === overStage);
    if (!stage) return;
    requestMove(lead, stage);
  }

  function requestMove(lead: BoardLead, stage: StageDto) {
    if (lead.stageId === stage.id) return;
    const position = leads.filter((item) => item.stageId === stage.id).length;
    if (isNegativeStage(stage.kind)) {
      setPendingMove({ lead, stage, position });
      return;
    }
    void persistMove(lead, stage, position);
  }

  const q = query.trim().toLowerCase();
  const match = useCallback(
    (l: BoardLead) =>
      !q ||
      l.contact.name.toLowerCase().includes(q) ||
      l.contact.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    [q]
  );
  const visibleLeads = useMemo(() => {
    const stagePositions = new Map(
      stages.map((stage) => [stage.id, stage.position])
    );
    return leads
      .filter(match)
      .sort(
        (a, b) =>
          (stagePositions.get(a.stageId) ?? Number.MAX_SAFE_INTEGER) -
            (stagePositions.get(b.stageId) ?? Number.MAX_SAFE_INTEGER) ||
          a.position - b.position
      );
  }, [leads, match, stages]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b bg-surface px-4 py-3 md:px-7 md:py-[18px]">
        <h2 className="font-display text-[22px] font-bold">
          Etapas del prospecto
        </h2>
        <div className="order-last flex w-full items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-[8px] transition-colors focus-within:border-brand focus-within:bg-background focus-within:ring-[3px] focus-within:ring-brand-soft md:order-none md:w-auto md:max-w-[300px] md:flex-1">
          <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
          <input
            placeholder="Buscar lead…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-faint md:text-[13px]"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ViewToggle
            value={view}
            options={PIPELINE_VIEW_OPTIONS}
            onChange={setView}
            ariaLabel="Visualización del pipeline"
          />
          <button
            onClick={() => setManaging(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-[10px] border bg-surface px-2.5 py-[9px] text-[13px] font-bold transition-colors hover:bg-surface-2 sm:px-[15px]"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Gestionar etapas</span>
          </button>
        </div>
      </header>

      {view === "board" ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-4 md:px-6 md:py-[22px]">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex h-full min-w-min items-stretch gap-[18px]">
              {stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  leads={visibleLeads.filter((lead) => lead.stageId === stage.id)}
                />
              ))}
              <AddStageColumn onCreated={() => void refetch()} />
            </div>
            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-7 md:py-[22px]">
          <PipelineList
            leads={visibleLeads}
            stages={stages}
            moving={moving}
            onMove={requestMove}
          />
        </div>
      )}

      {managing && (
        <StageManager
          stages={stages}
          onClose={() => setManaging(false)}
          onChanged={() => void refetch()}
        />
      )}
      {pendingMove && (
        <LeadClosureDialog
          key={`${pendingMove.lead.id}-${pendingMove.stage.id}`}
          stage={pendingMove.stage}
          busy={moving}
          onCancel={() => setPendingMove(null)}
          onConfirm={(reason) =>
            void persistMove(
              pendingMove.lead,
              pendingMove.stage,
              pendingMove.position,
              reason
            )
          }
        />
      )}
    </div>
  );
}

function PipelineList({
  leads,
  stages,
  moving,
  onMove,
}: {
  leads: BoardLead[];
  stages: StageDto[];
  moving: boolean;
  onMove: (lead: BoardLead, stage: StageDto) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-bold">Sin prospectos encontrados</p>
        <p className="text-xs text-mute">
          Prueba con otro nombre o número de teléfono.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-2 hidden grid-cols-[minmax(210px,1.6fr)_minmax(130px,.8fr)_minmax(170px,1fr)_minmax(130px,.8fr)_minmax(150px,.9fr)_42px] gap-4 px-4 text-[11px] font-extrabold uppercase tracking-[.06em] text-faint lg:grid">
        <span>Prospecto</span>
        <span>Teléfono</span>
        <span>Etapa</span>
        <span>Actividad</span>
        <span>Seguimiento</span>
        <span className="sr-only">Acciones</span>
      </div>
      <div className="space-y-2.5">
        {leads.map((lead) => {
          const reason = closureReasonLabel(lead.closureReason);
          return (
            <article
              key={lead.id}
              data-testid="lead-list-row"
              className="grid gap-3 rounded-[14px] border bg-surface p-4 transition-colors hover:border-brand/50 lg:grid-cols-[minmax(210px,1.6fr)_minmax(130px,.8fr)_minmax(170px,1fr)_minmax(130px,.8fr)_minmax(150px,.9fr)_42px] lg:items-center lg:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ContactAvatar
                  name={lead.contact.name}
                  seed={lead.contact.id}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {lead.contact.name}
                  </p>
                  {reason && (
                    <p className="truncate text-[11px] font-semibold text-mute">
                      Motivo: {reason}
                    </p>
                  )}
                </div>
              </div>

              <p className="truncate text-[12px] font-bold text-mute">
                <span className="mr-1 font-semibold text-faint lg:hidden">
                  Teléfono:
                </span>
                {formatPhone(lead.contact.phone)}
              </p>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-semibold text-faint lg:sr-only">
                  Etapa
                </span>
                <select
                  value={lead.stageId}
                  disabled={moving}
                  aria-label={`Cambiar etapa de ${lead.contact.name}`}
                  onChange={(event) => {
                    const stage = stages.find(
                      (item) => item.id === event.target.value
                    );
                    if (stage) onMove(lead, stage);
                  }}
                  className="h-9 w-full rounded-[9px] border bg-surface-2 px-2.5 text-[12px] font-bold outline-none transition-colors hover:bg-background focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:opacity-60"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-[12px] font-semibold text-mute">
                <span className="mr-1 text-faint lg:hidden">Actividad:</span>
                {lead.lastActivityAt
                  ? formatTime(lead.lastActivityAt)
                  : "Sin actividad"}
              </p>

              {lead.followUpDueAt ? (
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#80619E]">
                  <AlarmClock className="h-3.5 w-3.5 shrink-0" />
                  {formatTime(lead.followUpDueAt)}
                </p>
              ) : (
                <p className="text-[12px] text-faint">Sin seguimiento</p>
              )}

              <div className="flex justify-end">
                {lead.conversationId ? (
                  <Link
                    href={`/inbox?contact=${lead.contact.id}`}
                    aria-label={`Abrir conversación de ${lead.contact.name}`}
                    title="Abrir WhatsApp"
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-[rgba(62,189,107,.14)] text-[#2FA35A] transition-colors hover:bg-[rgba(62,189,107,.24)]"
                  >
                    <MessageCircle className="h-[17px] w-[17px]" strokeWidth={2.2} />
                  </Link>
                ) : (
                  <span aria-hidden className="h-[38px] w-[38px]" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StageColumn({ stage, leads }: { stage: StageDto; leads: BoardLead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const color = stageColor(stage);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col rounded-2xl border-[1.5px] p-1.5 transition-colors md:w-[300px]",
        isOver ? "border-dashed border-brand" : "border-transparent"
      )}
      style={isOver ? { background: "color-mix(in srgb, var(--accent) 6%, transparent)" } : undefined}
    >
      <div className="flex items-center gap-2.5 px-1 pb-3.5 pt-0.5">
        <span
          className="h-[11px] w-[11px] shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="font-display text-[15px] font-semibold">
          {stage.name}
        </span>
        <span className="ml-auto rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-extrabold text-mute">
          {leads.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-[11px] overflow-y-auto px-[3px] pb-10 pt-0.5">
        {leads.map((lead) => (
          <DraggableLead key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

function DraggableLead({ lead }: { lead: BoardLead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

function LeadCard({ lead, overlay = false }: { lead: BoardLead; overlay?: boolean }) {
  const reason = closureReasonLabel(lead.closureReason);
  return (
    <div
      data-testid="lead-board-card"
      className={cn(
        "cursor-grab rounded-[13px] border bg-surface p-[13px] shadow-sm transition-shadow",
        overlay && "rotate-2 shadow-pop"
      )}
    >
      <div className="flex items-center gap-[11px]">
        <ContactAvatar name={lead.contact.name} seed={lead.contact.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{lead.contact.name}</p>
          <p className="text-[11.5px] font-semibold text-faint">
            {lead.lastActivityAt
              ? `Actividad: ${formatTime(lead.lastActivityAt)}`
              : "Sin actividad"}
          </p>
        </div>
      </div>
      <div className="mt-[11px] flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-mute">
          {formatPhone(lead.contact.phone)}
        </span>
        {lead.conversationId && (
          <Link
            href={`/inbox?contact=${lead.contact.id}`}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Abrir conversación de WhatsApp"
            title="Abrir WhatsApp"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[rgba(62,189,107,.14)] text-[#2FA35A] transition-colors hover:bg-[rgba(62,189,107,.24)]"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        )}
      </div>
      {lead.followUpDueAt && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[rgba(154,123,184,.12)] px-2 py-1.5 text-[11px] font-bold text-[#80619E]">
          <AlarmClock className="h-3.5 w-3.5" />
          Seguimiento {formatTime(lead.followUpDueAt)}
        </div>
      )}
      {reason && (
        <p className="mt-2 truncate rounded-lg bg-surface-2 px-2 py-1.5 text-[11px] font-bold text-mute">
          Motivo: {reason}
        </p>
      )}
    </div>
  );
}

/** Columna final del mock: botón dashed que se convierte en formulario inline. */
function AddStageColumn({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n) {
      setAdding(false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/pipeline/stages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: n }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      toast(`Etapa "${n}" creada`);
      setAdding(false);
      setName("");
      onCreated();
    }
  }

  return (
    <div className="w-[280px] shrink-0 md:w-[300px]">
      {adding ? (
        <div className="rounded-[14px] border-[1.5px] border-brand bg-surface p-3.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Nombre de la etapa"
            className="w-full rounded-[9px] border bg-surface-2 px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand"
          />
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => void create()}
              disabled={saving || !name.trim()}
              className="flex-1 rounded-[9px] bg-brand py-[9px] text-[13px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              Crear etapa
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-[9px] border px-3.5 py-[9px] text-[13px] font-bold text-mute transition-colors hover:bg-surface-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-border-strong p-4 text-sm font-bold text-mute transition-colors hover:border-brand hover:text-brand"
        >
          <Plus className="h-[19px] w-[19px]" strokeWidth={2.2} />
          Nueva etapa
        </button>
      )}
    </div>
  );
}
