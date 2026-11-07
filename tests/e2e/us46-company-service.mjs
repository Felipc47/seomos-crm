import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, request } from "playwright";
import postgres from "postgres";

const baseURL = process.env.SERVICE_TEST_BASE_URL ?? "http://127.0.0.1:3108";

const dbURL = process.env.SERVICE_TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/seomos_company_service_037";
const testDB = new URL(dbURL);
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname) || !["127.0.0.1", "localhost"].includes(testDB.hostname) || !/^\/seomos_company_service_037(_release)?$/.test(testDB.pathname)) throw new Error("Solo self-test local con base dedicada 037");

const sql = postgres(dbURL, { max: 3 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const rootContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
rootContext.setDefaultTimeout(45000);
const root = await rootContext.newPage(), api = rootContext.request;
const password = "ServicePrueba123!", stamp = Date.now();
const phoneNumberId = `phone_test_${stamp}`, wabaId = `waba_test_${stamp}`;
let count = 0;
const check = (value, label) => { assert(value, label); console.log(`✓ ${++count}. ${label}`); };
const json = async res => { assert(res.ok(), `${res.status()} ${res.url()} ${await res.text()}`); return res.json(); };
const contexts = [rootContext], clients = [];
const errors = [];
root.on("pageerror", err => errors.push(err.message));
async function loginPage(page, email) {
  await page.goto("/login");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function loginClient(email) {
  const client = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  clients.push(client);
  await json(await client.post("/api/auth/sign-in/email", { data: { email, password } }));
  return client;
}
async function waitFor(read, predicate) {
  for (let i = 0; i < 80; i++) { const value = await read(); if (predicate(value)) return value; await new Promise(resolve => setTimeout(resolve, 250)); }
  throw new Error("Resultado del webhook no observado");
}
const row = id => root.getByTestId(`company-${id}`);
try {
  await mkdir(".artifacts/us46-company-service", { recursive: true });
  const [founder] = await sql`select email from "user" where is_superadmin=true`;
  if (!founder) {
    await root.goto("/register");
    await root.getByLabel("Tu nombre").fill("Superadmin de prueba");
    await root.getByLabel("Correo").fill("ceo@seomos.com");
    await root.getByLabel("Contraseña").fill(password);
    await root.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  } else await loginPage(root, founder.email);
  await root.waitForURL(/\/inbox/);
  const tenantEmails = [`alpha-${stamp}@service.test`, `beta-${stamp}@service.test`];
  for (const [i, email] of tenantEmails.entries()) await json(await api.post("/api/admin/companies", { data: {
    companyName: `${i === 0 ? "Empresa Alfa" : "Empresa Beta"} ${stamp}`, adminName: "Admin QA", adminEmail: email, adminPassword: password,
  } }));
  const listing = await json(await api.get("/api/admin/companies"));
  const a = listing.companies.find(c => c.adminEmail === tenantEmails[0]);
  const b = listing.companies.find(c => c.adminEmail === tenantEmails[1]);
  const serviceUrl = `/api/admin/companies/${a.id}/service`;
  const aContext = await browser.newContext({ baseURL, viewport: { width: 1365, height: 900 } }); contexts.push(aContext);
  aContext.setDefaultTimeout(45000);
  const tenant = await aContext.newPage(); tenant.on("pageerror", err => errors.push(err.message));
  await loginPage(tenant, tenantEmails[0]); await tenant.waitForURL(/\/inbox/);
  const apiA = aContext.request, apiB = await loginClient(tenantEmails[1]);
  check((await apiA.patch(`/api/admin/companies/${b.id}/service`, { data: { enabled: false, reason: "payment" } })).status() === 403, "admin de empresa no puede suspender otras empresas");
  check((await api.patch(`/api/admin/companies/${listing.ownOrganizationId}/service`, { data: { enabled: false, reason: "payment" } })).status() === 403, "superadmin conserva su propia empresa activa");
  for (const data of [{ enabled: false, reason: "other" }, { enabled: false, reason: "custom", message: " " }, { enabled: false, reason: "payment", message: "x".repeat(501) }]) {
    check((await api.patch(serviceUrl, { data })).status() === 422, "motivos y avisos inválidos rechazados sin cambiar el servicio");
  }
  check((await api.patch(serviceUrl, { data: "{", headers: { "content-type": "application/json" } })).status() === 422, "JSON inválido no cambia el servicio");
  check((await api.patch("/api/admin/companies/missing/service", { data: { enabled: true } })).status() === 404, "empresa inexistente devuelve 404");
  await json(await apiA.put("/api/settings/whatsapp", { data: { wabaId, phoneNumberId, token: "mock-token-service037" } }));
  await json(await apiA.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId, from: "573001234567", name: "Contacto conservado", text: "Hola antes de la pausa", waMessageId: `wamid.before-${stamp}` } }));
  const contactsBefore = (await waitFor(async () => json(await apiA.get("/api/contacts")), value => value.contacts.some(c => c.name === "Contacto conservado"))).contacts;
  check(contactsBefore.some(c => c.name === "Contacto conservado"), "WhatsApp mock ingresa mensajes con el servicio activo");
  const [before] = await sql`select (select count(*) from contact where organization_id=${a.id}) as contacts, (select count(*) from message where organization_id=${a.id}) as messages, (select balance from ai_credit_account where organization_id=${a.id}) as balance`;
  await root.goto("/companies"); await row(a.id).getByText("Servicio activo", { exact: true }).waitFor();
  check(await row(listing.ownOrganizationId).getByRole("button", { name: "Suspender servicio", exact: true }).count() === 0, "Empresas protege el botón de la organización propia");
  await row(a.id).getByRole("button", { name: "Suspender servicio", exact: true }).click();
  let dialog = root.getByRole("dialog", { name: "Suspender servicio", exact: true });
  await dialog.waitFor();
  await dialog.screenshot({ path: ".artifacts/us46-company-service/suspension-dialog.png" });
  check((await dialog.getByLabel("Mensaje para la empresa").inputValue()).includes("Gracias por tu paciencia"), "mantenimiento ofrece mensaje amable y vista previa");
  await dialog.getByLabel("Mensaje para la empresa").fill(" ");
  check(await dialog.getByRole("button", { name: "Suspender servicio", exact: true }).isDisabled(), "aviso vacío deshabilita guardar");
  await dialog.getByLabel("Motivo del aviso").selectOption("payment");
  check((await dialog.getByLabel("Mensaje para la empresa").inputValue()).includes("Estamos para ayudarte"), "pago pendiente usa un mensaje amable");
  await dialog.getByLabel("Motivo del aviso").selectOption("maintenance");
  await root.route(`**${serviceUrl}`, route => route.abort("failed"));
  await dialog.getByRole("button", { name: "Suspender servicio", exact: true }).click();
  await dialog.getByRole("alert").getByText("No pudimos conectar con el servidor. Inténtalo de nuevo.").waitFor();
  check(await dialog.getByRole("button", { name: "Suspender servicio", exact: true }).isEnabled(), "fallo de red deja reintentar sin colgar el diálogo");
  await root.unroute(`**${serviceUrl}`);
  await dialog.getByRole("button", { name: "Suspender servicio", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  await row(a.id).getByText("Servicio suspendido", { exact: true }).waitFor();
  await tenant.waitForURL(/\/service-unavailable/); await tenant.getByRole("heading", { name: "Estamos mejorando tu experiencia" }).waitFor();
  check(await tenant.getByText("Tus datos se conservan.", { exact: false }).isVisible(), "sesión abierta muestra aviso sin perder sus datos");
  for (const path of ["/api/contacts", "/api/conversations", "/api/settings/team", "/api/agent/profile", "/api/admin/companies", "/api/events", "/api/auth/organization/list"]) {
    const res = await apiA.get(path);
    check(res.status() === 403 && (await res.json()).error.code === "service_suspended", `${path}: acceso suspendido bloqueado en servidor`);
  }
  check((await apiB.get("/api/contacts")).status() === 200, "otra empresa conserva su acceso y sus datos aislados");
  const status = await json(await apiA.get("/api/service-status?organizationId=" + b.id));
  check(status.suspended && status.companyName === a.name, "estado ignora tenant inyectado y solo expone la empresa de la sesión");
  await json(await apiA.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId, from: "573001234567", text: "No debe ingresar durante la pausa", waMessageId: `wamid.paused-${stamp}` } }));
  check((await sql`select count(*) as n from message where organization_id=${a.id} and wa_message_id=${`wamid.paused-${stamp}`}`)[0].n === "0", "webhook durante pausa no ingresa ni activa al agente");
  const newLogin = await loginClient(tenantEmails[0]);
  check((await newLogin.get("/api/contacts")).status() === 403, "una sesión nueva también respeta la suspensión");
  await row(a.id).getByRole("button", { name: "Editar aviso", exact: true }).click();
  dialog = root.getByRole("dialog", { name: "Editar aviso", exact: true });
  await dialog.getByLabel("Motivo del aviso").selectOption("payment");
  await dialog.getByRole("button", { name: "Guardar aviso", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  await tenant.getByRole("heading", { name: "Tu servicio está en pausa", exact: true }).waitFor();
  check(await tenant.getByText("Estamos para ayudarte.", { exact: false }).isVisible(), "editar el aviso actualiza la pantalla del usuario conectado");
  await row(a.id).getByRole("button", { name: "Editar aviso", exact: true }).click();
  dialog = root.getByRole("dialog", { name: "Editar aviso", exact: true });
  await dialog.getByLabel("Motivo del aviso").selectOption("custom");
  const custom = "Estamos preparando mejoras para ti. Volvemos pronto. Gracias por tu comprensión.";
  await dialog.getByLabel("Mensaje para la empresa").fill(custom);
  await dialog.getByRole("button", { name: "Guardar aviso", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  await tenant.getByText(custom, { exact: true }).waitFor();
  check(true, "aviso personalizado se guarda y actualiza sin pedir nuevo login");
  await tenant.screenshot({ path: ".artifacts/us46-company-service/notice-desktop.png", fullPage: true });
  await tenant.setViewportSize({ width: 390, height: 844 });
  check(await tenant.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "aviso móvil cabe sin desbordamiento horizontal");
  await tenant.route("**/api/service-status", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await tenant.getByRole("button", { name: "Comprobar acceso" }).click();
  await tenant.getByRole("status").getByText("No pudimos comprobar el acceso.", { exact: false }).waitFor();
  check(await tenant.getByRole("button", { name: "Comprobar acceso" }).isEnabled(), "comprobación de acceso se recupera de fallo de red");
  await tenant.unroute("**/api/service-status");
  await tenant.getByRole("button", { name: "Comprobar acceso" }).click();
  await tenant.getByRole("status").getByText("El servicio sigue en pausa.", { exact: false }).waitFor();
  await tenant.screenshot({ path: ".artifacts/us46-company-service/notice-mobile.png", fullPage: true });
  await root.screenshot({ path: ".artifacts/us46-company-service/companies-desktop.png", fullPage: true });
  await root.setViewportSize({ width: 390, height: 844 });
  await row(a.id).getByRole("button", { name: "Reactivar servicio", exact: true }).scrollIntoViewIfNeeded();
  check(await root.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Empresas móvil conserva controles sin desbordamiento");
  await root.screenshot({ path: ".artifacts/us46-company-service/companies-mobile.png", fullPage: true });
  await row(a.id).getByRole("button", { name: "Reactivar servicio", exact: true }).click();
  await row(a.id).getByText("Servicio activo", { exact: true }).waitFor();
  await tenant.waitForURL(/\/inbox/);
  const contactsAfter = (await json(await apiA.get("/api/contacts"))).contacts;
  check(contactsAfter.some(c => c.id === contactsBefore.find(c => c.name === "Contacto conservado").id), "reactivar recupera la misma sesión y los mismos contactos");
  const [after] = await sql`select (select count(*) from contact where organization_id=${a.id}) as contacts, (select count(*) from message where organization_id=${a.id}) as messages, (select balance from ai_credit_account where organization_id=${a.id}) as balance`;
  check(JSON.stringify(before) === JSON.stringify(after), "pausa y reactivación conservan contactos, mensajes y créditos");
  await json(await apiA.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId, from: "573001234567", text: "Mensaje después de reactivar", waMessageId: `wamid.after-${stamp}` } }));
  check(await waitFor(async () => (await sql`select count(*) as n from message where organization_id=${a.id} and wa_message_id=${`wamid.after-${stamp}`}`)[0].n, n => n === "1"), "WhatsApp vuelve a ingresar mensajes tras reactivar");
  await json(await api.patch(serviceUrl, { data: { enabled: true } }));
  check((await sql`select suspended_at, suspension_reason, suspension_message from organization where id=${a.id}`)[0].suspension_message === null, "reactivar es idempotente y retira el aviso");
  await json(await api.delete(`/api/admin/companies/${b.id}`));
  check((await api.patch(`/api/admin/companies/${b.id}/service`, { data: { enabled: true } })).status() === 404, "reactivar servicio no restaura empresas eliminadas");
  const anon = await request.newContext({ baseURL }); clients.push(anon);
  check((await anon.patch(serviceUrl, { data: { enabled: true } })).status() === 401, "cambiar el servicio exige sesión");
  check((await anon.get("/api/service-status")).status() === 401, "el aviso no expone empresas a visitantes anónimos");
  check(errors.length === 0, `sin errores JavaScript: ${errors.join("; ")}`);
  console.log(`SELF-TEST SERVICIO POR EMPRESA: ${count} comprobaciones aprobadas`);
} catch (error) {
  for (const [i, context] of contexts.entries()) for (const [j, page] of context.pages().entries()) await page.screenshot({ path: `.artifacts/us46-company-service/failure-${i}-${j}.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  for (const client of clients) await client.dispose();
  for (const context of contexts) await context.close();
  await browser.close(); await sql.end();
}
