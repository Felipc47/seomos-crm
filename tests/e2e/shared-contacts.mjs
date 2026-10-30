import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3110";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_shared_contacts_038", { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const api = context.request, page = await context.newPage();
const checks = [], errors = [];
page.on("pageerror", error => errors.push(error.message));
function check(ok, label) { assert(ok, label); checks.push(label); console.log(`✅ ${checks.length}. ${label}`); }
async function json(res) { assert(res.ok(), `${res.status()} ${await res.text()}`); return res.json(); }
const stamp = Date.now(), phone = "573009990038";
const cards = [{ name: { formatted_name: "Fabián Contacto E2E" }, phones: [{ phone: "+57 300 123 4567", type: "CELL" }, { wa_id: "14155550100", type: "WORK" }], emails: [{ email: "fabian@example.test", type: "WORK" }], org: { company: "Ejemplo", title: "Director" }, addresses: [{ street: "Calle 38", city: "Bogotá" }], urls: [{ url: "https://example.test/contacto" }], birthday: "1990-01-02" }, { name: { first_name: "Otra", last_name: "Persona" } }];
function payload(id, contacts, type = "contacts") { return { object: "whatsapp_business_account", entry: [{ id: "waba_test_1", changes: [{ field: "messages", value: { metadata: { phone_number_id: "phone_test_1" }, contacts: [{ wa_id: phone, profile: { name: "Remitente E2E" } }], messages: [{ from: phone, id, timestamp: String(Math.floor(Date.now() / 1000)), type, ...(type === "text" ? { text: { body: "Después del contacto ilegible" } } : { contacts }) }] } }] }] }; }
async function webhook(body) { await json(await api.post("/api/webhooks/wa/shared038-verify-token", { data: body })); }
try {
  const anon = await request.newContext({ baseURL });
  check((await anon.get("/api/conversations/unknown/messages")).status() === 401, "historial exige autenticación"); await anon.dispose();
  await page.goto("/register"); await page.getByLabel("Tu nombre").fill("Admin contactos"); await page.getByLabel("Correo").fill(`shared-${stamp}@test.local`); await page.getByLabel("Contraseña").fill("SharedContacts123!"); await page.getByRole("button", { name: "Crear cuenta" }).click(); await page.waitForURL(/\/inbox/);
  await json(await api.put("/api/settings/whatsapp", { data: { wabaId: "waba_test_1", phoneNumberId: "phone_test_1", token: "EAAtest-valido" } }));
  const contact = (await json(await api.post("/api/contacts", { data: { name: "Remitente E2E", phone } }))).contact;
  const conversation = (await json(await api.post("/api/conversations", { data: { contactId: contact.id } }))).conversation;
  const messages = async () => (await json(await api.get(`/api/conversations/${conversation.id}/messages`))).messages;
  await page.goto(`/inbox?contact=${contact.id}`);
  await page.getByRole("button", { name: "Ver detalles del contacto" }).waitFor();

  const body = payload(`wamid.shared.${stamp}`, cards); await webhook(body);
  let region = page.getByRole("region", { name: "Contacto compartido: Fabián Contacto E2E", exact: true });
  await region.waitFor(); check(true, "webhook muestra tarjeta en hilo abierto mediante SSE sin recargar");
  check(await region.getByRole("link", { name: "+57 300 123 4567", exact: true }).getAttribute("href") === "tel:+573001234567", "teléfono recibido visible con enlace seguro");
  check(await region.getByRole("link", { name: "+14155550100", exact: true }).isVisible(), "conserva segundo número recibido solo como wa_id");
  check(await region.getByRole("link", { name: "fabian@example.test", exact: true }).getAttribute("href") === "mailto:fabian%40example.test", "correo visible con acción de email");
  check(await region.getByText("Ejemplo · Director", { exact: true }).isVisible() && await region.getByText("Calle 38, Bogotá", { exact: false }).isVisible(), "empresa y dirección visibles");
  check(await region.getByRole("link", { name: "https://example.test/contacto" }).getAttribute("href") === "https://example.test/contacto", "web disponible con protocolo seguro");
  check(await page.getByRole("region", { name: "Contacto compartido: Otra Persona" }).isVisible(), "todas las fichas del mismo mensaje visibles");
  let saved = await messages(); check(saved.length === 1 && saved[0].sharedContacts.length === 2, "DTO persiste dos fichas como un mensaje");
  await webhook(body); await new Promise(resolve => setTimeout(resolve, 700)); check((await messages()).length === 1, "reintento del webhook no duplica");
  check((await sql`select count(*)::int n from contact`)[0].n === 1, "ver la ficha no crea prospectos automáticamente");
  await page.reload(); region = page.getByRole("region", { name: "Contacto compartido: Fabián Contacto E2E", exact: true }); await region.waitFor(); check(true, "fichas persisten después de recargar");
  await webhook(payload(`wamid.invalid.${stamp}`, [null, { name: 4, phones: "bad" }]));
  await page.getByText("Los datos de este contacto no están disponibles.", { exact: false }).waitFor(); check(true, "payload incompleto muestra explicación sin colgar el hilo");
  await webhook(payload(`wamid.after.${stamp}`, null, "text")); await page.locator("span.whitespace-pre-wrap").filter({ hasText: "Después del contacto ilegible" }).waitFor(); check(true, "mensajes posteriores continúan funcionando");
  await webhook(payload(`wamid.unsafe.${stamp}`, [{ name: { formatted_name: "Ficha segura" }, urls: [{ url: "javascript:alert(1)" }], emails: [{ email: "a@example.test?bcc=otro@example.test" }] }]));
  const unsafe = page.getByRole("region", { name: "Contacto compartido: Ficha segura" }); await unsafe.waitFor(); check(await unsafe.locator("a[href]").count() === 0, "contenido inseguro se muestra sin enlaces ejecutables");
  const org = (await sql`select organization_id from contact where id=${contact.id}`)[0].organization_id;
  await sql`insert into message(id,organization_id,conversation_id,wa_message_id,direction,type,status) values(${'msg_legacy_'+stamp},${org},${conversation.id},${'wamid.legacy.'+stamp},'in','contacts','delivered')`;
  await page.reload(); await page.getByRole("region", { name: "Contacto compartido: Fabián Contacto E2E", exact: true }).waitFor(); check(await page.getByText("Los datos de este contacto no están disponibles.", { exact: false }).count() === 2, "históricos sin datos tienen fallback y solicitud de reenvío");
  await page.setViewportSize({ width: 390, height: 844 }); await region.scrollIntoViewIfNeeded(); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "tarjetas sin desbordamiento horizontal móvil");
  await mkdir(".artifacts/shared-contacts", { recursive: true }); await page.screenshot({ path: ".artifacts/shared-contacts/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await region.scrollIntoViewIfNeeded(); await page.screenshot({ path: ".artifacts/shared-contacts/desktop.png", fullPage: true });
  const bEmail = `shared-b-${stamp}@test.local`; await json(await api.post("/api/admin/companies", { data: { companyName: "Empresa B contactos", adminName: "Admin B", adminEmail: bEmail, adminPassword: "SharedContacts123!" } }));
  const apiB = await request.newContext({ baseURL }); await json(await apiB.post("/api/auth/sign-in/email", { data: { email: bEmail, password: "SharedContacts123!" } }));
  check((await apiB.get(`/api/conversations/${conversation.id}/messages`)).status() === 404, "otra empresa no puede leer las fichas compartidas"); await apiB.dispose();
  const migration = await readFile("drizzle/0036_burly_oracle.sql", "utf8"); await sql.unsafe(migration); await sql.unsafe(migration); check((await messages())[0].sharedContacts[0].name === "Fabián Contacto E2E", "migración repetida preserva fichas");
  check(errors.length === 0, "sin errores JavaScript en el navegador");
  check((await json(await api.get("/api/dev/wa-mock/outbox"))).outbox.length === 0, "sin envíos automáticos por recibir una ficha");
  await writeFile(".artifacts/shared-contacts/checks.json", JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(`SELF-TEST CONTACTOS: ${checks.length} comprobaciones aprobadas`);
} catch (error) { await mkdir(".artifacts/shared-contacts", { recursive: true }); await page.screenshot({ path: ".artifacts/shared-contacts/failure.png", fullPage: true }); throw error; } finally { await browser.close(); await sql.end(); }
