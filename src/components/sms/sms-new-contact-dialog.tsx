"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChannelPill } from "@/components/inbox/channel-pill";

export function SmsNewContactDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/sms/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, consentEvidence: evidence }) });
      const result = await response.json().catch(() => null) as { contact?: { id: string }; error?: { message?: string } } | null;
      if (!response.ok || !result?.contact) throw new Error(result?.error?.message ?? "No se pudo crear el contacto SMS.");
      onCreated(result.contact.id);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el contacto SMS."); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Nuevo contacto SMS" className="w-full max-w-md space-y-4 rounded-2xl border bg-surface p-5 shadow-2xl">
      <div className="flex items-center justify-between gap-3"><div><ChannelPill channel="sms" /><h2 className="mt-2 font-display text-xl font-semibold">Nuevo contacto SMS</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded-lg p-2 text-mute hover:bg-surface-2">✕</button></div>
      <p className="text-xs leading-5 text-mute">Registra el permiso para SMS por separado del permiso de WhatsApp.</p>
      <form onSubmit={(event) => void create(event)} className="space-y-3">
        <div><Label htmlFor="sms-new-name">Nombre</Label><Input id="sms-new-name" autoFocus required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div><Label htmlFor="sms-new-phone">Número de Estados Unidos</Label><Input id="sms-new-phone" placeholder="+1…" required maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        <div><Label htmlFor="sms-new-evidence">Evidencia de consentimiento SMS</Label><textarea id="sms-new-evidence" required minLength={10} maxLength={1000} value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border bg-background p-3 text-sm" /></div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Crear contacto SMS"}</Button></div>
      </form>
    </div>
  </div>;
}
