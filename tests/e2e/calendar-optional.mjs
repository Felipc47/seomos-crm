import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = "http://127.0.0.1:3106";
const dbURL = "postgresql://postgres@127.0.0.1:5433/seomos_calendar_optional_004";
const noConfig = process.env.E2E_GOOGLE_CONFIGURED === "false";
const sql = postgres(dbURL, { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, timezoneId: "Asia/Tokyo", viewport: { width: 1440, height: 1100 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request;
const evidence = ".artifacts/calendar-optional";
const checks = [];
const check = (value, label) => { assert(value, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${response.url()}: ${await response.text()}`); return response.json(); };
const get = async path => json(await api.get(path));
const put = async (path, data) => json(await api.put(path, { data }));
const post = async (path, data) => json(await api.post(path, { data }));
async function poll(fn, predicate = Boolean) {
  const end = Date.now() + 45000;
  while (Date.now() < end) { const value = await fn(); if (predicate(value)) return value; await new Promise(resolve => setTimeout(resolve, 250)); }
  throw new Error("Tiempo agotado esperando resultado observable");
}
const meeting = async id => (await get(`/api/contacts/${id}/meeting`)).meeting;
const googleEvents = async () => (await get("/api/dev/google-mock/outbox")).events;
const local = date => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = type => parts.find(part => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
};
let phoneCount = 0;
const stamp = Date.now().toString().slice(-7);
async function lead(name) {
  const phone = `5730${stamp}${++phoneCount}`;
  const contact = (await post("/api/contacts", { name, phone })).contact;
  const conversation = (await post("/api/conversations", { contactId: contact.id })).conversation;
  return { id: contact.id, phone, name, conversationId: conversation.id };
}
async function inbound(target, text) {
  const before = (await get(`/api/conversations/${target.conversationId}/messages`)).messages.filter(message => message.direction === "out" && message.aiGenerated).length;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_calendar004", from: target.phone, name: target.name, text });
  const messages = await poll(async () => (await get(`/api/conversations/${target.conversationId}/messages`)).messages, rows => rows.filter(message => message.direction === "out" && message.aiGenerated).length > before);
  return messages.filter(message => message.direction === "out" && message.aiGenerated).at(-1).text;
}
async function details(target) {
  await page.goto(`/inbox?contact=${target.id}`);
  await page.getByRole("button", { name: "Ver detalles del contacto" }).click();
  const region = page.getByRole("region", { name: "Reunión del prospecto" });
  await region.waitFor(); return region;
}
try {
  await mkdir(evidence, { recursive: true });
  const login = await api.post("/api/auth/sign-in/email", { data: { email: "calendar004@test.local", password: "CalendarPrueba123!" } });
  if (!login.ok()) {
    await page.goto("/register");
    await page.getByLabel("Tu nombre").fill("Admin calendario opcional");
    await page.getByLabel("Correo").fill("calendar004@test.local");
    await page.getByLabel("Contraseña").fill("CalendarPrueba123!");
    await page.getByRole("button", { name: "Crear cuenta" }).click(); await page.waitForURL(/\/inbox/);
  }
  const org = (await sql`select organization_id from member m join "user" u on u.id=m.user_id where u.email='calendar004@test.local' limit 1`)[0].organization_id;
  await api.delete("/api/settings/calendar"); await api.delete("/api/dev/google-mock/outbox"); await api.delete("/api/dev/wa-mock/outbox");
  await put("/api/settings/whatsapp", { wabaId: "waba_calendar004", phoneNumberId: "phone_calendar004", token: "EAAtest-valido" });
  await put("/api/agent/profile", { enabled: true, name: "Asesor calendario", instructions: "Ofrece una reunión cuando el prospecto muestre interés." });
  await sql`insert into ai_credit_account (organization_id,balance) values (${org},500) on conflict (organization_id) do update set balance=500`;
  const settings = await get("/api/settings/calendar");
  check(settings.connection === null, "sin Google conectado al iniciar");
  check(settings.googleConfigured === !noConfig, noConfig ? "sin credenciales de Google en runtime" : "integración disponible pero cuenta desconectada");
  await page.goto("/agent");
  await page.getByText("Agendamiento en CRM activo", { exact: true }).waitFor();
  check(await page.getByText(/El agente ofrece y registra reuniones en el CRM aunque Google Calendar no esté conectado/).isVisible(), "UI explica que Google es opcional");
  await page.getByLabel("Antelación mínima").selectOption("2");
  await page.getByRole("button", { name: "Guardar agendamiento", exact: true }).click();
  await poll(() => get("/api/settings/calendar"), value => value.settings.leadTimeBusinessDays === 2);
  const target = await lead(`Sin Calendar ${stamp}`);
  let reply = await inbound(target, "Quiero agendar una reunión");
  check(reply.includes("podemos agendar") && reply.includes("correo"), "agente ofrece agendamiento sin Google");
  check(await meeting(target.id) === null, "ofrecer no crea una reunión sin datos");
  reply = await inbound(target, "Quiero agendar una reunión sin confirmar, mi correo es cliente@example.test");
  check(reply.includes("confírmame qué horario") && reply.includes("Horarios propuestos"), "propone horarios y pide confirmación antes de reservar");
  check(await meeting(target.id) === null, "no reserva por una confirmación inventada del modelo");
  reply = await inbound(target, "11 am");
  check(reply.includes("Registré la reunión") && !/invitación|Meet|correo/.test(reply), "reserva local confirma por chat sin prometer Google");
  let row = await meeting(target.id);
  check(row.source === "manual" && row.meetLink === null && row.timezone === "America/Bogota", "reunión local persistida con hora empresarial y sin enlace inventado");
  check(row.reminderStatus === "pending" && Date.parse(row.startIso) - Date.parse(row.reminderDueAt) === 45 * 60_000, "confirmación existente se programa 45 minutos antes");
  const scheduled = await sql`select ps.kind from lead l join pipeline_stage ps on ps.id=l.stage_id where l.organization_id=${org} and l.contact_id=${target.id}`;
  check(scheduled[0].kind === "scheduled", "IA mueve al prospecto a Cita agendada");
  let region = await details(target);
  await region.getByText("Reunión registrada en el CRM", { exact: true }).waitFor();
  await page.getByText(reply, { exact: true }).first().waitFor();
  await page.screenshot({ path: `${evidence}/${noConfig ? "sin-credenciales" : "sin-calendar"}.png`, fullPage: true });
  await page.reload(); await page.getByRole("button", { name: "Ver detalles del contacto" }).click();
  region = page.getByRole("region", { name: "Reunión del prospecto" });
  await region.getByText("Reunión registrada en el CRM", { exact: true }).waitFor();
  check(true, "reunión y confirmación visibles tras recarga");
  await region.getByRole("button", { name: "Editar registro de reunión" }).click();
  await region.getByLabel("Título de la reunión").fill("Diagnóstico local editado");
  await region.getByRole("button", { name: "Guardar reunión" }).click();
  await region.getByText("Diagnóstico local editado", { exact: true }).waitFor();
  check((await meeting(target.id)).meetLink === null, "reunión local se edita sin exigir Meet");
  const creditsBefore = (await get("/api/agent/profile")).credits.balance;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_calendar004", from: target.phone, name: target.name, text: "11 am" });
  await poll(() => get("/api/agent/profile"), value => value.credits.balance < creditsBefore);
  await inbound(target, "gracias");
  check((await sql`select count(*)::int count from meeting where organization_id=${org} and contact_id=${target.id}`)[0].count === 1, "repetición no duplica reunión");
  check((await googleEvents()).length === 0, "reserva desconectada no crea eventos Google");
  const invalid = await lead(`Validaciones ${stamp}`);
  reply = await inbound(invalid, "Quiero agendar una reunión hoy mismo a las 10 am, mi correo es invalido@example.test");
  check(reply.includes("primera disponibilidad") && await meeting(invalid.id) === null, "sin Google respeta antelación mínima");
  reply = await inbound(invalid, "Quiero agendar una reunión a medianoche");
  check(reply.includes("Agendamos reuniones") && await meeting(invalid.id) === null, "sin Google rechaza horarios fuera de jornada");
  reply = await inbound(invalid, "Quiero agendar una reunión a las 10 am promesa incorrecta");
  check(reply.includes("Registré la reunión") && !reply.includes("Google Meet"), "descarta una falsa promesa de Google del modelo");
  row = await meeting(target.id);
  // Simular una respuesta reciente del cliente en el instante futuro del recordatorio.
  await sql`update conversation set last_inbound_at=${new Date(Date.parse(row.reminderDueAt) - 60000)} where id=${target.conversationId} and organization_id=${org}`;
  const cron = await api.post(`/api/cron/meetings?now=${encodeURIComponent(row.reminderDueAt)}`, { headers: { authorization: "Bearer calendar004-test-sweep" } });
  await json(cron);
  check((await meeting(target.id)).reminderStatus === "sent", "recordatorio funciona en reuniones sin Google");
  if (!noConfig) {
    await api.get("/api/google/oauth/start");
    check((await get("/api/settings/calendar")).connection?.status === "connected", "Google mock conectado para regresión");
    const google = await lead(`Con Calendar ${stamp}`);
    reply = await inbound(google, "Quiero agendar una reunión a las 10 am, mi correo es google@example.test");
    const googleRow = await meeting(google.id);
    check(googleRow.source === "google" && googleRow.meetLink?.startsWith("https://meet.google.com/"), "conectado conserva evento y enlace Meet");
    check(reply.includes("invitación al correo google@example.test") && reply.includes("Google Meet"), "solo éxito Google promete invitación");
    const events = await googleEvents();
    check(events.length === 1 && events[0].attendees.some(attendee => attendee.email === "google@example.test"), "Google recibe el invitado correcto");
    const conflict = await lead(`Conflicto ${stamp}`);
    reply = await inbound(conflict, "Quiero agendar una reunión a las 10 am, mi correo es choque@example.test");
    check(reply.includes("ya está ocupado") && await meeting(conflict.id) === null, "conflicto Google sigue negociando sin reserva local falsa");
    // Token cifrado ficticio que el mock rechaza, sin usar secretos reales.
    const { createCipheriv } = await import("node:crypto");
    const iv = Buffer.alloc(12, 1), cipher = createCipheriv("aes-256-gcm", Buffer.alloc(32), iv);
    const encrypted = Buffer.concat([cipher.update("gmock-refresh-revoked"), cipher.final()]);
    await sql`update google_credentials set refresh_cipher=${encrypted.toString("base64")}, refresh_iv=${iv.toString("base64")}, refresh_tag=${cipher.getAuthTag().toString("base64")}, status='connected' where organization_id=${org}`;
    const revoked = await lead(`Token vencido ${stamp}`);
    reply = await inbound(revoked, "Quiero agendar una reunión a las 10 am, mi correo es vencido@example.test");
    check((await meeting(revoked.id)).source === "manual" && reply.includes("Registré la reunión"), "token revocado degrada a reserva CRM sin colgar el turno");
    check((await get("/api/settings/calendar")).connection?.status === "reconnect_required", "conexión vencida queda marcada para reconectar");
    const reconnect = await lead(`Reconexión ${stamp}`);
    reply = await inbound(reconnect, "Quiero agendar una reunión a las 10 am, mi correo es reconectar@example.test");
    check((await meeting(reconnect.id)).source === "manual" && reply.includes("Registré la reunión"), "estado requiere reconexión sigue agendando");
    check(!(await get("/api/conversations")).conversations.find(value => value.id === reconnect.conversationId).handoffAt, "ausencia de Google no deriva al humano");
    const manual = await lead(`Reserva manual ${stamp}`);
    region = await details(manual);
    await page.getByRole("button", { name: "Agendar reunión", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Agendar reunión" });
    await dialog.getByLabel("Correo del prospecto").fill("manual@example.test");
    const manualDate = new Date(Date.now() + 10 * 24 * 3600_000); manualDate.setUTCHours(16, 0, 0, 0);
    await dialog.getByLabel("Fecha y hora", { exact: true }).fill(local(manualDate));
    await dialog.getByRole("button", { name: "Agendar reunión", exact: true }).click(); await dialog.waitFor({ state: "detached" });
    check((await meeting(manual.id)).source === "manual", "formulario manual también registra sin Calendar válido");
    await region.getByText("Reunión registrada en el CRM", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 }); await region.scrollIntoViewIfNeeded();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "reunión local usable en móvil sin desbordamiento");
    await page.screenshot({ path: `${evidence}/mobile.png`, fullPage: true });
    const bEmail = `calendar-b-${stamp}@test.local`;
    await post("/api/admin/companies", { companyName: `Empresa B ${stamp}`, adminName: "Admin B", adminEmail: bEmail, adminPassword: "CalendarPrueba123!" });
    const apiB = await request.newContext({ baseURL });
    await json(await apiB.post("/api/auth/sign-in/email", { data: { email: bEmail, password: "CalendarPrueba123!" } }));
    check((await apiB.post(`/api/contacts/${target.id}/schedule`, { data: { prospectEmail: "other@example.test", startIso: manualDate.toISOString() } })).status() === 404, "empresa B no puede agendar contacto ajeno");
    check((await apiB.get(`/api/contacts/${target.id}/meeting`)).status() === 404, "empresa B no puede leer la reunión local ajena");
    await apiB.dispose();
  }
  await writeFile(`${evidence}/${noConfig ? "sin-credenciales" : "e2e"}.json`, JSON.stringify({ passed: checks.length, checks }, null, 2));
  console.log(`CALENDAR OPCIONAL: ${checks.length} checks aprobados`);
} finally { await browser.close(); await sql.end(); }
