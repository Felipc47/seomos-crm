"use client";
import { useCallback, useEffect, useState } from "react";
import { Mail, Plus, RefreshCw, Users, Workflow, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { eligibleSubscriber, parseMailingCsv, renderMail, type MailingAction, type MailingSnapshot, type MailingStep } from "@/lib/mailing";
const selectClass = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm";
const panelClass = "min-w-0 rounded-2xl border border-border bg-surface p-5";
const statusLabels: Record<string, string> = { draft: "Borrador", active: "En curso", scheduled: "Programado", paused: "Pausado", completed: "Finalizado", cancelled: "Cancelado", pending: "Pendiente", sending: "Enviando", accepted: "Aceptado", failed: "Fallido", uncertain: "Por confirmar", skipped: "Excluido", verified: "Verificado", not_started: "Pendiente de DNS", bounced: "Rebote", complained: "Queja" };
function label(status: string) { return statusLabels[status] ?? status; }
function date(value: string | null) { return value ? new Date(value).toLocaleString("es-CO") : "—"; }
export function MailingClient() {
    const [data, setData] = useState<MailingSnapshot | null>(null);
    const [tab, setTab] = useState<"campaigns" | "sequences" | "audience" | "sender">("campaigns");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [trackOpens, setTrackOpens] = useState(false);
    const [trackClicks, setTrackClicks] = useState(false);
    const [domain, setDomain] = useState("");
    const [fromEmail, setFromEmail] = useState("");
    const [fromName, setFromName] = useState("");
    const [replyTo, setReplyTo] = useState("");
    const [senderLoaded, setSenderLoaded] = useState(false);
    const [listName, setListName] = useState("");
    const [listId, setListId] = useState("");
    const [subEmail, setSubEmail] = useState("");
    const [subName, setSubName] = useState("");
    const [consent, setConsent] = useState(false);
    const [csv, setCsv] = useState("");
    const [selectedId, setSelectedId] = useState("");
    const [programName, setProgramName] = useState("");
    const [programListId, setProgramListId] = useState("");
    const [steps, setSteps] = useState<MailingStep[]>([{ day: 0, subject: "", body: "" }]);
    const [scheduledAt, setScheduledAt] = useState("");
    const [autoEnroll, setAutoEnroll] = useState(true);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const load = useCallback(async () => {
        const response = await fetch("/api/mailing");
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.error?.message ?? "No se pudo cargar mailing");
        setData(body as MailingSnapshot);
        return body as MailingSnapshot;
    }, []);
    useEffect(() => { void load().catch((e: Error) => setError(e.message)); }, [load]);
    useEffect(() => {
        if (!data || senderLoaded)
            return;
        if (data.sender) {
            setDomain(data.sender.domain);
            setFromEmail(data.sender.fromEmail);
            setFromName(data.sender.fromName);
            setReplyTo(data.sender.replyTo ?? "");
            setTrackOpens(data.sender.trackOpens);
            setTrackClicks(data.sender.trackClicks);
        }
        if (data.lists[0]) {
            setListId(data.lists[0].id);
            setProgramListId(data.lists[0].id);
        }
        setSenderLoaded(true);
    }, [data, senderLoaded]);
    useEffect(() => { const timer = setInterval(() => { void load().catch(() => { }); }, 15000); return () => clearInterval(timer); }, [load]);
    async function run(action: MailingAction | Record<string, unknown>, success: string, endpoint = "/api/mailing") {
        if (busy)
            return null;
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error?.message ?? "No se pudo completar la acción");
            const fresh = await load();
            setMessage(success);
            return { result, fresh };
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo completar la acción");
            return null;
        }
        finally {
            setBusy(false);
        }
    }
    function newProgram(sequence = tab === "sequences") { setSelectedId(""); setProgramName(""); setProgramListId(data?.lists[0]?.id ?? ""); setSteps(sequence ? [7, 14, 21].map((day) => ({ day, subject: "", body: "" })) : [{ day: 0, subject: "", body: "" }]); setScheduledAt(""); setAutoEnroll(true); setPreviewIndex(null); }
    function openProgram(id: string, snapshot = data) {
        const p = snapshot?.programs.find((p) => p.id === id);
        if (!p)
            return;
        setSelectedId(id);
        setProgramName(p.name);
        setProgramListId(p.listId);
        setSteps(p.steps.map((s) => ({ ...s })));
        setAutoEnroll(p.status === "draft" ? true : p.autoEnroll);
        setScheduledAt("");
        setPreviewIndex(null);
    }
    function switchTab(next: typeof tab) { setTab(next); setError(null); setMessage(null); if (next === "campaigns" || next === "sequences")
        newProgram(next === "sequences"); }
    const selected = data?.programs.find((p) => p.id === selectedId);
    const editable = !selected || selected.status === "draft";
    const history = data?.sends.filter((s) => s.programId === selectedId) ?? [];
    const enrollments = data?.enrollments.filter((s) => s.programId === selectedId) ?? [];
    const ready = data?.sender?.status === "verified" && data.configured;
    const programList = data?.lists.find((l) => l.id === programListId);
    const firstStep = steps[previewIndex ?? 0];
    if (!data)
        return <p role={error ? "alert" : "status"}>{error ?? "Cargando mailing…"}</p>;
    const tabs = [{ key: "campaigns" as const, title: "Campañas", icon: Mail }, { key: "sequences" as const, title: "Automatizaciones", icon: Workflow }, { key: "audience" as const, title: "Audiencia", icon: Users }, { key: "sender" as const, title: "Remitente y DNS", icon: Globe }];
    const subscriberName = (id: string) => data.subscribers.find((s) => s.id === id)?.email ?? "Suscriptor";
    return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Secciones de mailing" className="flex flex-wrap gap-2">{tabs.map((t) => <Button key={t.key} variant={tab === t.key ? "default" : "outline"} onClick={() => switchTab(t.key)} aria-current={tab === t.key ? "page" : undefined}><t.icon className="mr-2 h-4 w-4"/>{t.title}</Button>)}</nav><Button variant="ghost" aria-label="Actualizar mailing" onClick={() => void load().catch((e: Error) => setError(e.message))}><RefreshCw className="h-4 w-4"/></Button></div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm">{message}</p>}
    {!ready && tab !== "sender" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"><p>Configura y verifica el remitente para habilitar los envíos. Puedes preparar listas y borradores.</p><Button variant="outline" onClick={() => switchTab("sender")}>Configurar remitente</Button></div>}

    {tab === "sender" && <div className="space-y-5"><section className={panelClass}><h2 className="text-lg font-bold">Tu dirección de envío</h2><p className="mt-1 text-sm text-mute">Usa una dirección de un dominio que controles. Añade los registros en el proveedor donde administras su DNS.</p>
      {!data.configured && <p role="alert" className="mt-3 text-sm">El administrador de la instancia debe configurar Resend para gestionar dominios y enviar correos.</p>}
      {data.canConfigure ? <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run({ action: "configure", domain, fromEmail, fromName, trackOpens, trackClicks, ...(replyTo ? { replyTo } : {}) }, "Remitente guardado. Añade los registros DNS y comprueba la verificación.", "/api/mailing/sender"); }}>
        <label className="space-y-1 text-sm">Dominio de envío<Input aria-label="Dominio de envío" placeholder="correo.tuempresa.com" value={domain} onChange={(e) => setDomain(e.target.value)} required/></label>
        <label className="space-y-1 text-sm">Dirección de envío<Input aria-label="Dirección de envío" type="email" placeholder="hola@correo.tuempresa.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required/></label>
        <label className="space-y-1 text-sm">Nombre del remitente<Input aria-label="Nombre del remitente" value={fromName} onChange={(e) => setFromName(e.target.value)} required/></label>
        <label className="space-y-1 text-sm">Responder a (opcional)<Input aria-label="Responder a" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)}/></label>
        <div className="flex flex-wrap gap-4 text-sm md:col-span-2"><label className="flex gap-2"><input type="checkbox" checked={trackOpens} onChange={(e) => setTrackOpens(e.target.checked)}/>Medir aperturas</label><label className="flex gap-2"><input type="checkbox" checked={trackClicks} onChange={(e) => setTrackClicks(e.target.checked)}/>Medir clics</label></div>
        <div className="flex flex-wrap gap-2 md:col-span-2"><Button disabled={busy || !data.configured}>Guardar remitente</Button>{data.sender && <Button type="button" variant="outline" disabled={busy} onClick={() => void run({ action: "verify" }, "Estado de DNS actualizado.", "/api/mailing/sender")}>Comprobar DNS</Button>}<span className="self-center text-sm" data-testid="sender-status">{label(data.sender?.status ?? "not_started")}</span></div>
      </form> : <p className="mt-4 text-sm">El administrador de tu empresa configura el remitente.</p>}
      {data.sender?.lastError && <p role="alert" className="mt-3 text-sm text-destructive">{data.sender.lastError}</p>}
    </section>{data.sender && <section className={panelClass}><h2 className="text-lg font-bold">Registros DNS</h2><p className="mb-4 mt-1 text-sm text-mute">Copia los valores completos. La propagación puede tardar; vuelve a comprobar cuando hayas añadido los registros.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Tipo</th><th className="p-2">Nombre</th><th className="p-2">Valor</th><th className="p-2">Prioridad / TTL</th><th className="p-2">Estado</th></tr></thead><tbody>{data.sender.records.map((r, i) => <tr key={i} className="border-b"><td className="p-2">{r.type} · {r.record}</td><td className="p-2"><code>{r.name}</code></td><td className="max-w-xs break-all p-2"><code>{r.value}</code><Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(r.value).then(() => setMessage("Valor DNS copiado.")).catch(() => setError("No se pudo copiar; selecciona el valor del registro.")); }}>Copiar valor</Button></td><td className="p-2">{r.priority ?? "—"} / {r.ttl ?? "Auto"}</td><td className="p-2">{label(r.status ?? "pending")}</td></tr>)}</tbody></table></div></section>}</div>}

    {tab === "audience" && <div className="space-y-5"><section className={panelClass}><h2 className="text-lg font-bold">Listas de correo</h2><form className="mt-4 flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); void run({ action: "create_list", name: listName }, "Lista creada.").then((r) => { if (r) {
            setListId(r.result.id);
            setProgramListId(r.result.id);
            setListName("");
        } }); }}><Input className="max-w-xs" aria-label="Nombre de la lista" placeholder="Nombre de la lista" value={listName} onChange={(e) => setListName(e.target.value)} required/><Button disabled={busy}>Crear lista</Button></form><div className="mt-4 grid gap-3 sm:grid-cols-3">{data.lists.map((l) => <button key={l.id} onClick={() => setListId(l.id)} className={`rounded-xl border p-4 text-left ${listId === l.id ? "border-brand bg-brand/10" : "border-border"}`}><span className="font-bold">{l.name}</span><span className="mt-1 block text-sm text-mute">{l.members} contactos · {l.eligible} elegibles</span></button>)}</div></section>
      {listId && <section className={panelClass}><h2 className="text-lg font-bold">Añadir suscriptores a {data.lists.find((l) => l.id === listId)?.name}</h2><p className="mt-1 text-sm text-mute">Solo necesitas nombre y email. El permiso para email se registra por separado.</p>
        <label className="my-4 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}/>Estos contactos dieron permiso para recibir marketing por email.</label>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); void run({ action: "add_subscribers", listId, rows: [{ email: subEmail, name: subName, consent }] }, "Suscriptor añadido.").then((r) => { if (r) {
                setSubEmail("");
                setSubName("");
            } }); }}><Input aria-label="Nombre del suscriptor" placeholder="Nombre" value={subName} onChange={(e) => setSubName(e.target.value)} required/><Input aria-label="Email del suscriptor" type="email" placeholder="Email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required/><Button disabled={busy}>Añadir suscriptor</Button></form>
        <div className="mt-6 border-t pt-5"><label className="text-sm font-bold" htmlFor="mailing-import">Importar CSV o pegar contactos</label><p className="my-2 text-sm text-mute">Columnas: email, nombre. Admite coma, punto y coma o tabulador; hasta 5000 filas. Reimportar conserva las bajas.</p><input aria-label="Archivo CSV" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(e) => { const file = e.target.files?.[0]; if (file) {
                if (file.size > 2000000) {
                    setError("El archivo supera 2 MB");
                    return;
                }
                void file.text().then(setCsv);
            } }}/><Textarea className="my-3 min-h-28" id="mailing-import" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'email,nombre\nana@ejemplo.com,Ana'}/><Button variant="outline" disabled={busy || !csv.trim()} onClick={() => { try {
                const rows = parseMailingCsv(csv, consent);
                void run({ action: "add_subscribers", listId, rows }, `${rows.length} filas importadas sin duplicar emails.`).then((r) => { if (r)
                    setCsv(""); });
            }
            catch {
                setError("Revisa el CSV: cada fila necesita un email válido y un nombre de hasta 120 caracteres.");
            } }}>Importar contactos</Button></div>
      </section>}
      <section className={panelClass}><h2 className="mb-4 text-lg font-bold">Suscriptores</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Contacto</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr></thead><tbody>{data.subscribers.filter((s) => !listId || s.listIds.includes(listId)).map((s) => <tr key={s.id} className="border-b"><td className="p-2"><strong>{s.name}</strong><span className="block text-mute">{s.email}</span></td><td className="p-2">{s.unsubscribedAt ? "Baja" : s.suppressedAt ? `Suprimido: ${s.suppressionReason}` : eligibleSubscriber(s) ? "Con permiso" : "Sin permiso"}</td><td className="flex flex-wrap gap-2 p-2">{!s.unsubscribedAt && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ action: "unsubscribe_subscriber", subscriberId: s.id }, "Baja registrada.")}>Dar de baja</Button>}{!s.unsubscribedAt && !s.suppressedAt && <Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (s.consentAt || window.confirm("Confirma que este contacto dio permiso para recibir marketing por email."))
            void run({ action: "set_consent", subscriberId: s.id, consent: !s.consentAt }, "Permiso actualizado."); }}>{s.consentAt ? "Retirar permiso" : "Registrar permiso"}</Button>}{listId && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ action: "remove_member", subscriberId: s.id, listId }, "Contacto retirado de la lista.")}>Quitar de lista</Button>}</td></tr>)}</tbody></table></div></section>
    </div>}

    {(tab === "campaigns" || tab === "sequences") && <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className={`${panelClass} space-y-3`}><Button className="w-full" onClick={() => newProgram()}><Plus className="mr-2 h-4 w-4"/>{tab === "campaigns" ? "Nueva campaña" : "Nueva automatización"}</Button>{data.programs.filter((p) => p.kind === (tab === "campaigns" ? "campaign" : "sequence")).map((p) => <button key={p.id} className={`w-full rounded-xl border p-3 text-left ${selectedId === p.id ? "border-brand bg-brand/10" : "border-border"}`} onClick={() => openProgram(p.id)}><strong className="block">{p.name}</strong><span className="text-xs text-mute">{label(p.status)} · {p.steps.length} {p.kind === "sequence" ? "pasos" : "correo"}</span></button>)}{!data.programs.some((p) => p.kind === (tab === "campaigns" ? "campaign" : "sequence")) && <p className="text-sm text-mute">Empieza guardando un borrador.</p>}</aside>
      <div className="min-w-0 space-y-5"><section className={panelClass}><h2 className="text-lg font-bold">{selected ? selected.name : tab === "campaigns" ? "Crear campaña" : "Crear automatización"}</h2>{selected && <p className="mt-1 text-sm text-mute">{label(selected.status)}</p>}
        <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); void run(selectedId ? { action: "update_program", programId: selectedId, name: programName, listId: programListId, steps } : { action: "create_program", kind: tab === "campaigns" ? "campaign" : "sequence", name: programName, listId: programListId, steps }, "Borrador guardado.").then((r) => { if (r)
            openProgram(r.result.id ?? selectedId, r.fresh); }); }}>
          <label className="block space-y-1 text-sm">Nombre<Input aria-label="Nombre del programa" disabled={!editable} value={programName} onChange={(e) => setProgramName(e.target.value)} required maxLength={100}/></label>
          <label className="block space-y-1 text-sm">Lista<select aria-label="Lista del programa" disabled={!editable} className={selectClass} value={programListId} onChange={(e) => setProgramListId(e.target.value)} required><option value="">Selecciona una lista</option>{data.lists.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.eligible} elegibles</option>)}</select></label>
          {tab === "sequences" && <p className="rounded-xl bg-surface-2 p-3 text-sm">Los días se cuentan desde que cada contacto entra en la secuencia. Ejemplo: día 7 primer correo, día 14 segundo y día 21 tercero.</p>}
          {steps.map((s, i) => <fieldset key={i} className="space-y-3 rounded-xl border border-border p-4"><legend className="px-2 text-sm font-bold">{tab === "sequences" ? `Paso ${i + 1}` : "Contenido del correo"}</legend>{tab === "sequences" && <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm">Día desde inscripción<Input className="w-24" type="number" min={0} max={3650} aria-label={`Día paso ${i + 1}`} disabled={!editable} value={s.day} onChange={(e) => setSteps(steps.map((item, n) => n === i ? { ...item, day: Number(e.target.value) } : item))}/></label>{editable && steps.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setSteps(steps.filter((_, n) => n !== i))}>Quitar paso {i + 1}</Button>}</div>}
            <label className="block space-y-1 text-sm">Asunto<Input aria-label={`Asunto paso ${i + 1}`} disabled={!editable} value={s.subject} onChange={(e) => setSteps(steps.map((item, n) => n === i ? { ...item, subject: e.target.value } : item))} required maxLength={200}/></label>
            <label className="block space-y-1 text-sm">Contenido<Textarea className="min-h-36" aria-label={`Contenido paso ${i + 1}`} disabled={!editable} value={s.body} onChange={(e) => setSteps(steps.map((item, n) => n === i ? { ...item, body: e.target.value } : item))} required maxLength={20000}/></label>
            <p className="text-xs text-mute">Usa {"{{nombre}}"} para personalizar. El enlace de baja se añade automáticamente.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPreviewIndex(previewIndex === i ? null : i)}>Vista previa paso {i + 1}</Button>{selectedId && <Button type="button" variant="outline" size="sm" disabled={busy || !ready} onClick={() => void run({ action: "test_program", programId: selectedId, stepIndex: i }, `Prueba aceptada para ${data.operatorEmail}.`)}>Enviar prueba paso {i + 1}</Button>}</div>
          </fieldset>)}
          {tab === "sequences" && editable && steps.length < 20 && <Button type="button" variant="outline" onClick={() => setSteps([...steps, { day: (steps.at(-1)?.day ?? 0) + 7, subject: "", body: "" }])}>Añadir paso</Button>}
          {editable && <Button disabled={busy || !programListId}>Guardar borrador</Button>}
        </form>
        {previewIndex !== null && firstStep && <div className="mt-5"><h3 className="font-bold">{renderMail(firstStep, "Ana", "#baja").subject}</h3><iframe title="Vista previa del correo" className="mt-2 h-80 w-full rounded-xl border bg-white" sandbox="" srcDoc={renderMail(firstStep, "Ana", "#baja").html}/></div>}
      </section>
      {selected && <section className={`${panelClass} space-y-4`}><h2 className="text-lg font-bold">Envío y seguimiento</h2><p className="text-sm text-mute">Lista: {programList?.name} · {programList?.eligible ?? 0} contactos actualmente elegibles.</p>
        {selected.status === "draft" && <>{tab === "campaigns" ? <label className="block space-y-1 text-sm">Programar (opcional)<Input aria-label="Programar campaña" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}/></label> : <label className="flex gap-2 text-sm"><input type="checkbox" checked={autoEnroll} onChange={(e) => setAutoEnroll(e.target.checked)}/>Inscribir automáticamente nuevos contactos de esta lista</label>}<Button disabled={busy || !ready} onClick={() => { if (tab === "campaigns" && !window.confirm(`¿Confirmas ${scheduledAt ? "programar" : "enviar"} esta campaña a ${programList?.eligible ?? 0} destinatarios con permiso?`))
                return; void run({ action: "start_program", programId: selected.id, ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}), autoEnroll }, tab === "campaigns" ? "Campaña confirmada. Los envíos se procesarán en el ciclo de correo." : "Secuencia activada. Los días empiezan al inscribir cada contacto."); }}>{tab === "campaigns" ? scheduledAt ? "Programar campaña" : "Enviar campaña" : "Activar automatización"}</Button></>}
        <div className="flex flex-wrap gap-2">{["active", "scheduled"].includes(selected.status) && <Button variant="outline" disabled={busy} onClick={() => void run({ action: "pause_program", programId: selected.id }, "Programa pausado.")}>Pausar</Button>}{selected.status === "paused" && <Button variant="outline" disabled={busy || !ready} onClick={() => void run({ action: "resume_program", programId: selected.id }, "Programa reanudado.")}>Reanudar</Button>}{!["completed", "cancelled"].includes(selected.status) && <Button variant="outline" disabled={busy} onClick={() => { if (window.confirm("¿Cancelar los envíos pendientes de este programa?"))
                void run({ action: "cancel_program", programId: selected.id }, "Programa cancelado."); }}>Cancelar programa</Button>}<Button variant="outline" disabled={busy} onClick={() => void run({ action: "duplicate_program", programId: selected.id }, "Copia creada como borrador.").then((r) => { if (r)
                openProgram(r.result.id, r.fresh); })}>Duplicar</Button>{selected.kind === "sequence" && ["active", "paused"].includes(selected.status) && <Button variant="outline" disabled={busy || !ready} onClick={() => { if (window.confirm(`¿Inscribir los ${programList?.eligible ?? 0} contactos elegibles desde hoy? Las inscripciones anteriores conservan su reloj.`))
                void run({ action: "enroll_program", programId: selected.id }, "Contactos inscritos; no se reiniciaron inscripciones anteriores."); }}>Inscribir contactos existentes</Button>}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ name: "Aceptados", count: history.filter((s) => s.status === "accepted").length }, { name: "Entregados", count: history.filter((s) => s.deliveredAt).length }, { name: "Pendientes", count: history.filter((s) => s.status === "pending").length }, { name: "Con incidencias", count: history.filter((s) => ["failed", "uncertain"].includes(s.status) || s.outcome).length }].map((m) => <div key={m.name} className="rounded-xl bg-surface-2 p-3"><span className="text-xs text-mute">{m.name}</span><strong className="block text-2xl">{m.count}</strong></div>)}</div>
        {selected.kind === "sequence" && enrollments.length > 0 && <div><h3 className="mb-2 font-bold">Inscripciones</h3>{enrollments.map((en) => <div key={en.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"><span>{subscriberName(en.subscriberId)} · desde {date(en.startedAt)} · {en.stoppedAt ? "Detenida" : "Inscrito"}</span>{!en.stoppedAt && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ action: "stop_enrollment", enrollmentId: en.id }, "Inscripción detenida.")}>Detener inscripción</Button>}</div>)}</div>}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-bold">Historial de destinatarios</caption><thead><tr className="border-b"><th className="p-2">Email / paso</th><th className="p-2">Fecha prevista</th><th className="p-2">Estado</th><th className="p-2">Eventos / incidencia</th></tr></thead><tbody>{history.map((s) => <tr key={s.id} className="border-b"><td className="p-2">{subscriberName(s.subscriberId)} · {s.stepIndex + 1}</td><td className="p-2">{date(s.dueAt)}</td><td className="p-2">{s.outcome ? label(s.outcome) : s.deliveredAt ? "Entregado" : label(s.status)}</td><td className="p-2">{s.lastError ?? (s.clickedAt ? `Clic ${date(s.clickedAt)}` : s.openedAt ? `Apertura ${date(s.openedAt)}` : "—")}</td></tr>)}</tbody></table></div><p className="text-xs text-mute">Aceptado significa que el proveedor recibió el correo. Entregas, aperturas y clics se muestran cuando llegan eventos del proveedor.</p>
      </section>}
    </div></div>}
  </div>;
}
