"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, UserRound } from "lucide-react";
import type {
  ConversationDto,
  InboxAssigneeOptionDto,
} from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  owner: "Admin",
  agent_editor: "Editor de agente",
  commercial: "Ejecutivo comercial",
  marketing: "Marketing",
  member: "Ejecutivo comercial",
};

export function ConversationTransferDialog({
  conversation,
  members,
  busy,
  onConfirm,
  onCancel,
}: {
  conversation: ConversationDto;
  members: InboxAssigneeOptionDto[];
  busy: boolean;
  onConfirm: (memberId: string | null) => void;
  onCancel: () => void;
}) {
  const currentId = conversation.assignee?.memberId ?? "";
  const [memberId, setMemberId] = useState(currentId);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-[fade-in_.16s_ease] items-center justify-center bg-black/55 p-4"
      onClick={() => !busy && onCancel()}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-transfer-title"
        className="w-full max-w-[460px] animate-[pop-in_.2s_ease] rounded-2xl bg-surface p-6 shadow-[0_24px_70px_rgba(0,0,0,.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-brand-soft">
          <ArrowRightLeft className="h-[26px] w-[26px] text-brand" strokeWidth={2} />
        </div>
        <h3
          id="conversation-transfer-title"
          className="font-display text-[19px] font-bold"
        >
          Transferir conversación
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          El nuevo responsable recibirá el chat de {conversation.contact.name}
          con todo el historial, archivos y contexto acumulado.
        </p>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[12.5px] font-bold">
            Nuevo responsable
          </span>
          <select
            autoFocus
            aria-label="Nuevo responsable"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className="h-11 w-full rounded-xl border bg-surface-2 px-3.5 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          >
            <option value="">Sin asignar</option>
            {members.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.name} · {ROLE_LABELS[member.role] ?? "Equipo"}
                {member.isCurrent ? " (tú)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-xs text-mute">
          <UserRound className="h-4 w-4 shrink-0" strokeWidth={2} />
          Responsable actual: {conversation.assignee?.name ?? "Sin asignar"}
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            disabled={busy || memberId === currentId}
            onClick={() => onConfirm(memberId || null)}
            className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? "Transfiriendo…" : "Transferir"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 rounded-xl border py-3 text-sm font-bold transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </section>
    </div>
  );
}
