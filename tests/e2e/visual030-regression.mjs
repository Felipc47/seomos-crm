import { chromium } from "playwright";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Standalone regression against the actual application, a dedicated local DB,
// and internal provider mocks. Never run this against an external CRM.
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const origin = new URL(baseURL);
if (!["127.0.0.1", "localhost"].includes(origin.hostname) || !["3100", "3101"].includes(origin.port)) {
  throw new Error("Use the isolated CRM on localhost:3100 or localhost:3101 only");
}
const artifacts = path.resolve(process.env.QA_OUTPUT_DIR ?? "output/crm-visual-2026-10/qa-real");
await mkdir(artifacts, { recursive: true });
const resumeKbStamp = process.env.QA_RESUME_KB_STAMP;
const reuseDesktop = process.env.QA_REUSE_DESKTOP === "1" || Boolean(resumeKbStamp);
const checks = [], errors = [], unexpectedResponses = [], externalRequests = [];
const stamp = resumeKbStamp ? Number(resumeKbStamp) : Date.now();
let createdContactId = null;
const account = { name: "SEOMOS Local", email: "visual030@seomos.test", password: "Visual030-LocalTest!" };
const savedSession = await readFile(`/tmp/seomos-visual030-${origin.port}-storage.json`, "utf8").then(JSON.parse).catch(() => null);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  baseURL, viewport: { width: 1512, height: 1050 }, colorScheme: "dark",
  timezoneId: "America/Bogota", extraHTTPHeaders: { Origin: baseURL },
  ...(savedSession ? { storageState: { cookies: savedSession.cookies, origins: [] } } : {}),
});
context.setDefaultTimeout(60000);
context.setDefaultNavigationTimeout(60000);
// Passive monitoring preserves native SSE cancellation/navigation semantics.
// The fixture runtime points every server provider at localhost; the real UI
// uses local assets/fonts. Any browser request outside this origin fails QA.
context.on("request", (request) => {
  const url = new URL(request.url());
  if (["http:", "https:"].includes(url.protocol) && url.origin !== origin.origin) externalRequests.push(`${url.origin}${url.pathname}`);
});
const page = await context.newPage();
const api = context.request;
page.on("pageerror", (error) => errors.push(error.message));
page.on("requestfailed", (request) => {
  const url = new URL(request.url());
  const failure = request.failure()?.errorText ?? "request failed";
  if (url.origin !== origin.origin || url.pathname === "/api/events" || failure.includes("ERR_ABORTED")) return;
  errors.push(`${url.pathname}: ${failure}`);
});
page.on("response", (response) => {
  if ((response.status() >= 500 || (response.status() >= 400 && response.url().includes("/_next/"))) && !/\/api\/agent\/configure/.test(response.url())) {
    unexpectedResponses.push({ url: new URL(response.url()).pathname, status: response.status() });
  }
});
function assert(value, message, detail = "") {
  if (!value) throw new Error(`${message}${detail ? `: ${detail}` : ""}`);
  checks.push(message); console.log(`✓ ${message}`);
}
async function json(response) { return response.json().catch(() => ({})); }
async function get(url) { const response = await api.get(url); assert(response.ok(), `GET ${url}`); return json(response); }
async function put(url, data) { const response = await api.put(url, { data }); assert(response.ok(), `PUT ${url}`); return json(response); }
async function shot(name) { await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: true, animations: "disabled" }); }
async function noOverflow(label) {
  const widths = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert(widths.content <= widths.viewport + 1, `${label}: sin desbordamiento horizontal`, JSON.stringify(widths));
}
async function goto(url, ready) {
  const response = await page.goto(url, { waitUntil: "load" });
  assert(response?.ok(), `${url}: respuesta HTTP correcta`);
  assert(new URL(page.url()).pathname === url, `${url}: pantalla autorizada accesible`);
  await ready().first().waitFor({ state: "visible" });
  await page.locator("main").waitFor();
  await page.locator("main").getByText(/^Cargando(?:\s|…|\.)/).first().waitFor({ state: "hidden" });
}
async function waitApi(url, method, action) {
  const pending = page.waitForResponse((r) => new URL(r.url()).pathname === url && r.request().method() === method);
  await action(); const response = await pending;
  assert(response.ok(), `${method} ${url}: control de UI guardó correctamente`);
  return json(response);
}
const headings = (name) => () => page.getByRole("heading", { name, exact: true });
// Each route has a real content control/heading instead of a generic layout check.
const routeChecks = [
  ["/dashboard", () => page.getByTestId("metric-new-leads")],
  ["/inbox", () => page.locator('[data-testid^="inbox-conversation-"]')],
  ["/pipeline", () => page.locator('[data-testid="lead-board-card"], [data-testid="lead-list-row"]')],
  ["/contacts", () => page.locator('[data-testid="contact-list-row"], [data-testid="contact-grid-card"]')],
  ["/agent", () => page.getByLabel("Nombre del agente")],
  ["/templates", headings("Plantillas")],
  ["/campaigns", headings("Nueva campaña")],
  ["/mailing", headings("Mailing")],
  ["/services", headings("Servicios")],
  ["/companies", headings("Empresas")],
  ["/settings/profile", headings("Tu perfil")],
  ["/settings/whatsapp", headings("Webhook de WhatsApp")],
  ["/settings/calendar", headings("Conectar Google Calendar")],
  ["/settings/notifications", headings("Notificaciones por correo")],
  ["/settings/integrations", () => page.locator("main h1")],
  ["/settings/branding", headings("Marca del CRM")],
  ["/settings/team", headings("Crear cuenta de equipo")],
  ["/notifications", headings("Notificaciones")],
];

