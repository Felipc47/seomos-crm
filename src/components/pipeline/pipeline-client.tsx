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
  ArrowUpRight,
  Clock3,
  Columns3,
  LayoutList,
  MessageCircle,
  Pencil,
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
import { LeadAssignmentBadges } from "@/components/lead-assignment-badges";
import { ProspectEditorDialog } from "@/components/contacts/prospect-editor-dialog";
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
  service: { id: string; name: string } | null;
  assignee: { memberId: string; name: string } | null;
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
  const [editing, setEditing] = useState<BoardLead | null>(null);
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
    <div data-help="pipeline" className="flex h-full min-h-0 flex-col bg-surface">
      <header className="shrink-0 px-5 pb-4 pt-4 md:px-8 md:pb-5 md:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3 md:gap-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-mute"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Gestión comercial</p>
            <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-.045em] md:text-[32px]">Etapas del prospecto</h2>
            <p className="mt-2 hidden max-w-lg text-[13px] leading-5 text-mute md:block">Cada oportunidad, su siguiente paso.</p>
          </div>
          <dl className="flex w-full items-center gap-4 self-center md:w-auto md:gap-7 md:rounded-xl md:border md:bg-surface md:px-5 md:py-3">
            <div className="flex items-baseline gap-1.5 md:block"><dt className="text-[10px] font-medium text-mute">Prospectos</dt><dd className="text-[15px] font-semibold leading-none tracking-tight tabular-nums md:mt-1 md:text-[23px]">{leads.length}</dd></div>
            <div className="flex items-baseline gap-1.5 border-l pl-4 md:block md:pl-7"><dt className="text-[10px] font-medium text-mute">Ganados</dt><dd className="text-[15px] font-semibold leading-none tracking-tight tabular-nums md:mt-1 md:text-[23px]">{leads.filter((lead) => stages.some((stage) => stage.id === lead.stageId && stage.kind === "won")).length}</dd></div>
            <div className="flex items-baseline gap-1.5 border-l pl-4 md:block md:pl-7"><dt className="text-[10px] font-medium text-mute">Con seguimiento</dt><dd className="text-[15px] font-semibold leading-none tracking-tight tabular-nums md:mt-1 md:text-[23px]">{leads.filter((lead) => lead.followUpDueAt).length}</dd></div>
          </dl>
        </div>
      </header>
      <div className="mx-5 flex shrink-0 items-center gap-2 border-y py-2.5 md:mx-8 md:gap-3 md:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-surface px-3 py-2.5 transition-colors focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-soft sm:max-w-[300px]">
          <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
          <input
            data-help="pipeline-search" placeholder="Buscar prospecto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 w-full bg-transparent text-[16px] outline-none placeholder:text-faint md:text-[13px]"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          <ViewToggle
            value={view}
            options={PIPELINE_VIEW_OPTIONS}
            onChange={setView}
            ariaLabel="Visualización del pipeline"
          />
          <button
            data-help="pipeline-manage" onClick={() => setManaging(true)}
            aria-label="Gestionar etapas"
            title="Gestionar etapas"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border bg-surface px-3 py-2.5 text-[12px] font-semibold transition-colors hover:bg-surface-2 sm:px-4"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Gestionar etapas</span>
          </button>
        </div>
      </div>

      {view === "board" ? (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-5 py-5 md:px-8 md:py-6">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex h-full min-w-min items-stretch gap-4">
              {stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  leads={visibleLeads.filter((lead) => lead.stageId === stage.id)}
                  onEdit={setEditing}
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
          <PipelineList
            leads={visibleLeads}
            stages={stages}
            moving={moving}
            onMove={requestMove}
            onEdit={setEditing}
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
      {editing && (
        <ProspectEditorDialog
          contactId={editing.contact.id}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refetch();
          }}
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
  onEdit,
}: {
  leads: BoardLead[];
  stages: StageDto[];
  moving: boolean;
  onMove: (lead: BoardLead, stage: StageDto) => void;
  onEdit: (lead: BoardLead) => void;
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
    <div className="w-full overflow-hidden rounded-xl border bg-surface">
      <div className="hidden grid-cols-[minmax(180px,1.6fr)_minmax(110px,.8fr)_minmax(150px,1fr)_minmax(110px,.8fr)_minmax(120px,.9fr)_86px] gap-4 border-b bg-surface-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.08em] text-mute xl:grid">
        <span>Prospecto</span>
        <span>Teléfono</span>
        <span>Etapa</span>
        <span>Actividad</span>
        <span>Seguimiento</span>
        <span className="sr-only">Acciones</span>
      </div>
      <div className="divide-y">
        {leads.map((lead) => {
          const reason = closureReasonLabel(lead.closureReason);
          return (
            <article
              key={lead.id}
              data-testid="lead-list-row"
              className="grid gap-3 bg-surface px-5 py-4 transition-colors hover:bg-surface-2/60 xl:grid-cols-[minmax(180px,1.6fr)_minmax(110px,.8fr)_minmax(150px,1fr)_minmax(110px,.8fr)_minmax(120px,.9fr)_86px] xl:items-center xl:gap-4"
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
                  <LeadAssignmentBadges
                    service={lead.service}
                    assignee={lead.assignee}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <p className="truncate text-[12px] font-bold text-mute">
                <span className="mr-1 font-semibold text-faint xl:hidden">
                  Teléfono:
                </span>
                {formatPhone(lead.contact.phone)}
              </p>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-semibold text-faint xl:sr-only">
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
                <span className="mr-1 text-faint xl:hidden">Actividad:</span>
                {lead.lastActivityAt
                  ? formatTime(lead.lastActivityAt)
                  : "Sin actividad"}
              </p>

              {lead.followUpDueAt ? (
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-mute">
                  <AlarmClock className="h-3.5 w-3.5 shrink-0" />
                  {formatTime(lead.followUpDueAt)}
                </p>
              ) : (
                <p className="text-[12px] text-faint">Sin seguimiento</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(lead)}
                  aria-label={`Editar ${lead.contact.name}`}
                  title="Editar prospecto"
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border bg-surface-2 text-mute transition-colors hover:border-brand hover:text-brand"
                >
                  <Pencil className="h-[16px] w-[16px]" strokeWidth={2.2} />
                </button>
                {lead.conversationId ? (
                  <Link
                    href={`/inbox?contact=${lead.contact.id}`}
                    aria-label={`Abrir conversación de ${lead.contact.name}`}
                    title="Abrir WhatsApp"
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border bg-surface text-success transition-colors hover:bg-success-bg"
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

function StageColumn({
  stage,
  leads,
  onEdit,
}: {
  stage: StageDto;
  leads: BoardLead[];
  onEdit: (lead: BoardLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const color = stageColor(stage);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col rounded-[14px] border bg-surface-2 p-2.5 transition-colors md:w-[290px]",
        isOver ? "border-dashed border-brand" : "border-border"
      )}
    >
      <div className="flex items-center gap-2.5 px-1.5 pb-4 pt-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="font-display text-[13px] font-bold tracking-[-.015em]">
          {stage.name}
        </span>
        <span className="ml-auto rounded-md border bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-mute">
          {leads.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-3">
        {leads.map((lead) => (
          <DraggableLead key={lead.id} lead={lead} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function DraggableLead({
  lead,
  onEdit,
}: {
  lead: BoardLead;
  onEdit: (lead: BoardLead) => void;
}) {
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
      <LeadCard lead={lead} onEdit={() => onEdit(lead)} />
    </div>
  );
}

function LeadCard({
  lead,
  overlay = false,
  onEdit,
}: {
  lead: BoardLead;
  overlay?: boolean;
  onEdit?: () => void;
}) {
  const reason = closureReasonLabel(lead.closureReason);
  return (
    <div
      data-testid="lead-board-card"
      className={cn(
        "group cursor-grab rounded-[11px] border bg-surface p-3.5 shadow-[0_2px_3px_rgba(0,0,0,.025)] transition-all hover:border-border-strong hover:shadow-sm",
        overlay && "rotate-2 shadow-pop"
      )}
    >
      <div className="flex items-center gap-2.5">
        <ContactAvatar name={lead.contact.name} seed={lead.contact.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold tracking-[-.015em]">{lead.contact.name}</p>
          <p className="mt-0.5 truncate text-[11px] tabular-nums text-mute">{formatPhone(lead.contact.phone)}</p>
        </div>
      </div>
      <LeadAssignmentBadges
        service={lead.service}
        assignee={lead.assignee}
        className="mt-3"
      />
      <div className="mt-3 flex items-center gap-1.5 border-t pt-2.5">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[10px] text-mute">
          <Clock3 className="h-3 w-3 shrink-0" />
          {lead.lastActivityAt ? formatTime(lead.lastActivityAt) : "Sin actividad"}
        </span>
        {onEdit && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            aria-label={`Editar ${lead.contact.name}`}
            title="Editar prospecto"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md text-mute transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        )}
        {lead.conversationId && (
          <Link
            href={`/inbox?contact=${lead.contact.id}`}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Abrir conversación de WhatsApp"
            title="Abrir WhatsApp"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border bg-surface text-mute transition-colors hover:bg-surface-2 hover:text-brand"
          >
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        )}
      </div>
      {lead.followUpDueAt && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5 text-[10px] font-medium text-mute">
          <AlarmClock className="h-3.5 w-3.5" />
          Seguimiento {formatTime(lead.followUpDueAt)}
        </div>
      )}
      {reason && (
        <p className="mt-2 truncate rounded-md bg-surface-2 px-2 py-1.5 text-[10px] font-medium text-mute">
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
    <div className="w-[240px] shrink-0">
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
              className="flex-1 rounded-[9px] bg-brand py-[9px] text-[13px] font-bold text-primary-foreground transition-colors hover:bg-brand-hover hover:text-brand-hover-foreground disabled:opacity-50"
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
