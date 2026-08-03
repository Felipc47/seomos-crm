"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Archive,
  ArchiveRestore,
  CheckSquare2,
  ChevronDown,
  Flag,
  Layers3,
  ListChecks,
  Pin,
  PinOff,
  Search,
  ShieldBan,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import type { ConversationDto, InboxAssigneeOptionDto } from "@/lib/types";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { LeadAssignmentBadges } from "@/components/lead-assignment-badges";
import { Button } from "@/components/ui/button";
import { StageTag } from "@/components/ui/stage-tag";
import { stageColor } from "@/lib/stage-colors";
import { useStages } from "@/components/use-stage-colors";
import { formatTime, previewText } from "./helpers";
import {
  InboxFilterDropdown,
  type InboxFilterOption,
} from "./inbox-filter-dropdown";

export type InboxConversationAction =
  | "delete"
  | "block"
  | "unblock"
  | "report";

function EmptyState({ onSeeded }: { onSeeded: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [failed, setFailed] = useState(false);

  async function seed() {
    setSeeding(true);
    const res = await fetch("/api/seed/demo", { method: "POST" }).catch(
      () => null
    );
    setSeeding(false);
    if (res?.ok) onSeeded();
    else setFailed(true);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Sin conversaciones todavía</p>
      <p className="text-xs text-text-3">
        Cuando alguien escriba a tu número de WhatsApp, su conversación
        aparecerá aquí en tiempo real.
      </p>
      {!failed && (
        <Button
          size="sm"
          variant="outline"
          disabled={seeding}
          onClick={() => void seed()}
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.7} />
          {seeding ? "Cargando demo…" : "Cargar datos de demostración"}
        </Button>
      )}
    </div>
  );
}

