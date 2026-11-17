"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldBan } from "lucide-react";
import { ChannelPill } from "@/components/inbox/channel-pill";
import { AiConversationHeaderControl, type AgentAvailability } from "@/components/inbox/ai-conversation-control";
import { InboxContactAvatar } from "@/components/inbox/inbox-contact-avatar";
import { Button } from "@/components/ui/button";
import { smsSegments, SMS_STATUS_LABEL, type SmsStatus } from "@/lib/sms";
import type { SmsInboxContact, SmsInboxSnapshot } from "@/lib/sms-inbox-types";
import { countryFromPhone } from "@/lib/phone-country";

type Review = { content: string; contactId: string; operationId: string };
const HANDOFF_REASONS: Record<string, string> = {
  cliente: "El cliente pidió atención humana.", modelo: "El agente solicitó apoyo humano.",
  error_modelo: "El proveedor de IA no dio una respuesta válida.", agenda: "La agenda requiere revisión.",
  creditos_sms: "No hay créditos SMS disponibles.", creditos_ia: "No hay créditos de IA disponibles.",
  sin_contacto: "No se encontró la ficha del contacto en el CRM.", seguimiento: "El seguimiento requiere revisión.",
  seguimiento_sms: "No se pudo enviar el seguimiento SMS.", accion_no_disponible: "La acción requiere atención del equipo.",
};

