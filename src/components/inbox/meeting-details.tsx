"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ExternalLink } from "lucide-react";
import { useEvents } from "@/components/use-events";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatMeetingTime, meetingLocalInput, meetingLocalToIso, type MeetingDto } from "@/lib/meeting";

const statusLabels: Record<MeetingDto["reminderStatus"], string> = {
  pending: "Confirmación programada", sending: "Enviando confirmación", sent: "Confirmación enviada a WhatsApp",
  skipped: "Confirmación omitida", uncertain: "Envío pendiente de verificar", disabled: "Confirmación desactivada", cancelled: "Registro retirado",
};
const fieldClass = "mt-1 w-full min-w-0 rounded-lg border bg-surface px-3 py-2 text-sm";
export function MeetingDetails({ contactId, refreshKey }: { contactId: string; refreshKey: number }) {
  const toast = useToast();
  const [meeting, setMeeting] = useState<MeetingDto | null>(null);
  const [timezone, setTimezone] = useState("America/Bogota");
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("Reunión");
  const [datetime, setDatetime] = useState("");
  const [link, setLink] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/contacts/${contactId}/meeting`).catch(() => null);
    if (!response?.ok) { setError("No se pudo cargar la reunión. Intenta nuevamente."); return; }
    const data = await response.json() as { meeting: MeetingDto | null; timezone: string };
    setMeeting(data.meeting); setTimezone(data.timezone); setLoaded(true);
  }, [contactId]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  useEvents({ onConversationUpdated: () => { void load(); }, onReconnect: () => { void load(); } });
  function edit() {
    const current = meeting?.reminderStatus !== "cancelled" ? meeting : null;
    setTitle(current?.title ?? "Reunión"); setDatetime(current ? meetingLocalInput(current.startIso, timezone) : "");
    setLink(current?.meetLink ?? ""); setEnabled(current?.reminderEnabled ?? true); setError(null); setEditing(true);
  }
  async function save() {
    setError(null);
    let startIso: string;
    try { startIso = meetingLocalToIso(datetime, timezone); } catch (err) { setError(err instanceof Error ? err.message : "Fecha inválida"); return; }
    setBusy(true);
    const response = await fetch(`/api/contacts/${contactId}/meeting`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ startIso, meetLink: link, title, reminderEnabled: enabled }) }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { const data = await response?.json().catch(() => null); setError(data?.error?.message ?? "No se pudo guardar la reunión."); return; }
    await load(); setEditing(false); toast("Reunión registrada");
  }
  async function remove() {
    setBusy(true); setError(null);
    const response = await fetch(`/api/contacts/${contactId}/meeting`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { const data = await response?.json().catch(() => null); setError(data?.error?.message ?? "No se pudo retirar el registro."); return; }
    await load(); toast("Registro retirado y confirmación cancelada");
  }
  const active = meeting && meeting.reminderStatus !== "cancelled";
  return <section aria-label="Reunión del prospecto" className="mt-6">
    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.6px] text-faint"><CalendarClock className="h-3.5 w-3.5" />Reunión</p>
    <div className="space-y-3 rounded-xl border bg-surface-2 p-3.5 text-[13px]">
      {!loaded ? <p className="text-mute">Cargando reunión…</p> : active && meeting ? <>
        <p className="font-semibold">{meeting.title}</p>
        <p>{formatMeetingTime(new Date(meeting.startIso), meeting.timezone)} <span className="block text-xs text-mute">{meeting.timezone}</span></p>
        {meeting.meetLink ? <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 break-all font-semibold text-brand-text underline"><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />{meeting.meetLink}</a> : <p className="text-mute">Enlace pendiente de registrar</p>}
        <p className="text-xs text-mute">{meeting.source === "google" ? "Agendada desde Google Calendar" : meeting.source === "legacy" ? "Reunión anterior recuperada; revisa el enlace y activa la confirmación." : "Reunión registrada en el CRM"}</p>
        <div role="status" className="border-t pt-2">
          <p className="font-semibold">{statusLabels[meeting.reminderStatus]}</p>
          {meeting.reminderEnabled && meeting.reminderStatus === "pending" && <p className="mt-1 text-xs text-mute">45 minutos antes · {formatMeetingTime(new Date(meeting.reminderDueAt), meeting.timezone)}</p>}
          {meeting.reminderSentAt && <p className="mt-1 text-xs text-mute">Solicitud enviada; la respuesta del prospecto queda en el chat.</p>}
          {meeting.reminderError && <p className="mt-1 text-xs text-mute">{meeting.reminderError}</p>}
        </div>
      </> : <p className="text-mute">Sin reunión registrada. Si ya se agendó por fuera del CRM, añade su fecha y enlace.</p>}
      {!editing && loaded && <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy || meeting?.reminderStatus === "sending"} onClick={edit}>{active ? "Editar registro de reunión" : "Registrar reunión existente"}</Button>
        {active && <Button size="sm" variant="ghost" disabled={busy || meeting?.reminderStatus === "sending"} onClick={() => void remove()}>Retirar registro</Button>}
      </div>}
      {editing && <form className="space-y-3 border-t pt-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label className="block">Título de la reunión<input className={fieldClass} value={title} maxLength={120} required onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block">Fecha y hora de reunión<input className={fieldClass} type="datetime-local" value={datetime} required onChange={(e) => setDatetime(e.target.value)} /></label>
        <p className="text-xs text-mute">Hora de la empresa: {timezone}</p>
        <label className="block">Enlace de la reunión<input className={fieldClass} type="url" value={link} maxLength={1000} placeholder="Opcional · https://meet.google.com/…" onChange={(e) => setLink(e.target.value)} /></label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-0.5" />Confirmar por WhatsApp 45 minutos antes</label>
        <p className="text-xs text-mute">Fuera de la ventana de 24h se necesita una <Link className="underline" href="/agent">plantilla aprobada en Agendamiento</Link>.</p>
        <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar reunión"}</Button><Button size="sm" variant="ghost" disabled={busy} type="button" onClick={() => setEditing(false)}>Cancelar edición</Button></div>
      </form>}
      {active && <p className="text-xs text-mute">Editar o retirar este registro solo cambia el CRM. Los cambios en Google Calendar se hacen en el calendario.</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {!loaded && error && <Button size="sm" variant="secondary" onClick={() => void load()}>Reintentar carga</Button>}
    </div>
  </section>;
}