/** Menú contextual de la fila: anclar/desanclar y archivar/desarchivar. */
function RowActions({
  conversation: c,
  onPatch,
  onAction,
  onTransfer,
}: {
  conversation: ConversationDto;
  onPatch: (id: string, patch: { pinned?: boolean; archived?: boolean }) => void;
  onAction: (action: InboxConversationAction, ids: string[]) => void;
  onTransfer: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const patchItems = [
    c.archivedAt
      ? null
      : {
          label: c.pinnedAt ? "Desanclar" : "Anclar",
          icon: c.pinnedAt ? PinOff : Pin,
          patch: { pinned: !c.pinnedAt },
        },
    {
      label: c.archivedAt ? "Desarchivar" : "Archivar",
      icon: c.archivedAt ? ArchiveRestore : Archive,
      patch: { archived: !c.archivedAt },
    },
  ].filter((i) => i !== null);

  const moderationItems = [
    ...(c.contact.blockedAt && c.contact.blockSyncStatus === "failed"
      ? [
          {
            label: "Reintentar bloqueo",
            icon: ShieldBan,
            action: "block" as const,
            danger: false,
          },
          {
            label: "Desbloquear",
            icon: ShieldCheck,
            action: "unblock" as const,
            danger: false,
          },
        ]
      : [
          {
            label: c.contact.blockedAt ? "Desbloquear" : "Bloquear",
            icon: c.contact.blockedAt ? ShieldCheck : ShieldBan,
            action: c.contact.blockedAt
              ? ("unblock" as const)
              : ("block" as const),
            danger: false,
          },
        ]),
    {
      label: "Reportar",
      icon: Flag,
      action: "report" as const,
      danger: false,
    },
    {
      label: "Eliminar chat",
      icon: Trash2,
      action: "delete" as const,
      danger: true,
    },
  ];

  return (
    <div className="absolute right-2 top-2.5">
      <button
        aria-label={`Opciones del chat con ${c.contact.name}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-mute transition-opacity hover:bg-subtle hover:text-foreground",
          open
            ? "opacity-100"
            : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        )}
      >
        <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-[11px] border bg-surface py-1 shadow-lg">
            {patchItems.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onPatch(c.id, item.patch);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-subtle"
              >
                <item.icon className="h-4 w-4 text-mute" strokeWidth={2} />
                {item.label}
              </button>
            ))}
            <button
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onTransfer(c.id);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-subtle"
            >
              <ArrowRightLeft className="h-4 w-4 text-mute" strokeWidth={2} />
              Transferir chat
            </button>
            <div className="my-1 border-t" />
            {moderationItems.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAction(item.action, [c.id]);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-subtle",
                  item.danger && "text-destructive"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    item.danger ? "text-destructive" : "text-mute"
                  )}
                  strokeWidth={2}
                />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ConversationList({
  conversations: conversationsProp,
  selectedId,
  onSelect,
  onSeeded,
  onPatch,
  onAction,
  onTransfer,
  currentMemberId,
  members,
  selectedActionIds,
  onSelectedActionIdsChange,
  selectionResetKey,
}: {
  conversations: ConversationDto[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeeded: () => void;
  onPatch: (id: string, patch: { pinned?: boolean; archived?: boolean }) => void;
  onAction: (action: InboxConversationAction, ids: string[]) => void;
  onTransfer: (id: string) => void;
  currentMemberId: string | null;
  members: InboxAssigneeOptionDto[];
  selectedActionIds: string[];
  onSelectedActionIdsChange: (ids: string[]) => void;
  selectionResetKey: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const [stageFilter, setStageFilter] = useState("");
  // "all" | "mine" | "unassigned" | memberId concreto (ids con prefijo, sin
  // colisión posible con los valores reservados).
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState<"stage" | "assignee" | null>(
    null
  );
  const [selecting, setSelecting] = useState(false);
  const stages = useStages();
  const colorFor = useMemo(() => {
    const byName = Object.fromEntries(
      stages.map((s) => [s.name, stageColor(s)])
    );
    return (name: string | null) =>
      name ? (byName[name] ?? "#5B6B8C") : "#5B6B8C";
  }, [stages]);
  const stageOptions = useMemo<InboxFilterOption[]>(
    () => [
      {
        value: "",
        label: "Todas las etapas",
        shortLabel: "Todas",
        description: "Ver el pipeline completo",
        icon: Layers3,
      },
      ...stages.map((stage) => ({
        value: stage.name,
        label: stage.name,
        color: colorFor(stage.name),
      })),
    ],
    [colorFor, stages]
  );
  const assigneeOptions = useMemo<InboxFilterOption[]>(
    () => [
      {
        value: "all",
        label: "Todos los responsables",
        shortLabel: "Todos",
        description: "Ver conversaciones de todo el equipo",
        icon: UsersRound,
      },
      {
        value: "mine",
        label: "Asignados a mí",
        shortLabel: "Asignados a mí",
        description: "Mi cola personal de atención",
        icon: UserRound,
        disabled: !currentMemberId,
      },
      {
        value: "unassigned",
        label: "Sin asignar",
        description: "Conversaciones en la cola general",
        icon: UserRoundX,
      },
      // Cada persona del equipo como opción propia ("Asignados a mí" ya cubre
      // al miembro actual, así que se omite para no duplicarlo).
      ...members
        .filter((member) => !member.isCurrent)
        .map((member) => ({
          value: member.memberId,
          label: member.name,
          description: ROLE_LABELS[member.role as Role] ?? "Equipo",
          icon: UserRound,
        })),
    ],
    [currentMemberId, members]
  );

  const loading = conversationsProp === null;
  const conversations = conversationsProp ?? [];
  const q = query.trim().toLowerCase();
  const matches = (c: ConversationDto) =>
    (!stageFilter || c.stageName === stageFilter) &&
    (assigneeFilter === "all" ||
      (assigneeFilter === "mine" &&
        Boolean(currentMemberId) &&
        c.assignee?.memberId === currentMemberId) ||
      (assigneeFilter === "unassigned" && !c.assignee) ||
      // Valor restante = memberId de una persona concreta del equipo.
      (assigneeFilter !== "mine" &&
        assigneeFilter !== "unassigned" &&
        c.assignee?.memberId === assigneeFilter)) &&
    (!q ||
      c.contact.name.toLowerCase().includes(q) ||
      c.contact.phone.includes(q) ||
      (c.preview ?? "").toLowerCase().includes(q));

  const inboxed = conversations.filter((c) => !c.archivedAt && matches(c));
  const archived = conversations.filter((c) => c.archivedAt && matches(c));
  const unreadCount = inboxed.filter((c) => c.unreadCount > 0).length;
  const filtered =
    filter === "archived"
      ? archived
      : filter === "unread"
        ? inboxed.filter((c) => c.unreadCount > 0)
        : inboxed;
  // Ancladas primero (la más antigua arriba, orden estable estilo WhatsApp);
  // el resto conserva el orden del servidor (último mensaje primero).
  const visible =
    filter === "archived"
      ? filtered
      : [...filtered].sort((a, b) => {
          if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
          if (a.pinnedAt && b.pinnedAt)
            return a.pinnedAt < b.pinnedAt ? -1 : 1;
          return 0;
        });
  const selectedSet = useMemo(
    () => new Set(selectedActionIds),
    [selectedActionIds]
  );
  const visibleIds = useMemo(() => visible.map((c) => c.id), [visible]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const selectedConversations = conversations.filter((c) =>
    selectedSet.has(c.id)
  );
  const selectedAreBlocked =
    selectedConversations.length > 0 &&
    selectedConversations.every((c) => Boolean(c.contact.blockedAt));
  const selectedNeedBlockRetry = selectedConversations.some(
    (c) => c.contact.blockedAt && c.contact.blockSyncStatus === "failed"
  );

  useEffect(() => {
    setSelecting(false);
    onSelectedActionIdsChange([]);
  }, [selectionResetKey, onSelectedActionIdsChange]);

  useEffect(() => {
    if (!selecting || selectedActionIds.length === 0) return;
    const visibleSet = new Set(visibleIds);
    const next = selectedActionIds.filter((id) => visibleSet.has(id));
    if (next.length !== selectedActionIds.length) {
      onSelectedActionIdsChange(next);
    }
  }, [
    selecting,
    selectedActionIds,
    visibleIds,
    onSelectedActionIdsChange,
  ]);

  function toggleSelected(id: string) {
    onSelectedActionIdsChange(
      selectedSet.has(id)
        ? selectedActionIds.filter((value) => value !== id)
        : [...selectedActionIds, id]
    );
  }

  function stopSelecting() {
    setSelecting(false);
    onSelectedActionIdsChange([]);
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="px-5 pb-3 pt-5">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[21px] font-bold">Bandeja</h2>
            <span className="text-[13px] font-extrabold text-mute">
              {conversations.filter((c) => !c.archivedAt).length}
            </span>
          </div>
          {conversations.length > 0 && (
            <button
              type="button"
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition-colors hover:bg-subtle",
                selecting && "border-brand bg-brand-tint text-brand-text"
              )}
            >
              <ListChecks className="h-4 w-4" strokeWidth={2} />
              {selecting ? "Cancelar" : "Seleccionar"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-[11px] border bg-surface-2 px-3 py-[10px] transition-colors focus-within:border-brand focus-within:bg-background focus-within:ring-[3px] focus-within:ring-brand-soft">
          <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
          <input
            placeholder="Buscar conversación…"
            aria-label="Buscar conversación"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-faint md:text-[13.5px]"
          />
        </div>
        <div className="mt-3.5 flex gap-2">
          {(
            [
              { id: "all", label: "Todas", count: inboxed.length },
              { id: "unread", label: "No leídas", count: unreadCount },
              { id: "archived", label: "Archivadas", count: archived.length },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-[15px] py-2 text-[13px] font-extrabold transition-colors",
                filter === f.id
                  ? "bg-foreground text-background"
                  : "bg-surface-2 text-mute hover:bg-subtle"
              )}
            >
              {f.label}
              <span className="opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex h-4 items-center justify-between px-0.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.09em] text-faint">
            <SlidersHorizontal className="h-3 w-3" strokeWidth={2.2} />
            Filtros
          </span>
          {(stageFilter || assigneeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setStageFilter("");
                setAssigneeFilter("all");
                setOpenFilter(null);
              }}
              className="text-[10.5px] font-bold text-brand transition-colors hover:text-brand-hover"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <InboxFilterDropdown
            id="inbox-stage-filter"
            label="Etapa"
            ariaLabel="Filtrar por etapa del lead"
            value={stageFilter}
            defaultValue=""
            options={stageOptions}
            open={openFilter === "stage"}
            align="left"
            onOpenChange={(open) => setOpenFilter(open ? "stage" : null)}
            onChange={setStageFilter}
          />
          <InboxFilterDropdown
            id="inbox-assignee-filter"
            label="Responsable"
            ariaLabel="Filtrar por responsable"
            value={assigneeFilter}
            defaultValue="all"
            options={assigneeOptions}
            open={openFilter === "assignee"}
            align="right"
            onOpenChange={(open) => setOpenFilter(open ? "assignee" : null)}
            onChange={setAssigneeFilter}
          />
        </div>
        {selecting && (
          <div
            className="mt-2.5 rounded-xl border border-brand/25 bg-brand-tint p-2.5"
            data-testid="inbox-bulk-actions"
          >
            <button
              type="button"
              onClick={() =>
                onSelectedActionIdsChange(allVisibleSelected ? [] : visibleIds)
              }
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-[12px] font-bold text-brand-text"
            >
              {allVisibleSelected ? (
                <CheckSquare2 className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <Square className="h-4 w-4" strokeWidth={2.2} />
              )}
              {allVisibleSelected ? "Quitar selección" : "Seleccionar visibles"}
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-[11px] text-mute">
                {selectedActionIds.length} seleccionados
              </span>
            </button>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={selectedActionIds.length === 0}
                onClick={() => onAction("report", selectedActionIds)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border bg-surface px-2 py-2 text-[11px] font-bold transition-colors hover:bg-subtle disabled:opacity-40"
              >
                <Flag className="h-3.5 w-3.5" /> Reportar
              </button>
              <button
                type="button"
                disabled={selectedActionIds.length === 0}
                onClick={() =>
                  onAction(
                    selectedAreBlocked && !selectedNeedBlockRetry
                      ? "unblock"
                      : "block",
                    selectedActionIds
                  )
                }
                className="inline-flex items-center justify-center gap-1 rounded-lg border bg-surface px-2 py-2 text-[11px] font-bold transition-colors hover:bg-subtle disabled:opacity-40"
              >
                {selectedAreBlocked && !selectedNeedBlockRetry ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldBan className="h-3.5 w-3.5" />
                )}
                {selectedNeedBlockRetry
                  ? "Reintentar"
                  : selectedAreBlocked
                    ? "Desbloquear"
                    : "Bloquear"}
              </button>
              <button
                type="button"
                disabled={selectedActionIds.length === 0}
                onClick={() => onAction("delete", selectedActionIds)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-destructive/20 bg-surface px-2 py-2 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-1">
        {loading ? (
          <p className="p-6 text-center text-xs text-text-3">Cargando…</p>
        ) : conversations.length === 0 ? (
          <EmptyState onSeeded={onSeeded} />
        ) : visible.length === 0 ? (
          <p className="p-6 text-center text-xs text-text-3">
            {filter === "archived"
              ? "No tienes chats archivados."
              : "No hay chats con estos filtros."}
          </p>
        ) : (
          <ul>
            {visible.map((c) => {
              const unread = c.unreadCount > 0;
              const active = selectedId === c.id;
              return (
                <li
                  key={c.id}
                  data-testid={`inbox-conversation-${c.id}`}
                  className="group relative mb-0.5"
                >
                  <button
                    onClick={() =>
                      selecting ? toggleSelected(c.id) : onSelect(c.id)
                    }
                    aria-pressed={selecting ? selectedSet.has(c.id) : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[13px] px-3 py-[13px] text-left transition-colors",
                      selecting && selectedSet.has(c.id)
                        ? "bg-brand-tint ring-1 ring-inset ring-brand/40"
                        : active
                        ? "bg-brand-tint shadow-[inset_3px_0_0_var(--accent)]"
                        : "hover:bg-subtle"
                    )}
                  >
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                      {selecting ? (
                        selectedSet.has(c.id) ? (
                          <CheckSquare2
                            className="h-6 w-6 text-brand"
                            strokeWidth={2.2}
                          />
                        ) : (
                          <Square className="h-6 w-6 text-mute" strokeWidth={2} />
                        )
                      ) : (
                        <ContactAvatar
                          name={c.contact.name}
                          seed={c.contact.id}
                          size="lg"
                        />
                      )}
                      <span
                        title={
                          c.contact.blockedAt
                            ? "Contacto bloqueado"
                            : c.windowOpen
                            ? "Ventana abierta (24 h)"
                            : "Ventana cerrada — usa una plantilla"
                        }
                        className={cn(
                          "absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-surface",
                          c.contact.blockedAt
                            ? "bg-destructive"
                            : c.windowOpen
                              ? "bg-success"
                              : "bg-[#B4ADA0]"
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2 pr-6">
                        <span
                          className={cn(
                            "truncate text-[14.5px] font-bold",
                            !unread && "font-semibold"
                          )}
                        >
                          {c.contact.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {c.pinnedAt && (
                            <Pin
                              aria-label="Chat anclado"
                              className="h-3 w-3 text-mute"
                              strokeWidth={2.2}
                            />
                          )}
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              unread ? "text-brand" : "text-faint"
                            )}
                          >
                            {formatTime(c.lastMessageAt)}
                          </span>
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-[13px]",
                            unread ? "font-medium text-text-2" : "text-mute"
                          )}
                        >
                          {previewText(c.preview)}
                        </span>
                        {unread && (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10.5px] font-semibold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </span>
                      <span className="mt-[7px] flex flex-wrap items-center gap-1.5">
                        {c.stageName && (
                          <StageTag
                            name={c.stageName}
                            color={colorFor(c.stageName)}
                          />
                        )}
                        <LeadAssignmentBadges
                          service={c.service}
                          assignee={c.assignee}
                          showUnassigned
                        />
                        {c.contact.blockedAt && (
                          <span
                            title={
                              c.contact.blockSyncStatus === "failed"
                                ? "Bloqueado en el CRM; falta sincronizar con Meta"
                                : "Bloqueado en el CRM y en Meta"
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2.5 py-[3px] text-[11px] font-bold text-destructive"
                          >
                            <ShieldBan className="h-3 w-3" strokeWidth={2.2} />
                            {c.contact.blockSyncStatus === "failed"
                              ? "Bloqueo pendiente"
                              : "Bloqueado"}
                          </span>
                        )}
                        {c.contact.reportedAt && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-[3px] text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <Flag className="h-3 w-3" strokeWidth={2.2} />
                            Reportado
                          </span>
                        )}
                        {c.handoffAt && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[11px] font-bold text-mute">
                            <UserRound className="h-3 w-3" strokeWidth={2.2} />
                            Atención humana
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  {!selecting && (
                    <RowActions
                      conversation={c}
                      onPatch={onPatch}
                      onAction={onAction}
                      onTransfer={onTransfer}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
