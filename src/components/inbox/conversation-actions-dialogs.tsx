"use client";

import { useEffect, useState } from "react";
import { Flag, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import type { ContactReportReason } from "@/lib/types";
import type { InboxConversationAction } from "./conversation-list";

export type PendingInboxAction = {
  action: InboxConversationAction;
  ids: string[];
  contactName?: string;
};

const REASONS: { value: ContactReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Acoso" },
  { value: "fraud", label: "Fraude o intento de estafa" },
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "other", label: "Otro" },
];

export function ConversationActionDialog({
  pending,
  busy,
  onConfirm,
  onCancel,
}: {
  pending: PendingInboxAction;
  busy: boolean;
  onConfirm: (input: {
    reason?: ContactReportReason;
    notes?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<ContactReportReason | "">("");
  const [notes, setNotes] = useState("");
  const count = pending.ids.length;
  const one = count === 1;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  const content = {
    delete: {
      title: one ? "Eliminar chat" : `Eliminar ${count} chats`,
      message: one
        ? `Se borrará el historial${pending.contactName ? ` con ${pending.contactName}` : ""}. El contacto y el prospecto se conservarán.`
        : "Se borrarán los historiales seleccionados. Los contactos y prospectos se conservarán.",
      confirm: one ? "Sí, eliminar chat" : `Eliminar ${count} chats`,
      icon: Trash2,
      danger: true,
    },
    block: {
      title: one ? "Bloquear contacto" : `Bloquear ${count} contactos`,
      message:
        "La IA, los mensajes manuales, las plantillas, campañas y seguimientos dejarán de enviar a estos contactos. El bloqueo local se aplica incluso si Meta tarda en sincronizar.",
      confirm: one ? "Bloquear contacto" : `Bloquear ${count} contactos`,
      icon: ShieldBan,
      danger: true,
    },
    unblock: {
      title: one ? "Desbloquear contacto" : `Desbloquear ${count} contactos`,
      message:
        "El envío solo volverá a habilitarse después de que Meta confirme el desbloqueo.",
      confirm: one ? "Desbloquear contacto" : `Desbloquear ${count} contactos`,
      icon: ShieldCheck,
      danger: false,
    },
    report: {
      title: one ? "Reportar contacto" : `Reportar ${count} contactos`,
      message:
        "Este reporte es interno del CRM y quedará auditado. No se envía a Meta ni bloquea automáticamente al contacto.",
      confirm: one ? "Guardar reporte" : `Reportar ${count} contactos`,
      icon: Flag,
      danger: false,
    },
  }[pending.action];
  const Icon = content.icon;
  const valid = pending.action !== "report" || Boolean(reason);

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-[fade-in_.16s_ease] items-center justify-center bg-black/55 p-4"
      onClick={() => !busy && onCancel()}
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conversation-action-title"
        className="w-full max-w-[440px] animate-[pop-in_.2s_ease] rounded-2xl bg-surface p-6 shadow-[0_24px_70px_rgba(0,0,0,.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${
            content.danger ? "bg-destructive/10" : "bg-brand-soft"
          }`}
        >
          <Icon
            className={`h-[26px] w-[26px] ${
              content.danger ? "text-destructive" : "text-brand"
            }`}
            strokeWidth={2}
          />
        </div>
        <h3
          id="conversation-action-title"
          className="font-display text-[19px] font-bold"
        >
          {content.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          {content.message}
        </p>

        {pending.action === "report" && (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold">
                Motivo
              </span>
              <select
                autoFocus
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as ContactReportReason | "")
                }
                className="h-11 w-full rounded-xl border bg-surface-2 px-3.5 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              >
                <option value="">Selecciona un motivo…</option>
                {REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-bold">
                Notas <span className="font-medium text-faint">Opcional</span>
              </span>
              <textarea
                value={notes}
                maxLength={500}
                rows={4}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Agrega contexto para el equipo…"
                className="w-full resize-none rounded-xl border bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
              <span className="mt-1 block text-right text-[11px] text-faint">
                {notes.length}/500
              </span>
            </label>
          </div>
        )}

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() =>
              onConfirm({
                ...(reason ? { reason } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              })
            }
            className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
              content.danger
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {busy ? "Un momento…" : content.confirm}
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
