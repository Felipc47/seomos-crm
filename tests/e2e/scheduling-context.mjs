import assert from "node:assert/strict";
import { chromium } from "playwright";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = "http://127.0.0.1:3108";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_scheduling_context_040", { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, timezoneId: "Asia/Tokyo", viewport: { width: 1400, height: 1050 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request;
const evidence = ".artifacts/scheduling-context", checks = [], transcript = [];
const check = (value, label) => { assert(value, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${response.url()}: ${await response.text()}`); return response.json(); };
const get = path => api.get(path).then(json), put = (path, data) => api.put(path, { data }).then(json), post = (path, data) => api.post(path, { data }).then(json);
async function poll(fn, predicate = Boolean) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) { const result = await fn(); if (predicate(result)) return result; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error("Timed out waiting for observable result");
}
const meeting = async target => (await get(`/api/contacts/${target.id}/meeting`)).meeting;
const events = async () => (await get("/api/dev/google-mock/outbox")).events;
const stamp = Date.now().toString().slice(-7);
let count = 0;
const timezone = "America/New_York";
const friday = new Date(Date.now() + 8 * 86400_000);
while (friday.getUTCDay() !== 5) friday.setUTCDate(friday.getUTCDate() + 1);
function atHour(date, hour) {
  const result = new Date(date); result.setUTCHours(15, 0, 0, 0);
  const localHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(result));
  result.setUTCHours(15 + hour - localHour); return result;
}
friday.setTime(atHour(friday, 10).getTime());
const thursday = new Date(friday.getTime() - 86400_000);
const date = (d, locale = "en-US") => d.toLocaleDateString(locale, { timeZone: timezone, weekday: "long", month: "long", day: "numeric", year: "numeric" });
const single = `Just to confirm, does ${date(friday)} at 10:00 a.m. ET work for you?`;
const options = `I can offer ${date(thursday)} at 1:00 p.m. or 3:00 p.m. ET, or ${date(friday)} at 10:00 a.m. ET. Which works best?`;
const initial = "I'm not available at those times. What other times are available? I'm free Thursday afternoon and Friday morning.";
let org;
async function lead(name, fixture = {}, language = "es-en", email = true) {
  await put("/api/agent/profile", { enabled: true, responseLanguage: language, instructions: `SCHEDULING_CONTEXT_FIXTURE=${JSON.stringify({ initial, proposal: single, startIso: friday.toISOString(), ...fixture })}` });
  const phone = `5730${stamp}${String(++count).padStart(2, "0")}`;
  const contact = (await post("/api/contacts", { name: `${name} ${stamp}`, phone, ...(email ? { email: "client@example.test" } : {}) })).contact;
  const conversation = (await post("/api/conversations", { contactId: contact.id })).conversation;
  return { id: contact.id, conversationId: conversation.id, phone, name };
}
async function inbound(target, text) {
  const messagesPath = `/api/conversations/${target.conversationId}/messages`;
  const before = (await get(messagesPath)).messages.filter(m => m.direction === "out" && m.aiGenerated).length;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_context040", from: target.phone, name: target.name, text });
  const messages = await poll(async () => (await get(messagesPath)).messages, rows => rows.filter(m => m.direction === "out" && m.aiGenerated).length > before);
  const reply = messages.filter(m => m.direction === "out" && m.aiGenerated).at(-1).text;
  transcript.push({ scenario: target.name, in: text, out: reply });
  return reply;
}
async function propose(target) { await inbound(target, initial); check(await meeting(target) === null, `${target.name}: offering a time does not book`); }
try {
  await mkdir(evidence, { recursive: true });
  const login = await api.post("/api/auth/sign-in/email", { data: { email: "context040@test.local", password: "ContextPrueba123!" } });
  if (!login.ok()) {
    await page.goto("/register");
    await page.getByLabel("Tu nombre").fill("Admin contexto"); await page.getByLabel("Correo").fill("context040@test.local"); await page.getByLabel("Contraseña").fill("ContextPrueba123!");
    await page.getByRole("button", { name: "Crear cuenta" }).click(); await page.waitForURL(/\/inbox/);
  }
  org = (await sql`select organization_id from member m join "user" u on u.id=m.user_id where u.email='context040@test.local' limit 1`)[0].organization_id;
  // Test setup only: configure the business timezone, never the browser timezone.
  await sql`update organization set metadata=jsonb_set(coalesce(nullif(metadata,'')::jsonb,'{}'::jsonb),'{calendar}',coalesce(nullif(metadata,'')::jsonb->'calendar','{}'::jsonb)||'{"timezone":"America/New_York"}'::jsonb)::text where id=${org}`;
  await sql`insert into ai_credit_account (organization_id,balance) values (${org},1000) on conflict (organization_id) do update set balance=1000`;
  await put("/api/settings/whatsapp", { wabaId: "waba_context040", phoneNumberId: "phone_context040", token: "EAAtest-valido" });
  await api.delete("/api/settings/calendar"); await api.delete("/api/dev/google-mock/outbox"); await api.delete("/api/dev/wa-mock/outbox");

  const direct = await lead("Unique Friday", { proposal: options });
  await propose(direct);
  let reply = await inbound(direct, "Friday");
  check(reply.startsWith("You're booked") && reply.includes("Friday") && !/Antes de|confírmame|jueves|viernes/.test(reply), "Friday books the single Friday option immediately in English");
  check((await meeting(direct)).startIso === friday.toISOString(), "exact Friday 10 AM ET persisted");
  check((await events()).length === 0, "disconnected Google keeps the booking in CRM without invented invitation");

  const screenshot = await lead("Screenshot sequence", { proposal: options, confirmAgain: single });
  await propose(screenshot);
  check((await inbound(screenshot, "Friday")) === single && await meeting(screenshot) === null, "legacy extra confirmation preserves Friday 10 AM");
  reply = await inbound(screenshot, "Yes");
  check(reply.startsWith("You're booked") && reply.includes("10:00") && !reply.includes("Suggested times"), "Yes books without resetting the choices or switching language");
  check((await meeting(screenshot)).startIso === friday.toISOString(), "screenshot sequence stores the accepted instant");
  await page.goto(`/inbox?contact=${screenshot.id}`);
  await page.getByText(reply, { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Ver detalles del contacto" }).click();
  const region = page.getByRole("region", { name: "Reunión del prospecto" });
  await region.getByText("Reunión registrada en el CRM", { exact: true }).waitFor();
  await page.screenshot({ path: `${evidence}/confirmed-desktop.png`, fullPage: true });
  check(true, "confirmation and meeting details visible in actual inbox UI");
  const credits = (await get("/api/agent/profile")).credits.balance;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_context040", from: screenshot.phone, name: screenshot.name, text: "Yes" });
  await poll(() => get("/api/agent/profile"), result => result.credits.balance < credits);
  // A duplicate may be silent; wait for the turn to settle by observing its credit and DB record.
  check((await sql`select count(*)::int count from meeting where organization_id=${org} and contact_id=${screenshot.id}`)[0].count === 1, "repeated confirmation cannot create a duplicate meeting");

  for (const [name, proposal, response, startIso] of [
    ["Ambiguous Thursday", options, "Thursday", new Date(thursday.getTime() + 3 * 3600_000).toISOString()],
    ["Yes to several options", options, "Yes", friday.toISOString()],
    ["Question mark", single, "?", friday.toISOString()],
    ["Negative response", single, "No, that doesn't work", friday.toISOString()],
    ["Wrong model datetime", single, "Yes", new Date(friday.getTime() + 3600_000).toISOString()],
    ["Unrelated question", "Can I have your email address?", "Yes", friday.toISOString()],
  ]) {
    const target = await lead(name, { proposal, startIso }); await propose(target);
    reply = await inbound(target, response);
    check(await meeting(target) === null && reply.startsWith("Before booking"), `${name}: no booking and an English clarification`);
    check(!/martes|miércoles|jueves|viernes|Antes de/.test(reply), `${name}: fallback dates remain in English`);
  }
  const stale = await lead("Historical time", { initial: "10 am", proposal: "Can I have your email address?" });
  await inbound(stale, "10 am"); reply = await inbound(stale, "Yes");
  check(await meeting(stale) === null && reply.startsWith("Before booking"), "old inbound time cannot authorize an unrelated Yes");

  const spanish = await lead("Español", { proposal: `¿Te sirve el ${date(friday, "es-CO")} a las 10:00 a. m.?` }, "es");
  await propose(spanish); reply = await inbound(spanish, "Sí");
  check(reply.startsWith("¡Listo! Registré") && reply.includes("viernes"), "Spanish profile keeps Spanish and accepts Sí");
  const missing = await lead("Missing email", {}, "en", false); await propose(missing);
  reply = await inbound(missing, "Yes");
  check(reply.includes("email address") && await meeting(missing) === null, "missing email asks in English without booking");
  const invalid = await lead("Invalid date", { startIso: "not-a-date" }, "en"); await propose(invalid);
  check((await inbound(invalid, "Yes")).includes("exact date and time") && await meeting(invalid) === null, "invalid datetime degrades in English");
  const todayAtTen = atHour(new Date(), 10);
  const tooSoon = await lead("Lead time", { startIso: todayAtTen.toISOString() }, "en"); await propose(tooSoon);
  check((await inbound(tooSoon, "10 am")).includes("first availability") && await meeting(tooSoon) === null, "lead-time guard remains active in English");
  const off = atHour(friday, 22);
  const offHours = await lead("Work hours", { startIso: off.toISOString(), proposal: `${date(off)} at 10 pm?` }, "en"); await propose(offHours);
  check((await inbound(offHours, "Yes")).includes("Monday to Friday") && await meeting(offHours) === null, "work-hours guard remains active in English");

  await api.get("/api/google/oauth/start");
  check((await get("/api/settings/calendar")).connection?.status === "connected", "Google mock connected");
  const google = await lead("Google success", {}, "en"); await propose(google);
  reply = await inbound(google, "Yes");
  check(reply.includes("invitation") && reply.includes("Google Meet") && (await meeting(google)).source === "google", "Google success confirms in English with real mock event and Meet");
  check((await events()).length === 1 && (await events())[0].attendees.some(a => a.email === "client@example.test"), "single event includes the intended invitee");
  const conflict = await lead("Calendar conflict", {}, "en"); await propose(conflict);
  reply = await inbound(conflict, "Yes");
  check(reply.includes("already booked") && await meeting(conflict) === null && (await events()).length === 1, "occupied slot asks another time in English without false reservation");

  const badProvider = await lead("Malformed provider", { invalidJson: true }, "en"); await propose(badProvider);
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_context040", from: badProvider.phone, name: badProvider.name, text: "Yes" });
  await poll(async () => (await sql`select handoff_at from conversation where id=${badProvider.conversationId}`)[0].handoff_at);
  check(await meeting(badProvider) === null && (await get("/api/health")).ok !== false, "persistent malformed provider output hands off without booking or hanging the server");
  const wa = await get("/api/dev/wa-mock/outbox");
  check(JSON.stringify(wa).includes("You're booked"), "English confirmation was delivered to the WhatsApp mock outbox");
  await writeFile(`${evidence}/e2e.json`, JSON.stringify({ passed: checks.length, checks, transcript, expectedStartIso: friday.toISOString() }, null, 2));
  console.log(`SCHEDULING CONTEXT: ${checks.length} checks passed`);
} finally { await browser.close(); await sql.end(); }
