import { chromium, request } from "playwright";
import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Este self-test solo usa localhost y mocks");
const stamp = `${Date.now()}`;
const mailingDomain = `mailing-${stamp}.example.test`;
const ownerEmail = "mailing028@seomos.test";
const password = "Mailing028-LocalTest!";
const sweepSecret = "mailing028-test-sweep";
const webhookSecret = "whsec_dGVzdC1tYWlsaW5nLXNpZ25pbmcta2V5LTAyOA==";
const artifacts = path.resolve(".artifacts/us37-mailing");
await mkdir(artifacts, { recursive: true });
let passed = 0;
function assert(condition, message, detail = "") { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); passed++; console.log(`  ✅ ${message}`); }
async function json(response) { return response.json().catch(() => ({})); }
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1080 } });
const page = await context.newPage(); const publicApi = await request.newContext({ baseURL }); const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("dialog", (dialog) => dialog.accept());
async function state(api = context.request) { const response = await api.get("/api/mailing"); assert(response.ok(), "estado de mailing disponible"); return json(response); }
async function action(input, api = context.request) { const response = await api.post("/api/mailing", { data: input }); const body = await json(response); assert(response.ok(), `${input.action} responde`, body.error?.message); return body; }
async function sweep(now = new Date(), api = publicApi) { const response = await api.post(`/api/cron/sweep?now=${now.toISOString()}`, { headers: { authorization: `Bearer ${sweepSecret}` } }); const body = await json(response); assert(response.ok() && !body.mailing?.error, "ciclo de mailing disponible", JSON.stringify(body.mailing)); return body.mailing; }
async function outbox() { return (await json(await publicApi.get("/api/dev/resend-mock"))).outbox ?? []; }
async function mock(input) { assert((await publicApi.post("/api/dev/resend-mock", { data: input })).ok(), "mock configurado"); }
async function waitStatus(message) { await page.getByRole("status").filter({ hasText: message }).waitFor(); }
async function reload() { await page.getByRole("button", { name: "Actualizar mailing", exact: true }).click(); }
async function createProgram(kind, listId, prefix, days = [0]) { return (await action({ action: "create_program", kind, name: prefix, listId, steps: days.map((day, i) => ({ day, subject: `${prefix} ${["X", "Y", "Z"][i] ?? i} {{nombre}}`, body: `Mensaje ${i + 1} para {{nombre}}.\nhttps://example.test` })) })).id; }

