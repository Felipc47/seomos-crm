import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, request } from "playwright";
import postgres from "postgres";

const baseURL = process.env.CALENDAR_DESCRIPTION_BASE_URL ?? "http://127.0.0.1:3110";
const dbURL = process.env.CALENDAR_DESCRIPTION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/seomos_calendar_description_041";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname) || new URL(dbURL).pathname !== "/seomos_calendar_description_041" || !["localhost", "127.0.0.1"].includes(new URL(dbURL).hostname)) throw new Error("Solo self-test local con base dedicada 041");
const sql = postgres(dbURL, { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1400, height: 1050 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request, clients = [], checks = [], errors = [];
page.on("pageerror", error => errors.push(error.message));
const evidence = ".artifacts/calendar-description", stamp = Date.now(), password = "DescriptionPrueba123!";
const defaultDescription = "Agendada desde Seomos CRM para {{nombre}} ({{telefono}}).";
const custom = "Hi {{nombre}},\nwe will review your online store and inventory.\nWhatsApp: {{telefono}}\nPlease bring your questions.";
const check = (value, label) => { assert(value, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${response.url()} ${await response.text()}`); return response.json(); };
const get = path => api.get(path).then(json), put = (path, data) => api.put(path, { data }).then(json), post = (path, data) => api.post(path, { data }).then(json);
const settings = async () => (await get("/api/settings/calendar")).settings;
const events = async () => (await get("/api/dev/google-mock/outbox")).events;
async function poll(read, predicate = Boolean) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) { const value = await read(); if (predicate(value)) return value; await new Promise(resolve => setTimeout(resolve, 250)); }
  throw new Error("Timed out waiting for observable result");
}
async function loginClient(email) {
  const client = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } }); clients.push(client);
  await json(await client.post("/api/auth/sign-in/email", { data: { email, password } })); return client;
}
async function saveUI(text) {
  await page.getByLabel("Descripción de la reunión", { exact: true }).fill(text);
  const response = page.waitForResponse(response => response.url().endsWith("/api/settings/calendar") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Guardar ajustes", exact: true }).click();
  assert((await response).ok());
  await page.getByRole("status").getByText("Ajustes de calendario guardados", { exact: true }).waitFor();
}
let n = 0, organizationId;
async function lead(name) {
  const phone = `5730${String(stamp).slice(-7)}${String(++n).padStart(2, "0")}`;
  const contact = (await post("/api/contacts", { name, phone, email: "prospect@example.test" })).contact;
  const conversation = (await post("/api/conversations", { contactId: contact.id })).conversation;
  return { ...contact, conversationId: conversation.id };
}
const nextFriday = new Date(Date.now() + 8 * 86400000);
while (nextFriday.getUTCDay() !== 5) nextFriday.setUTCDate(nextFriday.getUTCDate() + 1);
const day = nextFriday.toISOString().slice(0, 10);
const instant = hour => `${day}T${String(hour + 5).padStart(2, "0")}:00:00.000Z`;
const render = contact => custom.replaceAll("{{nombre}}", contact.name).replaceAll("{{telefono}}", contact.phone);
try {
  await mkdir(evidence, { recursive: true });
  const login = await api.post("/api/auth/sign-in/email", { data: { email: "description041@test.local", password } });
  if (!login.ok()) {
    await page.goto("/register");
    await page.getByLabel("Tu nombre").fill("Admin descripción");
    await page.getByLabel("Correo").fill("description041@test.local");
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    await page.waitForURL(/\/inbox/);
  }
  organizationId = (await sql`select m.organization_id from member m join "user" u on u.id=m.user_id where u.email='description041@test.local' limit 1`)[0].organization_id;
  // Reset only this isolated test organization's settings; simulates a legacy tenant.
  await sql`update organization set metadata='{}' where id=${organizationId}`;
  check((await settings()).defaultDescription === defaultDescription, "legacy settings expose the previous description as the default");
  await page.goto("/settings/calendar");
  const field = page.getByLabel("Descripción de la reunión", { exact: true });
  await field.waitFor();
  check(await field.inputValue() === defaultDescription, "actual settings UI loads the default description");
  check(await field.getAttribute("maxlength") === "4000", "UI communicates and enforces the text limit");
  await saveUI(custom);
  await page.reload(); await field.waitFor();
  check(await field.inputValue() === custom && (await settings()).defaultDescription === custom, "multiline edit persists after reload and agrees with the API");
  const before = await settings();
  await put("/api/settings/calendar", { slotMinutes: 60 });
  check((await settings()).defaultDescription === custom && (await settings()).timezone === before.timezone, "partial updates preserve description and unrelated calendar settings");

  const company = (await post("/api/admin/companies", { companyName: `Calendar Beta ${stamp}`, adminName: "Admin Beta", adminEmail: `beta-${stamp}@description.test`, adminPassword: password })).company;
  const beta = await loginClient(company.adminEmail);
  check((await json(await beta.get("/api/settings/calendar"))).settings.defaultDescription === defaultDescription, "another company cannot inherit the first company's custom text");
  await json(await beta.put("/api/settings/calendar", { data: { defaultDescription: "Texto exclusivo de Beta" } }));
  await put("/api/settings/calendar", { organizationId: company.id, defaultDescription: custom });
  check((await json(await beta.get("/api/settings/calendar"))).settings.defaultDescription === "Texto exclusivo de Beta", "injected organization ID cannot overwrite another company's description");
  check((await get(`/api/settings/calendar?organizationId=${company.id}`)).settings.defaultDescription === custom, "reads also use the authenticated company");
  const editorEmail = `editor-${stamp}@description.test`;
  await post("/api/settings/team", { name: "Editor QA", email: editorEmail, password, role: "agent_editor" });
  const editor = await loginClient(editorEmail);
  check((await editor.put("/api/settings/calendar", { data: { defaultDescription: "No autorizado" } })).status() === 403 && (await settings()).defaultDescription === custom, "an agent editor cannot modify the company's invitation text");
  for (const value of ["x".repeat(4001), null, 42]) check((await api.put("/api/settings/calendar", { data: { defaultDescription: value } })).status() === 422 && (await settings()).defaultDescription === custom, "invalid description is rejected without losing saved settings");
  await put("/api/settings/calendar", { defaultDescription: "x".repeat(4000) });
  check((await settings()).defaultDescription.length === 4000, "the exact 4000-character boundary is accepted");
  await saveUI(custom);

  await page.route("**/api/settings/calendar", route => route.request().method() === "PUT" ? route.fulfill({ status: 503, contentType: "application/json", body: "{}" }) : route.continue());
  const draft = "Borrador que se conserva si falla el guardado";
  await field.fill(draft);
  await page.getByRole("button", { name: "Guardar ajustes", exact: true }).click();
  await page.getByRole("status").getByText("No se pudieron guardar los ajustes.", { exact: false }).waitFor();
  check(await field.inputValue() === draft && await page.getByRole("button", { name: "Guardar ajustes", exact: true }).isEnabled() && (await settings()).defaultDescription === custom, "failed save shows an error, retains the draft and permits retry");
  await page.unroute("**/api/settings/calendar");
  await saveUI(custom);
  await field.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${evidence}/settings-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await field.scrollIntoViewIfNeeded();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "settings and the multiline field fit mobile width");
  await page.screenshot({ path: `${evidence}/settings-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1400, height: 1050 });

  await api.get("/api/google/oauth/start");
  check((await get("/api/settings/calendar")).connection?.status === "connected", "Google mock is connected through the real OAuth flow");
  await api.delete("/api/dev/google-mock/outbox");
  const manual = await lead(`Ana Manual ${stamp}`);
  await page.goto(`/inbox?contact=${manual.id}`);
  await page.getByRole("button", { name: "Ver detalles del contacto", exact: true }).click();
  await page.getByRole("button", { name: "Agendar reunión", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Agendar reunión", exact: true });
  await dialog.getByLabel("Correo del prospecto", { exact: true }).fill(manual.email);
  await dialog.getByLabel("Fecha y hora", { exact: true }).fill(`${day}T10:00`);
  await poll(() => dialog.getByRole("button", { name: "Agendar reunión", exact: true }).isEnabled());
  const booked = page.waitForResponse(response => response.url().endsWith(`/api/contacts/${manual.id}/schedule`) && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Agendar reunión", exact: true }).click();
  check((await booked).ok(), "manual scheduling completes from the actual inbox UI");
  await dialog.waitFor({ state: "detached" });
  check((await events()).length === 1 && (await events())[0].description === render(manual), "Google receives the custom description with this contact's name, phone and line breaks");
  await page.getByRole("region", { name: "Reunión del prospecto" }).getByText("Agendada desde Google Calendar", { exact: true }).waitFor();
  await page.screenshot({ path: `${evidence}/manual-booked.png`, fullPage: true });

  await put("/api/settings/whatsapp", { wabaId: "waba_description041", phoneNumberId: "phone_description041", token: "test-token" });
  await sql`insert into ai_credit_account (organization_id,balance) values (${organizationId},1000) on conflict (organization_id) do update set balance=1000`;
  const initial = "Can we meet next Friday?";
  const proposal = `Does Friday, ${nextFriday.toLocaleDateString("en-US", { timeZone: "America/Bogota", month: "long", day: "numeric", year: "numeric" })} at 12:00 p.m. work for you?`;
  await put("/api/agent/profile", { enabled: true, responseLanguage: "en", instructions: `SCHEDULING_CONTEXT_FIXTURE=${JSON.stringify({ initial, proposal, startIso: instant(12) })}` });
  const agent = await lead(`Ana Agent ${stamp}`);
  const messagesPath = `/api/conversations/${agent.conversationId}/messages`;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_description041", from: agent.phone, name: agent.name, text: initial });
  await poll(async () => (await get(messagesPath)).messages, rows => rows.some(row => row.direction === "out" && row.text === proposal));
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_description041", from: agent.phone, name: agent.name, text: "Yes" });
  const messages = await poll(async () => (await get(messagesPath)).messages, rows => rows.some(row => row.direction === "out" && row.text?.includes("You're booked")));
  check((await events()).length === 2 && (await events())[1].description === render(agent), "the real agent pipeline also uses the company's configured invitation description");
  check(JSON.stringify(await get("/api/dev/wa-mock/outbox")).includes("You're booked"), "agent confirmation is actually delivered through the WhatsApp mock");

  await page.goto("/settings/calendar"); await field.waitFor(); await saveUI("");
  const empty = await lead(`Sin descripción ${stamp}`);
  await post(`/api/contacts/${empty.id}/schedule`, { prospectEmail: empty.email, startIso: instant(14) });
  const finalEvents = await events();
  check((await settings()).defaultDescription === "" && finalEvents.at(-1).description === "", "clearing the field persists and sends an empty description");
  check(finalEvents[0].description === render(manual) && finalEvents[1].description === render(agent), "editing settings never rewrites invitations already created");
  check(errors.length === 0, "no uncaught browser errors during settings or scheduling flows");
  await writeFile(`${evidence}/e2e.json`, JSON.stringify({ checks, count: checks.length, events: finalEvents, agentMessages: messages.filter(row => row.text).map(row => ({ direction: row.direction, text: row.text })), browserErrors: errors }, null, 2));
  console.log(`CALENDAR DESCRIPTION: ${checks.length} checks passed`);
} catch (error) {
  await page.screenshot({ path: `${evidence}/failure.png`, fullPage: true }).catch(() => {});
  console.error("Browser errors:", errors);
  throw error;
} finally { await browser.close(); for (const client of clients) await client.dispose(); await sql.end(); }
