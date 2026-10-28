"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { smsSegments, SMS_STATUS_LABEL, type SmsStatus } from "@/lib/sms";

type Contact = { id: string; name: string; phone: string; consentEvidence: string; optedOutAt: string | null };
type Message = { id: string; direction: "in" | "out"; content: string; status: SmsStatus; createdAt: string };
type Snapshot = { contacts: Contact[]; messages: Message[]; connection: { sender: string | null; deliveryEnabled: boolean; smsCredits: number | null; webhookReady: boolean } | null };
export function SmsInbox() {
  const [data,setData] = useState<Snapshot>({ contacts: [],messages: [],connection: null });
  const [selected,setSelected] = useState(""); const selectedRef = useRef(selected); selectedRef.current = selected;
  const [name,setName] = useState(""); const [phone,setPhone] = useState(""); const [evidence,setEvidence] = useState("");
  const [content,setContent] = useState(""); const [review,setReview] = useState<{ content: string; contactId: string; operationId: string } | null>(null);
  const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const [notice,setNotice] = useState("");
  const contact = data.contacts.find(c => c.id === selected); const info = smsSegments(content);
  const refresh = useCallback(async (id: string) => {
    const response = await fetch(`/api/sms${id ? `?contactId=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo actualizar la bandeja SMS.");
    const result = await response.json() as Snapshot;
    if (selectedRef.current === id) setData(result);
  },[]);
  useEffect(() => {
    let active = true;
    void refresh(selected).catch(() => { if (active) setError("No se pudo cargar SMS. Puedes actualizar la bandeja."); });
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(selected).catch(() => {}); },5000);
    return () => { active = false; clearInterval(timer); };
  },[selected,refresh]);
  async function request(path: string,body?: unknown) {
    const response = await fetch(path,{ method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "No se pudo completar la operación SMS.");
    return result;
  }
  async function createContact() {
    setBusy(true); setError(""); setNotice("");
    try { const result = await request("/api/sms/contacts",{name,phone,consentEvidence:evidence}); setName("");setPhone("");setEvidence(""); setSelected(result.contact.id);setNotice("Contacto SMS creado con su evidencia de consentimiento."); }
    catch(e) { setError(e instanceof Error ? e.message : "No se pudo crear el contacto."); } finally { setBusy(false); }
  }
  async function send() {
    if (!review) return;
    setBusy(true); setError(""); setNotice("");
    try { const result = await request("/api/sms/send",review); setContent(""); setReview(null);
      setNotice(result.message.status === "uncertain" ? "Brevo no confirmó el resultado. El intento quedó guardado; no lo reenvíes hasta comprobarlo." : `SMS: ${SMS_STATUS_LABEL[result.message.status as SmsStatus]}.`);
      await refresh(selected);
    } catch(e) { setError(e instanceof Error ? e.message : "No se pudo confirmar el envío."); }
    finally { setBusy(false); }
  }
  async function optOut() {
    if (!contact) return; setBusy(true);setError("");
    try { await request(`/api/sms/contacts/${contact.id}/opt-out`);await refresh(selected);setNotice("Baja SMS registrada. Los envíos a este contacto están bloqueados."); }
    catch(e) { setError(e instanceof Error ? e.message : "No se pudo registrar la baja."); } finally { setBusy(false); }
  }
  const ready = !!data.connection?.deliveryEnabled && data.connection.webhookReady && (data.connection.smsCredits ?? 0) > 0;
  return <section aria-label="Bandeja SMS" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface p-4"><div><p className="font-semibold">{ready ? `Remitente: ${data.connection?.sender}` : "Completa la configuración para enviar SMS"}</p><p className="mt-1 text-sm text-mute">Saldo informado: {data.connection?.smsCredits ?? "no disponible"} · {data.connection?.webhookReady ? "Webhook registrado" : "Recepción pendiente"}</p></div><Link href="/settings/sms" className="text-sm font-semibold underline">Configurar Brevo</Link></div>
    {error && <p role="alert" className="rounded-xl border p-3 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4">
        <div className="rounded-xl border bg-surface p-4"><h2 className="mb-3 font-semibold">Contactos SMS</h2><div className="max-h-72 space-y-2 overflow-y-auto">{data.contacts.length ? data.contacts.map(c => <button key={c.id} onClick={() => {setSelected(c.id);setReview(null);setContent("");setNotice("");setError("");}} className={`w-full rounded-lg border p-3 text-left ${selected === c.id ? "bg-surface-2" : ""}`}><span className="block break-words font-medium">{c.name}</span><span className="text-xs text-mute">{c.phone}{c.optedOutAt ? " · Baja SMS" : ""}</span></button>) : <p className="text-sm text-mute">Aún no hay contactos SMS.</p>}</div></div>
        <details className="rounded-xl border bg-surface p-4"><summary className="cursor-pointer font-semibold">Nuevo contacto SMS</summary><form className="mt-4 space-y-3" onSubmit={e => {e.preventDefault();void createContact();}}>
          <div><Label htmlFor="sms-name">Nombre</Label><Input id="sms-name" value={name} onChange={e => setName(e.target.value)} required maxLength={150}/></div>
          <div><Label htmlFor="sms-phone">Número de Estados Unidos</Label><Input id="sms-phone" placeholder="+1…" value={phone} onChange={e => setPhone(e.target.value)} required maxLength={30}/></div>
          <div><Label htmlFor="sms-consent">Evidencia de consentimiento SMS</Label><textarea id="sms-consent" value={evidence} onChange={e => setEvidence(e.target.value)} required minLength={10} maxLength={1000} className="mt-1 min-h-24 w-full rounded-xl border bg-background p-3 text-sm"/></div>
          <p className="text-xs text-mute">Registra la fecha, fuente y referencia del permiso recibido. Los permisos de WhatsApp y email son independientes.</p><Button type="submit" disabled={busy}>Crear contacto SMS</Button>
        </form></details>
      </aside>
      <div className="min-w-0 rounded-xl border bg-surface p-4 sm:p-5">{contact ? <>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><h2 className="font-semibold">{contact.name}</h2><p className="text-sm text-mute">{contact.phone} · {contact.optedOutAt ? "Baja SMS" : "Consentimiento registrado"}</p></div><Button size="sm" variant="ghost" disabled={busy || !!contact.optedOutAt} onClick={() => void optOut()}>Registrar baja SMS</Button></div>
        <div role="log" aria-label="Historial SMS" aria-live="polite" className="mb-5 max-h-[480px] min-h-40 space-y-3 overflow-y-auto">{data.messages.length ? data.messages.map(m => <article key={m.id} className={`max-w-[90%] rounded-xl border p-3 ${m.direction === "out" ? "ml-auto bg-surface-2" : "mr-auto"}`}><p className="mb-1 text-xs font-semibold text-mute">{m.direction === "out" ? "Tu empresa" : contact.name}</p><p className="whitespace-pre-wrap break-words text-sm">{m.content}</p><p className="mt-2 text-xs text-mute">{SMS_STATUS_LABEL[m.status]} · {new Date(m.createdAt).toLocaleString("es-CO")}</p></article>) : <p className="text-sm text-mute">No hay mensajes con este contacto.</p>}</div>
        <form className="space-y-3 border-t pt-4" onSubmit={e => {e.preventDefault();setError("");setReview({content:content.trim(),contactId:contact.id,operationId:crypto.randomUUID()});}}>
          <Label htmlFor="sms-content">Mensaje SMS</Label><textarea id="sms-content" value={content} onChange={e => setContent(e.target.value)} required maxLength={1600} disabled={!ready || !!contact.optedOutAt || busy || !!review} className="min-h-28 w-full rounded-xl border bg-background p-3 text-sm disabled:opacity-50"/>
          <p className="text-xs text-mute">{info.segments} segmento(s) estimados · {info.unicode ? "Unicode" : "GSM"}. Cada segmento puede consumir créditos. Solo avisos solicitados; no usar para promociones.</p>
          <Button type="submit" disabled={!ready || !!contact.optedOutAt || busy || !content.trim() || !!review}>Revisar SMS</Button>
        </form>
        {review && <div role="dialog" aria-modal="false" aria-label="Confirmar envío SMS" className="mt-4 space-y-3 rounded-xl border bg-surface-2 p-4"><h3 className="font-semibold">Confirmar envío SMS</h3><p className="text-sm">Para {contact.phone} · {smsSegments(review.content).segments} segmento(s) estimados</p><p className="whitespace-pre-wrap break-words text-sm">{review.content}</p><p className="text-xs text-mute">El envío usará créditos de Brevo. Si el resultado es incierto, conserva el mismo intento y revisa el historial.</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void send()}>{busy ? "Enviando…" : "Confirmar y enviar SMS"}</Button><Button variant="ghost" disabled={busy} onClick={() => setReview(null)}>Cancelar</Button></div></div>}
      </> : <div className="py-16 text-center"><h2 className="font-semibold">Selecciona un contacto SMS</h2><p className="mt-2 text-sm text-mute">Crea un contacto con permiso SMS para iniciar una conversación.</p></div>}</div>
    </div>
  </section>;
}
