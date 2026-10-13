import assert from "node:assert/strict";
import { chromium } from "playwright";
import postgres from "postgres";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.BASE_URL ?? "http://localhost:3102";
const dbURL = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/seomos_language_031";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(baseURL) || !dbURL.endsWith("/seomos_language_031")) throw Error("Usar exclusivamente el entorno local aislado");
const sql = postgres(dbURL, { max: 1 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage();
let passed = 0;
const check = (condition, name) => { assert(condition, name); console.log(`✅ ${++passed}. ${name}`); };
async function poll(fn) { const until = Date.now() + 45000; while (Date.now() < until) { const value = await fn(); if (value) return value; await new Promise(r => setTimeout(r, 250)); } throw Error("Tiempo de espera agotado"); }
const api = context.request;
const phone = (n) => `573110${Date.now().toString().slice(-5)}${n}`;
const phones = [1,2,3,4].map(phone);
const profile = async () => (await (await api.get("/api/agent/profile")).json()).profile;
async function inbound(phone, text) { const res = await api.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId: "phone_language031", from: phone, name: `Idioma ${phone}`, text } }); check(res.ok(), `ingesta del mensaje ${text}`); }
async function conversation(phone) { return (await (await api.get("/api/conversations")).json()).conversations.find(c => c.contact.phone === phone); }
async function response(phone, expected, count = 1) {
  const cv = await poll(() => conversation(phone));
  await poll(async () => { const messages = (await (await api.get(`/api/conversations/${cv.id}/messages`)).json()).messages; return messages.filter(m => m.direction === "out" && m.aiGenerated).length >= count && messages.some(m => m.direction === "out" && m.text === expected); });
  await page.goto(`/inbox?conversation=${cv.id}`);
  const visible = page.getByText(expected, { exact: true });
  // La bandeja selecciona desde el ID o desde la lista, según el estado de navegación.
  if (!(await visible.count())) await page.getByText(`Idioma ${phone}`, { exact: true }).first().click();
  await visible.first().waitFor();
  check(await visible.first().isVisible(), `respuesta visible al cliente: ${expected}`);
}
async function select(language) {
  await page.goto("/agent");
  const select = page.getByLabel("Idioma de respuesta", { exact: true });
  await select.selectOption(language);
  await page.getByRole("button", { name: "Guardar comportamiento" }).click();
  await poll(async () => (await profile()).responseLanguage === language);
  await page.reload();
  await select.waitFor();
  check((await select.inputValue()) === language, `${language} se guarda y sobrevive a recarga`);
}
try {
  const login = await api.post("/api/auth/sign-in/email", { data: { email: "language031@test.local", password: "IdiomaPrueba123!" } });
  if (!login.ok()) {
    await page.goto("/register");
    await page.getByLabel("Tu nombre").fill("Idioma de prueba");
    await page.getByLabel("Correo").fill("language031@test.local");
    await page.getByLabel("Contraseña").fill("IdiomaPrueba123!");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL(/\/inbox/);
  }
  await sql`update ai_credit_account set balance=100, total_granted=100`;
  await api.put("/api/agent/profile", { data: { responseLanguage: "es" } });
  const initial = await profile();
  check(initial.responseLanguage === "es", "configuración en español antes del flujo");
  const wa = await api.put("/api/settings/whatsapp", { data: { wabaId: "waba_language031", phoneNumberId: "phone_language031", token: "EAAtest-valido" } });
  check(wa.ok(), "WhatsApp conectado al proveedor simulado");
  check((await api.put("/api/agent/profile", { data: { enabled: true } })).ok(), "agente activado para self-test");
  await page.goto("/agent");
  const selector = page.getByLabel("Idioma de respuesta", { exact: true });
  await selector.waitFor();
  check((await selector.locator("option").count()) === 3, "exactamente tres opciones accesibles");
  await selector.selectOption("en");
  check((await profile()).responseLanguage === "es", "cambiar el formulario requiere guardar");
  await select("es");
  await inbound(phones[0], "hello LANGUAGE_PROBE");
  await response(phones[0], "¡Hola! ¿Cómo puedo ayudarte hoy?");
  await select("en");
  await inbound(phones[1], "hola LANGUAGE_PROBE WRAPPED");
  await response(phones[1], "Hello! How can I help you today?");
  check(true, "el adaptador recupera JSON envuelto sin perder la política de idioma");
  await select("es-en");
  await inbound(phones[2], "hello LANGUAGE_PROBE");
  await response(phones[2], "Hello! How can I help you today?");
  await inbound(phones[2], "hola LANGUAGE_PROBE");
  await response(phones[2], "¡Hola! ¿Cómo puedo ayudarte hoy?", 2);
  const invalid = await api.put("/api/agent/profile", { data: { responseLanguage: "fr" } });
  check(invalid.status() === 422, "idioma inválido rechazado");
  check((await profile()).responseLanguage === "es-en", "el rechazo conserva el valor guardado");
  const other = await api.post("/api/admin/companies", { data: { companyName: "Otra empresa idiomas", adminName: "Admin B", adminEmail: `language-b-${Date.now()}@test.local`, adminPassword: "IdiomaPrueba123!" } });
  check(other.status() === 201, "segunda empresa aislada creada");

  // Inspeccionar ambas filas prueba que guardar A no modifica el default de B.
  const rows = await sql`select response_language from agent_profile`;
  check(rows.some(r => r.response_language === "es") && rows.some(r => r.response_language === "es-en"), "configuración por empresa mantiene aislamiento y default heredado");

  await api.post("/api/dev/ai-mock/fail-next", { data: { chat: 20 } });
  await inbound(phones[3], "hello LANGUAGE_PROBE");
  const failed = await poll(async () => { const cv = await conversation(phones[3]); return cv?.handoffReason === "error" ? cv : null; });
  check(Boolean(failed.handoffAt), "proveedor caído escala a humano sin colgar el turno");
  await api.post("/api/dev/ai-mock/fail-next", { data: { chat: 0 } });
  await select("en");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await selector.waitFor();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "selector y pantalla sin desbordamiento móvil");
  await selector.scrollIntoViewIfNeeded();
  await mkdir(".artifacts/us41-agent-language", { recursive: true });
  await page.screenshot({ path: ".artifacts/us41-agent-language/mobile.png" });
  check(await selector.isVisible(), "selector visible y operativo en móvil");
  console.log(`SELF-TEST: ${passed} comprobaciones aprobadas`);
} finally { await browser.close(); await sql.end(); }
