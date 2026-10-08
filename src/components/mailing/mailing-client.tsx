"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, Plus, RefreshCw, Users, Workflow, Globe, CheckCircle2, Send, Clock3, Eye, X, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { eligibleSubscriber, parseMailingCsv, renderMail, type MailingAction, type MailingSnapshot, type MailingStep } from "@/lib/mailing";
const selectClass = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm";
const panelClass = "min-w-0 rounded-2xl border border-border bg-surface p-5";
const statusLabels: Record<string, string> = { draft: "Borrador", active: "En proceso", scheduled: "Programado", paused: "Pausado", completed: "Envío procesado", cancelled: "Cancelado", pending: "En espera", sending: "Enviando", accepted: "Aceptado por el proveedor", failed: "Fallido", uncertain: "Por confirmar", skipped: "Excluido", verified: "Verificado", not_started: "Pendiente de DNS", bounced: "Rebote", complained: "Queja" };
function label(status: string) { return statusLabels[status] ?? status; }
function date(value: string | null) { return value ? new Date(value).toLocaleString("es-CO") : "—"; }
export function MailingClient() {
    const [data, setData] = useState<MailingSnapshot | null>(null);
    const [tab, setTab] = useState<"campaigns" | "sequences" | "audience" | "sender">("campaigns");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [sendingTest, setSendingTest] = useState<number | null>(null);
    const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
    const [confirmSend, setConfirmSend] = useState(false);
    const [search, setSearch] = useState("");
    const [draftKind, setDraftKind] = useState<"campaign" | "sequence">("campaign");
    const confirmDialog = useRef<HTMLDialogElement>(null);
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
    useEffect(() => { const timer = setInterval(() => { if (!document.hidden) void load().catch(() => { }); }, 5000); return () => clearInterval(timer); }, [load]);
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
    function focusEditor() { requestAnimationFrame(() => document.getElementById("mailing-editor")?.scrollIntoView({ block: "start" })); }
    function newProgram(sequence = tab === "sequences") { setDraftKind(sequence ? "sequence" : "campaign"); setSelectedId(""); setProgramName(""); setProgramListId(data?.lists[0]?.id ?? ""); setSteps(sequence ? [7, 14, 21].map((day) => ({ day, subject: "", body: "" })) : [{ day: 0, subject: "", body: "" }]); setScheduledAt(""); setSendMode("now"); setAutoEnroll(true); setPreviewIndex(0); setConfirmSend(false); focusEditor(); }
    function openProgram(id: string, snapshot = data, focus = true) {
        const p = snapshot?.programs.find((p) => p.id === id);
        if (!p)
            return;
        setDraftKind(p.kind);
        setSelectedId(id);
        setProgramName(p.name);
        setProgramListId(p.listId);
        setSteps(p.steps.map((s) => ({ ...s })));
        setAutoEnroll(p.status === "draft" ? true : p.autoEnroll);
        setScheduledAt("");
        setSendMode("now");
        setPreviewIndex(0);
        setConfirmSend(false);
        if (focus) focusEditor();
    }
    function switchTab(next: typeof tab) { setTab(next); setSearch(""); setError(null); setMessage(null); if ((next === "campaigns" || next === "sequences") && draftKind !== (next === "sequences" ? "sequence" : "campaign"))
        newProgram(next === "sequences"); }
    useEffect(() => {
        if (confirmSend && !confirmDialog.current?.open) confirmDialog.current?.showModal();
        if (!confirmSend && confirmDialog.current?.open) confirmDialog.current.close();
    }, [confirmSend]);
    const selected = data?.programs.find((p) => p.id === selectedId);
    const editable = !selected || selected.status === "draft";
    const history = data?.sends.filter((s) => s.programId === selectedId) ?? [];
    const enrollments = data?.enrollments.filter((s) => s.programId === selectedId) ?? [];
    const ready = data?.sender?.status === "verified" && data.configured;
    const dirty = Boolean(selected && editable && (programName !== selected.name || programListId !== selected.listId || JSON.stringify(steps) !== JSON.stringify(selected.steps)));
    const programList = data?.lists.find((l) => l.id === programListId);
    const firstStep = steps[previewIndex ?? 0];
    const processed = history.filter((s) => ["accepted", "failed", "uncertain", "skipped"].includes(s.status)).length;
    const progress = history.length ? Math.round(processed / history.length * 100) : 0;
    const upcoming = history.filter((s) => s.status === "pending").sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    const deliveryReady = ready && !dirty && Boolean(selectedId) && (tab === "sequences" || Boolean(programList?.eligible));
    function waitReason(send: MailingSnapshot["sends"][number]) {
        if (send.lastError) return `${send.lastError}${send.nextAttemptAt ? ` · Reintento ${date(send.nextAttemptAt)}` : ""}`;
        if (selected?.status === "paused") return "Pausado; reanuda para continuar.";
        if (!ready && send.status === "pending") return "Falta verificar el remitente.";
        if (send.status === "pending" && new Date(send.dueAt).getTime() > Date.now()) return `Previsto para ${date(send.dueAt)}`;
        if (send.status === "pending") return "Esperando turno de envío; actualización automática.";
        if (send.status === "sending") return "Enviando al proveedor…";
        if (send.deliveredAt) return `Entregado ${date(send.deliveredAt)}`;
        if (send.status === "accepted") return `Aceptado ${date(send.acceptedAt)}; esperando confirmación de entrega.`;
        return "—";
    }
    if (!data)
        return <p role={error ? "alert" : "status"}>{error ?? "Cargando mailing…"}</p>;
    const tabs = [{ key: "campaigns" as const, title: "Campañas", icon: Mail }, { key: "sequences" as const, title: "Automatizaciones", icon: Workflow }, { key: "audience" as const, title: "Audiencia", icon: Users }, { key: "sender" as const, title: "Remitente y DNS", icon: Globe }];
    const visiblePrograms = data.programs.filter((p) => p.kind === (tab === "campaigns" ? "campaign" : "sequence") && p.name.toLowerCase().includes(search.toLowerCase()));
    const subscriberName = (id: string) => data.subscribers.find((s) => s.id === id)?.email ?? "Suscriptor";
    return <div className="mx-auto max-w-6xl space-y-5">
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-2 shadow-sm"><nav aria-label="Secciones de mailing" className="flex flex-wrap gap-2">{tabs.map((t) => <Button key={t.key} variant={tab === t.key ? "default" : "outline"} onClick={() => switchTab(t.key)} aria-current={tab === t.key ? "page" : undefined}><t.icon className="mr-2 h-4 w-4"/>{t.title}</Button>)}</nav><Button variant="ghost" aria-label="Actualizar mailing" onClick={() => void load().catch((e: Error) => setError(e.message))}><RefreshCw className="h-4 w-4"/></Button></div>
    {error && !confirmSend && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm">{message}</p>}
    {!ready && tab !== "sender" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"><p>Configura y verifica el remitente para habilitar los envíos. Puedes preparar listas y borradores.</p><Button variant="outline" onClick={() => switchTab("sender")}>Configurar remitente</Button></div>}

    {tab === "sender" && <div className="space-y-5"><section className={panelClass}><h2 className="text-lg font-bold">Tu dirección de envío</h2><p className="mt-1 text-sm text-mute">Usa una dirección de un dominio que controles. Esta dirección se usa únicamente para Mailing. Los avisos y la recuperación de contraseña conservan su remitente actual. Añade los registros de envío sin reemplazar la configuración de tu correo existente.</p>
      {!data.configured && <p role="alert" className="mt-3 text-sm">El administrador de la instancia debe configurar Resend para gestionar dominios y enviar correos.</p>}
      {data.canConfigure ? <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run({ action: "configure", domain, fromEmail, fromName, trackOpens, trackClicks, ...(replyTo ? { replyTo } : {}) }, "Remitente guardado. Añade los registros DNS y comprueba la verificación.", "/api/mailing/sender"); }}>
        <label className="space-y-1 text-sm">Dominio de envío<Input aria-label="Dominio de envío" placeholder="correo.tuempresa.com" value={domain} onChange={(e) => setDomain(e.target.value)} required/></label>
        <label className="space-y-1 text-sm">Dirección de envío<Input aria-label="Dirección de envío" type="email" placeholder="hola@correo.tuempresa.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required/></label>
        <label className="space-y-1 text-sm">Nombre del remitente<Input aria-label="Nombre del remitente" value={fromName} onChange={(e) => setFromName(e.target.value)} required/></label>
        <label className="space-y-1 text-sm">Responder a (opcional)<Input aria-label="Responder a" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)}/></label>
        <div className="flex flex-wrap gap-4 text-sm md:col-span-2"><label className="flex gap-2"><input type="checkbox" disabled={Boolean(data.sender && data.sender.domain === domain && !data.sender.canConfigureTracking)} checked={trackOpens} onChange={(e) => setTrackOpens(e.target.checked)}/>Medir aperturas</label><label className="flex gap-2"><input type="checkbox" disabled={Boolean(data.sender && data.sender.domain === domain && !data.sender.canConfigureTracking)} checked={trackClicks} onChange={(e) => setTrackClicks(e.target.checked)}/>Medir clics</label></div>
        {data.sender && data.sender.domain === domain && !data.sender.canConfigureTracking && <p className="text-sm text-mute md:col-span-2">Las métricas actuales de este dominio se conservan; usa un subdominio dedicado si quieres ajustarlas solo para Mailing.</p>}
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

    {(tab === "campaigns" || tab === "sequences") && <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className={`${panelClass} space-y-4`} aria-label="Programas guardados">
        <div className="hidden lg:block"><h2 className="font-bold">{tab === "campaigns" ? "Tus campañas" : "Tus automatizaciones"}</h2><p className="mt-1 text-xs text-mute">{tab === "campaigns" ? "Un correo a una lista de contactos." : "Una serie de correos a lo largo del tiempo."}</p></div>
        <label className="block space-y-2 text-sm lg:hidden">{tab === "campaigns" ? "Abrir campaña" : "Abrir automatización"}<select className={selectClass} aria-label="Abrir programa" value={selectedId} onChange={(e) => e.target.value ? openProgram(e.target.value) : newProgram()}><option value="">Nuevo borrador</option>{data.programs.filter((p) => p.kind === (tab === "campaigns" ? "campaign" : "sequence")).map((p) => <option key={p.id} value={p.id}>{p.name} · {label(p.status)}</option>)}</select></label>
        <Button className="w-full" onClick={() => newProgram()}><Plus className="mr-2 h-4 w-4"/>{tab === "campaigns" ? "Nueva campaña" : "Nueva automatización"}</Button>
        {data.programs.length > 0 && <Input className="hidden lg:block" aria-label="Buscar programas" placeholder="Buscar por nombre…" value={search} onChange={(e) => setSearch(e.target.value)}/>}
        <div className="hidden max-h-[65vh] space-y-2 overflow-y-auto lg:block">{visiblePrograms.map((p) => <button key={p.id} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId === p.id ? "border-brand bg-brand/10" : "border-border hover:bg-surface-2"}`} onClick={() => openProgram(p.id)}><strong className="block break-words">{p.name}</strong><span className="mt-2 inline-block rounded-md bg-surface-2 px-2 py-1 text-xs">{p.kind === "sequence" && p.status === "active" ? "Activa" : label(p.status)}</span><span className="mt-2 block text-xs text-mute">{data.lists.find((l) => l.id === p.listId)?.name} · {p.kind === "sequence" ? `${p.steps.length} pasos` : "1 correo"}</span></button>)}</div>
        {!visiblePrograms.length && <p className="hidden text-sm text-mute lg:block">{search ? "No hay resultados con ese nombre." : "Crea tu primer borrador. Podrás revisarlo antes de enviar."}</p>}
      </aside>
      <div className="min-w-0 space-y-5">
        <section id="mailing-editor" className={`${panelClass} scroll-mt-40 sm:scroll-mt-24`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{selected ? selected.name : tab === "campaigns" ? "Crear campaña" : "Crear automatización"}</h2><p className="mt-1 text-sm text-mute">{editable ? "Elige a quién escribes, prepara el correo y revisa el envío." : "El contenido está guardado. Puedes duplicarlo para crear otra versión."}</p></div><span className="rounded-full border border-border px-3 py-1 text-xs">{selected ? selected.kind === "sequence" && selected.status === "active" ? "Activa" : label(selected.status) : "Nuevo borrador"}</span></div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-mute" aria-label="Pasos de preparación">{["Destinatarios", "Contenido", "Revisar y enviar"].map((name, i) => <a key={name} href={`#mailing-step-${i + 1}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-foreground">{i + 1}</span>{name}</a>)}</div>
          <form className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); void run(selectedId ? { action: "update_program", programId: selectedId, name: programName, listId: programListId, steps } : { action: "create_program", kind: tab === "campaigns" ? "campaign" : "sequence", name: programName, listId: programListId, steps }, "Borrador guardado. Revisa la vista previa y el envío.").then((r) => { if (r) openProgram(r.result.id ?? selectedId, r.fresh, false); }); }}>
            <div id="mailing-step-1" className="scroll-mt-40 sm:scroll-mt-24 space-y-4"><h3 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-brand"/>1. Destinatarios</h3>
              <div className="grid gap-4 md:grid-cols-2"><label className="block space-y-1 text-sm">Nombre de {tab === "campaigns" ? "la campaña" : "la automatización"}<Input aria-label="Nombre del programa" placeholder={tab === "campaigns" ? "Ej. Novedades de octubre" : "Ej. Bienvenida a nuevos clientes"} disabled={!editable} value={programName} onChange={(e) => setProgramName(e.target.value)} required maxLength={100}/></label><label className="block space-y-1 text-sm">Lista de contactos<select aria-label="Lista del programa" disabled={!editable} className={selectClass} value={programListId} onChange={(e) => setProgramListId(e.target.value)} required><option value="">Selecciona una lista</option>{data.lists.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.eligible} con permiso</option>)}</select></label></div>
              {programList ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm"><span><strong>{programList.eligible}</strong> contactos con permiso · {programList.members - programList.eligible} excluidos de esta lista</span><Button type="button" size="sm" variant="ghost" onClick={() => switchTab("audience")}>Ver contactos<ArrowRight className="ml-2 h-3 w-3"/></Button></div> : <div className="rounded-xl border border-dashed border-border p-4 text-sm"><p>Crea una lista y añade tus contactos para continuar.</p><Button type="button" className="mt-3" variant="outline" onClick={() => switchTab("audience")}>Crear mi lista de contactos</Button></div>}
            </div>
            <div id="mailing-step-2" className="scroll-mt-40 sm:scroll-mt-24 border-t border-border pt-6"><h3 className="mb-4 flex items-center gap-2 font-bold"><Mail className="h-4 w-4 text-brand"/>2. Contenido del correo</h3>
              {tab === "sequences" && <p className="mb-4 rounded-xl bg-surface-2 p-3 text-sm">Los días se cuentan desde que cada contacto entra en la secuencia: día 7, día 14, día 21… El día 0 se envía al inscribirlo.</p>}
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"><div className="min-w-0 space-y-4">
                {steps.map((s, i) => <fieldset key={i} className="min-w-0 space-y-3 rounded-xl border border-border p-4"><legend className="px-2 text-sm font-bold">{tab === "sequences" ? `Paso ${i + 1}` : "Tu mensaje"}</legend>{tab === "sequences" && <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">Día desde inscripción<Input className="w-24" type="number" min={0} max={3650} aria-label={`Día paso ${i + 1}`} disabled={!editable} value={s.day} onChange={(e) => setSteps(steps.map((item, n) => n === i ? { ...item, day: Number(e.target.value) } : item))}/></label>{editable && steps.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setSteps(steps.filter((_, n) => n !== i))}>Quitar paso {i + 1}</Button>}</div>}
                  <label className="block space-y-1 text-sm">Asunto<Input aria-label={`Asunto paso ${i + 1}`} placeholder="Lo que verán en su bandeja de entrada" disabled={!editable} value={s.subject} onChange={(e) => setSteps(steps.map((item, n) => n === i ? { ...item, subject: e.target.value } : item))} required maxLength={200}/></label>
                  <label className="block space-y-1 text-sm">Mensaje<Textarea className="min-h-44" aria-label={`Contenido paso ${i + 1}`} placeholder="Hola {{nombre}},…" disabled={!editable} value={s.body} onFocus={() => setPreviewIndex(i)} onChange={(e) => setSteps(steps.map((item, n) => n === i ? { ...item, body: e.target.value } : item))} required maxLength={20000}/></label>
                  <p className="text-xs text-mute">Escribe {"{{nombre}}"} para personalizar. Incluimos el enlace de baja al final.</p>
                  <div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => { setPreviewIndex(i); document.getElementById("mailing-preview")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }}><Eye className="mr-2 h-4 w-4"/>{tab === "campaigns" ? "Vista previa" : `Vista previa paso ${i + 1}`}</Button>{selectedId && <Button type="button" variant="outline" size="sm" disabled={busy || !ready || dirty} onClick={() => { setSendingTest(i); void run({ action: "test_program", programId: selectedId, stepIndex: i }, `Prueba aceptada para ${data.operatorEmail}. El proveedor recibió el correo; la llegada a tu buzón puede tardar.`).finally(() => setSendingTest(null)); }}>{sendingTest === i ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Enviando prueba…</> : <>{tab === "campaigns" ? "Enviar prueba" : `Enviar prueba paso ${i + 1}`}</>}</Button>}</div>
                </fieldset>)}
                {tab === "sequences" && editable && steps.length < 20 && <Button type="button" variant="outline" onClick={() => setSteps([...steps, { day: (steps.at(-1)?.day ?? 0) + 7, subject: "", body: "" }])}><Plus className="mr-2 h-4 w-4"/>Añadir paso</Button>}
              </div><div id="mailing-preview" className="min-w-0 rounded-xl border border-border bg-surface-2 p-3 xl:sticky xl:top-6"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><Eye className="h-4 w-4"/>Vista previa{tab === "sequences" ? ` · paso ${(previewIndex ?? 0) + 1}` : ""}</div><div className="rounded-t-lg border border-border bg-white p-3 text-sm text-slate-800"><p className="truncate text-xs text-slate-500">De: {data.sender?.fromName || "Tu empresa"} · {data.sender?.fromEmail || "Configura tu remitente"}</p><strong className="mt-2 block break-words">{firstStep?.subject ? renderMail(firstStep, "Ana", "#baja").subject : "El asunto aparecerá aquí"}</strong></div><iframe title="Vista previa del correo" className="h-80 w-full rounded-b-lg bg-white" sandbox="" srcDoc={renderMail(firstStep ?? { day: 0, subject: "", body: "Escribe tu mensaje para verlo aquí." }, "Ana", "#baja").html}/><p className="mt-2 text-xs text-mute">Ejemplo con el nombre Ana. La prueba irá a {data.operatorEmail}.</p></div></div>
            </div>
            {editable && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-4"><span className="text-sm text-mute">{dirty ? "Tienes cambios sin guardar. Guarda antes de probar o enviar." : selected ? "Borrador guardado. Continúa a la revisión del envío." : "Guarda este borrador para enviar una prueba y revisarlo."}</span><Button disabled={busy || !programListId}>{busy ? "Guardando…" : "Guardar borrador"}</Button></div>}
          </form>
        </section>
        <section id="mailing-step-3" className={`${panelClass} scroll-mt-40 sm:scroll-mt-24 space-y-5`}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Send className="h-4 w-4 text-brand"/>3. {editable ? "Revisar y enviar" : "Envío y seguimiento"}</h2>
          {!selected ? <p className="text-sm text-mute">Guarda el borrador para revisar los destinatarios, enviar una prueba y confirmar.</p> : <>
            {selected.status === "draft" ? <>
              <dl className="grid gap-4 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-3"><div><dt className="text-mute">Remitente</dt><dd className="mt-1 break-all font-medium">{data.sender?.fromEmail ?? "Sin configurar"}</dd></div><div><dt className="text-mute">Destinatarios</dt><dd className="mt-1 font-medium">{programList?.name} · {programList?.eligible ?? 0} con permiso</dd></div><div><dt className="text-mute">Correo</dt><dd className="mt-1 font-medium">{selected.kind === "sequence" ? `${selected.steps.length} pasos` : selected.steps[0]?.subject}</dd></div></dl>
              {tab === "campaigns" ? <fieldset className="space-y-3"><legend className="mb-3 text-sm font-bold">¿Cuándo quieres enviarlo?</legend><div className="grid gap-3 sm:grid-cols-2">{[{ value: "now" as const, title: "Enviar ahora", text: "El envío comienza al confirmar.", icon: Send }, { value: "schedule" as const, title: "Programar para después", text: "Elige la fecha y hora de inicio.", icon: Clock3 }].map((option) => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${sendMode === option.value ? "border-brand bg-brand/5" : "border-border"}`}><input className="mt-1" type="radio" name="mailing-send-mode" value={option.value} checked={sendMode === option.value} onChange={() => setSendMode(option.value)}/><span><span className="flex items-center gap-2 text-sm font-bold"><option.icon className="h-4 w-4"/>{option.title}</span><span className="mt-1 block text-xs text-mute">{option.text}</span></span></label>)}</div>{sendMode === "schedule" && <label className="block space-y-2 text-sm">Fecha y hora de inicio<Input className="max-w-sm" aria-label="Programar campaña" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required/><span className="block text-xs text-mute">Tu zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Se comprueba cada minuto a partir de esta hora.</span></label>}</fieldset> : <label className="flex items-start gap-2 rounded-xl bg-surface-2 p-4 text-sm"><input className="mt-1" type="checkbox" aria-label="Inscribir automáticamente nuevos contactos de esta lista" checked={autoEnroll} onChange={(e) => setAutoEnroll(e.target.checked)}/><span>Inscribir automáticamente los nuevos contactos de esta lista<span className="mt-1 block text-xs text-mute">Los contactos actuales se inscriben con el botón «Inscribir contactos existentes» después de activar.</span></span></label>}
              {(!ready || dirty || (tab === "campaigns" && !programList?.eligible)) && <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">{dirty ? "Guarda los cambios para enviar el contenido que estás viendo." : !ready ? "Verifica el remitente para poder enviar." : "Añade contactos con permiso a esta lista antes de enviar."}</p>}
              <Button className="w-full sm:w-auto" disabled={busy || !deliveryReady} onClick={() => { if (sendMode === "schedule" && tab === "campaigns" && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) { setError("Elige una fecha y hora futura para programar."); return; } setError(null); setConfirmSend(true); }}><Send className="mr-2 h-4 w-4"/>{tab === "sequences" ? "Revisar activación" : sendMode === "schedule" ? "Revisar programación" : "Revisar envío"}</Button>
            </> : <>
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4"><div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 text-brand"/>{selected.status === "scheduled" ? `Programada para ${date(selected.scheduledAt)}` : selected.status === "paused" ? "Envío pausado" : selected.status === "cancelled" ? "Envío cancelado" : selected.kind === "sequence" ? "Automatización activa" : selected.status === "completed" ? "Procesamiento finalizado" : "El envío está en proceso"}</div><p className="mt-2 text-sm text-mute">{selected.status === "scheduled" ? "Comenzará a partir de esta hora; comprobamos los envíos programados cada minuto." : selected.status === "paused" ? "Las fechas se conservan. Reanuda cuando quieras continuar." : selected.kind === "sequence" ? `Cada contacto tiene su propio calendario desde la inscripción.${upcoming ? ` Próximo paso: ${date(upcoming.dueAt)}.` : " Inscribe contactos para iniciar su calendario."}` : "La aceptación del proveedor y la entrega al buzón se muestran por separado. Los estados se actualizan automáticamente."}</p></div>
              {history.length > 0 && <div><div className="mb-2 flex justify-between text-xs text-mute"><span>{processed} de {history.length} envíos procesados</span><span>{progress}%</span></div><div role="progressbar" aria-label="Progreso de los envíos" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }}/></div></div>}
            </>}
            <div className="flex flex-wrap gap-2">{["active", "scheduled"].includes(selected.status) && <Button variant="outline" disabled={busy} onClick={() => void run({ action: "pause_program", programId: selected.id }, "Programa pausado.")}>Pausar</Button>}{selected.status === "paused" && <Button variant="outline" disabled={busy || !ready} onClick={() => void run({ action: "resume_program", programId: selected.id }, "Programa reanudado. El envío continúa.")}>Reanudar</Button>}{!["completed", "cancelled", "draft"].includes(selected.status) && <Button variant="ghost" disabled={busy} onClick={() => { if (window.confirm("¿Cancelar los envíos pendientes de este programa?")) void run({ action: "cancel_program", programId: selected.id }, "Programa cancelado."); }}>Cancelar programa</Button>}<Button variant="outline" disabled={busy} onClick={() => void run({ action: "duplicate_program", programId: selected.id }, "Copia creada como borrador.").then((r) => { if (r) openProgram(r.result.id, r.fresh); })}>Duplicar</Button>{selected.kind === "sequence" && ["active", "paused"].includes(selected.status) && <Button variant="outline" disabled={busy || !ready} onClick={() => { if (window.confirm(`¿Inscribir los ${programList?.eligible ?? 0} contactos con permiso desde hoy? Las inscripciones anteriores conservan su reloj.`)) void run({ action: "enroll_program", programId: selected.id }, "Contactos inscritos; no se reiniciaron inscripciones anteriores."); }}>Inscribir contactos existentes</Button>}</div>
            {selected.status !== "draft" && <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ name: "Aceptados por el proveedor", count: history.filter((s) => s.status === "accepted").length }, { name: "Entregados al buzón", count: history.filter((s) => s.deliveredAt).length }, { name: "En espera o enviando", count: history.filter((s) => ["pending", "sending"].includes(s.status)).length }, { name: "Con incidencias", count: history.filter((s) => ["failed", "uncertain"].includes(s.status) || s.outcome).length }].map((m) => <div key={m.name} className="rounded-xl bg-surface-2 p-3"><span className="text-xs text-mute">{m.name}</span><strong className="mt-1 block text-2xl">{m.count}</strong></div>)}</div>
              {selected.kind === "sequence" && enrollments.length > 0 && <div><h3 className="mb-2 font-bold">Contactos inscritos</h3>{enrollments.map((en) => <div key={en.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm"><span>{subscriberName(en.subscriberId)} · desde {date(en.startedAt)} · {en.stoppedAt ? "Detenida" : "Inscrito"}</span>{!en.stoppedAt && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ action: "stop_enrollment", enrollmentId: en.id }, "Inscripción detenida.")}>Detener inscripción</Button>}</div>)}</div>}
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-bold">Historial de destinatarios</caption><thead><tr className="border-b border-border"><th className="p-2">Email / paso</th><th className="p-2">Fecha prevista</th><th className="p-2">Estado</th><th className="p-2">Detalle</th></tr></thead><tbody>{history.map((s) => <tr key={s.id} className="border-b border-border"><td className="p-2">{subscriberName(s.subscriberId)} · {s.stepIndex + 1}</td><td className="p-2">{date(s.dueAt)}</td><td className="p-2">{s.outcome ? label(s.outcome) : s.deliveredAt ? "Entregado" : s.status === "pending" && new Date(s.dueAt).getTime() > Date.now() ? "Programado" : label(s.status)}</td><td className="min-w-48 p-2 text-mute">{s.clickedAt ? `Clic ${date(s.clickedAt)}` : s.openedAt ? `Apertura ${date(s.openedAt)}` : waitReason(s)}</td></tr>)}</tbody></table></div>
            </>}
          </>}
        </section>
      </div>
    </div>}
    <dialog aria-labelledby="mailing-confirm-title" ref={confirmDialog} onCancel={() => setConfirmSend(false)} onClose={() => setConfirmSend(false)} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/70">
      <div className="p-6"><div className="flex items-center justify-between gap-4"><h2 id="mailing-confirm-title" className="text-xl font-bold">{tab === "sequences" ? "Confirmar automatización" : sendMode === "schedule" ? "Confirmar programación" : "Confirmar envío"}</h2><Button variant="ghost" size="icon" aria-label="Cerrar confirmación" onClick={() => setConfirmSend(false)}><X className="h-4 w-4"/></Button></div><p className="mt-3 text-sm text-mute">{tab === "sequences" ? "Activa los pasos guardados. Cada contacto tendrá su calendario desde la inscripción." : sendMode === "schedule" ? `Iniciará a partir del ${date(scheduledAt)}.` : "El envío comienza al confirmar. La llegada al buzón depende del servicio de correo del destinatario."}</p>{error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<dl className="my-5 space-y-3 rounded-xl bg-surface-2 p-4 text-sm"><div><dt className="text-mute">Desde</dt><dd className="break-all font-medium">{data.sender?.fromName} · {data.sender?.fromEmail}</dd></div><div><dt className="text-mute">Lista</dt><dd className="font-medium">{programList?.name} · {programList?.eligible ?? 0} contactos con permiso</dd></div><div><dt className="text-mute">Contenido guardado</dt><dd className="font-medium">{selected?.steps[0]?.subject}{tab === "sequences" ? ` · ${steps.length} pasos` : ""}</dd></div></dl><div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setConfirmSend(false)}>Volver a revisar</Button><Button disabled={busy || !deliveryReady} onClick={() => { if (!selected) return; void run({ action: "start_program", programId: selected.id, ...(tab === "campaigns" && sendMode === "schedule" ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}), autoEnroll }, tab === "sequences" ? "Secuencia activada. Los días empiezan al inscribir cada contacto." : sendMode === "schedule" ? "Campaña programada para la fecha elegida." : "Campaña confirmada. El envío comienza ahora.").then((r) => { if (r) setConfirmSend(false); }); }}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Confirmando…</> : tab === "sequences" ? "Activar automatización" : sendMode === "schedule" ? "Programar campaña" : "Enviar ahora"}</Button></div></div>
    </dialog>
  </div>;
}