export function SmsConversationPanel({ contact, messages, connection, agentAvailability, onBack, onRefresh }: {
  contact: SmsInboxContact;
  messages: SmsInboxSnapshot["messages"];
  connection: SmsInboxSnapshot["connection"];
  agentAvailability: AgentAvailability | null;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const ready = !!connection?.deliveryEnabled && connection.webhookReady && (connection.smsCredits ?? 0) > 0;
  const info = smsSegments(content);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, contact.id]);

  async function request(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => null) as { error?: { message?: string }; message?: { status: SmsStatus } } | null;
    if (!response.ok) throw new Error(result?.error?.message ?? "No se pudo completar la operación SMS.");
    return result;
  }

  async function send() {
    if (!review || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/sms/send", review);
      const status = result?.message?.status;
      setContent(""); setReview(null);
      setNotice(status === "uncertain"
        ? "Brevo no confirmó el resultado. El intento quedó guardado; no lo reenvíes hasta comprobarlo."
        : `SMS: ${status ? SMS_STATUS_LABEL[status] : "Registrado"}.`);
      await onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo confirmar el envío."); }
    finally { setBusy(false); }
  }

  async function toggleAgent(enabled: boolean) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/sms/contacts/${contact.id}/agent`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const result = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(result?.error?.message ?? "No se pudo actualizar la IA.");
      await onRefresh();
      if (!enabled) setNotice("Agente SMS pausado.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo actualizar la IA.");
    } finally { setBusy(false); }
  }

  async function optOut() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/api/sms/contacts/${contact.id}/opt-out`);
      await onRefresh();
      setNotice("Baja SMS registrada. Los envíos a este contacto están bloqueados.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar la baja."); }
    finally { setBusy(false); }
  }

  return <div className="flex h-full min-h-0 flex-col" data-testid="sms-conversation-panel">
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-surface px-3 py-3.5 md:gap-3 md:px-6 md:py-4">
      <button onClick={onBack} aria-label="Volver a la bandeja" className="rounded-lg p-1.5 text-mute hover:bg-surface-2 md:hidden"><ChevronLeft className="h-5 w-5" /></button>
      <InboxContactAvatar name={contact.name} seed={contact.id} size="md" country={countryFromPhone(contact.phone)} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[16px] font-semibold md:text-[18px]">{contact.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-text-3">{contact.phone}</p>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <ChannelPill channel="sms" compact />
        <AiConversationHeaderControl active={contact.aiEnabled && !contact.handoffAt} availability={agentAvailability} busy={busy} shortLabel onCheckedChange={(enabled) => void toggleAgent(enabled)} />
        <Button size="sm" variant="ghost" disabled={busy || !!contact.optedOutAt} onClick={() => void optOut()} aria-label="Registrar baja SMS">
          <ShieldBan className="h-4 w-4" /><span className="hidden lg:inline">Registrar baja</span>
        </Button>
      </div>
    </header>

    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-chat px-4 py-5 md:px-7" role="log" aria-label="Historial SMS" aria-live="polite">
      {messages.length ? messages.map((message) => <article key={message.id} className={`max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm ${message.direction === "out" ? "ml-auto border-orange-400/20 bg-surface" : "mr-auto border-border bg-surface-2"}`}>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.08em] text-mute">{message.direction === "out" ? (message.source === "agent" ? "Agente IA" : message.source === "automation" ? "Bienvenida automática" : "Tu empresa") : contact.name}</p>
        <p className="whitespace-pre-wrap break-words text-[13px] leading-6">{message.content}</p>
        <p className="mt-2 text-[10px] text-text-3">{SMS_STATUS_LABEL[message.status]} · {new Date(message.createdAt).toLocaleString("es-CO")}</p>
      </article>) : <div className="m-auto text-center"><ChannelPill channel="sms" /><p className="mt-3 text-sm font-semibold">Inicia la conversación por SMS</p><p className="mt-1 text-xs text-mute">Envía un aviso solicitado a este contacto.</p></div>}
      <div ref={endRef} />
    </div>

    <div className="shrink-0 space-y-2 border-t bg-surface px-4 py-3 md:px-7">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-mute">
        <span>{contact.optedOutAt ? "Baja SMS registrada" : ready ? `Remitente ${connection?.sender} · ${connection?.smsCredits} créditos` : "Envía cuando Brevo informe créditos y el webhook esté listo"}</span>
        <Link href="/settings/sms" className="font-semibold text-foreground underline-offset-2 hover:underline">Configurar Brevo</Link>
      </div>
      {contact.handoffAt && <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-800 dark:text-orange-300" role="status">Atención humana: el agente derivó este SMS al equipo. {HANDOFF_REASONS[contact.handoffReason ?? ""] ?? "El equipo debe revisar la conversación."} Puedes reactivar la IA con el interruptor.</p>}
      {contact.aiEnabled && !contact.handoffAt && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">IA activa: responderá automáticamente a los próximos SMS entrantes.</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {review ? <div role="dialog" aria-label="Confirmar envío SMS" className="space-y-3 rounded-xl border border-orange-400/30 bg-orange-500/5 p-3">
        <p className="text-sm font-bold">Confirma el SMS · {smsSegments(review.content).segments} segmento(s)</p>
        <p className="text-xs text-mute">Para {contact.phone}. Cada segmento puede consumir créditos.</p>
        <p className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-sm">{review.content}</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void send()}>{busy ? "Enviando…" : "Confirmar y enviar SMS"}</Button><Button variant="outline" disabled={busy} onClick={() => setReview(null)}>Editar</Button></div>
      </div> : <form onSubmit={(event) => { event.preventDefault(); setError(""); setNotice(""); setReview({ content: content.trim(), contactId: contact.id, operationId: crypto.randomUUID() }); }}>
        <label htmlFor="sms-content" className="sr-only">Mensaje SMS</label>
        <textarea id="sms-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder={contact.optedOutAt ? "Este contacto se dio de baja de SMS" : "Escribe un mensaje SMS…"} maxLength={1600} required disabled={!ready || !!contact.optedOutAt || busy} className="max-h-40 min-h-20 w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-orange-400 disabled:opacity-50" />
        <div className="mt-1.5 flex flex-wrap items-center gap-3"><Button size="sm" type="submit" disabled={!ready || !!contact.optedOutAt || busy || !content.trim()}>Revisar SMS</Button><p className="text-[10px] text-mute">{info.segments} segmento(s) · {info.unicode ? "Unicode" : "GSM"} · Solo avisos solicitados</p></div>
      </form>}
    </div>
  </div>;
}
