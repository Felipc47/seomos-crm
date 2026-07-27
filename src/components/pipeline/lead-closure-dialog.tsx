"use client";

import { useState } from "react";
import { CircleX } from "lucide-react";
import type { LeadClosureReason, } from "@/lib/lead-closure";
import { reasonsForStage } from "@/lib/lead-closure";
import type { StageDto } from "@/lib/types";

export function LeadClosureDialog({
  stage,
  busy = false,
  onConfirm,
  onCancel,
}: {
  stage: StageDto;
  busy?: boolean;
  onConfirm: (reason: LeadClosureReason) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<LeadClosureReason | "">("");
  const options = reasonsForStage(stage.kind);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-[fade-in_.16s_ease] items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="closure-title"
        className="w-full max-w-[430px] animate-[pop-in_.2s_ease] rounded-2xl bg-surface p-6 shadow-[0_24px_60px_rgba(0,0,0,.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-surface-2">
          <CircleX className="h-[26px] w-[26px] text-mute" strokeWidth={2} />
        </div>
        <h3 id="closure-title" className="font-display text-[19px] font-bold">
          Mover a {stage.name}
        </h3>
        <p className="mb-4 mt-2 text-sm leading-relaxed text-mute">
          Elige el motivo para mantener el embudo y los reportes limpios.
        </p>
        <label
          htmlFor="closure-reason"
          className="mb-1.5 block text-[12.5px] font-bold"
        >
          Motivo
        </label>
        <select
          id="closure-reason"
          autoFocus
          value={reason}
          onChange={(event) =>
            setReason(event.target.value as LeadClosureReason | "")
          }
          className="h-11 w-full rounded-xl border bg-surface-2 px-3.5 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        >
          <option value="">Selecciona un motivo…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason || busy}
            className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Confirmar"}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border py-3 text-sm font-bold transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
