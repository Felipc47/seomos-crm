"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Kind = "meta_form" | "sheet";
type Source = { sourceType: Kind; sourceKey: string; consentEvidence: string };
type Available = { sourceType: Kind; sourceKey: string; label: string };

export function SmsLeadSources() {
  const [available, setAvailable] = useState<Available[]>([]);
  const [configured, setConfigured] = useState<Source[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/settings/sms/lead-sources", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudieron consultar las fuentes de leads.");
    const data = await response.json();
    setAvailable([
      ...data.forms.map((id: string) => ({ sourceType: "meta_form" as const, sourceKey: id, label: `Formulario Meta ${id}` })),
      ...data.sheets.map((s: { id: string; name: string }) => ({ sourceType: "sheet" as const, sourceKey: s.id, label: `Google Sheets: ${s.name}` })),
    ]);
    setConfigured(data.sources);
  }
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
  async function update(source: Available, evidence: string | null) {
    const key = `${source.sourceType}:${source.sourceKey}`;
    setBusy(key); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/sms/lead-sources", {
        method: evidence === null ? "DELETE" : "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceType: source.sourceType, sourceKey: source.sourceKey,
          ...(evidence === null ? {} : { consentEvidence: evidence }) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "No se pudo guardar la fuente.");
      await load();
      setMessage(evidence === null ? "Alta SMS automática desactivada para esta fuente." : "Fuente de consentimiento SMS guardada. Se aplica a leads nuevos.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la fuente."); }
    finally { setBusy(null); }
  }
  return <section className="space-y-4 rounded-xl border bg-surface p-5" aria-label="Alta automática de leads SMS">
    <div><h4 className="font-semibold">Alta automática para SMS</h4>
      <p className="mt-1 text-sm text-mute">Activa cada formulario o pestaña solo si todas sus nuevas filas aceptaron expresamente recibir SMS de tu marca. Guarda el texto o la referencia verificable de esa aceptación. El CRM crea el contacto SMS sin otro paso por lead; conserva las bajas y no envía mensajes por activar esta opción.</p></div>
    {available.length === 0 && <p className="text-sm text-mute">Aún no hay formularios Meta detectados ni pestañas de Sheets conectadas.</p>}
    {available.map(source => {
      const saved = configured.find(c => c.sourceType === source.sourceType && c.sourceKey === source.sourceKey);
      const key = `${source.sourceType}:${source.sourceKey}`;
      return <form key={key} className="space-y-3 rounded-lg border p-4" onSubmit={e => {
        e.preventDefault(); const data = new FormData(e.currentTarget);
        void update(source, String(data.get("evidence") ?? "").trim());
      }}>
        <div><p className="font-medium">{source.label}</p><p className="text-xs text-mute">{saved ? "Alta SMS activa para leads nuevos" : "Alta SMS desactivada"}</p></div>
        <label className="block text-sm" htmlFor={`sms-source-${key}`}>Texto o referencia de aceptación SMS</label>
        <textarea key={saved?.consentEvidence ?? ""} id={`sms-source-${key}`} name="evidence" defaultValue={saved?.consentEvidence ?? ""} minLength={10} maxLength={800} required className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm" placeholder="Texto del checkbox SMS, versión del formulario y marca" />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Confirmo que esta fuente contiene leads que aceptaron SMS expresamente.</label>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!!busy}>{busy === key ? "Guardando…" : saved ? "Actualizar evidencia" : "Activar alta SMS"}</Button>
          {saved && <Button type="button" variant="ghost" disabled={!!busy} onClick={() => void update(source, null)}>Desactivar</Button>}</div>
      </form>;
    })}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
