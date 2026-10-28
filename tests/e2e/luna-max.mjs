import assert from "node:assert/strict";
import { chromium } from "playwright";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3107";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_luna_035", { max: 1 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request;
const checks = [];
const check = (value, label) => { assert(value, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async res => { assert(res.ok(), `${res.status()} ${res.url()}`); return res.json(); };
const post = async (path, data) => json(await api.post(path, { data }));
const get = async path => json(await api.get(path));
async function poll(fn, condition = Boolean) { const end = Date.now() + 45000; while (Date.now() < end) { const value = await fn(); if (condition(value)) return value; await new Promise(r => setTimeout(r, 250)); } throw Error("Resultado no observable a tiempo"); }
const state = data => post("/api/dev/ai-mock/fail-next", data ?? {});
const dialog = page.getByRole("dialog", { name: "Chat demo del agente" });
const input = page.getByLabel("Mensaje para el agente demo");
async function send(text) {
  await input.fill(text);
  const response = page.waitForResponse(r => r.url().endsWith("/api/agent/demo") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Enviar prueba" }).click(); return response;
}
try {
  await mkdir(".artifacts/luna-max", { recursive: true });
  const login = await api.post("/api/auth/sign-in/email", { data: { email: "luna035@test.local", password: "LunaPrueba123!" } });
  if (!login.ok()) {
    await page.goto("/register"); await page.getByLabel("Tu nombre").fill("Admin Luna"); await page.getByLabel("Correo").fill("luna035@test.local"); await page.getByLabel("Contraseña").fill("LunaPrueba123!"); await page.getByRole("button", { name: "Crear cuenta" }).click(); await page.waitForURL(/\/inbox/);
  }
  const org = (await sql`select m.organization_id from member m join "user" u on u.id=m.user_id where u.email='luna035@test.local' limit 1`)[0].organization_id;
  await json(await api.put("/api/settings/whatsapp", { data: { wabaId: "waba_luna035", phoneNumberId: "phone_luna035", token: "EAAtest-valido" } }));
  await json(await api.put("/api/agent/profile", { data: { enabled: true, name: "Luna prueba", responseLanguage: "es" } }));
  await sql`insert into ai_credit_account (organization_id,balance) values (${org},100) on conflict (organization_id) do update set balance=100`;
  await state({ resetCounters: true });
  const phone = `57311${Date.now().toString().slice(-7)}`;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_luna035", from: phone, name: "Cliente prueba Luna", text: "Hola LANGUAGE_PROBE WRAPPED" });
  const cv = await poll(async () => (await get("/api/conversations")).conversations.find(c => c.contact.phone === phone));
  await poll(async () => (await get(`/api/conversations/${cv.id}/messages`)).messages.find(m => m.direction === "out" && m.aiGenerated));
  const requests = await poll(state, s => s.chatRequests.some(r => r.model === "gpt-5.6-luna"));
  check(requests.chatRequests.some(r => r.model === "gpt-6-luna" && r.reasoningEffort === "xhigh"), "turno WhatsApp usa Luna reciente con esfuerzo máximo admitido");
  check(requests.chatRequests.some(r => r.model === "gpt-5.6-luna" && r.reasoningEffort === null), "perfilado conserva modelo anterior y esfuerzo por defecto");
  await page.goto(`/inbox?contact=${cv.contact.id}`); await page.getByText("¡Hola! ¿Cómo puedo ayudarte hoy?", { exact: true }).first().waitFor();
  check(true, "respuesta recuperada de JSON envuelto visible en Bandeja");
  await page.screenshot({ path: ".artifacts/luna-max/inbox.png", fullPage: true });
  await page.goto("/agent"); await page.getByRole("button", { name: "Abrir chat demo" }).click(); await dialog.waitFor();
  await state({ resetCounters: true });
  check((await send("Hola DEMO_ENVUELTO")).ok(), "demo responde con la configuración nueva");
  await dialog.getByText("¡Hola! Soy Luna prueba. ¿Cómo puedo ayudarte?", { exact: true }).waitFor();
  let current = await state(); check(current.chatRequests.every(r => r.model === "gpt-6-luna" && r.reasoningEffort === "xhigh"), "el transporte del demo incluye esfuerzo xhigh");
  await page.screenshot({ path: ".artifacts/luna-max/demo.png", fullPage: true });
  await state({ resetCounters: true, chat: 3 });
  check((await send("Necesito información")).status() === 503, "fallo persistente del proveedor degrada sin colgarse");
  await dialog.getByRole("alert").waitFor();
  check(await input.inputValue() === "Necesito información" && await page.getByRole("button", { name: "Enviar prueba" }).isEnabled(), "UI conserva el mensaje y permite reintentar");
  current = await state(); check(current.chatCalls === 3 && current.chatRequests.every(r => r.reasoningEffort === "xhigh"), "reintentos conservan el máximo de razonamiento");
  check((await send("Hola DEMO_ENVUELTO")).ok(), "el siguiente turno se recupera al volver el proveedor");
  await state({ resetCounters: true });
  check((await send("DEMO_FORMATO_INVALIDO")).status() === 503, "JSON inválido devuelve error controlado");
  current = await state(); check(current.chatCalls === 3 && await input.inputValue() === "DEMO_FORMATO_INVALIDO", "formato inválido agota reintentos y conserva el mensaje");
  await writeFile(".artifacts/luna-max/e2e.json", JSON.stringify({ passed: checks.length, checks }, null, 2));
  console.log(`LUNA: ${checks.length} comprobaciones aprobadas`);
} finally { await browser.close(); await sql.end(); }
