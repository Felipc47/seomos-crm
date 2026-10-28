"use client";
import { useEffect, useState } from "react";
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
  return <section className="space-y-6" aria-label="Conexión de SMS">
    <div><h3 className="text-xl font-semibold">SMS con Brevo</h3><p className="mt-2 text-sm text-mute">Conecta la cuenta de tu empresa y consulta su saldo de SMS.</p></div>
    <div className="space-y-2 rounded-xl border bg-surface p-5" aria-label="Estado de Brevo">
      <p className="font-semibold">{loading ? "Cargando conexión…" : connection ? "Cuenta API conectada" : "Sin cuenta de Brevo conectada"}</p>
      {connection && <><p className="text-sm">{connection.companyName} · {connection.email}</p><p className="text-sm">Saldo informado por Brevo: {connection.smsCredits === null ? "No disponible" : `${connection.smsCredits} créditos SMS`}</p><p className="text-xs text-mute">Clave terminada en {connection.keyLast4}. Última comprobación: {new Date(connection.verifiedAt).toLocaleString("es-CO")}</p></>}
      <p className="text-sm font-semibold">{connection?.deliveryEnabled ? `Remitente configurado: ${connection.sender}` : "Envíos SMS pendientes de habilitación"}</p>
      {connection?.webhookReady && <p className="text-sm">Webhook de respuestas registrado</p>}
      <p className="text-sm text-mute">Conectar la API no habilita los envíos. Falta registrar y aprobar el remitente para el país de destino, disponer de créditos y configurar el consentimiento y las bajas SMS. La bandeja SMS permite enviar avisos individuales y recibir respuestas cuando Brevo entregue los eventos del número habilitado.</p>
    </div>
    <form className="space-y-4 rounded-xl border bg-surface p-5" onSubmit={e => { e.preventDefault(); void run("save"); }}>
      <fieldset disabled={loading || busy} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="brevo-key">{connection ? "Nueva clave API de Brevo" : "Clave API de Brevo"}</Label><Input id="brevo-key" type="password" autoComplete="new-password" minLength={20} maxLength={500} required value={key} onChange={e => setKey(e.target.value)} /></div>
        <p className="text-xs text-mute">La clave se guarda cifrada por empresa. La verificación usa el permiso Account → Read; no consulta contactos ni envía mensajes. Para operar SMS requiere además Transactional SMS → Read/write y Webhooks → Read/write.</p>
        <Button type="submit">{busy ? "Verificando…" : "Verificar y conectar Brevo"}</Button>
      </fieldset>
    </form>
    {connection && <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="secondary" onClick={() => void run("test")}>Actualizar cuenta y saldo</Button><Button disabled={busy} variant="ghost" onClick={() => void run("disconnect")}>Desconectar Brevo</Button></div>}
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
      <a href="/sms" className="inline-block text-sm font-semibold underline">Abrir bandeja SMS</a>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Preparar la cuenta en Brevo</summary><div className="mt-3 space-y-3 text-sm text-mute"><p>En Brevo abre Configuración → SMTP & API → API keys & MCP. Crea una clave restringida con lectura de Account para comprobar la cuenta. No es necesario otorgar acceso a contactos, email, pagos u otros canales.</p><p>Para registrar el remitente abre Configuración → Campañas → SMS Sender ID. Estados Unidos y Canadá requieren el trámite de número toll-free, datos de la empresa y evidencia de consentimiento. La aprobación la realiza Brevo.</p><p><a className="underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">Administrar claves en Brevo</a> · <a className="underline" href="https://app.brevo.com/sms-compliance/listing?source=settings" target="_blank" rel="noreferrer">Registro de remitente</a></p><p>El saldo depende del país y de los segmentos de cada mensaje. Verificar esta conexión no compra créditos ni envía una prueba.</p></div></details>
  </section>;
}
