"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Copy, KeyRound, MessageSquareText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Connection = { email: string; companyName: string; smsCredits: number | null; keyLast4: string; verifiedAt: string; deliveryEnabled: boolean; sender: string | null; approvalEvidence: string | null; webhookReady: boolean; webhookUncertain: boolean };
export function SmsClient() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [key, setKey] = useState("");
  const [sender, setSender] = useState("");
  const [evidence, setEvidence] = useState("");
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => {
    let active = true;
    void fetch("/api/settings/sms").then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (active) setConnection(data.connection);
    }).catch(() => { if (active) setError("No se pudo cargar la conexión SMS."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function run(action: "save" | "test" | "disconnect") {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(action === "test" ? "/api/settings/sms/test" : "/api/settings/sms", {
        method: action === "save" ? "PUT" : action === "test" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: action === "save" ? JSON.stringify({ apiKey: key }) : undefined,
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error?.message ?? "No se pudo completar la operación."); return; }
      setConnection(action === "disconnect" ? null : data.connection);
      setKey("");
      setMessage(action === "disconnect" ? "Brevo desconectado." : "Cuenta y saldo consultados. Esta comprobación no envía SMS.");
    } catch { setError("No se pudo completar la operación. Intenta nuevamente."); }
    finally { setBusy(false); }
  }
  async function configure(kind: "sender" | "webhook") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/settings/sms/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: kind === "sender" ? JSON.stringify({ sender, approvalEvidence: evidence, approved }) : undefined });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "No se pudo configurar SMS."); return; }
      setConnection(data.connection);
      setMessage(kind === "sender" ? "Remitente guardado con la aprobación que registraste." : "Webhook registrado en Brevo. La recepción real depende del número habilitado.");
    } catch { setError("No se pudo configurar SMS. Revisa el estado antes de reintentar."); }
    finally { setBusy(false); }
  }
  async function copyKeyLast4() {
    if (!connection) return;
    try {
      await navigator.clipboard.writeText(connection.keyLast4);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 3000);
  }

  return <section className="space-y-6" aria-label="Conexión de SMS">
    <div className="flex items-start gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <MessageSquareText className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-2xl font-bold tracking-tight">SMS con Brevo</h3>
        <p className="mt-1 text-sm text-mute">Consulta la conexión de tu empresa y prepara los envíos desde un solo lugar.</p>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border bg-surface shadow-sm" aria-label="Estado de Brevo">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-brand-tint/40 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-sm">
            {connection ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Conexión</p>
            <p className="mt-1 text-lg font-bold">{loading ? "Cargando conexión…" : connection ? "Cuenta API conectada" : "Sin cuenta de Brevo conectada"}</p>
            {connection && <p className="mt-1 break-all text-sm text-mute">{connection.companyName} · {connection.email}</p>}
          </div>
        </div>
        {!loading && <Badge variant={connection ? "success" : "warning"}>{connection ? "Conectada" : "Pendiente"}</Badge>}
      </div>

      {connection ? <>
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl border bg-surface-2/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mute"><KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Clave conectada</p>
              <div className="flex items-center gap-1.5">
                {copyState !== "idle" && <span aria-live="polite" className={`text-xs font-semibold ${copyState === "copied" ? "text-success" : "text-destructive"}`}>{copyState === "copied" ? "Copiado" : "No se pudo copiar"}</span>}
                <button type="button" onClick={() => void copyKeyLast4()} className="rounded-md p-1.5 text-mute transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Copiar últimos 4 caracteres de la clave" title="Copiar últimos 4 caracteres">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <p className="mt-2 font-mono text-xl font-bold tracking-wide" aria-label={`Clave conectada terminada en ${connection.keyLast4}`}>•••• {connection.keyLast4}</p>
            <p className="mt-1 text-xs text-mute">Solo se muestran los últimos 4 caracteres</p>
          </div>
          <div className="rounded-xl border bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mute">Saldo SMS</p>
            <p className="mt-3 text-lg font-bold">{connection.smsCredits === null ? "No disponible" : `${connection.smsCredits} créditos`}</p>
            <p className="mt-1 text-xs text-mute">Informado por Brevo</p>
          </div>
          <div className="rounded-xl border bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mute">Última comprobación</p>
            <p className="mt-3 text-sm font-bold">{new Date(connection.verifiedAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</p>
            <p className="mt-1 text-xs text-mute">Cuenta y permisos de lectura</p>
          </div>
        </div>

        <div className="mx-5 mb-5 rounded-xl border bg-surface-2/50 p-4 sm:mx-6 sm:mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{connection.deliveryEnabled ? `Remitente configurado: ${connection.sender}` : "Envíos SMS pendientes de habilitación"}</p>
            <Badge variant={connection.deliveryEnabled ? "success" : "warning"}>{connection.deliveryEnabled ? "Remitente configurado" : "Falta el remitente"}</Badge>
          </div>
          <p className="mt-2 text-sm text-mute">{connection.deliveryEnabled ? "Verifica el saldo y el consentimiento del destinatario antes de enviar." : "La API ya está conectada. Configura un número aprobado por Brevo para habilitar los envíos."}</p>
          {connection.webhookReady && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Webhook de respuestas registrado</p>}
          <details className="group mt-3 border-t pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
              Ver requisitos para enviar SMS <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-mute">
              <li>Registrar y aprobar el remitente para el país de destino.</li>
              <li>Disponer de créditos SMS en Brevo.</li>
              <li>Guardar el consentimiento del contacto y respetar sus bajas SMS.</li>
            </ol>
          </details>
        </div>
        <div className="flex flex-wrap gap-3 border-t p-5 sm:px-6">
          <Button disabled={busy} variant="secondary" onClick={() => void run("test")}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Actualizar cuenta y saldo</Button>
          <Button disabled={busy} variant="ghost" onClick={() => void run("disconnect")}>Desconectar Brevo</Button>
        </div>
      </> : <p className="p-5 text-sm text-mute sm:p-6">Conecta una clave API para consultar la cuenta y preparar el canal SMS.</p>}
    </div>

    <form className="space-y-4 rounded-2xl border bg-surface p-5 shadow-sm sm:p-6" onSubmit={e => { e.preventDefault(); void run("save"); }}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h4 className="font-bold">{connection ? "Administrar clave API" : "Conectar Brevo"}</h4>
          <p className="text-sm text-mute">{connection ? "La clave actual sigue activa hasta que verifiques otra." : "Verifica tu clave para conectar la cuenta de esta empresa."}</p>
        </div>
      </div>
      <fieldset disabled={loading || busy} className="space-y-4">
        {connection && <p className="rounded-lg border bg-surface-2/50 px-3 py-2 text-sm">Clave actual: <span className="font-mono font-bold">•••• {connection.keyLast4}</span> <span className="text-mute">· El campo nuevo queda vacío por seguridad.</span></p>}
        <div className="space-y-2">
          <Label htmlFor="brevo-key">{connection ? "Nueva clave API de Brevo" : "Clave API de Brevo"}</Label>
          <Input id="brevo-key" type="password" autoComplete="new-password" minLength={20} maxLength={500} required value={key} onChange={e => setKey(e.target.value)} placeholder={connection ? "Pega una clave nueva para reemplazar la actual" : "Pega tu clave API de Brevo"} />
        </div>
        <p className="text-xs text-mute">Se guarda cifrada por empresa. Para verificarla se necesita Account → Read; para operar SMS, Transactional SMS → Read/write y Webhooks → Read/write.</p>
        <Button type="submit">{busy ? "Verificando…" : connection ? "Verificar y reemplazar clave" : "Verificar y conectar Brevo"}</Button>
      </fieldset>
    </form>
    {connection && <div className="space-y-4 rounded-xl border bg-surface p-5">
      <h4 className="font-semibold">Número y respuestas</h4>
      <p className="text-sm text-mute">Usa un número de Estados Unidos cuya aprobación haya confirmado Brevo. Guardar estos datos no tramita ni concede una aprobación.</p>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void configure("sender"); }}>
        <div className="space-y-2"><Label htmlFor="sms-sender">Número remitente aprobado</Label><Input id="sms-sender" placeholder="+1…" value={sender} onChange={e => setSender(e.target.value)} required maxLength={30} /></div>
        <div className="space-y-2"><Label htmlFor="sms-approval">Referencia de aprobación en Brevo</Label><Input id="sms-approval" placeholder="Fecha y referencia de la aprobación recibida" value={evidence} onChange={e => setEvidence(e.target.value)} required minLength={10} maxLength={1000} /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} required className="mt-1" />Confirmo que Brevo aprobó este número para mi empresa y el uso solicitado.</label>
        <Button disabled={busy} type="submit">Guardar remitente aprobado</Button>
      </form>
      <div className="border-t pt-4"><Button variant="secondary" disabled={busy || connection.webhookReady || connection.webhookUncertain} onClick={() => void configure("webhook")}>{connection.webhookReady ? "Recepción configurada" : "Activar recepción de respuestas"}</Button>
        {connection.webhookUncertain && <p className="mt-2 text-sm">Brevo no confirmó el registro anterior. Revisa sus webhooks antes de crear otro.</p>}
        <p className="mt-2 text-xs text-mute">El CRM registra un webhook autenticado para entregas, respuestas y bajas. El secreto se guarda cifrado y nunca se muestra.</p>
      </div>
      <a href="/inbox?channel=sms" className="inline-block text-sm font-semibold underline">Abrir SMS en Bandeja</a>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Preparar la cuenta en Brevo</summary><div className="mt-3 space-y-3 text-sm text-mute"><p>En Brevo abre Configuración → SMTP & API → API keys & MCP. Crea una clave restringida con lectura de Account para comprobar la cuenta. No es necesario otorgar acceso a contactos, email, pagos u otros canales.</p><p>Para registrar el remitente abre Configuración → Campañas → SMS Sender ID. Estados Unidos y Canadá requieren el trámite de número toll-free, datos de la empresa y evidencia de consentimiento. La aprobación la realiza Brevo.</p><p><a className="underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">Administrar claves en Brevo</a> · <a className="underline" href="https://app.brevo.com/sms-compliance/listing?source=settings" target="_blank" rel="noreferrer">Registro de remitente</a></p><p>El saldo depende del país y de los segmentos de cada mensaje. Verificar esta conexión no compra créditos ni envía una prueba.</p></div></details>
  </section>;
}
