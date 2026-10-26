import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3110", evidence = ".artifacts/sms";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_sms_034", { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request, checks = [];
const key = "sms-mock-valid-account-1111";
const check = (yes, label) => { assert(yes, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async r => { assert(r.ok(), `${r.status()} ${await r.text()}`); return r.json(); };
const config = async () => json(await api.get("/api/settings/sms"));
async function saveUI(value, success = true) {
  await page.getByLabel("Nueva clave API de Brevo", { exact: true }).or(page.getByLabel("Clave API de Brevo", { exact: true })).fill(value);
  const response = page.waitForResponse(r => r.url().endsWith("/api/settings/sms") && r.request().method() === "PUT");
  await page.getByRole("button", { name: "Verificar y conectar Brevo" }).click();
  const r = await response;
  if (success) { await json(r); await page.getByRole("status").waitFor(); }
  else { check(!r.ok(), "UI conserva fallo como error de operación"); await page.getByLabel("Conexión de SMS", { exact: true }).getByRole("alert").waitFor(); }
  return r;
}
try {
  await mkdir(evidence, { recursive: true });
  const anonymous = await request.newContext({ baseURL });
  for (const path of ["/api/settings/sms", "/api/settings/sms/test"]) {
    const r = path.endsWith("test") ? await anonymous.post(path) : await anonymous.get(path);
    check(r.status() === 401, `sin sesión no accede a ${path}`);
  }
  await anonymous.dispose();
  const login = await api.post("/api/auth/sign-in/email", { data: { email: "sms034@test.local", password: "SmsPrueba123!" } });
  if (!login.ok()) {
    await page.goto("/register");
    await page.getByLabel("Tu nombre").fill("Admin SMS"); await page.getByLabel("Correo").fill("sms034@test.local"); await page.getByLabel("Contraseña").fill("SmsPrueba123!");
    await page.getByRole("button", { name: "Crear cuenta" }).click(); await page.waitForURL(/\/inbox/);
  }
  const org = (await sql`select organization_id from member m join "user" u on u.id=m.user_id where u.email='sms034@test.local' limit 1`)[0].organization_id;
  await api.delete("/api/settings/sms");
  await page.goto("/settings/sms"); await page.getByText("Sin cuenta de Brevo conectada", { exact: true }).waitFor();
  check((await config()).connection === null, "sin conexión por defecto");
  check((await api.post("/api/settings/sms/test")).status() === 409, "probar sin conexión informa pendiente");
  await saveUI(key);
  let c = (await config()).connection;
  check(c.email === "admin@example.test" && c.smsCredits === 25 && !c.deliveryEnabled, "conecta desde interfaz y distingue API de habilitación de envíos");
  const publicJson = JSON.stringify(c);
  check(!publicJson.includes(key) && !publicJson.includes("mock-provider-secret") && !publicJson.includes("secretCipher"), "respuesta no expone claves propias ni incluidas por Brevo");
  const [stored] = await sql`select secret_cipher,secret_iv,secret_tag from sms_connection where organization_id=${org}`;
  check(stored.secret_cipher !== key && !stored.secret_cipher.includes(key) && stored.secret_iv && stored.secret_tag, "clave cifrada en reposo");
  check(await page.getByLabel("Nueva clave API de Brevo").inputValue() === "", "clave se limpia al guardar");
  await page.reload(); await page.getByText("Cuenta API conectada", { exact: true }).waitFor();
  check(await page.getByLabel("Nueva clave API de Brevo").inputValue() === "", "recarga no recupera clave completa");
  await page.getByRole("button", { name: "Actualizar cuenta y saldo" }).click(); await page.getByRole("status").waitFor();
  check((await config()).connection.smsCredits === 25, "comprueba la cuenta guardada sin enviar SMS");
  for (const [bad, status] of [["sms-mock-invalid-key-0000",422],["sms-mock-unavailable-0000",503],["sms-mock-malformed-0000",503],["sms-mock-rate-limit-0000",503]]) {
    const before = (await config()).connection;
    const r = await saveUI(bad, false); const body = await r.text();
    check(r.status() === status && !body.includes(bad), `${bad}: error controlado y secreto no expuesto`);
    check(JSON.stringify((await config()).connection) === JSON.stringify(before), `${bad}: reemplazo fallido conserva conexión anterior`);
  }
  await saveUI("sms-mock-zero-balance-0000"); check((await config()).connection.smsCredits === 0, "saldo cero se muestra explícitamente");
  await saveUI("sms-mock-unknown-balance-0000"); check((await config()).connection.smsCredits === null, "saldo ausente no se inventa como cero");
  await page.screenshot({ path: `${evidence}/connection-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "configuración SMS sin desbordamiento móvil");
  await page.screenshot({ path: `${evidence}/connection-mobile.png`, fullPage: true });
  const email = `sms-b-${Date.now()}@test.local`;
  await json(await api.post("/api/admin/companies", { data: { companyName: "SMS B", adminName: "Admin B", adminEmail: email, adminPassword: "SmsPrueba123!" } }));
  const apiB = await request.newContext({ baseURL }); await json(await apiB.post("/api/auth/sign-in/email", { data: { email, password: "SmsPrueba123!" } }));
  check((await json(await apiB.get("/api/settings/sms"))).connection === null, "empresa B no lee conexión de A");
  await json(await apiB.put("/api/settings/sms", { data: { apiKey: "sms-mock-second-account-2222" } }));
  check((await config()).connection.email === "admin@example.test", "empresa B no reemplaza conexión de A");
  await apiB.delete("/api/settings/sms"); check((await config()).connection !== null, "desconectar B conserva conexión de A");
  await sql`update member set role='commercial' where user_id=(select id from "user" where email=${email})`;
  for (const method of ["get", "put", "delete"]) {
    const r = await apiB[method]("/api/settings/sms", { data: { apiKey: key } }); check(r.status() === 403, `rol comercial bloqueado en ${method}`);
  }
  check((await apiB.post("/api/settings/sms/test")).status() === 403, "rol comercial no verifica credencial"); await apiB.dispose();
  check((await api.put("/api/settings/sms", { data: { apiKey: key, organizationId: "other" } })).status() === 422, "no acepta tenant suministrado por cliente");
  await page.getByRole("button", { name: "Desconectar Brevo" }).click(); await page.getByText("Brevo desconectado.", { exact: true }).waitFor();
  check((await config()).connection === null && (await sql`select id from sms_connection where organization_id=${org}`).length === 0, "desconexión elimina secreto del tenant");
  check((await api.post("/api/sms/send", { data: { recipient: "+12025550123", content: "test" } })).status() === 404, "no hay endpoint que envíe sin aprobación/configuración");
  await writeFile(`${evidence}/e2e.json`, JSON.stringify({ passed: checks.length, checks }, null, 2));
  console.log(`SMS CONNECTION: ${checks.length} comprobaciones aprobadas`);
} finally { await browser.close(); await sql.end(); }
