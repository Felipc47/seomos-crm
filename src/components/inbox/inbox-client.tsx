"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  ShieldBan,
} from "lucide-react";
import { InboxContactAvatar } from "./inbox-contact-avatar";
import { cn } from "@/lib/utils";
import type {
  ConversationDto,
  InboxAssigneeOptionDto,
  MessageDto,
} from "@/lib/types";
import { useEvents } from "@/components/use-events";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import {
  ConversationList,
  type InboxConversationAction,
} from "./conversation-list";
import { MessageThread } from "./message-thread";
import { Composer } from "./composer";
import { ContactPanel } from "./contact-panel";
import {
  AiConversationHeaderControl,
  type AgentAvailability,
} from "./ai-conversation-control";
import {
  ConversationActionDialog,
  type PendingInboxAction,
} from "./conversation-actions-dialogs";
import type { ContactReportReason } from "@/lib/types";
import { ConversationTransferDialog } from "./conversation-transfer-dialog";

export function InboxClient() {
  const [conversations, setConversations] = useState<ConversationDto[] | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  // Slide-over de detalles del lead (mock SEOMOS): se abre con "Ver detalles".
  const [detailOpen, setDetailOpen] = useState(false);
  // Se incrementa con cada evento SSE que puede cambiar la etapa/lead o el
  // estado del agente: el panel de detalles lo observa y refetch en vivo.
  const [detailRev, setDetailRev] = useState(0);
  // El encabezado necesita solo la disponibilidad global, no el prompt ni la
  // configuración privada del agente.
  const [agentAvailability, setAgentAvailability] =
    useState<AgentAvailability | null>(null);
  const [aiUpdatingId, setAiUpdatingId] = useState<string | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [pendingAction, setPendingAction] =
    useState<PendingInboxAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [assignmentOptions, setAssignmentOptions] = useState<{
    currentMemberId: string;
    members: InboxAssigneeOptionDto[];
  } | null>(null);
  const [transferConversationId, setTransferConversationId] = useState<
    string | null
  >(null);
  const [transferBusy, setTransferBusy] = useState(false);

  const toast = useToast();
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const lastFetchRef = useRef<string | null>(null);

  const refetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { conversations: ConversationDto[] };
    setConversations(data.conversations);
    lastFetchRef.current = new Date().toISOString();
  }, []);

  const refetchMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(
      `/api/conversations/${conversationId}/messages`
    ).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { messages: MessageDto[] };
    if (selectedIdRef.current === conversationId) setMessages(data.messages);
  }, []);

  const refetchAgentAvailability = useCallback(async () => {
    const res = await fetch("/api/agent/status").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as AgentAvailability;
    setAgentAvailability(data);
  }, []);

  const refetchAssignmentOptions = useCallback(async () => {
    const response = await fetch(
      "/api/conversations/assignment-options"
    ).catch(() => null);
    if (!response?.ok) return;
    setAssignmentOptions(
      (await response.json()) as {
        currentMemberId: string;
        members: InboxAssigneeOptionDto[];
      }
    );
  }, []);

  useEffect(() => {
    void refetchConversations();
    void refetchAgentAvailability();
    void refetchAssignmentOptions();
  }, [
    refetchAgentAvailability,
    refetchAssignmentOptions,
    refetchConversations,
  ]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMessages([]);
      void refetchMessages(id);
      void fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markRead: true }),
      });
    },
    [refetchMessages]
  );

  // Enlace directo desde Contactos/Pipeline: /inbox?contact=<id>. Si el
  // contacto aún no tiene conversación (importado por CSV o creado a mano),
  // se crea vacía: con la ventana cerrada, el composer ofrece plantillas.
  const searchParams = useSearchParams();
  const contactParam = searchParams.get("contact");
  const createTriedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!contactParam || selectedIdRef.current || !conversations) return;
    const match = conversations.find((c) => c.contact.id === contactParam);
    if (match) {
      select(match.id);
      return;
    }
    if (createTriedRef.current === contactParam) return;
    createTriedRef.current = contactParam;
    void (async () => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactId: contactParam }),
      }).catch(() => null);
      if (res?.ok) await refetchConversations();
    })();
  }, [contactParam, conversations, select, refetchConversations]);

  useEvents({
    onMessageNew: ({ conversationId, message }) => {
      if (selectedIdRef.current === conversationId) {
        const m = message as MessageDto;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, m]
        );
        void fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markRead: true }),
        });
      }
      void refetchConversations();
      // Un entrante nuevo puede crear/mover el lead: refresca el panel.
      setDetailRev((v) => v + 1);
    },
    onMessageStatus: ({ conversationId, messageId, status }) => {
      if (selectedIdRef.current !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: status as MessageDto["status"] } : m
        )
      );
    },
    onConversationUpdated: () => {
      void refetchConversations();
      // El agente movió de etapa o cambió el handoff: refresca el panel en vivo.
      setDetailRev((v) => v + 1);
    },
    onReconnect: () => {
      // Catch-up tras reconexión (contrato sse.md): refetch completo.
      void refetchConversations();
      void refetchAgentAvailability();
      void refetchAssignmentOptions();
      if (selectedIdRef.current) void refetchMessages(selectedIdRef.current);
      setDetailRev((v) => v + 1);
    },
  });

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;
  const transferConversation =
    conversations?.find((c) => c.id === transferConversationId) ?? null;

  const sendText = useCallback(
    async (text: string): Promise<string | null> => {
      if (!selectedIdRef.current) return "Sin conversación seleccionada";
      const res = await fetch(
        `/api/conversations/${selectedIdRef.current}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        }
      ).catch(() => null);
      if (!res) return "Sin conexión con el servidor";
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        return data?.error?.message ?? "No se pudo enviar el mensaje";
      }
      if (selectedIdRef.current) void refetchMessages(selectedIdRef.current);
      void refetchConversations();
      return null;
    },
    [refetchMessages, refetchConversations]
  );

  // Envía un adjunto (multipart) con pie opcional; el servidor valida
  // formato/tamaño según lo que WhatsApp acepta.
  const sendFile = useCallback(
    async (file: File, caption: string | null): Promise<string | null> => {
      if (!selectedIdRef.current) return "Sin conversación seleccionada";
      const form = new FormData();
      form.set("file", file);
      if (caption) form.set("caption", caption);
      const res = await fetch(
        `/api/conversations/${selectedIdRef.current}/messages/attachment`,
        { method: "POST", body: form }
      ).catch(() => null);
      if (!res) return "Sin conexión con el servidor";
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        return data?.error?.message ?? "No se pudo enviar el adjunto";
      }
      if (selectedIdRef.current) void refetchMessages(selectedIdRef.current);
      void refetchConversations();
      return null;
    },
    [refetchMessages, refetchConversations]
  );

  const patchConversation = useCallback(
    async (patch: {
      aiEnabled?: boolean;
      reactivate?: boolean;
    }): Promise<boolean> => {
      const id = selectedIdRef.current;
      if (!id) return false;
      setAiUpdatingId(id);
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => null);

      if (!res) {
        toast("Sin conexión con el servidor");
        setAiUpdatingId((current) => (current === id ? null : current));
        return false;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        toast(data?.error?.message ?? "No se pudo cambiar el estado de la IA");
        setAiUpdatingId((current) => (current === id ? null : current));
        return false;
      }

      const data = (await res.json()) as {
        conversation: ConversationDto | null;
        agentTurn: {
          queued: boolean;
          reason:
            | "queued"
            | "ai_unavailable"
            | "agent_disabled"
            | "conversation_inactive"
            | "window_closed"
            | "no_pending_message";
        } | null;
      };
      if (data.conversation) {
        setConversations((current) =>
          current?.map((conversation) =>
            conversation.id === id ? data.conversation! : conversation
          ) ?? current
        );
      }

      const activating = patch.reactivate || patch.aiEnabled === true;
      if (activating && data.agentTurn?.queued) {
        toast("IA activada · respondiendo el mensaje pendiente");
      } else if (
        activating &&
        data.agentTurn?.reason === "window_closed"
      ) {
        toast("IA activada · la ventana de 24 horas está cerrada");
      } else {
        toast(activating ? "IA activada" : "IA pausada");
      }

      setAiUpdatingId((current) => (current === id ? null : current));
      void refetchConversations();
      return true;
    },
    [refetchConversations, toast]
  );

  // Ancla/desancla o archiva/desarchiva cualquier chat desde la lista. El
  // tope de 3 anclados lo valida el servidor (422) y aquí solo se informa.
  const pinOrArchive = useCallback(
    async (id: string, patch: { pinned?: boolean; archived?: boolean }) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => null);
      if (!res) {
        toast("Sin conexión con el servidor");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        toast(data?.error?.message ?? "No se pudo actualizar el chat");
        return;
      }
      if (patch.pinned !== undefined)
        toast(patch.pinned ? "Chat anclado" : "Chat desanclado");
      else if (patch.archived !== undefined)
        toast(patch.archived ? "Chat archivado" : "Chat desarchivado");
      void refetchConversations();
    },
    [refetchConversations, toast]
  );

  // Reinicia la conversación seleccionada: borra su historial y limpia estado.
  const resetConversation = useCallback(async (): Promise<boolean> => {
    const id = selectedIdRef.current;
    if (!id) return false;
    const res = await fetch(`/api/conversations/${id}/reset`, {
      method: "POST",
    }).catch(() => null);
    if (!res?.ok) return false;
    if (selectedIdRef.current === id) setMessages([]);
    void refetchMessages(id);
    void refetchConversations();
    return true;
  }, [refetchMessages, refetchConversations]);

  // Borra un contacto de forma permanente y sale de su conversación.
  const deleteContact = useCallback(
    async (contactId: string): Promise<boolean> => {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      }).catch(() => null);
      if (!res?.ok) return false;
      setSelectedId(null);
      setMessages([]);
      setDetailOpen(false);
      setConversations(
        (prev) => prev?.filter((c) => c.contact.id !== contactId) ?? prev
      );
      void refetchConversations();
      return true;
    },
    [refetchConversations]
  );

  const requestConversationAction = useCallback(
    (action: InboxConversationAction, ids: string[]) => {
      if (ids.length === 0 || ids.length > 100) return;
      const contactName =
        ids.length === 1
          ? conversations?.find((conversation) => conversation.id === ids[0])
              ?.contact.name
          : undefined;
      setPendingAction({ action, ids: [...new Set(ids)], contactName });
    },
    [conversations]
  );

  const transferAssignee = useCallback(
    async (memberId: string | null) => {
      const id = transferConversationId;
      if (!id || transferBusy) return;
      setTransferBusy(true);
      const response = await fetch(`/api/conversations/${id}/assignee`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId }),
      }).catch(() => null);
      if (!response) {
        setTransferBusy(false);
        toast("Sin conexión con el servidor");
        return;
      }
      const data = (await response.json().catch(() => null)) as
        | {
            changed?: boolean;
            conversation?: ConversationDto;
            error?: { message?: string };
          }
        | null;
      if (!response.ok || !data?.conversation) {
        setTransferBusy(false);
        toast(data?.error?.message ?? "No se pudo transferir el chat");
        return;
      }

      setConversations((current) =>
        current?.map((conversation) =>
          conversation.id === id ? data.conversation! : conversation
        ) ?? current
      );
      setTransferBusy(false);
      setTransferConversationId(null);
      setDetailRev((value) => value + 1);
      toast(
        data.conversation.assignee
          ? `Chat transferido a ${data.conversation.assignee.name}`
          : "Chat sin asignar"
      );
      void refetchConversations();
    }, [refetchConversations, toast, transferBusy, transferConversationId]);

  const executeConversationAction = useCallback(
    async (input: {
      reason?: ContactReportReason;
      notes?: string;
    }) => {
      if (!pendingAction || actionBusy) return;
      setActionBusy(true);
      const singleDelete =
        pendingAction.action === "delete" && pendingAction.ids.length === 1;
      const response = await fetch(
        singleDelete
          ? `/api/conversations/${pendingAction.ids[0]}`
          : "/api/conversations/bulk",
        singleDelete
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                action: pendingAction.action,
                conversationIds: pendingAction.ids,
                ...(pendingAction.action === "report"
                  ? { reason: input.reason, notes: input.notes }
                  : {}),
              }),
            }
      ).catch(() => null);

      if (!response) {
        setActionBusy(false);
        toast("Sin conexión con el servidor");
        return;
      }
      const data = (await response.json().catch(() => null)) as
        | {
            affected?: number;
            warning?: string;
            error?: { message?: string };
          }
        | null;
      if (!response.ok) {
        setActionBusy(false);
        toast(data?.error?.message ?? "No se pudo completar la acción");
        return;
      }

      const { action, ids } = pendingAction;
      if (action === "delete") {
        setConversations((current) =>
          current?.filter((conversation) => !ids.includes(conversation.id)) ??
          current
        );
        if (selectedIdRef.current && ids.includes(selectedIdRef.current)) {
          setSelectedId(null);
          setMessages([]);
          setDetailOpen(false);
        }
      }

      setActionBusy(false);
      setPendingAction(null);
      setSelectedActionIds([]);
      setSelectionResetKey((value) => value + 1);
      await refetchConversations();

      if (data?.warning) {
        toast(data.warning);
      } else {
        const count = data?.affected ?? ids.length;
        const message = {
          delete: count === 1 ? "Chat eliminado" : `${count} chats eliminados`,
          block:
            count === 1 ? "Contacto bloqueado" : `${count} contactos bloqueados`,
          unblock:
            count === 1
              ? "Contacto desbloqueado"
              : `${count} contactos desbloqueados`,
          report:
            count === 1
              ? "Reporte interno guardado"
              : `${count} reportes internos guardados`,
        }[action];
        toast(message);
      }
    },
    [actionBusy, pendingAction, refetchConversations, toast]
  );

  return (
    <div className="flex h-full">
      {/* Master-detail en mobile: lista a pantalla completa sin selección;
          con selección se muestra solo el hilo (botón atrás en el header). */}
      <section
        className={cn(
          "w-full shrink-0 overflow-hidden md:w-[400px] md:border-r",
          selected && "hidden md:block"
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={select}
          onSeeded={() => void refetchConversations()}
          onPatch={(id, patch) => void pinOrArchive(id, patch)}
          onAction={requestConversationAction}
          onTransfer={setTransferConversationId}
          currentMemberId={assignmentOptions?.currentMemberId ?? null}
          members={assignmentOptions?.members ?? []}
          selectedActionIds={selectedActionIds}
          onSelectedActionIdsChange={setSelectedActionIds}
          selectionResetKey={selectionResetKey}
        />
      </section>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          selected ? "flex" : "hidden md:flex"
        )}
      >
        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b bg-surface px-3 py-[15px] md:px-[22px]">
              <button
                onClick={() => setSelectedId(null)}
                aria-label="Volver a la bandeja"
                className="rounded-lg p-1.5 text-mute transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
              >
                <ChevronLeft className="h-[21px] w-[21px]" strokeWidth={2.2} />
              </button>
              <InboxContactAvatar
                name={selected.contact.name}
                seed={selected.contact.id}
                size="md"
                country={selected.contact.country}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold leading-tight">
                  {selected.contact.name}
                </p>
                <p
                  className={
                    selected.windowOpen
                      ? "text-xs font-bold text-success"
                      : "text-xs text-text-3"
                  }
                >
                  {selected.windowOpen
                    ? "ventana abierta"
                    : `+${selected.contact.phone}`}
                </p>
              </div>
              {selected.contact.blockedAt ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-xs font-bold text-destructive"
                  title="La IA y todos los envíos están bloqueados"
                >
                  <ShieldBan className="h-4 w-4" strokeWidth={2.2} />
                  <span className="hidden xl:inline">Bloqueado</span>
                </span>
              ) : (
                <AiConversationHeaderControl
                  active={
                    Boolean(
                      agentAvailability?.enabled &&
                        agentAvailability.aiConfigured
                    ) &&
                    selected.aiEnabled &&
                    !selected.handoffAt
                  }
                  availability={agentAvailability}
                  busy={aiUpdatingId === selected.id}
                  onCheckedChange={(checked) => {
                    void patchConversation(
                      checked
                        ? { reactivate: true }
                        : { aiEnabled: false }
                    );
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => setTransferConversationId(selected.id)}
                aria-label="Transferir chat"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border bg-surface p-[9px] text-[13px] font-bold transition-colors hover:bg-surface-2 xl:px-[13px]"
              >
                <ArrowRightLeft className="h-[16px] w-[16px]" strokeWidth={2.2} />
                <span className="hidden xl:inline">Transferir</span>
              </button>
              <button
                onClick={() => setDetailOpen(true)}
                aria-label="Ver detalles del contacto"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border bg-surface p-[9px] text-[13px] font-bold transition-colors hover:bg-surface-2 lg:px-[15px]"
              >
                <span className="hidden lg:inline">Ver detalles</span>
                <ChevronRight className="h-[15px] w-[15px]" strokeWidth={2.2} />
              </button>
            </header>
            <MessageThread messages={messages} />
            {selected.contact.blockedAt ? (
              <div className="border-t bg-background px-[18px] py-4">
                <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center">
                  <ShieldBan
                    className="h-5 w-5 shrink-0 text-destructive"
                    strokeWidth={2.2}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Contacto bloqueado</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-mute">
                      La IA, mensajes, plantillas, campañas y seguimientos no
                      pueden escribirle.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {selected.contact.blockSyncStatus === "failed" && (
                      <button
                        type="button"
                        onClick={() =>
                          requestConversationAction("block", [selected.id])
                        }
                        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
                      >
                        Reintentar con Meta
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        requestConversationAction("unblock", [selected.id])
                      }
                      className="rounded-xl border bg-surface px-4 py-2.5 text-sm font-bold transition-colors hover:bg-subtle"
                    >
                      Desbloquear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Composer
                conversation={selected}
                onSend={sendText}
                onSendFile={sendFile}
                onSent={() => {
                  if (selectedIdRef.current)
                    void refetchMessages(selectedIdRef.current);
                  void refetchConversations();
                }}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-chat text-sm text-text-3">
            Elige una conversación para ver el hilo
          </div>
        )}
      </section>

      {detailOpen && selected && (
        <SlideOver
          onClose={() => setDetailOpen(false)}
          ariaLabel={`Detalles de ${selected.contact.name}`}
        >
          <ContactPanel
            conversation={selected}
            refreshKey={detailRev}
            agentAvailability={agentAvailability}
            aiUpdating={aiUpdatingId === selected.id}
            onPatchConversation={patchConversation}
            onResetConversation={resetConversation}
            onDeleteContact={deleteContact}
            onContactUpdated={refetchConversations}
            onClose={() => setDetailOpen(false)}
          />
        </SlideOver>
      )}
      {pendingAction && (
        <ConversationActionDialog
          key={`${pendingAction.action}:${pendingAction.ids.join(",")}`}
          pending={pendingAction}
          busy={actionBusy}
          onConfirm={(input) => void executeConversationAction(input)}
          onCancel={() => !actionBusy && setPendingAction(null)}
        />
      )}
      {transferConversation && assignmentOptions && (
        <ConversationTransferDialog
          conversation={transferConversation}
          members={assignmentOptions.members}
          busy={transferBusy}
          onConfirm={(memberId) => void transferAssignee(memberId)}
          onCancel={() => !transferBusy && setTransferConversationId(null)}
        />
      )}
    </div>
  );
}