try {
  let login = await context.request.post("/api/auth/sign-in/email", { data: { email: ownerEmail, password } });
  if (!login.ok()) login = await context.request.post("/api/auth/sign-up/email", { data: { name: "Admin Mailing", email: ownerEmail, password } });
  assert(login.ok(), "administrador entra sin conectar WhatsApp");
  const companies = await json(await context.request.get("/api/admin/companies"));
  const ownId = companies.ownOrganizationId;
  assert(Boolean(ownId), "superadmin obtiene empresas y su organización");
  const toggle = (enabled, id = ownId, api = context.request) => api.patch(`/api/admin/companies/${id}/mailing`, { data: { enabled } });
  assert((await toggle(false)).ok(), "superadmin deshabilita Mailing");
  assert((await context.request.get("/api/mailing")).status() === 404, "empresa deshabilitada no obtiene API de Mailing");
  assert((await context.request.post("/api/mailing", { data: { action: "create_list", name: "Oculta" } })).status() === 404, "empresa deshabilitada no modifica Mailing");
  assert((await context.request.post("/api/mailing/sender", { data: { action: "verify" } })).status() === 404, "empresa deshabilitada no configura remitente");
  await page.goto("/mailing"); await page.waitForURL("**/inbox");
  assert(await page.getByRole("link", { name: "Mailing", exact: true }).count() === 0, "URL bloqueada y navegación oculta mientras está deshabilitada");
  await page.goto("/companies");
  const ownCompany = companies.companies.find((c) => c.id === ownId);
  const ownSwitch = page.getByRole("switch", { name: `Mailing para ${ownCompany.name}`, exact: true });
  await ownSwitch.waitFor(); assert(await ownSwitch.getAttribute("aria-checked") === "false", "Empresas muestra Mailing inactivo");
  await ownSwitch.click(); await waitStatus("Mailing habilitado para");
  assert(await ownSwitch.getAttribute("aria-checked") === "true", "superadmin habilita Mailing desde Empresas");
  await page.getByRole("link", { name: "Mailing", exact: true }).first().waitFor();
  await page.screenshot({ path: path.join(artifacts, "companies.png"), fullPage: true });
  const initial = await state();
  await publicApi.delete("/api/dev/resend-mock");
  if (initial.sender) await publicApi.post("/api/dev/resend-mock/domains", { headers: { authorization: "Bearer re_test" }, data: { name: initial.sender.domain } });
  const existingDomain = `existente-${stamp}.example.test`;
  const preexisting = await publicApi.post("/api/dev/resend-mock/domains", { headers: { authorization: "Bearer re_test" }, data: { name: existingDomain } });
  const preexistingId = (await json(preexisting)).id;
  assert(preexisting.ok(), "dominio preexistente preparado en proveedor");
  const importedDomain = await context.request.post("/api/mailing/sender", { data: { action: "configure", domain: existingDomain, fromEmail: `hola@${existingDomain}`, fromName: "Seomos" } });
  assert(importedDomain.ok(), "superadmin reutiliza dominio preexistente sin registro duplicado");
  const sharedState = await state();
  assert(sharedState.sender.canConfigureTracking === false, "dominio preexistente conserva configuración compartida");
  await context.request.post("/api/mailing/sender", { data: { action: "verify" } });
  const sharedProvider = await json(await publicApi.get("/api/dev/resend-mock"));
  assert(!(sharedProvider.domainMutations ?? []).some((m) => m.id === preexistingId), "configurar/verificar dominio existente no modifica proveedor");
  await mock({ domainVerified: false });
  await page.goto("/mailing"); await page.getByRole("heading", { name: "Mailing", exact: true }).waitFor();
  await page.getByRole("button", { name: "Remitente y DNS", exact: true }).click();
  await page.getByLabel("Dominio de envío", { exact: true }).fill(mailingDomain);
  await page.getByLabel("Dirección de envío", { exact: true }).fill(`hola@${mailingDomain}`);
  await page.getByLabel("Nombre del remitente", { exact: true }).fill("Mi Empresa");
  await page.getByLabel("Responder a", { exact: true }).fill("respuestas@example.test");
  await page.getByLabel("Medir aperturas", { exact: true }).check(); await page.getByLabel("Medir clics", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar remitente", exact: true }).click(); await waitStatus("Remitente guardado");
  assert(await page.getByRole("heading", { name: "Registros DNS", exact: true }).isVisible(), "UI muestra registros DNS reales del mock");
  assert(await page.getByText("mock-dkim-not-for-production", { exact: true }).isVisible(), "registro DKIM observable");
  const invalid = await context.request.post("/api/mailing/sender", { data: { action: "configure", domain: mailingDomain, fromEmail: "hola@ajeno.test", fromName: "Mi Empresa" } });
  assert(invalid.status() === 422, "remitente ajeno al dominio rechazado");

  await page.getByRole("button", { name: "Audiencia", exact: true }).click();
  await page.getByLabel("Nombre de la lista", { exact: true }).fill(`Clientes ${stamp}`); await page.getByRole("button", { name: "Crear lista", exact: true }).click(); await waitStatus("Lista creada");
  const list = (await state()).lists.find((l) => l.name === `Clientes ${stamp}`); assert(Boolean(list), "lista guardada desde UI");
  await page.getByLabel("Estos contactos dieron permiso para recibir marketing por email.", { exact: true }).check();
  await page.getByLabel("Nombre del suscriptor", { exact: true }).fill("Ana"); await page.getByLabel("Email del suscriptor", { exact: true }).fill(`ana-${stamp}@example.test`);
  await page.getByRole("button", { name: "Añadir suscriptor", exact: true }).click(); await waitStatus("Suscriptor añadido");
  await page.getByLabel("Importar CSV o pegar contactos", { exact: true }).fill(`email,nombre\nbob-${stamp}@example.test,Bob\ncarla-${stamp}@example.test,"Carla, Pérez"\nANA-${stamp}@example.test,Ana`);
  await page.getByRole("button", { name: "Importar contactos", exact: true }).click(); await waitStatus("filas importadas");
  let snapshot = await state();
  assert(snapshot.subscribers.filter((s) => s.listIds.includes(list.id)).length === 3, "importación deduplica por email normalizado sin teléfono");
  await action({ action: "add_subscribers", listId: list.id, rows: [{ email: `sinpermiso-${stamp}@example.test`, name: "Sin permiso", consent: false }] });

  await page.getByRole("button", { name: "Campañas", exact: true }).click();
  await page.getByLabel("Nombre del programa", { exact: true }).fill(`Campaña ${stamp}`); await page.getByLabel("Lista del programa", { exact: true }).selectOption(list.id);
  await page.getByLabel("Asunto paso 1", { exact: true }).fill(`Oferta ${stamp} {{nombre}}`); await page.getByLabel("Contenido paso 1", { exact: true }).fill("Hola {{nombre}}, conoce nuestra oferta.\nhttps://example.test/oferta");
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click(); await waitStatus("Borrador guardado");
  snapshot = await state(); const campaign = snapshot.programs.find((p) => p.name === `Campaña ${stamp}`);
  assert(Boolean(campaign), "borrador creado desde UI");
  assert(await page.getByRole("button", { name: "Enviar campaña", exact: true }).isDisabled(), "DNS pendiente bloquea envío en UI");
  const denied = await context.request.post("/api/mailing", { data: { action: "start_program", programId: campaign.id } }); assert(denied.status() === 409, "DNS pendiente también bloquea API");
  await page.getByRole("button", { name: "Vista previa paso 1", exact: true }).click();
  await page.frameLocator('iframe[title="Vista previa del correo"]').getByText("Hola Ana, conoce nuestra oferta.", { exact: false }).waitFor();
  assert(await page.frameLocator('iframe[title="Vista previa del correo"]').getByRole("link", { name: "Dejar de recibir estos correos" }).isVisible(), "vista previa personaliza e incluye baja");
  await mock({ domainVerified: true }); await page.getByRole("button", { name: "Remitente y DNS", exact: true }).click(); await page.getByRole("button", { name: "Comprobar DNS", exact: true }).click(); await waitStatus("Estado de DNS actualizado");
  assert((await state()).sender.status === "verified", "dominio verificado habilita remitente elegido");
  assert((await state()).sender.trackOpens && (await state()).sender.trackClicks, "preferencias de métricas guardadas por empresa");
  await page.getByRole("button", { name: "Campañas", exact: true }).click(); await page.getByRole("button", { name: new RegExp(`^Campaña ${stamp}`) }).click();
  await page.getByRole("button", { name: "Enviar prueba paso 1", exact: true }).click(); await waitStatus("Prueba aceptada");
  assert((await outbox()).some((m) => m.to[0] === ownerEmail && m.from === `Mi Empresa <hola@${mailingDomain}>`), "prueba usa remitente de empresa y email del operador");
  await page.getByRole("button", { name: "Enviar campaña", exact: true }).click(); await waitStatus("Campaña confirmada");
  const concurrent = await Promise.all([sweep(), sweep()]); assert(concurrent.some((r) => r.locked) || concurrent.reduce((sum, r) => sum + r.accepted, 0) === 3, "cron concurrente no duplica envíos");
  await sweep();
  snapshot = await state(); assert(snapshot.sends.filter((s) => s.programId === campaign.id && s.status === "accepted").length === 3, "campaña envía exactamente a tres elegibles");
  const mails = (await outbox()).filter((m) => m.subject.startsWith(`Oferta ${stamp}`) && m.headers?.["List-Unsubscribe"]);
  assert(mails.length === 3 && !mails.some((m) => m.to[0].startsWith("sinpermiso-")), "buzón conserva tres correos y excluye email sin permiso");
  assert(mails.every((m) => m.reply_to === "respuestas@example.test" && m.headers["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click"), "reply-to y cabecera de baja presentes");

  const anaMail = mails.find((m) => m.to[0].startsWith("ana-")); const unsubscribeURL = anaMail.headers["List-Unsubscribe"].slice(1, -1);
  const confirmation = await publicApi.get(unsubscribeURL); assert(confirmation.ok(), "GET baja muestra confirmación");
  snapshot = await state(); const ana = snapshot.subscribers.find((s) => s.email === `ana-${stamp}@example.test`);
  assert(!ana.unsubscribedAt, "escáner GET no ejecuta baja");
  assert((await publicApi.post(unsubscribeURL, { form: { "List-Unsubscribe": "One-Click" } })).ok(), "POST de baja funciona sin sesión");
  assert((await publicApi.post(unsubscribeURL)).ok(), "baja repetida idempotente");
  await action({ action: "add_subscribers", listId: list.id, rows: [{ email: ana.email, name: "Ana", consent: true }] });
  assert((await state()).subscribers.find((s) => s.id === ana.id).unsubscribedAt, "reimportar no reactiva una baja");

  const seqList = (await action({ action: "create_list", name: `Secuencia ${stamp}` })).id;
  await action({ action: "add_subscribers", listId: seqList, rows: [{ email: `secuencia-${stamp}@example.test`, name: "Diego", consent: true }] });
  await page.getByRole("button", { name: "Automatizaciones", exact: true }).click(); await reload();
  await page.getByLabel("Nombre del programa", { exact: true }).fill(`Seguimiento ${stamp}`); await page.getByLabel("Lista del programa", { exact: true }).selectOption(seqList);
  for (let i = 0; i < 3; i++) { assert(await page.getByLabel(`Día paso ${i + 1}`, { exact: true }).inputValue() === `${[7, 14, 21][i]}`, `paso ${i + 1} muestra día desde inscripción`); await page.getByLabel(`Asunto paso ${i + 1}`, { exact: true }).fill(`Secuencia ${stamp} ${["X", "Y", "Z"][i]} {{nombre}}`); await page.getByLabel(`Contenido paso ${i + 1}`, { exact: true }).fill(`Correo ${i + 1} para {{nombre}}`); }
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click(); await waitStatus("Borrador guardado");
  assert(await page.getByLabel("Inscribir automáticamente nuevos contactos de esta lista", { exact: true }).isChecked(), "guardar borrador conserva inscripción automática predeterminada");
  await page.getByRole("button", { name: "Activar automatización", exact: true }).click(); await waitStatus("Secuencia activada");
  const sequence = (await state()).programs.find((p) => p.name === `Seguimiento ${stamp}`);
  await page.getByRole("button", { name: "Inscribir contactos existentes", exact: true }).click(); await waitStatus("Contactos inscritos");
  snapshot = await state(); const enrollment = snapshot.enrollments.find((e) => e.programId === sequence.id); const start = new Date(enrollment.startedAt);
  const atDay = (d) => new Date(start.getTime() + d * 86400000 + 1000);
  await sweep(atDay(6)); assert((await state()).sends.filter((s) => s.programId === sequence.id && s.status === "accepted").length === 0, "no envía antes de siete días");
  await page.getByRole("button", { name: "Pausar", exact: true }).click(); await waitStatus("Programa pausado"); await sweep(atDay(7));
  assert((await state()).sends.filter((s) => s.programId === sequence.id && s.status === "accepted").length === 0, "pausa impide correo vencido");
  await page.getByRole("button", { name: "Reanudar", exact: true }).click(); await waitStatus("Programa reanudado");
  const beforeDisabled = (await outbox()).length;
  assert((await toggle(false)).ok(), "superadmin retira acceso a una empresa con secuencia activa");
  await sweep(atDay(7)); assert((await outbox()).length === beforeDisabled, "deshabilitar empresa detiene envíos automáticos vencidos");
  assert((await toggle(true)).ok(), "superadmin restaura acceso a Mailing");
  assert((await state()).enrollments.some((e) => e.id === enrollment.id && e.startedAt === enrollment.startedAt), "rehabilitar conserva datos y reloj de inscripción");
  for (const [index, day] of [7, 14, 21].entries()) { await sweep(atDay(day)); await sweep(atDay(day)); snapshot = await state(); assert(snapshot.sends.filter((s) => s.programId === sequence.id && s.status === "accepted").length === index + 1, `día ${day}: un paso nuevo sin duplicados`); }
  const seqMails = (await outbox()).filter((m) => m.subject.startsWith(`Secuencia ${stamp}`)); assert(seqMails.map((m) => m.subject).join("|") === ["X", "Y", "Z"].map((letter) => `Secuencia ${stamp} ${letter} Diego`).join("|"), "buzón observa secuencia X/Y/Z real");
  await action({ action: "enroll_program", programId: sequence.id }); assert((await state()).enrollments.filter((e) => e.programId === sequence.id).length === 1, "inscripción repetida conserva reloj");
  await action({ action: "add_subscribers", listId: seqList, rows: [{ email: `auto-${stamp}@example.test`, name: "Elena", consent: true }] });
  snapshot = await state(); const auto = snapshot.enrollments.find((e) => e.programId === sequence.id && e.id !== enrollment.id); assert(Boolean(auto), "nuevo suscriptor entra automáticamente a la secuencia");
  await action({ action: "stop_enrollment", enrollmentId: auto.id }); await sweep(new Date(new Date(auto.startedAt).getTime() + 22 * 86400000)); assert((await state()).sends.filter((s) => s.subscriberId === auto.subscriberId).every((s) => s.status === "skipped"), "parada individual excluye pasos pendientes");
  await action({ action: "add_subscribers", listId: seqList, rows: [{ email: `baja-secuencia-${stamp}@example.test`, name: "Baja secuencia", consent: true }] });
  const bajaSequence = (await state()).subscribers.find((s) => s.email === `baja-secuencia-${stamp}@example.test`);
  await action({ action: "unsubscribe_subscriber", subscriberId: bajaSequence.id }); await sweep(atDay(22));
  assert((await state()).sends.filter((s) => s.programId === sequence.id && s.subscriberId === bajaSequence.id).every((s) => s.status === "skipped"), "baja cancela también pasos de automatización");

  const scheduled = await createProgram("campaign", seqList, `Programada ${stamp}`); const future = new Date(Date.now() + 3600000); await action({ action: "start_program", programId: scheduled, scheduledAt: future.toISOString() });
  await sweep(new Date(future.getTime() - 1000)); assert((await state()).sends.filter((s) => s.programId === scheduled).every((s) => s.status === "pending"), "campaña programada espera su fecha");
  await action({ action: "cancel_program", programId: scheduled }); await sweep(new Date(future.getTime() + 1000)); assert((await state()).sends.filter((s) => s.programId === scheduled).every((s) => s.status === "skipped"), "cancelación conserva pendientes excluidos");

  const failure = await createProgram("campaign", seqList, `Fallo ${stamp}`); await action({ action: "start_program", programId: failure }); await mock({ failNext: 1 }); const failureAt = new Date(); await sweep(failureAt);
  snapshot = await state(); assert(snapshot.sends.some((s) => s.programId === failure && s.status === "pending" && s.lastError === "Resend respondió HTTP 500"), "fallo proveedor aplaza y registra error sanitizado");
  await sweep(new Date(failureAt.getTime() + 121000)); assert((await state()).sends.filter((s) => s.programId === failure).every((s) => s.status === "accepted"), "reintento acotado recupera el envío");
  const malformed = await createProgram("campaign", seqList, `Formato ${stamp}`); await action({ action: "start_program", programId: malformed }); await mock({ malformedNext: 1 }); const malformedAt = new Date(); await sweep(malformedAt);
  const firstCount = (await outbox()).filter((m) => m.subject.startsWith(`Formato ${stamp}`)).length; await sweep(new Date(malformedAt.getTime() + 121000));
  const afterMalformed = (await outbox()).filter((m) => m.subject.startsWith(`Formato ${stamp}`)); assert(afterMalformed.length === 2 && firstCount === 1, "respuesta inesperada se recupera sin duplicar aceptación del proveedor");

  const delivered = afterMalformed[0];
  async function webhook(type, eventId, email = delivered.id, tags) { const body = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: email, ...(tags ? { tags } : {}) } }); const timestamp = Math.floor(Date.now() / 1000).toString(); const signature = createHmac("sha256", Buffer.from(webhookSecret.slice(6), "base64")).update(`${eventId}.${timestamp}.${body}`).digest("base64"); return publicApi.post("/api/mailing/webhook", { data: body, headers: { "content-type": "application/json", "svix-id": eventId, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` } }); }
  assert((await webhook("email.delivered", `evt-delivered-${stamp}`)).ok(), "evento firmado registra entrega"); assert((await webhook("email.delivered", `evt-delivered-${stamp}`)).ok(), "evento repetido no duplica efectos");
  assert((await webhook("email.opened", `evt-opened-${stamp}`)).ok() && (await webhook("email.clicked", `evt-clicked-${stamp}`)).ok(), "apertura y clic se registran solo con eventos");
  assert((await webhook("email.complained", `evt-complaint-${stamp}`)).ok(), "queja firmada suprime futuros envíos");
  assert((await publicApi.post("/api/mailing/webhook", { data: {}, headers: { "svix-signature": "v1,falsa" } })).status() === 401, "firma falsa rechazada");
  assert((await publicApi.post("/api/cron/sweep", { headers: { authorization: "Bearer incorrecto" } })).status() === 404, "cron protegido");
  assert((await webhook("email.sent", `evt-unrelated-${stamp}`, "transactional-not-in-mailing")).ok(), "webhook ignora correos transaccionales sin bloquear al proveedor");
  const uncertain = await createProgram("campaign", seqList, `Incierto ${stamp}`); await action({ action: "start_program", programId: uncertain }); await mock({ malformedNext: 1 }); const uncertainAt = new Date(); await sweep(uncertainAt);
  const uncertainMail = (await outbox()).find((m) => m.subject.startsWith(`Incierto ${stamp}`));
  await sweep(new Date(uncertainAt.getTime() + 24 * 3600000));
  assert((await state()).sends.some((s) => s.programId === uncertain && s.status === "uncertain"), "respuesta incierta fuera de ventana no se reenvía a ciegas");
  assert((await webhook("email.delivered", `evt-reconcile-${stamp}`, uncertainMail.id, uncertainMail.tags)).ok(), "evento por tags reconcilia respuesta incierta");
  assert((await state()).sends.some((s) => s.programId === uncertain && s.status === "accepted" && s.deliveredAt), "reconciliación observable sin duplicar correo");
  const quota = await createProgram("campaign", seqList, `Cuota ${stamp}`); await action({ action: "start_program", programId: quota }); await mock({ statusNext: 429 }); const quotaAt = new Date(); await sweep(quotaAt);
  assert((await state()).sends.some((s) => s.programId === quota && s.lastError === "Resend respondió HTTP 429"), "límite del proveedor aplaza el agregado de envíos");
  await sweep(new Date(quotaAt.getTime() + 121000));

  const company = await context.request.post("/api/admin/companies", { data: { companyName: `Ajena ${stamp}`, adminName: "Admin B", adminEmail: `b-${stamp}@seomos.test`, adminPassword: password } }); assert(company.ok(), "segunda empresa creada para aislamiento");
  const foreign = await request.newContext({ baseURL }); assert((await foreign.post("/api/auth/sign-in/email", { data: { email: `b-${stamp}@seomos.test`, password } })).ok(), "segunda empresa inicia sesión");
  const companyId = (await json(company)).company.id;
  assert((await foreign.get("/api/mailing")).status() === 404, "empresas nuevas tienen Mailing deshabilitado por defecto");
  assert((await toggle(true, companyId, foreign)).status() === 403, "admin de empresa no puede habilitarse Mailing");
  assert((await toggle(true, ownId, foreign)).status() === 403, "admin no puede habilitar otra empresa");
  assert((await toggle("true", companyId)).status() === 422, "superadmin debe enviar boolean válido");
  assert((await toggle(true, "org_inexistente")).status() === 404, "habilitación de empresa inexistente devuelve 404");
  const foreignPage = await browser.newPage();
  await foreignPage.context().addCookies(await foreign.storageState().then((s) => s.cookies));
  await foreignPage.goto(`${baseURL}/mailing`); await foreignPage.waitForURL("**/inbox");
  assert(await foreignPage.getByRole("link", { name: "Mailing", exact: true }).count() === 0, "empresa nueva tampoco ve ni abre Mailing por URL");
  assert((await toggle(true, companyId)).ok(), "superadmin selecciona otra empresa para Mailing");
  await foreignPage.goto(`${baseURL}/mailing`); await foreignPage.getByRole("heading", { name: "Mailing", exact: true }).waitFor();
  assert(await foreignPage.getByRole("link", { name: "Mailing", exact: true }).first().isVisible(), "empresa seleccionada ve Mailing tras habilitación");
  await foreignPage.close();
  assert((await state(foreign)).programs.length === 0, "empresa B no ve mailing de A");
  assert((await foreign.post("/api/mailing", { data: { action: "duplicate_program", programId: campaign.id } })).status() === 404, "IDs de programas ajenos no se operan");
  assert((await foreign.post("/api/mailing/sender", { data: { action: "configure", domain: mailingDomain, fromEmail: `otro@${mailingDomain}`, fromName: "Ajena" } })).status() === 409, "dominio no se reclama desde otra empresa");
  const editorEmail = `editor-${stamp}@seomos.test`; assert((await context.request.post("/api/settings/team", { data: { name: "Editor", email: editorEmail, password, role: "agent_editor" } })).ok(), "editor creado para prueba de permisos");
  const editor = await request.newContext({ baseURL }); const editorLogin = await editor.post("/api/auth/sign-in/email", { data: { email: editorEmail, password } });
  assert(editorLogin.ok(), "editor inicia sesión para prueba de permisos", `${editorLogin.status()}`);
  assert((await editor.get("/api/mailing")).status() === 403 && (await editor.post("/api/mailing", { data: { action: "create_list", name: "No permitida" } })).status() === 403, "editor de agente no accede a mailing");
  await foreign.dispose(); await editor.dispose();

  await page.getByRole("button", { name: "Campañas", exact: true }).click(); await page.getByRole("button", { name: new RegExp(`^Campaña ${stamp}`) }).click(); await page.getByText("Entregados", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, "desktop.png"), fullPage: true }); await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Nueva campaña", exact: true }).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && [...document.querySelectorAll("main > div, main > div > div")].every((el) => el.scrollWidth <= el.clientWidth + 1)), "UI móvil sin desbordamiento del contenido");
  await page.screenshot({ path: path.join(artifacts, "mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1080 }); await page.goto("/companies"); await page.getByRole("switch", { name: `Mailing para ${ownCompany.name}`, exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, "companies.png"), fullPage: true });
  assert(errors.length === 0, "sin errores de ejecución en navegador", errors.join("; "));
  await writeFile(path.join(artifacts, "result.json"), JSON.stringify({ passed, baseURL, completedAt: new Date().toISOString(), browserErrors: errors }, null, 2));
  console.log(`\nRESULTADO: ${passed} verificaciones verdes`);
} finally { await context.close(); await publicApi.dispose(); await browser.close(); }
