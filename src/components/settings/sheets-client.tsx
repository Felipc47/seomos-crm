"use client";
import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimezone } from "@/components/timezone-provider";
import type { SyncStats } from "@/lib/sheets-contacts";

type Source = { serviceId: string | null; flowIssues?: { id: string; contactId: string | null; result: string | null }[]; flows?: { pending: number; done: number; failed: number }; id: string; name: string; url: string; enabled: boolean; intervalMinutes: number; lastSyncAt: string | null; nextSyncAt: string; lastStatus: string; lastError: string | null; lastStats: SyncStats | null };
export function SheetsClient() {
  const { timezone } = useTimezone();
  const [sources, setSources] = useState<Source[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; templateName: string | null }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setIntervalMinutes] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      const [response, servicesResponse] = await Promise.all([fetch("/api/settings/sheets"), fetch("/api/services")]);
      if (servicesResponse.ok) setServices((await servicesResponse.json()).services);
      if (!response.ok) throw new Error();
      const data = await response.json(); setSources(data.sources); setLoaded(true);
    } catch { setError("No se pudieron cargar las conexiones de Sheets."); setLoaded(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);
  const date = (value: string) => new Intl.DateTimeFormat("es-CO", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  async function action(key: string, path: string, method: string, data?: unknown) {
    setBusy(key); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "No se pudo guardar el cambio.");
      if (key === "create") { setName(""); setUrl(""); setServiceId(""); setMessage("Hoja conectada. La primera revisión se realizará en el próximo minuto; también puedes sincronizar ahora."); }
      else setMessage(key.startsWith("sync:") ? "Sincronización completada." : "Configuración actualizada.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor."); }
    finally { setBusy(null); await load(); }
  }
  return <section className="max-w-4xl space-y-4" aria-label="Sincronización de Google Sheets">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-brand" /> Google Sheets</CardTitle>
        <CardDescription>Recibe los contactos de tus hojas y formularios de Meta automáticamente. Cada pestaña se conecta por separado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={event => { event.preventDefault(); void action("create", "/api/settings/sheets", "POST", { name, url, intervalMinutes: interval, serviceId: serviceId || null }); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="sheet-name">Nombre de la conexión</Label><Input id="sheet-name" value={name} onChange={e => setName(e.target.value)} required maxLength={80} placeholder="Ej. Leads de Meta — Integraciones" /></div>
            <div className="space-y-2"><Label htmlFor="sheet-interval">Revisar cada (minutos)</Label><Input id="sheet-interval" type="number" min={1} max={1440} value={interval} onChange={e => setIntervalMinutes(Number(e.target.value))} required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="sheet-url">Enlace de la pestaña de Google Sheets</Label><Input id="sheet-url" type="url" value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0" /></div>
          <div className="space-y-2"><Label htmlFor="sheet-service">Servicio para los nuevos leads</Label><select id="sheet-service" value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full rounded-xl border bg-surface-2 px-3 py-2 text-sm"><option value="">Solo contactos, sin flujo automático</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}{service.templateName ? ` — ${service.templateName}` : " — saludo global si está configurado"}</option>)}</select></div>
          <p className="text-xs leading-5 text-text-3">La hoja debe permitir lectura con el enlace. Incluye las columnas full_name y phone_number, o nombre y teléfono; email es opcional. Las demás columnas se guardan en las notas. No se modifica la hoja, no se borran contactos. Al elegir un servicio, las filas nuevas reciben el flujo configurado: aviso interno por correo y plantilla de bienvenida. Si ya existe una plantilla o un intento previo, no se repite el saludo.</p>
          <Button type="submit" disabled={!!busy || !loaded}><Plus className="h-4 w-4" />{busy === "create" ? "Comprobando hoja…" : "Conectar hoja"}</Button>
        </form>
      </CardContent>
    </Card>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-brand/30 bg-brand-tint p-4 text-sm">{message}</p>}
    {!loaded ? <p className="text-sm text-text-3">Cargando conexiones…</p> : sources.map(source => <Card key={source.id} data-testid={`sheet-source-${source.id}`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{source.name}</CardTitle><span className="text-xs font-semibold">{!source.enabled ? "Pausada" : source.lastStatus === "failed" ? "Revisar conexión" : source.lastStatus === "running" ? "Sincronizando…" : "Activa"}</span></div>
        <a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-brand underline">Abrir hoja de origen</a>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void action(source.id, `/api/settings/sheets/${source.id}`, "PATCH", { serviceId: data.get("service") || null }); }} className="space-y-2">
          <Label htmlFor={`service-${source.id}`}>Servicio de {source.name}</Label>
          <div className="flex flex-wrap gap-2"><select key={source.serviceId ?? "none"} id={`service-${source.id}`} name="service" defaultValue={source.serviceId ?? ""} className="min-w-0 flex-1 rounded-xl border bg-surface-2 px-3 py-2 text-sm"><option value="">Solo contactos, sin flujo automático</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}{service.templateName ? ` — ${service.templateName}` : ""}</option>)}</select><Button type="submit" variant="outline" disabled={!!busy}>Guardar servicio</Button></div>
          <p className="text-xs text-text-3">Se aplica a filas nuevas. Cambiar el servicio no envía mensajes a contactos ya sincronizados ni reemplaza servicios asignados.</p>
        </form>
        <div className="flex flex-wrap items-end gap-3">
          <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void action(source.id, `/api/settings/sheets/${source.id}`, "PATCH", { intervalMinutes: Number(data.get("interval")) }); }} className="flex items-end gap-2">
            <div className="space-y-2"><Label htmlFor={`interval-${source.id}`}>Intervalo de {source.name} (min)</Label><Input key={source.intervalMinutes} id={`interval-${source.id}`} name="interval" type="number" className="w-28" defaultValue={source.intervalMinutes} min={1} max={1440} required /></div>
            <Button type="submit" variant="outline" disabled={!!busy}>Guardar intervalo</Button>
          </form>
          <Button variant="outline" disabled={!!busy} onClick={() => void action(source.id, `/api/settings/sheets/${source.id}`, "PATCH", { enabled: !source.enabled })}>{source.enabled ? "Pausar" : "Reanudar"}</Button>
          <Button disabled={!!busy || source.lastStatus === "running"} onClick={() => void action(`sync:${source.id}`, `/api/settings/sheets/${source.id}/sync`, "POST")}><RefreshCw className="h-4 w-4" />{busy === `sync:${source.id}` ? "Sincronizando…" : "Sincronizar ahora"}</Button>
        </div>
        <p className="text-xs text-text-3">{source.lastSyncAt ? `Última revisión: ${date(source.lastSyncAt)}.` : "Aún no se ha sincronizado."}{source.enabled ? ` Próxima revisión: ${date(source.nextSyncAt)}.` : " Sincronización automática pausada."}</p>
        {source.lastStats && <p className="text-sm">{source.lastStats.created} nuevos · {source.lastStats.updated} actualizados · {source.lastStats.unchanged} sin cambios · {source.lastStats.skipped} omitidos</p>}
        {source.flows && (source.serviceId || source.flows.done + source.flows.failed + source.flows.pending > 0) && <p className="text-sm">Flujos: {source.flows.done} procesados · {source.flows.pending} pendientes · {source.flows.failed} con incidencias.{source.flows.failed > 0 && <span className="block text-destructive">Revisa las conversaciones, los avisos y la conexión. Los intentos fallidos no se repiten automáticamente para evitar duplicados.</span>}</p>}
        {!!source.flowIssues?.length && <ul className="space-y-2 text-sm">{source.flowIssues.map(issue => <li key={issue.id} className="rounded-xl border p-3">{issue.result}{issue.contactId && <a className="ml-2 text-brand underline" href={`/inbox?contact=${encodeURIComponent(issue.contactId)}`}>Revisar contacto</a>}</li>)}</ul>}
        {source.lastError && <p role="alert" className="text-sm text-destructive">{source.lastError}</p>}
        {!!source.lastStats?.issues.length && <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-semibold">Ver filas omitidas (hasta 20)</summary><ul className="mt-2 space-y-1">{source.lastStats.issues.map((issue, i) => <li key={i}>Fila {issue.row}: {issue.reason}</li>)}</ul></details>}
      </CardContent>
    </Card>)}
  </section>;
}
