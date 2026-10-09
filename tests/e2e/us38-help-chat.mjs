import { chromium, request } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Este guion solo usa localhost y mocks");
const ownerEmail = "help029@seomos.test";
const password = "Help029-LocalTest!";
const stamp = Date.now();
const artifacts = path.resolve(".artifacts/us38-help-chat");
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, timezoneId: "America/Bogota", extraHTTPHeaders: { Origin: baseURL } });
const page = await context.newPage();
const anonymous = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
const errors = []; const replies = []; let passed = 0;
page.on("pageerror", (error) => errors.push(error.message));
function assert(condition, message, detail = "") { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); passed++; console.log(`✅ ${message}`); }
const panel = () => page.getByRole("dialog", { name: "Asistente de ayuda" });
const payload = (question, pathname = "/inbox", history = []) => ({ question, pathname, history });
async function ask(question) {
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/help/chat") && response.request().method() === "POST");
  await panel().getByLabel("Tu pregunta sobre el CRM").fill(question);
  await panel().getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  const response = await responsePromise; const body = await response.json();
  assert(response.ok(), "la pregunta recibe una respuesta", body.error?.message);
  await panel().getByRole("log").getByText(body.answer, { exact: true }).last().waitFor();
  await panel().getByRole("button", { name: "Enviar pregunta", exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector("#crm-help-question")?.disabled);
  replies.push({ question, ...body });
  return body;
}
async function open() { await page.getByRole("button", { name: "Abrir ayuda", exact: true }).click(); await panel().waitFor(); }
async function loginRole(email, role) {
  const creation = await context.request.post("/api/settings/team", { data: { name: `Prueba ${role}`, email, password, role } });
  assert(creation.ok(), `cuenta ${role} de prueba creada`);
  const account = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  assert((await account.post("/api/auth/sign-in/email", { data: { email, password } })).ok(), `${role} inicia sesión`);
  return account;
}

try {
  assert((await anonymous.post("/api/help/chat", { data: payload("hola") })).status() === 401, "chat protegido sin sesión");
  await page.goto("/login");
  assert(await page.getByRole("button", { name: "Abrir ayuda", exact: true }).count() === 0, "chat ausente del acceso público");
  let login = await context.request.post("/api/auth/sign-in/email", { data: { email: ownerEmail, password } });
  if (!login.ok()) login = await context.request.post("/api/auth/sign-up/email", { data: { name: "Admin Ayuda", email: ownerEmail, password } });
  assert(login.ok(), "admin entra a la base aislada");
  const companies = await (await context.request.get("/api/admin/companies")).json();
  const ownId = companies.ownOrganizationId;
  assert(Boolean(ownId), "organización local de prueba disponible");
  await context.request.patch(`/api/admin/companies/${ownId}/mailing`, { data: { enabled: false } });
  const profileBefore = await (await context.request.get("/api/agent/profile")).json();
  assert((await context.request.post("/api/help/chat", { data: payload(" ") })).status() === 422, "rechaza pregunta vacía");
  assert((await context.request.post("/api/help/chat", { data: { ...payload("hola"), role: "owner" } })).status() === 422, "no acepta rol enviado por cliente");
  assert((await context.request.post("/api/help/chat", { data: payload("x".repeat(1001)) })).status() === 422, "limita longitud de pregunta");

  await page.goto("/inbox"); await open();
  assert(await panel().getByText("Te guío en Bandeja", { exact: true }).isVisible(), "identifica pantalla de Bandeja");
  assert(await panel().getByRole("button", { name: "¿Cómo respondo a un cliente?", exact: true }).isVisible(), "propone una pregunta de la pantalla");
  assert(await panel().getByLabel("Tu pregunta sobre el CRM").evaluate((element) => element === document.activeElement), "abrir enfoca la entrada");
  const first = await ask("¿Cómo respondo a un cliente?");
  assert(first.mode === "ai" && first.guides[0]?.href === "/inbox", "respuesta de IA fundamentada y enlace de Bandeja");
  assert(await panel().getByRole("listitem").count() >= 3, "pasos observables en la conversación");
  await page.screenshot({ path: path.join(artifacts, "desktop-inbox.png") });
  const followup = await ask("¿Y después?");
  assert(followup.guides[0]?.id === first.guides[0]?.id, "el seguimiento conserva tema de conversación");
  await page.keyboard.press("Escape"); await panel().waitFor({ state: "detached" });
  assert(await page.getByRole("button", { name: "Abrir ayuda", exact: true }).evaluate((element) => element === document.activeElement), "Escape devuelve foco a Ayuda");
  await open(); assert(await panel().getByText("¿Y después?", { exact: true }).isVisible(), "cerrar y abrir conserva conversación");
  await panel().getByRole("button", { name: "Nueva conversación de ayuda" }).click();
  assert(await panel().getByRole("log").getByText("Tú", { exact: true }).count() === 0, "Nueva conversación vacía mensajes anteriores");

  await ask("¿Cómo cambio la foto de mi perfil?");
  await panel().getByRole("link", { name: "Ir a Actualizar tu perfil", exact: true }).click();
  await page.waitForURL("**/settings/profile"); await panel().waitFor({ state: "detached" });
  assert(page.url().endsWith("/settings/profile"), "enlace lleva a la pantalla real y cierra el panel");
  await open(); assert(await panel().getByText("Te guío en Perfil", { exact: true }).isVisible(), "actualiza contexto al navegar");
  await panel().getByRole("button", { name: "Nueva conversación de ayuda" }).click();

  await anonymous.post("/api/dev/ai-mock/fail-next", { data: { chat: 3 } });
  const failed = await ask("¿Cómo cambio la etapa de un prospecto?");
  assert(failed.mode === "guide" && failed.guides[0]?.id === "pipeline", "proveedor caído degrada a pasos útiles tras reintentos");
  assert(await panel().getByText(/La IA no pudo responder esta vez/).isVisible(), "identifica el fallback sin colgar el chat");
  const malformed = await ask("FORMATO_INVALIDO cambiar etapa prospecto");
  assert(malformed.mode === "guide" && malformed.guides[0]?.id === "pipeline", "formato inválido también termina en guía útil");
  const wrapped = await ask("FORMATO_ENVUELTO perfil");
  assert(wrapped.mode === "ai" && wrapped.guides[0]?.id === "profile", "extrae respuesta JSON envuelta en Markdown");

  await page.route("**/api/help/chat", (route) => route.abort("failed"));
  const networkQuestion = "¿Cómo encuentro un contacto?";
  await panel().getByLabel("Tu pregunta sobre el CRM").fill(networkQuestion);
  await panel().getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  await panel().getByRole("alert").waitFor();
  assert(await panel().getByLabel("Tu pregunta sobre el CRM").inputValue() === networkQuestion, "fallo de red conserva pregunta y libera entrada");
  assert(await panel().getByRole("button", { name: "Reintentar pregunta", exact: true }).isEnabled(), "permite reintentar desde el error");
  await page.unroute("**/api/help/chat");
  const retriedResponse = page.waitForResponse("**/api/help/chat");
  await panel().getByRole("button", { name: "Reintentar pregunta", exact: true }).click();
  const retried = await (await retriedResponse).json();
  await panel().getByText(retried.answer, { exact: true }).last().waitFor();
  assert(retried.guides[0]?.id === "contacts", "reintento recupera respuesta de Contactos");
  assert(await panel().getByRole("log").getByText(networkQuestion, { exact: true }).count() === 1, "reintento no duplica la pregunta");

  await context.request.patch(`/api/admin/companies/${ownId}/mailing`, { data: { enabled: true } });
  await page.goto("/mailing"); await open();
  assert(await panel().getByRole("button", { name: "¿Cómo creo una campaña de correo?", exact: true }).isVisible(), "Mailing habilitado ofrece sugerencia contextual");
  const mailing = await ask("¿Cómo automatizo correos a los 7, 14 y 21 días?");
  assert(mailing.guides[0]?.id === "mailing-sequence", "explica automatización por días desde inscripción");
  await page.screenshot({ path: path.join(artifacts, "desktop-mailing.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await panel().evaluate((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }), "panel cabe completo en móvil");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sin desbordamiento horizontal en móvil");
  await page.screenshot({ path: path.join(artifacts, "mobile-mailing.png") });
  await panel().getByRole("button", { name: "Nueva conversación de ayuda" }).click();
  await page.screenshot({ path: path.join(artifacts, "mobile-welcome.png") });
  await panel().getByRole("button", { name: "Cerrar ayuda", exact: true }).click();
  assert(await page.getByRole("button", { name: "Abrir ayuda", exact: true }).isVisible(), "móvil puede cerrar y volver a abrir");
  assert(JSON.stringify(await (await context.request.get("/api/agent/profile")).json()) === JSON.stringify(profileBefore), "ayuda no modifica el agente de negocio");
  const outbox = await (await anonymous.get("/api/dev/wa-mock/outbox")).json();
  assert((outbox.outbox ?? outbox.messages ?? []).length === 0, "ayuda no envía mensajes por WhatsApp");

  const commercial = await loginRole(`commercial-${stamp}@seomos.test`, "commercial");
  const unauthorized = await (await commercial.post("/api/help/chat", { data: payload("GUIA_NO_AUTORIZADA cambiar etapa prospecto", "/companies") })).json();
  assert(unauthorized.mode === "guide" && unauthorized.guides.every((guide) => guide.href !== "/companies"), "servidor bloquea guía administrativa propuesta por el proveedor");
  const commercialMail = await (await commercial.post("/api/help/chat", { data: payload("automatizar correos a los 7 dias", "/mailing") })).json();
  assert(commercialMail.guides[0]?.id === "mailing-sequence", "comercial de empresa habilitada recibe ayuda de Mailing");
  const editor = await loginRole(`editor-${stamp}@seomos.test`, "agent_editor");
  const editorMail = await (await editor.post("/api/help/chat", { data: payload("Mailing automatizaciones", "/mailing") })).json();
  assert(editorMail.guides.every((guide) => !guide.href.startsWith("/mailing")), "editor no recibe guías de Mailing pese a empresa habilitada");
  const editorBrowser = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, storageState: await editor.storageState() });
  const editorPage = await editorBrowser.newPage(); await editorPage.goto("/agent");
  await editorPage.getByRole("button", { name: "Abrir ayuda", exact: true }).click();
  assert(await editorPage.getByRole("button", { name: "¿Cómo configuro el agente de IA?", exact: true }).isVisible(), "editor ve ayuda contextual de Agente");
  await editorBrowser.close();

  const foreignEmail = `foreign-${stamp}@seomos.test`;
  const company = await context.request.post("/api/admin/companies", { data: { companyName: `Ayuda ajena ${stamp}`, adminName: "Admin B", adminEmail: foreignEmail, adminPassword: password } });
  assert(company.ok(), "segunda empresa aislada preparada");
  const foreign = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  assert((await foreign.post("/api/auth/sign-in/email", { data: { email: foreignEmail, password } })).ok(), "admin de empresa ajena inicia sesión");
  const disabledMail = await (await foreign.post("/api/help/chat", { data: payload("automatizaciones de Mailing", "/mailing") })).json();
  assert(disabledMail.guides.every((guide) => guide.href !== "/mailing" && guide.href !== "/companies"), "empresa deshabilitada no hereda módulos ni privilegios de otra");
  const foreignHelp = await (await foreign.post("/api/help/chat", { data: payload("crear cuenta equipo", "/settings/team") })).json();
  assert(foreignHelp.guides[0]?.id === "team", "admin de otra empresa conserva ayuda de sus propios permisos");

  let rateLimited = false;
  for (let i = 0; i < 13; i++) {
    const response = await foreign.post("/api/help/chat", { data: payload("¿Cómo respondo?", "/inbox") });
    if (response.status() === 429) { rateLimited = true; break; }
    assert(response.ok(), "consulta dentro del límite se atiende");
  }
  assert(rateLimited, "límite por usuario evita llamadas ilimitadas al proveedor");
  assert((await commercial.post("/api/help/chat", { data: payload("contactos", "/contacts") })).ok(), "límite de otra empresa no bloquea a este usuario");
  assert(errors.length === 0, "sin errores de ejecución de navegador", errors.join(" | "));
  await Promise.all([commercial.dispose(), editor.dispose(), foreign.dispose()]);
  await writeFile(path.join(artifacts, "result.json"), JSON.stringify({ passed, baseURL, completedAt: new Date().toISOString(), browserErrors: errors, replies }, null, 2));
  console.log(`RESULTADO: ${passed} comprobaciones verdes`);
} finally { await context.close(); await anonymous.dispose(); await browser.close(); }