try {
  const mock = await api.get("/api/dev/wa-mock/outbox");
  assert(mock.ok(), "Mocks internos habilitados antes de cualquier mutación", `HTTP ${mock.status()}`);
  const session = await json(await api.get("/api/auth/get-session", { timeout: 60000 }));
  if (session?.user?.email !== account.email) {
    let login = await api.post("/api/auth/sign-in/email", { data: account, timeout: 60000 });
    if (!login.ok()) login = await api.post("/api/auth/sign-up/email", { data: account, timeout: 60000 });
    assert(login.ok(), "Cuenta ficticia de la base local inicia sesión");
  } else assert(true, "Cuenta ficticia de la base local reanuda sesión");
  const contactsBefore = await get("/api/contacts");
  if ((contactsBefore.contacts ?? []).length === 0) {
    assert((await api.post("/api/seed/demo")).ok(), "Demo insertada solo en organización vacía");
  }
  const companies = await get("/api/admin/companies");
  assert(Boolean(companies.ownOrganizationId), "Cuenta local conserva rol de superadmin");
  assert((await api.patch(`/api/admin/companies/${companies.ownOrganizationId}/mailing`, { data: { enabled: true } })).ok(), "Mailing habilitado para la empresa local");
  const channel = await get("/api/settings/whatsapp");
  if (channel.connection?.phoneNumberId !== "phone_visual030") {
    await put("/api/settings/whatsapp", { wabaId: "waba_visual030", phoneNumberId: "phone_visual030", token: "EAAtest-valido" });
  } else assert(true, "Canal de WhatsApp ficticio ya configurado");
  await put("/api/agent/profile", { enabled: true });
  await context.storageState({ path: `/tmp/seomos-visual030-${origin.port}-storage.json` });

  if (!reuseDesktop) {
  await goto("/inbox", routeChecks[1][1]);
  assert(!(await page.locator("html").evaluate((el) => el.classList.contains("dark"))), "Tema claro por defecto incluso con sistema oscuro");
  await noOverflow("Escritorio bandeja");
  await shot("01-inbox-light");
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).filter({ visible: true }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  assert(await page.locator("html").evaluate((el) => el.classList.contains("dark")), "Control cambia a modo oscuro");
  await page.reload({ waitUntil: "load" });
  await routeChecks[1][1]().first().waitFor();
  assert(await page.locator("html").evaluate((el) => el.classList.contains("dark")), "Modo oscuro persiste al recargar");
  await shot("02-inbox-dark");
  await page.getByRole("button", { name: "Modo claro", exact: true }).filter({ visible: true }).click();

  for (const [url, ready] of routeChecks) {
    await goto(url, ready);
    await noOverflow(`Escritorio ${url}`);
    await shot(`desktop-${url.slice(1).replaceAll("/", "-")}`);
  }
  await writeFile(path.join(artifacts, "desktop-result.json"), JSON.stringify({ completedAt: new Date().toISOString(), baseURL, checks: [...checks], errors: [...errors], unexpectedResponses: [...unexpectedResponses], externalRequests: [...externalRequests] }, null, 2));
  } else {
    // Explicit continuation of a completed desktop phase on the same frozen
    // application. The default command always performs the entire suite.
    const evidence = JSON.parse(await readFile(path.join(artifacts, "desktop-result.json"), "utf8"));
    if (evidence.baseURL !== baseURL || evidence.errors.length || evidence.unexpectedResponses.length || evidence.externalRequests.length || !routeChecks.every(([url]) => evidence.checks.includes(`Escritorio ${url}: sin desbordamiento horizontal`))) throw new Error("Desktop evidence is incomplete; run without QA_REUSE_DESKTOP");
    for (const check of evidence.checks) if (!checks.includes(check)) checks.push(check);
    if (resumeKbStamp) {
      const interrupted = JSON.parse(await readFile(path.join(artifacts, "interruption-kb-timeout.json"), "utf8"));
      if (interrupted.errors.length || interrupted.unexpectedResponses.length || interrupted.externalRequests.length || !interrupted.checks.includes("Knowledge base guarda preguntas y respuestas")) throw new Error("Interrupted run is not valid for KB continuation");
      checks.splice(0, checks.length, ...interrupted.checks);
      console.log(`Continuación: ${checks.length} comprobaciones previas conservadas; reanudar eliminación KB ${stamp}`);
    }
    console.log(`Desktop: ${routeChecks.length} rutas y temas verificados en desktop-result.json; continuando flujos y móvil`);
  }

  // All existing agent controls remain functional and persisted by the real API.
  await goto("/agent", routeChecks[4][1]);
  const question = `¿Cómo opera la prueba ${stamp}?`;
  if (!resumeKbStamp) {
  const originalInstructions = (await get("/api/agent/profile")).profile.instructions;
  await page.getByLabel("Nombre del agente").fill("Asesor SEOMOS Local");
  await page.getByRole("textbox", { name: "Saludo", exact: true }).fill("Hola, soy el asesor de SEOMOS. ¿Cómo podemos ayudarte?");
  const tones = page.getByRole("group", { name: "Tonos preestablecidos" });
  // Re-query after each toggle; positional locators would shift as selections
  // disappear and make a repeat run wait for a no-longer-existing second item.
  while (await tones.locator('[aria-pressed="true"]').count()) await tones.locator('[aria-pressed="true"]').first().click();
  await tones.getByRole("button", { name: "Cercano", exact: true }).click();
  await tones.getByRole("button", { name: "Consultivo", exact: true }).click();
  await tones.getByRole("button", { name: "Directo", exact: true }).click();
  assert(await tones.locator('[aria-pressed="true"]').count() === 2, "Tonos conserva el máximo de dos sin desactivar los elegidos");
  await page.locator("#agent-tone").fill("Mensajes claros y preguntas breves.");
  const sections = [
    ["presentacion", "Presentación y saludo"], ["negocio", "Negocio y servicios"],
    ["calificacion", "Calificación del prospecto"], ["precios", "Precios y cotizaciones"],
    ["agendamiento", "Reuniones y agendamiento"], ["reglas", "Reglas y límites"],
  ];
  for (const [, title] of sections) {
    await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
    await page.getByRole("textbox", { name: title, exact: true }).fill(`Prueba local: ${title}. Usar únicamente información confirmada.`);
  }
  await page.getByRole("button", { name: /^Escalado a humano/ }).click();
  await page.getByRole("textbox", { name: "Escalado a humano", exact: true }).fill("Transferir a una persona cuando el cliente lo solicite.");
  await waitApi("/api/agent/profile", "PUT", () => page.getByRole("button", { name: "Guardar comportamiento" }).click());
  await page.reload({ waitUntil: "load" });
  await page.getByLabel("Nombre del agente").waitFor();
  const savedProfile = (await get("/api/agent/profile")).profile;
  assert(savedProfile.name === "Asesor SEOMOS Local" && savedProfile.tonePresets.length === 2, "Nombre y tonos sobreviven la recarga");
  assert(sections.every(([key, title]) => savedProfile.instructionSections[key].includes(title)), "Las seis secciones de entrenamiento persisten completas");
  assert(savedProfile.escalationRules.includes("Transferir"), "Reglas de escalado persisten");
  assert(savedProfile.instructions === originalInstructions, "El texto libre heredado se conserva al guardar las seis secciones");
  assert(await page.getByRole("switch", { name: "Agente encendido" }).getAttribute("aria-checked") === "true", "Interruptor general refleja el estado persistido del agente");
  assert(await page.getByRole("textbox", { name: "Saludo", exact: true }).inputValue() === savedProfile.greeting, "Saludo cargado coincide con configuración real");

  await page.getByPlaceholder("Pregunta (p. ej. ¿Hacen envíos?)").fill(question);
  await page.getByPlaceholder("Respuesta", { exact: true }).fill("Solo usa datos ficticios en localhost.");
  await waitApi("/api/kb", "POST", () => page.getByRole("button", { name: "Agregar P/R" }).click());
  await page.getByText(question, { exact: true }).waitFor();
  assert((await get("/api/kb")).entries.some((entry) => entry.question === question), "Knowledge base guarda preguntas y respuestas");
  await page.getByPlaceholder("Horarios, direcciones, políticas…").fill(`Bloque de prueba ${stamp}`);
  await waitApi("/api/kb", "POST", () => page.getByRole("button", { name: "Agregar bloque" }).click());
  await page.getByText(`Bloque de prueba ${stamp}`, { exact: true }).waitFor();
  }
  for (const text of [question, `Bloque de prueba ${stamp}`]) {
    console.log(`Paso KB: comprobar y eliminar entrada ${text}`);
    const entry = (await get("/api/kb")).entries.find((row) => row.question === text || row.content === text);
    if (entry) {
      await waitApi(`/api/kb/${entry.id}`, "DELETE", () => page.locator('[data-help="knowledge-list"] li').filter({ hasText: text }).getByRole("button", { name: "Eliminar entrada" }).click());
      await page.getByText(text, { exact: true }).waitFor({ state: "detached", timeout: 60000 });
      assert(true, "Respuesta DELETE y retirada visual de la entrada confirmadas");
    } else {
      assert(resumeKbStamp && await page.getByText(text, { exact: true }).count() === 0, "Entrada de la corrida interrumpida ya eliminada en API y UI");
    }
  }
  assert(!(await get("/api/kb")).entries.some((entry) => entry.question === question || entry.content === `Bloque de prueba ${stamp}`), "Eliminar entradas retira solo las creadas en esta prueba");

  await page.getByLabel("Inicio de jornada").selectOption("540");
  await page.getByLabel("Fin de jornada").selectOption("540");
  await page.getByRole("button", { name: "Guardar agendamiento" }).click();
  await page.getByText("El fin de jornada debe dejar al menos una franja completa", { exact: true }).waitFor();
  assert(true, "Agendamiento muestra error cuando no cabe ninguna franja");
  await page.getByLabel("Fin de jornada").selectOption("1050");
  await page.getByLabel("Franjas de", { exact: true }).selectOption("30");
  await page.getByLabel("Antelación mínima").selectOption("2");
  await waitApi("/api/settings/calendar", "PUT", () => page.getByRole("button", { name: "Guardar agendamiento" }).click());
  const calendar = (await get("/api/settings/calendar")).settings;
  assert(calendar.workStartMin === 540 && calendar.workEndMin === 1050 && calendar.slotMinutes === 30 && calendar.leadTimeBusinessDays === 2, "Horario, franjas y antelación se guardan sin perder opciones");
  await page.locator('[data-help="agent-scheduling"]').scrollIntoViewIfNeeded();
  await shot("agent-scheduling");
  const followBefore = (await get("/api/settings/follow-up")).settings;
  await waitApi("/api/settings/follow-up", "PUT", () => page.getByRole("switch", { name: "Seguimiento automático activado" }).click());
  assert((await get("/api/settings/follow-up")).settings.enabled !== followBefore.enabled, "Seguimiento automático cambia en backend");
  await waitApi("/api/settings/follow-up", "PUT", () => page.getByRole("switch", { name: "Seguimiento automático activado" }).click());
  assert((await get("/api/settings/follow-up")).settings.enabled === followBefore.enabled, "Seguimiento automático se restaura");
  assert(await page.locator('[data-help="agent-followup"] select').count() === 1, "Selector de plantilla para seguimiento sigue disponible");

  // Assistant works as a reviewable draft, never silently saving over the agent.
  const beforeDraft = (await get("/api/agent/profile")).profile;
  await page.getByRole("button", { name: /Configurar con IA/ }).click();
  const assistant = page.getByRole("dialog", { name: "Configurar agente con IA" });
  await assistant.waitFor();
  await assistant.getByRole("button", { name: "Crear borrador" }).click();
  await assistant.getByRole("alert").getByText(/Agrega el sitio web/).waitFor();
  assert(true, "Asistente valida antes de generar");
  await assistant.getByLabel("¿Qué ofrece el negocio?").fill("SEOMOS ofrece diagnóstico y acompañamiento de marketing digital en Colombia.");
  await assistant.getByRole("button", { name: /^Vender/ }).click();
  await assistant.getByLabel(/¿Qué nunca debe prometer o hacer?/).fill("No inventar precios ni resultados garantizados.");
  await assistant.getByRole("button", { name: "Crear borrador" }).click();
  await assistant.getByText("Borrador completo", { exact: true }).waitFor({ timeout: 60000 });
  assert(JSON.stringify((await get("/api/agent/profile")).profile) === JSON.stringify(beforeDraft), "Generar borrador no cambia el agente guardado");
  await shot("agent-assistant-draft");
  await assistant.getByRole("button", { name: "Usar este borrador", exact: true }).click();
  await assistant.waitFor({ state: "detached" });
  assert(JSON.stringify((await get("/api/agent/profile")).profile) === JSON.stringify(beforeDraft), "Aplicar borrador no guarda ni enciende implícitamente");
  assert((await page.getByPlaceholder("Horarios, direcciones, políticas…").inputValue()).length > 30, "Borrador también rellena conocimiento editable");
  await page.reload({ waitUntil: "load" });
  await page.getByLabel("Nombre del agente").waitFor();
  assert(await page.getByLabel("Nombre del agente").inputValue() === beforeDraft.name, "Recarga recupera comportamiento guardado frente al borrador sin guardar");
  await shot("agent-complete-light");

  await goto("/inbox", routeChecks[1][1]);
  const conversations = (await get("/api/conversations")).conversations;
  const first = conversations[0]; assert(Boolean(first), "Conversaciones demo presentes");
  const conversationMessages = (await get(`/api/conversations/${first.id}/messages`)).messages;
  const firstMessage = conversationMessages.find((message) => message.direction === "in" && message.text)?.text;
  assert(Boolean(firstMessage), "La conversación elegida contiene mensajes reales del fixture");
  await page.getByRole("button", { name: `Opciones del chat con ${first.contact.name}`, exact: true }).click();
  const initialPinned = Boolean(first.pinnedAt);
  await waitApi(`/api/conversations/${first.id}`, "PATCH", () => page.getByRole("button", { name: initialPinned ? "Desanclar" : "Anclar", exact: true }).click());
  assert(Boolean((await get("/api/conversations")).conversations.find((row) => row.id === first.id).pinnedAt) !== initialPinned, "Anclar chat actualiza conversación real");
  await page.getByRole("button", { name: `Opciones del chat con ${first.contact.name}`, exact: true }).click();
  await waitApi(`/api/conversations/${first.id}`, "PATCH", () => page.getByRole("button", { name: initialPinned ? "Anclar" : "Desanclar", exact: true }).click());
  await page.getByTestId(`inbox-conversation-${first.id}`).getByRole("button").first().click();
  await page.getByTestId("chat-ai-control").waitFor();
  await page.locator("span.whitespace-pre-wrap").filter({ hasText: firstMessage }).first().waitFor();
  assert(await page.getByRole("switch", { name: "IA en esta conversación", exact: true }).count() === 1, "Control individual de IA permanece disponible en chat");
  await shot("inbox-open-conversation");
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).filter({ visible: true }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  await shot("inbox-open-dark");
  await page.getByRole("button", { name: "Modo claro", exact: true }).filter({ visible: true }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));

  await goto("/contacts", routeChecks[3][1]);
  await page.locator('[data-help="contacts-new"]').click();
  await page.getByRole("heading", { name: "Nuevo prospecto", exact: true }).waitFor();
  const contactName = `Prueba visual ${stamp}`;
  await page.locator("#new-name").fill(contactName);
  await page.locator("#new-phone").fill(`57301${String(stamp).slice(-7)}`);
  await page.locator("#new-email").fill("contacto@example.test");
  await page.locator("#new-notes").fill("Contacto ficticio para regresión visual.");
  const createdContact = await waitApi("/api/contacts", "POST", () => page.getByRole("button", { name: "Crear prospecto", exact: true }).click());
  createdContactId = createdContact.contact?.id ?? null;
  assert(Boolean(createdContactId), "Alta devuelve identidad del único contacto creado por esta corrida");
  await page.getByPlaceholder("Buscar por nombre o teléfono…").fill(contactName);
  await page.getByRole("button", { name: `Editar ${contactName}`, exact: true }).click();
  await page.getByRole("dialog", { name: "Editar prospecto" }).waitFor();
  await page.locator("#prospect-edit-name").fill(`${contactName} editado`);
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page.getByRole("dialog", { name: "Editar prospecto" }).waitFor({ state: "detached" });
  assert((await get("/api/contacts")).contacts.some((contact) => contact.name === `${contactName} editado`), "Crear y editar contacto conserva persistencia real");

  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/inbox", "/dashboard", "/pipeline", "/contacts", "/agent", "/mailing", "/settings/team"]) {
    const ready = routeChecks.find(([candidate]) => candidate === url)[1];
    await goto(url, ready); await noOverflow(`Móvil ${url}`);
    await shot(`mobile-${url.slice(1).replaceAll("/", "-")}`);
    if (url === "/inbox") {
      await page.getByTestId(`inbox-conversation-${first.id}`).getByRole("button").first().click();
      await page.getByTestId("chat-ai-control").waitFor();
      await page.locator("span.whitespace-pre-wrap").filter({ hasText: firstMessage }).first().waitFor();
      await noOverflow("Conversación abierta móvil");
      await shot("mobile-inbox-conversation");
    }
  }
  await goto("/agent", routeChecks[4][1]);
  await page.getByRole("button", { name: /Configurar con IA/ }).click();
  await assistant.waitFor(); await noOverflow("Asistente de IA móvil");
  assert(await assistant.getByRole("button", { name: "Crear borrador" }).isVisible(), "Asistente móvil conserva acción principal visible");
  await shot("mobile-agent-assistant");
  await page.keyboard.press("Escape");
  await assistant.waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).filter({ visible: true }).click();
  await shot("mobile-agent-dark");
  await page.getByRole("button", { name: "Modo claro", exact: true }).filter({ visible: true }).click();

  if (createdContactId) {
    const archived = await api.patch(`/api/contacts/${createdContactId}`, { data: { archived: true }, timeout: 60000 });
    assert(archived.ok(), "Contacto exclusivo de QA archivado al finalizar");
    assert(Boolean((await get(`/api/contacts/${createdContactId}`)).contact.archivedAt), "Limpieza de contacto confirmada sin tocar los fixtures anteriores");
    createdContactId = null;
  }
  const waOutbox = await get("/api/dev/wa-mock/outbox");
  assert((waOutbox.outbox ?? waOutbox.messages ?? []).length === 0, "Pruebas visuales no generan mensajes de WhatsApp");
  assert(errors.length === 0, "Sin excepciones de navegador", errors.join(" | "));
  assert(unexpectedResponses.length === 0, "Sin respuestas 5xx inesperadas", JSON.stringify(unexpectedResponses));
  assert(externalRequests.length === 0, "Ninguna solicitud del navegador salió del CRM local", JSON.stringify(externalRequests));
  await context.storageState({ path: `/tmp/seomos-visual030-${origin.port}-storage.json` });
  await writeFile(path.join(artifacts, "result.json"), JSON.stringify({ completedAt: new Date().toISOString(), baseURL, reusedDesktopEvidence: reuseDesktop, resumedAfterInterruption: Boolean(resumeKbStamp), interruptionEvidence: resumeKbStamp ? "interruption-kb-timeout.json" : null, desktopEvidence: "desktop-result.json", passed: checks.length, checks, errors, unexpectedResponses, externalRequests }, null, 2));
  await rm(path.join(artifacts, "failure.json"), { force: true });
  await rm(path.join(artifacts, "failure.png"), { force: true });
  console.log(`RESULTADO: ${checks.length} comprobaciones verdes`);
} catch (error) {
  // Playwright API call logs can include the local auth cookie. Keep credentials
  // out of console output and artifacts even though this is a throwaway account.
  const message = String(error).split("\nCall log:")[0];
  await shot("failure").catch(() => {});
  await writeFile(path.join(artifacts, "failure.json"), JSON.stringify({ error: message, url: page.url(), passed: checks.length, checks, errors, unexpectedResponses, externalRequests }, null, 2));
  throw new Error(message);
} finally {
  if (createdContactId) await api.patch(`/api/contacts/${createdContactId}`, { data: { archived: true }, timeout: 60000 }).catch(() => {});
  await context.close().catch(() => {}); await browser.close().catch(() => {});
}
