#!/bin/bash
# Self-test de COMPORTAMIENTO — avisos y resumen semanal por email (020).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3100}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && DATABASE_URL=postgresql://postgres:postgres@localhost:5433/vocero pnpm db:migrate >/dev/null 2>&1)

echo "── API real + Resend mock: avisos, aislamiento, resumen e infeliz"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const sweepSecret = "test-sweep-secret-020";
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", { max: 1 });
let passed = 0;

function assert(condition, message, context = "") {
  if (!condition) throw new Error(`${message}${context ? ` — ${context}` : ""}`);
  passed++;
  console.log(`  ✅ ${message}`);
}

async function body(response) {
  return response.json().catch(() => ({}));
}

async function waitFor(check, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`${message}${value ? ` — ${JSON.stringify(value)}` : ""}`);
}

(async () => {
  const publicApi = await request.newContext({ baseURL });
  await publicApi.delete("/api/dev/resend-mock");

  const ownerEmail = `admin-correo-${stamp}@test.local`;
  const commercialEmail = `comercial-correo-${stamp}@test.local`;
  const foreignEmail = `admin-ajeno-${stamp}@test.local`;
  const owner = await request.newContext({ baseURL });
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: { name: "Admin Correo", email: ownerEmail, password },
  });
  assert(signup.ok(), "empresa y administrador creados", `${signup.status()}`);

  const whatsapp = await owner.put("/api/settings/whatsapp", {
    data: { wabaId: "waba_email_a", phoneNumberId: "phone_email_a", token: "EAAtest-valido" },
  });
  assert(whatsapp.ok(), "WhatsApp mock de empresa A conectado");
  const memberResponse = await owner.post("/api/settings/team", {
    data: { name: "Ana Comercial", email: commercialEmail, password, role: "commercial" },
  });
  assert(memberResponse.ok(), "responsable comercial creado");
  const team = (await body(await owner.get("/api/settings/team"))).members;
  const commercial = team.find((member) => member.email === commercialEmail);
  assert(Boolean(commercial?.id), "responsable recuperado con ID");

  async function inbound(phoneNumberId, phone, name, event) {
    const response = await publicApi.post("/api/dev/wa-mock/inbound", {
      data: {
        phoneNumberId,
        from: phone,
        name,
        text: `Hola desde ${name}`,
        waMessageId: `wamid.us30.${stamp}.${event}`,
      },
    });
    assert(response.ok(), `lead entrante: ${name}`, `${response.status()}`);
  }

  async function emails() {
    return (await body(await publicApi.get("/api/dev/resend-mock"))).outbox ?? [];
  }

  await inbound("phone_email_a", "573001110030", "Ada Prospecto", "ada");
  await waitFor(async () => (await emails()).length === 1, "no llegó aviso al admin");
  let outbox = await emails();
  assert(outbox[0].to[0] === ownerEmail, "nuevo lead avisa al administrador");
  assert(
    outbox[0].subject.includes("Ada Prospecto") && outbox[0].html.includes("/inbox?contact="),
    "aviso identifica y enlaza el prospecto"
  );

  const conversations = (await body(await owner.get("/api/conversations"))).conversations;
  const ada = conversations.find((item) => item.contact.phone === "573001110030");
  assert(Boolean(ada?.id), "lead aparece en la bandeja real");
  const assigned = await owner.patch(`/api/conversations/${ada.id}/assignee`, {
    data: { memberId: commercial.id },
  });
  assert(assigned.ok() && (await body(assigned)).changed === true, "lead asignado al responsable");
  await waitFor(async () => (await emails()).length === 2, "no llegó aviso al responsable");
  outbox = await emails();
  assert(outbox.some((email) => email.to[0] === commercialEmail), "responsable recibe su aviso");

  const repeated = await owner.patch(`/api/conversations/${ada.id}/assignee`, {
    data: { memberId: commercial.id },
  });
  assert(repeated.ok() && (await body(repeated)).changed === false, "asignación repetida es idempotente");
  await inbound("phone_email_a", "573001110030", "Ada Prospecto", "ada");
  assert((await emails()).length === 2, "evento y asignación repetidos no duplican correo");

  const company = await owner.post("/api/admin/companies", {
    data: {
      companyName: "Empresa Ajena",
      adminName: "Admin Ajeno",
      adminEmail: foreignEmail,
      adminPassword: password,
    },
  });
  assert(company.ok(), "segunda empresa creada");
  const foreign = await request.newContext({ baseURL });
  const foreignLogin = await foreign.post("/api/auth/sign-in/email", {
    data: { email: foreignEmail, password },
  });
  assert(foreignLogin.ok(), "admin de empresa B inicia sesión");
  assert(
    (await foreign.put("/api/settings/whatsapp", {
      data: { wabaId: "waba_email_b", phoneNumberId: "phone_email_b", token: "EAAtest-valido" },
    })).ok(),
    "WhatsApp mock de empresa B conectado"
  );
  await inbound("phone_email_b", "573002220030", "Bruno Ajeno", "bruno");
  await waitFor(async () => (await emails()).length === 3, "no llegó aviso de empresa B");
  outbox = await emails();
  assert(outbox.some((email) => email.to[0] === foreignEmail), "B avisa solo a su administrador");
  assert(
    outbox.filter((email) => email.to[0] === ownerEmail).every((email) => !email.html.includes("Bruno Ajeno")),
    "avisos inmediatos no cruzan empresas"
  );

  const cron = await publicApi.post("/api/cron/sweep?now=2026-08-17T12:00:00.000Z", {
    headers: { authorization: `Bearer ${sweepSecret}` },
  });
  const cronBody = await body(cron);
  assert(cron.ok(), "barrido semanal responde", JSON.stringify(cronBody));
  assert(
    cronBody.weeklyEmail?.sent === 3 && cronBody.weeklyEmail?.failed === 0,
    "envía panorama A, resumen responsable y panorama B",
    JSON.stringify(cronBody.weeklyEmail)
  );
  outbox = await emails();
  assert(outbox.length === 6, "buzón contiene tres avisos y tres resúmenes");
  const adminDigest = outbox.find(
    (email) => email.to[0] === ownerEmail && email.subject.startsWith("Panorama semanal")
  );
  const assigneeDigest = outbox.find(
    (email) => email.to[0] === commercialEmail && email.subject.startsWith("Tu resumen semanal")
  );
  assert(adminDigest?.html.includes("Ada Prospecto"), "admin recibe panorama completo de A");
  assert(assigneeDigest?.html.includes("Ada Prospecto"), "responsable recibe sus prospectos");
  assert(!adminDigest.html.includes("Bruno Ajeno"), "panorama administrativo respeta tenant");

  for (let attempt = 0; attempt < 2; attempt++) {
    const retry = await publicApi.post("/api/cron/sweep?now=2026-08-17T12:00:00.000Z", {
      headers: { authorization: `Bearer ${sweepSecret}` },
    });
    assert(retry.ok(), `reintento semanal ${attempt + 1} responde`);
  }
  assert((await emails()).length === 6, "tres barridos producen una entrega por resumen");

  assert(
    (await publicApi.post("/api/dev/resend-mock", { data: { failNext: 1 } })).ok(),
    "fallo de proveedor preparado"
  );
  await inbound("phone_email_a", "573003330030", "Carla Resiliente", "carla");
  const afterFailure = await emails();
  assert(afterFailure.length === 6, "proveedor fallido no crea una falsa entrega");
  const contacts = (await body(await owner.get("/api/contacts"))).contacts;
  assert(
    contacts.some((contact) => contact.name === "Carla Resiliente"),
    "fallo de correo no revierte el lead"
  );
  const [failed] = await sql`
    select status, last_error
    from email_delivery
    where status = 'failed'
    order by created_at desc
    limit 1
  `;
  assert(
    failed?.status === "failed" && failed.last_error === "Resend respondió HTTP 500",
    "fallo se persiste sanitizado",
    JSON.stringify(failed)
  );
  assert(!failed.last_error.includes("REEMPLAZA_"), "error no contiene la API key");

  const denied = await publicApi.post("/api/cron/sweep", {
    headers: { authorization: "Bearer incorrecto" },
  });
  assert(denied.status() === 404, "cron oculta su existencia con secreto incorrecto");

  console.log(`\n═══ RESULTADO: ${passed} verificaciones verdes ═══`);
  await Promise.all([owner.dispose(), foreign.dispose(), publicApi.dispose()]);
  await sql.end();
})().catch(async (error) => {
  console.error(error);
  await sql.end().catch(() => {});
  process.exit(1);
});
JS
)
