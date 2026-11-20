import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { createDecipheriv, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3114", stamp = Date.now(), password = "LeadSms044!";
const sql = postgres(process.env.CRM_TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/seomos_leadsms_044");
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
  await post("/api/dev/brevo-mock/control", { reset: true });
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
  check(!!s2 && s2.aiEnabled && s2.consentEvidence.includes(formId) && !!(await crm(2)) && (await wa(2)).length === 1,
    "new Meta lead appears in CRM and SMS with evidence and WhatsApp greeting");
  add(3); await mock(); await sync();
  const s3 = await sms(3);
  check(!!s3 && s3.aiEnabled && s3.consentEvidence.includes(source.id) && !!(await crm(3)) && (await wa(3)).length === 1,
    "new Sheets lead appears in CRM and SMS with evidence and WhatsApp greeting");
  await sync(); await meta(3, formId);
  check((await sql`select count(*)::int as n from sms_contact where organization_id=${org} and phone=${`+${phone(3)}`}`)[0].n === 1,
    "repeated Sheets and cross-source Meta events keep one SMS contact");
  await post(`/api/sms/contacts/${s3.id}/opt-out`);
  await meta(3, formId); await sync();
  check(!!(await sms(3)).optedOutAt && !(await sms(3)).aiEnabled, "later source events never lift an SMS opt-out or its AI pause");
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
  await page.goto("/agent");
  await page.getByLabel("Canal favorito para nuevos leads").selectOption("sms");
  await page.getByRole("button", { name: "Guardar comportamiento" }).click();
  await wait(async () => (await get("/api/agent/profile")).profile.preferredContactChannel === "sms");
  check(true, "Agent UI saves SMS as this company's preferred channel");
  await page.goto("/templates");
  const channelSelect = page.getByLabel("Canal del saludo automático");
  const generalTemplate = page.getByLabel("Plantilla general de saludo");
  await channelSelect.waitFor();
  await wait(async () => (await channelSelect.inputValue()) === "sms");
  await generalTemplate.selectOption(template.id);
  await wait(async () => (await get("/api/settings/leadgen")).settings.greetingTemplateId === template.id);
  await channelSelect.selectOption("whatsapp");
  await wait(async () => (await get("/api/agent/profile")).profile.preferredContactChannel === "whatsapp");
  await channelSelect.selectOption("sms");
  await wait(async () => (await get("/api/agent/profile")).profile.preferredContactChannel === "sms");
  check((await generalTemplate.inputValue()) === template.id, "Templates switches the same greeting channel without replacing the selected template");
  add(5); await mock(); await sync();
  const sends5 = (await get("/api/dev/brevo-mock/control")).sends.filter(m => m.recipient === `+${phone(5)}`);
  check((await sms(5)).aiEnabled && sends5.length === 1 && sends5[0].content.includes("Hello Persona") && !sends5[0].content.includes("STOP") && (await wa(5)).length === 0,
    "first Sheets service sends its approved greeting by SMS only, without an added STOP footer");
  const [auto5] = await sql`select source,status from sms_message where organization_id=${org} and contact_id=${(await sms(5)).id} and direction='out'`;
  check(auto5.source === "automation" && auto5.status === "accepted", "SMS inbox records automatic source and provider acceptance");
  const service2 = (await post("/api/services", { name: "Ecommerce QA" })).service;
  const template2 = (await post("/api/templates", { name: `ecommerce_${stamp}`, language: "en_US", category: "MARKETING",
    body: "Hi {{1}}, let's review your ecommerce inventory.", variables: [{ source: "first_name" }] })).template;
  await post("/api/dev/wa-mock/template-status", { wabaId: `waba_${stamp}`, name: template2.name, language: "en_US", event: "APPROVED" });
  await wait(async () => (await get("/api/templates")).templates.find(t => t.id === template2.id && t.status === "approved"));
  await patch(`/api/services/${service2.id}`, { greetingTemplateId: template2.id });
  await post("/api/dev/sheets-mock", { gid: "1", csv: header + `l:${stamp}_6,Persona 6,p:+${phone(6)},lead6@example.test,${formId}` });
  const source2 = (await post("/api/settings/sheets", { name: "Ecommerce Meta QA", url: "https://docs.google.com/spreadsheets/d/123456789012345678901234567890/edit#gid=1", serviceId: service2.id })).source;
  await post("/api/dev/sheets-mock", { gid: "1", csv: header + `l:${stamp}_10,Persona 10,p:+${phone(10)},lead10@example.test,${formId}` });
  await post(`/api/settings/sheets/${source2.id}/sync`);
  const [noConsent] = await sql`select flow_state, flow_result from sheets_row where organization_id=${org} and external_key=${`l:${stamp}_10`}`;
  check(noConsent?.flow_state === "failed" && noConsent.flow_result.includes("falta consentimiento") && !(await sms(10)),
    "a Sheets source missing SMS consent leaves a visible reason and never calls the provider");
  await post("/api/dev/sheets-mock", { gid: "1", csv: header + `l:${stamp}_6,Persona 6,p:+${phone(6)},lead6@example.test,${formId}` });
  await put("/api/settings/sms/lead-sources", { sourceType: "sheet", sourceKey: source2.id, consentEvidence: evidence });
  await post(`/api/settings/sheets/${source2.id}/sync`);
  const sends6 = (await get("/api/dev/brevo-mock/control")).sends.filter(m => m.recipient === `+${phone(6)}`);
  check(sends6.length === 1 && sends6[0].content.includes("ecommerce inventory") && !sends6[0].content.includes("STOP") && !sends6[0].content.includes("how can we help") && (await wa(6)).length === 0,
    "second Sheets source selects its own service template and sends SMS only");
  await sync(); await post(`/api/settings/sheets/${source2.id}/sync`);
  check((await get("/api/dev/brevo-mock/control")).sends.filter(m => [`+${phone(5)}`, `+${phone(6)}`].includes(m.recipient)).length === 2,
    "repeated syncs do not duplicate SMS greetings");
  await put("/api/agent/profile", { enabled: true });
  await sql`insert into ai_credit_account (organization_id,balance,total_granted,total_used)
    values (${org},20,20,0) on conflict (organization_id)
    do update set balance=20,total_granted=20,total_used=0`;
  const [welcome] = await sql`select m.provider_message_id from sms_message m join sms_contact c on c.id=m.contact_id
    where c.organization_id=${org} and c.phone=${`+${phone(5)}`} and m.source='automation' limit 1`;
  const [smsConnection] = await sql`select webhook_secret from sms_connection where organization_id=${org}`;
  const secret = smsConnection.webhook_secret;
  const decipher = createDecipheriv("aes-256-gcm", Buffer.alloc(32), Buffer.from(secret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
  const token = Buffer.concat([decipher.update(Buffer.from(secret.cipher, "base64")), decipher.final()]).toString();
  await json(await api.post(`/api/webhooks/brevo/${org}`, { headers: { authorization: `Bearer ${token}` },
    data: { msg_status: "replied", to: phone(5), messageId: Number(welcome.provider_message_id),
      reply: "SMS_AGENT_REPLY", ts_event: Math.floor(Date.now() / 1000) } }));
  await wait(async () => (await sql`select m.id from sms_message m join sms_contact c on c.id=m.contact_id
    where c.organization_id=${org} and c.phone=${`+${phone(5)}`} and m.source='agent' limit 1`)[0]);
  check((await get("/api/dev/brevo-mock/control")).sends.filter(m => m.recipient === `+${phone(5)}`).length === 2,
    "new consented lead receives an AI SMS reply by default when the company agent is on");
  await meta(7, formId);
  await wait(() => sms(7));
  await wait(async () => (await get("/api/dev/brevo-mock/control")).sends.some(m => m.recipient === `+${phone(7)}`));
  check((await wa(7)).length === 0, "direct Meta lead also honors the company's SMS-only preferred welcome");
  await post("/api/dev/brevo-mock/control", { next: "timeout" });
  add(8); await mock(); await sync();
  const [failed8] = await sql`select r.flow_state,m.status from sheets_row r join sms_contact c on c.id=r.contact_id or (c.organization_id=r.organization_id and c.phone=${`+${phone(8)}`}) left join sms_message m on m.contact_id=c.id and m.source='automation' where r.organization_id=${org} and r.external_key=${`l:${stamp}_8`} limit 1`;
  check(failed8.flow_state === "failed" && failed8.status === "uncertain" && (await wa(8)).length === 0,
    "provider timeout keeps an uncertain SMS result and never falls back to WhatsApp");
  const count8 = (await sql`select count(*)::int as n from sms_message m join sms_contact c on c.id=m.contact_id where c.organization_id=${org} and c.phone=${`+${phone(8)}`}`)[0].n;
  await sync();
  check((await sql`select count(*)::int as n from sms_message m join sms_contact c on c.id=m.contact_id where c.organization_id=${org} and c.phone=${`+${phone(8)}`}`)[0].n === count8,
    "failed automatic SMS is not blindly retried by another sync");
  const person6 = await sms(6);
  const crm6 = await crm(6);
  await page.goto(`/inbox?channel=sms&sms=${person6.id}`);
  const smsPanel = page.getByTestId("sms-conversation-panel");
  await smsPanel.getByRole("button", { name: "Ver detalles del contacto" }).click();
  const details = page.getByRole("dialog", { name: "Detalles de Persona 6" });
  await details.getByText("lead6@example.test", { exact: true }).waitFor();
  await details.getByText("Ecommerce QA", { exact: true }).waitFor();
  await details.getByRole("button", { name: "Agendar reunión" }).waitFor();
  const notes = details.getByPlaceholder("Notas internas sobre este contacto…");
  assert.match(await notes.inputValue(), /Google Sheets/);
  await notes.fill("Notas QA desde el chat SMS");
  await details.getByRole("button", { name: "Guardar notas" }).click();
  await wait(async () => (await get(`/api/contacts/${crm6.id}`)).contact.notes === "Notas QA desde el chat SMS");
  check(true, "SMS opens the shared CRM contact with email, service, meeting controls and editable notes");
  await page.keyboard.press("Escape");
  await smsPanel.getByRole("button", { name: "Usar plantilla" }).click();
  await smsPanel.getByLabel("Plantilla para SMS").selectOption(template2.id);
  const draft = smsPanel.getByLabel("Mensaje SMS");
  await wait(async () => (await draft.inputValue()).includes("Hi Persona, let's review your ecommerce inventory."));
  check((await get("/api/dev/brevo-mock/control")).sends.filter(m => m.recipient === `+${phone(6)}`).length === 1,
    "applying the approved template personalizes an editable SMS without sending");
  await smsPanel.getByRole("button", { name: "Revisar SMS" }).click();
  await smsPanel.getByRole("button", { name: "Confirmar y enviar SMS" }).click();
  await wait(async () => (await get("/api/dev/brevo-mock/control")).sends.filter(m => m.recipient === `+${phone(6)}`).length === 2);
  check(true, "the operator can send the personalized template by SMS after confirming");
  const manual = (await post("/api/sms/contacts", { name: "Manual QA", phone: `+${phone(11)}`, consentEvidence: evidence })).contact;
  const linked = await Promise.all([post(`/api/sms/contacts/${manual.id}/details`), post(`/api/sms/contacts/${manual.id}/details`)]);
  check(linked[0].contact.id === linked[1].contact.id && !!(await crm(11)), "concurrent opens of an SMS-only contact link one CRM record");
  const other = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  await json(await other.post("/api/auth/sign-in/email", { data: { email: otherEmail, password } }));
  check((await json(await other.get("/api/agent/profile"))).profile.preferredContactChannel === "whatsapp", "other companies keep WhatsApp as the default");
  check((await other.put("/api/settings/sms/lead-sources", { data: { sourceType: "sheet", sourceKey: source.id, consentEvidence: evidence } })).status() === 422,
    "another tenant cannot attest this Sheets source");
  check((await other.post(`/api/sms/contacts/${person6.id}/details`)).status() === 404 &&
    (await other.post(`/api/sms/contacts/${person6.id}/template-preview`, { data: { templateId: template2.id } })).status() === 404,
    "other tenants cannot see the SMS contact details or render a template for that contact");
  await other.dispose();
  check(errors.length === 0, "no browser JavaScript errors");
  await writeFile(".artifacts/lead-sms-044/results.json", JSON.stringify({ count: checks.length, checks, errors }, null, 2));
  console.log(`E2E PASS: ${checks.length} checks`);
} catch (error) {
  await page.screenshot({ path: ".artifacts/lead-sms-044/failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); await sql.end(); }
