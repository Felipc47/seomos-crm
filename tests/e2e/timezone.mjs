import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3109", password = "TimezonePrueba123!", stamp = Date.now();
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_timezone_039", { max: 3 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, timezoneId: "Asia/Tokyo", viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request, errors = [], checks = [];
page.on("pageerror", e => errors.push(e.message));
const check = (value, label) => { assert(value, label); checks.push(label); console.log(`✓ ${checks.length}. ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${response.url()} ${await response.text()}`); return response.json(); };
const get = async path => json(await api.get(path));
const select = () => page.getByLabel("Zona horaria", { exact: true });
async function save(zone) {
  await select().selectOption(zone);
  const pending = page.waitForResponse(r => r.request().method() === "PUT" && r.url().endsWith("/api/settings/timezone"));
  await page.getByRole("button", { name: "Guardar zona horaria", exact: true }).click();
  await json(await pending); await page.getByRole("status").filter({ hasText: "Zona horaria guardada" }).waitFor();
}
async function login(email) {
  const client = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  await json(await client.post("/api/auth/sign-in/email", { data: { email, password } })); return client;
}
try {
  await mkdir(".artifacts/timezone039", { recursive: true });
  const anon = await request.newContext({ baseURL });
  check((await anon.get("/api/settings/timezone")).status() === 401, "lectura exige sesión");
  check((await anon.put("/api/settings/timezone", { data: { timezone: "UTC" } })).status() === 401, "escritura exige sesión"); await anon.dispose();
  await page.goto("/register"); await page.getByLabel("Tu nombre").fill("SEOMOS QA");
  await page.getByLabel("Correo").fill(`owner-${stamp}@timezone.test`); await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click(); await page.waitForURL(/\/inbox/);
  await page.goto("/settings/timezone"); await select().waitFor();
  check(await select().inputValue() === "America/Bogota", "Bogotá predeterminada aunque navegador esté en Tokio");
  check((await select().locator("option").count()) > 400, "selector permite zonas mundiales");
  check(await page.getByRole("link", { name: "Zona horaria", exact: true }).isVisible(), "ajuste aparece en navegación");
  const [{ organization_id: orgA }] = await sql`select organization_id from member m join "user" u on u.id=m.user_id where u.email=${`owner-${stamp}@timezone.test`}`;
  await json(await api.put("/api/settings/calendar", { data: { defaultTitle: "Conservar título", internalInvitees: ["qa@example.test"], defaultDurationMin: 60 } }));
  await sql`update organization set metadata=(metadata::jsonb || '{"unrelated":{"keep":true}}'::jsonb)::text where id=${orgA}`;
  await page.route("**/api/settings/timezone", route => route.request().method() === "PUT" ? route.abort() : route.continue());
  await select().selectOption("America/New_York"); await page.getByRole("button", { name: "Guardar zona horaria" }).click(); await page.getByRole("alert").filter({ hasText: "No se pudo guardar" }).waitFor();
  check(await select().inputValue() === "America/New_York", "fallo de red conserva selección");
  check((await get("/api/settings/timezone")).timezone === "America/Bogota", "fallo de red no cambia valor persistido");
  await page.unroute("**/api/settings/timezone"); await save("America/New_York"); await page.reload(); await select().waitFor();
  check(await select().inputValue() === "America/New_York", "guardar y recargar conserva Florida");
  const calendar = (await get("/api/settings/calendar")).settings;
  check(calendar.timezone === "America/New_York" && calendar.defaultTitle === "Conservar título" && calendar.defaultDurationMin === 60 && calendar.internalInvitees[0] === "qa@example.test", "cambiar zona preserva los otros ajustes de calendario");
  check((await sql`select metadata::jsonb->'unrelated' as other from organization where id=${orgA}`)[0].other.keep === true, "preserva metadata ajena");
  check((await get("/api/dashboard?range=today")).range.timezone === "America/New_York", "reportes usan misma zona que ajustes");
  for (const timezone of ["No/Existe", "", "+05:00", "EST"]) check((await api.put("/api/settings/timezone", { data: { timezone } })).status() === 422, `rechaza zona inválida ${timezone}`);
  check((await api.put("/api/settings/timezone", { data: { timezone: "UTC", organizationId: "ajena" } })).status() === 422, "rechaza intento de elegir empresa en el body");
  check((await get("/api/settings/timezone")).timezone === "America/New_York", "entrada inválida conserva configuración");
  const clients = [];
  for (const [name, zone] of [["Lion Data QA", "America/New_York"], ["Baterías Conecta QA", "America/Bogota"]]) {
    const email = `${clients.length}-${stamp}@timezone.test`;
    await json(await api.post("/api/admin/companies", { data: { companyName: name, adminName: name, adminEmail: email, adminPassword: password } }));
    const client = await login(email); await json(await client.put("/api/settings/timezone", { data: { timezone: zone } }));
    clients.push(client); check((await json(await client.get("/api/settings/timezone"))).timezone === zone, `admin de ${name} guarda su zona`);
  }
  await json(await clients[0].put("/api/settings/timezone", { data: { timezone: "Europe/Madrid" } }));
  check((await get("/api/settings/timezone")).timezone === "America/New_York" && (await json(await clients[1].get("/api/settings/timezone"))).timezone === "America/Bogota", "cambios de otra empresa no cruzan tenants");
  for (const role of ["commercial", "marketing", "agent_editor"]) {
    const email = `${role}-${stamp}@timezone.test`;
    await json(await api.post("/api/settings/team", { data: { name: role, email, password, role } }));
    const client = await login(email); clients.push(client);
    check((await client.put("/api/settings/timezone", { data: { timezone: "UTC" } })).status() === 403, `${role} no edita zona`);
    check((await json(await client.get("/api/settings/timezone"))).timezone === "America/New_York", `${role} usa zona de su empresa`);
    const restricted = await browser.newContext({ baseURL, storageState: await client.storageState() });
    const restrictedPage = await restricted.newPage(); await restrictedPage.goto("/settings/timezone"); await restrictedPage.waitForURL(/\/settings\/profile/);
    check(await restrictedPage.getByRole("link", { name: "Zona horaria", exact: true }).count() === 0, `${role} no ve ajuste administrativo`); await restricted.close();
  }
  // Datos del canal solo mediante los proveedores mock.
  await json(await api.put("/api/settings/whatsapp", { data: { wabaId: "timezone_waba", phoneNumberId: "timezone_phone", token: "EAAtest-timezone" } }));
  await json(await api.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId: "timezone_phone", from: "573100039001", name: "Prospecto zona", text: "Mensaje de zona horaria", timestamp: Math.floor(new Date("2027-07-15T13:00:00Z").getTime()/1000) } }));
  const contacts = (await get("/api/contacts?q=573100039001")).contacts;
  const contactId = contacts[0].id;

  await page.goto(`/inbox?contact=${contactId}`);
  // Seleccionar la fila si la URL no activa la conversación.
  const message = page.getByText("Mensaje de zona horaria", { exact: true }).last();
  if (!(await message.count())) await page.getByText("Prospecto zona", { exact: true }).first().click();
  await message.waitFor();
  await page.getByText("09:00", { exact: true }).first().waitFor();
  check(await page.getByText("09:00", { exact: true }).count() > 0, "burbuja muestra 09:00 Florida y no 22:00 Tokio");
  await json(await api.put(`/api/contacts/${contactId}/meeting`, { data: { startIso: "2027-07-15T13:00:00Z", title: "Reunión QA", reminderEnabled: false } }));
  const before = await get(`/api/contacts/${contactId}/meeting`);
  check(before.timezone === "America/New_York" && before.meeting.timezone === "America/New_York", "nuevas reuniones usan zona configurada");
  await page.goto("/settings/timezone"); await save("America/Bogota");
  const after = await get(`/api/contacts/${contactId}/meeting`);
  check(after.timezone === "America/Bogota" && after.meeting.startIso === before.meeting.startIso && after.meeting.timezone === "America/New_York", "cambio no reprograma reuniones existentes");
  await page.goto(`/inbox?contact=${contactId}`); if (!(await message.count())) await page.getByText("Prospecto zona", { exact: true }).first().click(); await message.waitFor();
  await page.getByText("08:00", { exact: true }).first().waitFor();
  check(await page.getByText("08:00", { exact: true }).count() > 0, "burbuja cambia a 08:00 Bogotá");
  await page.goto("/settings/timezone"); await save("Asia/Tokyo"); await page.reload(); await select().waitFor(); check(await select().inputValue() === "Asia/Tokyo", "cliente puede elegir libremente una tercera zona");
  await save("America/New_York");
  await sql`update organization set mailing_enabled=true where id=${orgA}`;
  const snapshot = {
    sender: { domain: "example.test", fromEmail: "qa@example.test", fromName: "QA", replyTo: null, status: "verified", records: [], trackOpens: false, trackClicks: false, canConfigureTracking: true, lastError: null },
    configured: true, canConfigure: true, operatorEmail: "qa@example.test",
    lists: [{ id: "listqa", name: "Lista QA", members: 1, eligible: 1 }], subscribers: [], enrollments: [], sends: [],
    programs: [{ id: "programqa", name: "Campaña QA", kind: "campaign", listId: "listqa", status: "draft", autoEnroll: false, scheduledAt: null, steps: [{ day: 0, subject: "Prueba", body: "Mensaje QA" }] }],
  };
  let scheduledRequest;
  await page.route("**/api/mailing", async route => {
    if (route.request().method() === "POST") { scheduledRequest = route.request().postDataJSON(); await route.fulfill({ json: { ok: true } }); }
    else await route.fulfill({ json: snapshot });
  });
  await page.goto("/mailing");
  await page.getByRole("button", { name: /Campaña QA/ }).click();
  await page.getByRole("radio", { name: /Programar para después/ }).check();
  await page.getByLabel("Programar campaña", { exact: true }).fill("2027-07-15T09:00");
  check(await page.getByText("Zona horaria de la empresa: America/New_York", { exact: false }).isVisible(), "mailing identifica la zona empresarial");
  await page.getByRole("button", { name: "Revisar programación", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  await dialog.getByRole("button", { name: "Programar campaña", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Campaña programada" }).waitFor();
  check(scheduledRequest?.scheduledAt === "2027-07-15T13:00:00.000Z", "09:00 Florida se programa a 13:00 UTC aunque navegador esté en Tokio");
  await page.getByLabel("Programar campaña", { exact: true }).fill("2027-03-14T02:30");
  await page.getByRole("button", { name: "Revisar programación", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "no existe" }).waitFor();
  check(await page.getByRole("dialog").isVisible() === false, "hora inexistente por DST muestra error y no abre envío");
  await page.unroute("**/api/mailing");
  await page.goto("/settings/timezone"); await select().waitFor();
  await page.screenshot({ path: ".artifacts/timezone039/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "selector no desborda móvil"); await page.screenshot({ path: ".artifacts/timezone039/mobile.png", fullPage: true });
  const runScript = args => promisify(execFile)(process.execPath, ["scripts/set-organization-timezone.mjs", ...args], { env: { ...process.env, DATABASE_URL: "postgresql://postgres@127.0.0.1:5433/seomos_timezone_039" } });
  await runScript([`${orgA}=America/Bogota`]);
  check((await get("/api/settings/timezone")).timezone === "America/Bogota", "operación de configuración productiva probada en empresa ficticia");
  await assert.rejects(runScript([`${orgA}=UTC`, "org_missing=UTC"]));
  check((await get("/api/settings/timezone")).timezone === "America/Bogota", "empresa inexistente revierte toda la operación administrativa");
  check((await get("/api/settings/calendar")).settings.defaultTitle === "Conservar título", "operación administrativa conserva ajustes existentes");
  check(errors.length === 0, `sin errores de navegador: ${errors.join("; ")}`);
  await writeFile(".artifacts/timezone039/checks.json", JSON.stringify({ checks, browserTimezone: "Asia/Tokyo", ok: true }, null, 2));
  for (const client of clients) await client.dispose();
  console.log(`SELF-TEST ZONA HORARIA: ${checks.length} comprobaciones aprobadas`);
} finally { await browser.close(); await sql.end(); }
