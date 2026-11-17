import assert from "node:assert/strict";
import { chromium } from "playwright";
import postgres from "postgres";
import { createDecipheriv, randomUUID } from "node:crypto";

const baseURL = "http://127.0.0.1:3110";
const db = postgres("postgresql://postgres:postgres@127.0.0.1:5433/seomos_sms_034", { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL });
const api = context.request;
const checks = [];
const check = (ok, label) => { assert(ok, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async res => { assert(res.ok(), `${res.status()} ${await res.text()}`); return res.json(); };
const waitFor = async predicate => {
  for (let n = 0; n < 100; n++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error("SMS parity: resultado no observado");
};
let counter = 1800000000;
try {
  await json(await api.post("/api/auth/sign-in/email", { data: { email: "sms034@test.local", password: "SmsPrueba123!" } }));
  const [owner] = await db`select m.id, m.organization_id as org from member m join "user" u on u.id=m.user_id where u.email='sms034@test.local' limit 1`;
  assert(owner);
  const org = owner.org;
  await db`delete from sms_event where organization_id=${org}`;
  await db`delete from sms_message where organization_id=${org}`;
  await db`delete from sms_contact where organization_id=${org}`;
  await json(await api.post("/api/dev/brevo-mock/control", { data: { reset: true } }));
  await db`update ai_credit_account set balance=30 where organization_id=${org}`;
  await json(await api.put("/api/agent/profile", { data: { enabled: true, name: "SMS QA", responseLanguage: "es-en" } }));
  const suffix = Date.now().toString().slice(-7);
  const phone = `+1202${suffix}`;
  const crmId = `ct_sms_${randomUUID()}`;
  const serviceId = `svc_sms_${randomUUID()}`;
  const leadId = `lead_sms_${randomUUID()}`;
  const [stage] = await db`select id from pipeline_stage where organization_id=${org} and name='Nuevo' limit 1`;
  await db`insert into contact (id,organization_id,phone,name,email,consent_source) values (${crmId},${org},${phone.slice(1)},'SMS Parity QA','sms-qa@example.test','meta_lead_ads')`;
  await db`insert into service (id,organization_id,name,assigned_member_id) values (${serviceId},${org},'SMS QA service',${owner.id})`;
  await db`insert into lead (id,organization_id,contact_id,stage_id,service_id) values (${leadId},${org},${crmId},${stage.id},${serviceId})`;
  const person = (await json(await api.post("/api/sms/contacts", { data: { name: "SMS Parity QA", phone, consentEvidence: "Fictitious explicit QA SMS consent" } }))).contact;
  const manual = (await json(await api.post("/api/sms/send", { data: { contactId: person.id, content: "Requested QA message", operationId: randomUUID() } }))).message;
  await json(await api.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } }));
  async function hook(reply) {
    const [row] = await db`select webhook_secret from sms_connection where organization_id=${org}`;
    const value = row.webhook_secret;
    const cipher = createDecipheriv("aes-256-gcm", Buffer.alloc(32), Buffer.from(value.iv, "base64"));
    cipher.setAuthTag(Buffer.from(value.tag, "base64"));
    const token = Buffer.concat([cipher.update(Buffer.from(value.cipher, "base64")), cipher.final()]).toString();
    await json(await api.post(`/api/webhooks/brevo/${org}`, {
      headers: { authorization: `Bearer ${token}` },
      data: { msg_status: "replied", to: phone, messageId: Number(manual.providerMessageId), reply, ts_event: ++counter },
    }));
  }
  const snap = async () => json(await api.get(`/api/sms?contactId=${person.id}`));
  await hook("SMS_AGENT_AVAILABILITY Do you have available times for a call?");
  await waitFor(async () => (await snap()).messages.some(message => message.source === "agent"));
  const offer = (await snap()).messages.find(message => message.source === "agent")?.content ?? "";
  check(/(?:Available|Proposed) \(.+\):.+;.+Which works\?/i.test(offer), "SMS ofrece dos fechas concretas en lugar de una respuesta vaga");
  check(offer.includes("We have your email.") && !offer.includes("Please share your email."), "la oferta utiliza el correo ya conocido sin pedirlo otra vez");
  check((await db`select id from meeting where organization_id=${org} and contact_id=${crmId}`).length === 0, "oferta no crea reunión sin confirmación");

  await hook("SMS_AGENT_NOTE I need inventory integration");
  await waitFor(async () => (await db`select notes from contact where id=${crmId}`)[0]?.notes?.includes("SMS QA note"));
  check((await snap()).messages.some(message => message.source === "agent" && message.content === "Thanks, I noted that."), "SMS guarda nota y responde al lead");
  await hook("SMS_AGENT_STAGE I want your service");
  await waitFor(async () => (await db`select p.name from lead l join pipeline_stage p on p.id=l.stage_id where l.id=${leadId}`)[0]?.name === "Calificado");
  check((await snap()).messages.some(message => message.source === "agent" && message.content === "Your lead is qualified."), "SMS mueve etapa del lead y responde");
  await hook("SMS_AGENT_FOLLOWUP Please text me later");
  await waitFor(async () => (await db`select follow_up_channel, follow_up_due_at from lead where id=${leadId}`)[0]?.follow_up_channel === "sms");
  const [dueLead] = await db`select follow_up_due_at from lead where id=${leadId}`;
  check(!!dueLead.follow_up_due_at, "pedido de contacto posterior programa SMS, no WhatsApp");
  const travel = new Date(dueLead.follow_up_due_at.getTime() + 60_000).toISOString();
  await json(await api.post(`/api/cron/sweep?now=${encodeURIComponent(travel)}`, { headers: { authorization: "Bearer sms034-sweep-local" } }));
  await waitFor(async () => (await snap()).messages.some(message => message.source === "automation" && /Following up as you requested/.test(message.content)));
  check((await snap()).messages.some(message => message.source === "automation" && /Following up as you requested/.test(message.content)), "barrido envía seguimiento solicitado por SMS");

  const date = new Date(Date.now() + 9 * 86400_000);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  const localDate = date.toISOString().slice(0, 10);
  await hook(`SMS_AGENT_SCHEDULE ${localDate}T10:00:00-05:00 10:00 AM`);
  await waitFor(async () => (await db`select follow_up_due_at from lead where id=${leadId}`)[0]?.follow_up_due_at === null);
  check((await db`select follow_up_due_at from lead where id=${leadId}`)[0]?.follow_up_due_at === null, "respuesta entrante cancela el seguimiento SMS pendiente");
  await waitFor(async () => (await db`select id from meeting where organization_id=${org} and contact_id=${crmId}`).length === 1);
  const [meeting] = await db`select start_at from meeting where organization_id=${org} and contact_id=${crmId}`;
  const [lead] = await db`select p.kind from lead l join pipeline_stage p on p.id=l.stage_id where l.id=${leadId}`;
  check(meeting.start_at.toISOString() === `${localDate}T15:00:00.000Z` && lead.kind === "scheduled", "confirmación SMS registra reunión y mueve etapa");
  await waitFor(async () => (await snap()).messages.filter(message => message.source === "agent").length >= 2);
  check((await snap()).messages.some(message => message.source === "agent" && /Booked for/.test(message.content)), "confirmación visible en el hilo SMS");

  await hook("Quiero hablar con una persona");
  await waitFor(async () => !!(await snap()).contacts.find(contact => contact.id === person.id)?.handoffAt);
  const [assigned] = await db`select assigned_member_id from lead where id=${leadId}`;
  check(assigned.assigned_member_id === owner.id, "derivación SMS asigna al responsable del servicio");
  const [notification] = await db`select href from notification where organization_id=${org} and href like ${`%sms=${person.id}%`} order by created_at desc limit 1`;
  check(notification?.href.includes(`sms=${person.id}`), "derivación notifica con enlace al hilo SMS");
  const page = await context.newPage();
  await page.goto(`/inbox?channel=sms&sms=${person.id}`);
  await page.getByText("Atención humana: el agente derivó este SMS al equipo.", { exact: false }).waitFor();
  check(await page.getByTestId("sms-conversation-panel").isVisible(), "Bandeja muestra estado de atención humana");
  await json(await api.patch(`/api/sms/contacts/${person.id}/agent`, { data: { enabled: true } }));
  await waitFor(async () => !(await snap()).contacts.find(contact => contact.id === person.id)?.handoffAt);
  check((await snap()).contacts.find(contact => contact.id === person.id)?.aiEnabled, "reactivar IA despeja derivación sin contestar historial");
  await hook("SMS_AGENT_BAD_JSON");
  await waitFor(async () => (await snap()).contacts.find(contact => contact.id === person.id)?.handoffReason === "error_modelo");
  check(!(await snap()).contacts.find(contact => contact.id === person.id)?.aiEnabled, "salida inválida deriva a humano con motivo visible");
  console.log(`SMS PARITY: ${checks.length} comprobaciones aprobadas`);
} finally { await browser.close(); await db.end(); }
