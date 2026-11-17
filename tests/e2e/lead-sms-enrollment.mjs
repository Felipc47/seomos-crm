import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3114", stamp = Date.now(), password = "LeadSms044!";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_leadsms_044");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
const page = await context.newPage(), api = context.request, checks = [], errors = [];
page.on("pageerror", e => errors.push(e.message));
const check = (ok, label) => { assert(ok, label); checks.push(label); console.log(`✓ ${checks.length}. ${label}`); };
const json = async r => { assert(r.ok(), `${r.status()}: ${await r.text()}`); return r.json(); };
const post = (url, data = {}) => api.post(url, { data }).then(json);
const put = (url, data) => api.put(url, { data }).then(json);
const patch = (url, data) => api.patch(url, { data }).then(json);
const get = url => api.get(url).then(json);
const phone = n => `1202555${String(n).padStart(4, "0")}`;
const sms = async n => (await get("/api/sms")).contacts.find(c => c.phone === `+${phone(n)}`);
const crm = async n => (await get(`/api/contacts?q=${phone(n)}`)).contacts.find(c => c.phone === phone(n));
const wa = async n => (await get("/api/dev/wa-mock/outbox")).outbox.filter(m => m.to === phone(n) && m.type === "template" && m.phoneNumberId === `phone_${stamp}`);
const meta = (n, formId) => post("/api/dev/leadgen-mock/inbound", { leadgenId: `lgmock_${stamp}_${n}`, formId, name: `Persona ${n}`, phone: phone(n), email: `lead${n}@example.test` });
const wait = async fn => { for (let i = 0; i < 80; i++) { const value = await fn(); if (value) return value; await new Promise(r => setTimeout(r, 250)); } throw new Error("Observable result timed out"); };
let org;
try {
  await mkdir(".artifacts/lead-sms-044", { recursive: true });
  const [oldRoot] = await sql`select email from "user" where email like 'root-044-%' order by created_at limit 1`;
  const rootEmail = oldRoot?.email ?? `root-044-${stamp}@example.test`;
  const login = await api.post("/api/auth/sign-in/email", { data: { email: rootEmail, password } });
  if (!login.ok()) {
    await page.goto("/register");
    await page.getByLabel("Tu nombre").fill("Root QA"); await page.getByLabel("Correo").fill(rootEmail); await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click(); await page.waitForURL(/\/inbox/);
  }
  const company = await post("/api/admin/companies", { companyName: `Lead SMS QA ${stamp}`, adminName: "Admin QA", adminEmail: `admin-${stamp}@example.test`, adminPassword: password });
  org = company.company.id;
  const otherEmail = `other-${stamp}@example.test`;
  await post("/api/admin/companies", { companyName: `Other QA ${stamp}`, adminName: "Other Admin", adminEmail: otherEmail, adminPassword: password });
  await post("/api/auth/sign-out"); await post("/api/auth/sign-in/email", { email: `admin-${stamp}@example.test`, password });
  await put("/api/settings/whatsapp", { wabaId: `waba_${stamp}`, phoneNumberId: `phone_${stamp}`, token: "EAAtest-valido" });
  const service = (await post("/api/services", { name: "Consulta QA" })).service;
  const formId = `form_${stamp}`;
  await post(`/api/services/${service.id}/forms`, { formId });
  const template = (await post("/api/templates", { name: `greeting_${stamp}`, language: "en_US", category: "MARKETING", body: "Hello {{1}}, how can we help?", variables: [{ source: "first_name" }] })).template;
  await post("/api/dev/wa-mock/template-status", { wabaId: `waba_${stamp}`, name: template.name, language: "en_US", event: "APPROVED" });
  await wait(async () => (await get("/api/templates")).templates.find(t => t.id === template.id && t.status === "approved"));
  await patch(`/api/services/${service.id}`, { greetingTemplateId: template.id });
  const rows = [];
  const header = "id,full_name,phone_number,email,form_id\n";
  const mock = () => post("/api/dev/sheets-mock", { gid: "0", csv: header + rows.join("\n") });
  const add = n => rows.push(`l:${stamp}_${n},Persona ${n},p:+${phone(n)},lead${n}@example.test,${formId}`);
  await mock();
  const source = (await post("/api/settings/sheets", { name: "Leads Meta QA", url: "https://docs.google.com/spreadsheets/d/123456789012345678901234567890/edit#gid=0", serviceId: service.id })).source;
  const sync = () => post(`/api/settings/sheets/${source.id}/sync`);
  await meta(1, formId);
  await wait(() => crm(1));
  check(!(await sms(1)), "Meta creates a CRM contact but no SMS enrollment before attestation");
  await page.goto("/settings/sms");
  const section = page.getByRole("region", { name: "Alta automática de leads SMS" });
  await section.getByText(`Formulario Meta ${formId}`).waitFor();
  const forms = section.locator("form");
  const evidence = "Formulario Meta QA: casilla expresa de SMS de la marca; versión local de prueba 044";
  await forms.nth(0).locator("textarea").fill(evidence);
  await forms.nth(0).getByRole("checkbox").check();
  await forms.nth(0).getByRole("button", { name: "Activar alta SMS" }).click();
  await section.getByText("Fuente de consentimiento SMS guardada. Se aplica a leads nuevos.").waitFor();
  await forms.nth(1).locator("textarea").fill(evidence);
  await forms.nth(1).getByRole("checkbox").check();
  await forms.nth(1).getByRole("button", { name: "Activar alta SMS" }).click();
  await section.getByText("Fuente de consentimiento SMS guardada. Se aplica a leads nuevos.").waitFor();
  check((await get("/api/settings/sms/lead-sources")).sources.length === 2, "admin enables exactly the Meta form and Sheets tab through UI");
  check(!(await sms(1)), "activating a source does not retroactively enroll historical leads");
  await meta(2, formId);
  const s2 = await wait(() => sms(2));
  check(!!s2 && s2.consentEvidence.includes(formId) && !!(await crm(2)) && (await wa(2)).length === 1,
    "new Meta lead appears in CRM and SMS with evidence and WhatsApp greeting");
  add(3); await mock(); await sync();
  const s3 = await sms(3);
  check(!!s3 && s3.consentEvidence.includes(source.id) && !!(await crm(3)) && (await wa(3)).length === 1,
    "new Sheets lead appears in CRM and SMS with evidence and WhatsApp greeting");
  await sync(); await meta(3, formId);
  check((await sql`select count(*)::int as n from sms_contact where organization_id=${org} and phone=${`+${phone(3)}`}`)[0].n === 1,
    "repeated Sheets and cross-source Meta events keep one SMS contact");
  await post(`/api/sms/contacts/${s3.id}/opt-out`);
  await meta(3, formId); await sync();
  check(!!(await sms(3)).optedOutAt, "later source events never lift an SMS opt-out");
  const blocked = (await post("/api/contacts", { name: "Persona 4", phone: phone(4) })).contact;
  await sql`update contact set blocked_at=now() where id=${blocked.id} and organization_id=${org}`;
  add(4); await mock(); await sync();
  check(!(await sms(4)), "blocked CRM contacts are not auto-enrolled for SMS");
  await put("/api/settings/sms", { apiKey: "sms-mock-valid-account-1111" });
  await post("/api/settings/sms/sender", { sender: "+12025550124", approved: true, approvalEvidence: "QA simulated approved sender 044" });
  await post("/api/settings/sms/webhook");
  const before = (await get("/api/dev/brevo-mock/control")).sends.length;
  const sent = await post("/api/sms/send", { contactId: s2.id, content: "QA: Thanks for your interest. Reply STOP to opt out.", operationId: randomUUID() });
  check(sent.message.status === "accepted" && (await get("/api/dev/brevo-mock/control")).sends.length === before + 1,
    "enrolled Meta lead can receive an SMS without manual contact creation");
  await page.goto("/sms");
  await page.getByText("Persona 2", { exact: true }).first().waitFor();
  check(true, "automatically enrolled lead appears in SMS inbox");
  await patch(`/api/contacts/${(await crm(2)).id}`, { optedOut: true });
  const blockedSend = await api.post("/api/sms/send", { data: { contactId: s2.id, content: "Do not send", operationId: randomUUID() } });
  check(blockedSend.status() === 409 && (await get("/api/dev/brevo-mock/control")).sends.length === before + 1,
    "CRM opt-out blocks SMS before the provider");
  const other = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  await json(await other.post("/api/auth/sign-in/email", { data: { email: otherEmail, password } }));
  check((await other.put("/api/settings/sms/lead-sources", { data: { sourceType: "sheet", sourceKey: source.id, consentEvidence: evidence } })).status() === 422,
    "another tenant cannot attest this Sheets source");
  await other.dispose();
  check(errors.length === 0, "no browser JavaScript errors");
  await writeFile(".artifacts/lead-sms-044/results.json", JSON.stringify({ count: checks.length, checks, errors }, null, 2));
  console.log(`E2E PASS: ${checks.length} checks`);
} catch (error) {
  await page.screenshot({ path: ".artifacts/lead-sms-044/failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); await sql.end(); }
