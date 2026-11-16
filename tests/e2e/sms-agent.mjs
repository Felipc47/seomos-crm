import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { createDecipheriv, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = "http://127.0.0.1:3110";
const db = postgres("postgresql://postgres:postgres@127.0.0.1:5433/seomos_sms_034", { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(), api = context.request;
page.setDefaultTimeout(30000);
const checks = [];
const check = (ok, label) => { assert(ok, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${await response.text()}`); return response.json(); };
const post = async (path, data) => json(await api.post(path, { data }));
const snapshot = async id => json(await api.get(`/api/sms?contactId=${id}`));
const sends = async () => (await json(await api.get("/api/dev/brevo-mock/control"))).sends;
const waitFor = async predicate => {
  for (let n = 0; n < 100; n++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 150)); }
  throw new Error("Esperando resultado observable del agente SMS");
};
let org, eventCounter = 1700001000;
async function hook(messageId, reply) {
  const [row] = await db`select webhook_secret from sms_connection where organization_id=${org}`;
  const value = row.webhook_secret;
  const cipher = createDecipheriv("aes-256-gcm", Buffer.alloc(32), Buffer.from(value.iv, "base64"));
  cipher.setAuthTag(Buffer.from(value.tag, "base64"));
  const token = Buffer.concat([cipher.update(Buffer.from(value.cipher, "base64")), cipher.final()]).toString();
  return json(await api.post(`/api/webhooks/brevo/${org}`, {
    headers: { authorization: `Bearer ${token}` },
    data: { msg_status: "replied", to: "12025550131", messageId, reply, ts_event: ++eventCounter },
  }));
}
try {
  await mkdir(".artifacts/sms-agent", { recursive: true });
  await json(await api.post("/api/auth/sign-in/email", { data: { email: "sms034@test.local", password: "SmsPrueba123!" } }));
  org = (await db`select m.organization_id from member m join "user" u on u.id=m.user_id where u.email='sms034@test.local' limit 1`)[0].organization_id;
  await db`delete from sms_event where organization_id=${org}`;
  await db`delete from sms_message where organization_id=${org}`;
  await db`delete from sms_contact where organization_id=${org}`;
  await api.delete("/api/settings/sms");
  await post("/api/dev/brevo-mock/control", { reset: true });
  await json(await api.put("/api/agent/profile", { data: { enabled: true, name: "Agente QA SMS" } }));
  await db`insert into ai_credit_account (organization_id,balance,total_granted,total_used) values (${org},20,20,0)
    on conflict (organization_id) do update set balance=20,total_granted=20,total_used=0`;
  await json(await api.put("/api/settings/sms", { data: { apiKey: "sms-mock-valid-account-1111" } }));
  await post("/api/settings/sms/sender", { sender: "+12025550124", approvalEvidence: "QA aprobación ficticia para mocks", approved: true });
  await post("/api/settings/sms/webhook");
  const person = (await post("/api/sms/contacts", {
    name: "Agente SMS QA", phone: "+12025550131", consentEvidence: "QA ficticio: permiso SMS explícito para pruebas locales",
  })).contact;
  const first = (await post("/api/sms/send", { contactId: person.id, content: "Aviso solicitado de prueba", operationId: randomUUID() })).message;
  check(first.status === "accepted" && (await sends()).length === 1, "primer aviso manual enviado al mock");

  await page.goto("/inbox?channel=sms");
  await page.getByTestId(`inbox-sms-${person.id}`).getByRole("button").click();
  const switcher = page.getByRole("switch", { name: "IA en esta conversación" });
  check(!(await switcher.isChecked()), "IA SMS apagada inicialmente para contactos existentes");
  await hook(Number(first.providerMessageId), "SMS_AGENT_REPLY_OFF");
  await new Promise(resolve => setTimeout(resolve, 500));
  check((await sends()).length === 1, "respuesta entrante con IA apagada no envía");

  await switcher.click();
  await waitFor(async () => (await snapshot(person.id)).contacts.find(c => c.id === person.id)?.aiEnabled === true);
  check(await switcher.isChecked(), "operador activa IA SMS desde Bandeja");
  await new Promise(resolve => setTimeout(resolve, 500));
  check((await sends()).length === 1, "encender IA no responde retroactivamente al historial");

  await hook(Number(first.providerMessageId), "SMS_AGENT_REPLY");
  await waitFor(async () => (await snapshot(person.id)).messages.some(m => m.source === "agent"));
  await page.getByRole("log", { name: "Historial SMS" }).getByText("Respuesta automatica de prueba.", { exact: true }).waitFor();
  check((await sends()).length === 2 && await page.getByText("Agente IA", { exact: true }).isVisible(), "agente responde automáticamente y se distingue en el hilo");
  const aiEntry = (await snapshot(person.id)).messages.find(m => m.source === "agent");
  check(aiEntry && aiEntry.content.length <= 160, "respuesta automática limitada a un segmento");
  const lastEvent = eventCounter;
  eventCounter--;
  await hook(Number(first.providerMessageId), "SMS_AGENT_REPLY");
  eventCounter = lastEvent;
  await new Promise(resolve => setTimeout(resolve, 500));
  check((await sends()).length === 2, "webhook repetido no duplica respuesta");
  await api.post("/api/cron/sweep", { headers: { authorization: "Bearer sms034-sweep-local" } });
  await new Promise(resolve => setTimeout(resolve, 500));
  check((await sends()).length === 2, "barrido de recuperación no duplica respuesta");

  const beforeManual = (await sends()).length;
  const beforeCalls = (await post("/api/dev/ai-mock/fail-next", {})).chatCalls;
  await hook(Number(first.providerMessageId), "SMS_AGENT_DELAY_MANUAL");
  await waitFor(async () => (await post("/api/dev/ai-mock/fail-next", {})).chatCalls > beforeCalls);
  await post("/api/sms/send", { contactId: person.id, content: "Respuesta manual prevalece.", operationId: randomUUID() });
  await new Promise(resolve => setTimeout(resolve, 1300));
  const afterManual = (await sends()).length;
  check(afterManual === beforeManual + 1 && (await snapshot(person.id)).messages.filter(m => m.source === "agent").length === 1,
    "respuesta manual durante el LLM cancela el SMS automático");

  await hook(Number(first.providerMessageId), "SMS_AGENT_NONE");
  await waitFor(async () => {
    const [row] = await db`select ai_last_inbound_id from sms_contact where id=${person.id}`;
    const s = await snapshot(person.id);
    return row.ai_last_inbound_id === s.messages.at(-1)?.id;
  });
  check((await sends()).length === afterManual, "acción none se marca atendida sin enviar");

  await post("/api/dev/brevo-mock/control", { next: "unavailable" });
  await hook(Number(first.providerMessageId), "SMS_AGENT_REPLY");
  await waitFor(async () => (await snapshot(person.id)).messages.some(m => m.source === "agent" && m.status === "uncertain"));
  const uncertain = (await snapshot(person.id)).messages.find(m => m.source === "agent" && m.status === "uncertain");
  check(!!uncertain, "fallo de Brevo conserva el intento como incierto");
  await api.post("/api/cron/sweep", { headers: { authorization: "Bearer sms034-sweep-local" } });
  await new Promise(resolve => setTimeout(resolve, 500));
  check((await snapshot(person.id)).messages.filter(m => m.id === uncertain.id).length === 1, "resultado incierto no se reenvía");
  const sendsAfterFailure = (await sends()).length;

  await hook(Number(first.providerMessageId), "Quiero hablar con una persona");
  await waitFor(async () => !(await snapshot(person.id)).contacts.find(c => c.id === person.id)?.aiEnabled);
  check((await sends()).length === sendsAfterFailure, "solicitud de humano pausa IA sin SMS automático");
  await page.screenshot({ path: ".artifacts/sms-agent/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "control IA SMS no desborda en móvil");
  await page.screenshot({ path: ".artifacts/sms-agent/mobile.png", fullPage: true });

  await json(await api.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } }));
  await hook(Number(first.providerMessageId), "SMS_AGENT_LONG");
  await waitFor(async () => !(await snapshot(person.id)).contacts.find(c => c.id === person.id)?.aiEnabled);
  check((await sends()).length === sendsAfterFailure, "respuesta de varios segmentos se descarta y pausa IA");

  await json(await api.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } }));
  await hook(Number(first.providerMessageId), "SMS_AGENT_BAD_JSON");
  await waitFor(async () => !(await snapshot(person.id)).contacts.find(c => c.id === person.id)?.aiEnabled);
  check((await sends()).length === sendsAfterFailure, "salida inválida del modelo pausa IA y no envía");

  await db`update ai_credit_account set balance=0 where organization_id=${org}`;
  await json(await api.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } }));
  await hook(Number(first.providerMessageId), "SMS_AGENT_REPLY");
  await waitFor(async () => !(await snapshot(person.id)).contacts.find(c => c.id === person.id)?.aiEnabled);
  check((await sends()).length === sendsAfterFailure, "saldo IA cero pausa agente antes del modelo y Brevo");

  const [existingTenant] = await db`select email from "user" where email like 'sms-agent-b-%@test.local' order by created_at desc limit 1`;
  const tenant = existingTenant?.email ?? `sms-agent-b-${Date.now()}@test.local`;
  if (!existingTenant) await post("/api/admin/companies", { companyName: "SMS Agent B", adminName: "Admin B", adminEmail: tenant, adminPassword: "SmsPrueba123!" });
  await db`update member set role='owner' where user_id=(select id from "user" where email=${tenant})`;
  const other = await request.newContext({ baseURL });
  await json(await other.post("/api/auth/sign-in/email", { data: { email: tenant, password: "SmsPrueba123!" } }));
  check((await other.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } })).status() === 404, "tenant ajeno no activa IA en contacto A");
  await db`update member set role='agent_editor' where user_id=(select id from "user" where email=${tenant})`;
  check((await other.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } })).status() === 403, "rol sin SMS no activa IA");
  await other.dispose();
  const anon = await request.newContext({ baseURL });
  check((await anon.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } })).status() === 401, "sin sesión no activa IA");
  await anon.dispose();

  await db`update ai_credit_account set balance=20 where organization_id=${org}`;
  await json(await api.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } }));
  await hook(Number(first.providerMessageId), "STOP");
  await waitFor(async () => !!(await snapshot(person.id)).contacts.find(c => c.id === person.id)?.optedOutAt);
  check(!(await snapshot(person.id)).contacts.find(c => c.id === person.id)?.aiEnabled && (await sends()).length === sendsAfterFailure, "STOP da de baja y apaga el agente sin responder");

  await writeFile(".artifacts/sms-agent/result.json", JSON.stringify({ passed: checks.length, checks }, null, 2));
  console.log(`SMS AGENT: ${checks.length} comprobaciones aprobadas`);
} finally { await browser.close(); await db.end(); }
