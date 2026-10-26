"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Connection = { email: string; companyName: string; smsCredits: number | null; keyLast4: string; verifiedAt: string; deliveryEnabled: false };
export function SmsClient() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [key, setKey] = useState("");
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
  return <section className="space-y-6" aria-label="Conexión de SMS">
    <div><h3 className="text-xl font-semibold">SMS con Brevo</h3><p className="mt-2 text-sm text-mute">Conecta la cuenta de tu empresa y consulta su saldo de SMS.</p></div>
    <div className="space-y-2 rounded-xl border bg-surface p-5" aria-label="Estado de Brevo">
      <p className="font-semibold">{loading ? "Cargando conexión…" : connection ? "Cuenta API conectada" : "Sin cuenta de Brevo conectada"}</p>
      {connection && <><p className="text-sm">{connection.companyName} · {connection.email}</p><p className="text-sm">Saldo informado por Brevo: {connection.smsCredits === null ? "No disponible" : `${connection.smsCredits} créditos SMS`}</p><p className="text-xs text-mute">Clave terminada en {connection.keyLast4}. Última comprobación: {new Date(connection.verifiedAt).toLocaleString("es-CO")}</p></>}
      <p className="text-sm font-semibold">Envíos SMS pendientes de habilitación</p>
      <p className="text-sm text-mute">Conectar la API no habilita los envíos. Falta registrar y aprobar el remitente para el país de destino, disponer de créditos y configurar el consentimiento y las bajas SMS. Los avisos y campañas estarán disponibles al completar esta configuración.</p>
    </div>
    <form className="space-y-4 rounded-xl border bg-surface p-5" onSubmit={e => { e.preventDefault(); void run("save"); }}>
      <fieldset disabled={loading || busy} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="brevo-key">{connection ? "Nueva clave API de Brevo" : "Clave API de Brevo"}</Label><Input id="brevo-key" type="password" autoComplete="new-password" minLength={20} maxLength={500} required value={key} onChange={e => setKey(e.target.value)} /></div>
        <p className="text-xs text-mute">La clave se guarda cifrada por empresa. La verificación usa el permiso Account → Read; no consulta contactos ni envía mensajes.</p>
        <Button type="submit">{busy ? "Verificando…" : "Verificar y conectar Brevo"}</Button>
      </fieldset>
    </form>
    {connection && <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="secondary" onClick={() => void run("test")}>Actualizar cuenta y saldo</Button><Button disabled={busy} variant="ghost" onClick={() => void run("disconnect")}>Desconectar Brevo</Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Preparar la cuenta en Brevo</summary><div className="mt-3 space-y-3 text-sm text-mute"><p>En Brevo abre Configuración → SMTP & API → API keys & MCP. Crea una clave restringida con lectura de Account para comprobar la cuenta. No es necesario otorgar acceso a contactos, email, pagos u otros canales.</p><p>Para registrar el remitente abre Configuración → Campañas → SMS Sender ID. Estados Unidos y Canadá requieren el trámite de número toll-free, datos de la empresa y evidencia de consentimiento. La aprobación la realiza Brevo.</p><p><a className="underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">Administrar claves en Brevo</a> · <a className="underline" href="https://app.brevo.com/sms-compliance/listing?source=settings" target="_blank" rel="noreferrer">Registro de remitente</a></p><p>El saldo depende del país y de los segmentos de cada mensaje. Verificar esta conexión no compra créditos ni envía una prueba.</p></div></details>
  </section>;
}
