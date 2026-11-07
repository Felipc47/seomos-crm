"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SERVICE_NOTICES, type SuspensionReason } from "@/lib/company-service";

type Company = { id: string; name: string; suspendedAt: string | null; suspensionReason: SuspensionReason | null; suspensionMessage: string | null };

export function ServiceDialog({ company, onClose, onSaved }: { company: Company; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState<SuspensionReason>(company.suspensionReason ?? "maintenance");
  const [message, setMessage] = useState(company.suspensionMessage ?? SERVICE_NOTICES.maintenance.message as string);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);

  async function save() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}/service`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: false, reason, message }), signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(data?.error?.message ?? "No se pudo guardar el cambio"); return;
      }
      onSaved();
    } catch { setError("No pudimos conectar con el servidor. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="service-dialog-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border bg-surface p-6 text-foreground shadow-xl backdrop:bg-black/40">
      <h2 id="service-dialog-title" className="text-lg font-bold">{company.suspendedAt ? "Editar aviso" : "Suspender servicio"}</h2>
      <p className="mt-2 break-words text-sm text-text-2">{company.name}</p>
      <p className="mt-2 text-xs leading-relaxed text-mute">El acceso y las automatizaciones quedarán en pausa. Los datos y la configuración se conservan. Puedes reactivar el servicio desde Empresas.</p>
      <label className="mt-5 block text-sm font-bold" htmlFor="suspension-reason">Motivo del aviso</label>
      <select id="suspension-reason" value={reason} disabled={busy} onChange={e => { const next = e.target.value as SuspensionReason; setReason(next); setMessage(SERVICE_NOTICES[next].message); }} className="mt-2 w-full rounded-lg border bg-surface-2 p-2.5 text-sm">
        {Object.entries(SERVICE_NOTICES).map(([value, preset]) => <option key={value} value={value}>{preset.label}</option>)}
      </select>
      <label className="mt-4 block text-sm font-bold" htmlFor="suspension-message">Mensaje para la empresa</label>
      <textarea id="suspension-message" rows={4} maxLength={500} disabled={busy} value={message} onChange={e => setMessage(e.target.value)} className="mt-2 w-full resize-y rounded-lg border bg-surface-2 p-3 text-sm" />
      <p className="text-right text-xs text-mute">{message.length}/500</p>
      <div aria-label="Vista previa del aviso" className="mt-4 rounded-xl border bg-surface-2 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-mute">Vista previa</p>
        <p className="mt-2 text-sm font-bold">{SERVICE_NOTICES[reason].title}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-2">{message}</p>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button>
        <Button disabled={busy || !message.trim()} onClick={() => void save()}>{busy ? "Guardando…" : company.suspendedAt ? "Guardar aviso" : "Suspender servicio"}</Button>
      </div>
    </dialog>
  );
}
