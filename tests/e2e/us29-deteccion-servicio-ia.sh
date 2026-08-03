#!/bin/bash
# Self-test de COMPORTAMIENTO — clasificación IA y enrutamiento por servicio.
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)

echo "── WhatsApp directo + IA: clasificación, precedencia e idempotencia"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { chromium, request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const phoneNumberId = "phone_service_ai";
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", {
  max: 1,
});
let passed = 0;

function ok(message) {
  passed += 1;
  console.log(`  ✅ ${message}`);
}

function assert(condition, message, context = "") {
  if (!condition) {
    throw new Error(`${message}${context ? ` — ${context}` : ""}`);
  }
  ok(message);
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
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${message}${value ? ` — ${JSON.stringify(value)}` : ""}`);
}

async function session(email) {
  const context = await request.newContext({ baseURL });
  const login = await context.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  assert(login.ok(), `inicio de sesión: ${email}`, `${login.status()}`);
  return context;
}

async function inbound(api, phone, name, text) {
  const response = await api.post("/api/dev/wa-mock/inbound", {
    data: { phoneNumberId, from: phone, name, text },
  });
  assert(response.ok(), `entrante: ${name}`, `${response.status()}`);
}

async function contactByPhone(api, phone) {
  const response = await api.get(`/api/contacts?q=${phone}`);
  if (!response.ok()) return null;
  return (await response.json()).contacts?.find(
    (contact) => contact.phone === phone
  ) ?? null;
}

async function conversationByPhone(api, phone) {
  const response = await api.get("/api/conversations");
  if (!response.ok()) return null;
  return (await response.json()).conversations?.find(
    (conversation) => conversation.contact.phone === phone
  ) ?? null;
}

(async () => {
  const ownerEmail = `owner-service-ai-${stamp}@test.local`;
  const anaEmail = `ana-service-ai-${stamp}@test.local`;
  const pedroEmail = `pedro-service-ai-${stamp}@test.local`;
  const phones = {
    direct: "573110029001",
    transferred: "573110029002",
    invalid: "573110029003",
    notifyFailure: "573110029004",
    leadgen: "573110029005",
  };

  const owner = await request.newContext({ baseURL });
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: {
      name: "Admin Servicio IA",
      email: ownerEmail,
      password,
    },
  });
  assert(signup.ok(), "registro de organización", `${signup.status()}`);

  const whatsapp = await owner.put("/api/settings/whatsapp", {
    data: {
      wabaId: "waba_service_ai",
      phoneNumberId,
      token: "EAAtest-valido",
    },
  });
  assert(whatsapp.ok(), "WhatsApp mock conectado", `${whatsapp.status()}`);
  await owner.delete("/api/dev/wa-mock/outbox");
  const agent = await owner.put("/api/agent/profile", {
    data: { enabled: true, name: "Ana IA" },
  });
  assert(agent.ok(), "agente encendido");

  for (const member of [
    { name: "Ana Web", email: anaEmail, role: "commercial" },
    { name: "Pedro Comercial", email: pedroEmail, role: "commercial" },
  ]) {
    const created = await owner.post("/api/settings/team", {
      data: { ...member, password },
    });
    assert(created.ok(), `miembro creado: ${member.name}`);
  }
  const team = (await body(await owner.get("/api/settings/team"))).members;
  const ana = team.find((member) => member.email === anaEmail);
  const pedro = team.find((member) => member.email === pedroEmail);
  assert(ana?.id && pedro?.id, "ejecutivos recuperados");

  const web = (await body(await owner.post("/api/services", {
    data: { name: "Desarrollo web" },
  }))).service;
  const seo = (await body(await owner.post("/api/services", {
    data: { name: "SEO" },
  }))).service;
  assert(web?.id && seo?.id, "catálogo de servicios creado");
  assert(
    (await owner.patch(`/api/services/${web.id}`, {
      data: { assignedMemberId: ana.id },
    })).ok(),
    "Desarrollo web asignado a Ana"
  );
  assert(
    (await owner.patch(`/api/services/${seo.id}`, {
      data: { assignedMemberId: ana.id },
    })).ok(),
    "SEO asignado a Ana"
  );

  const anaSession = await session(anaEmail);

  // El mock se comporta como un proveedor sobreconfiado y devuelve el primer
  // serviceId válido en estas tres entradas. La frontera de persistencia debe
  // rechazarlo hasta que el CLIENTE exprese una necesidad concreta.
  await inbound(owner, phones.direct, "Cliente Directa", "Hola");
  const directConversation = await waitFor(
    () => conversationByPhone(owner, phones.direct),
    "no apareció la conversación directa"
  );
  await waitFor(async () => {
    const messages = await body(
      await owner.get(`/api/conversations/${directConversation.id}/messages`)
    );
    return messages.messages?.some(
      (message) => message.direction === "out" && message.aiGenerated
    );
  }, "la IA no atendió el mensaje ambiguo");
  const ambiguous = await contactByPhone(owner, phones.direct);
  assert(
    ambiguous.service === null && ambiguous.assignee === null,
    "saludo no se asigna aunque el proveedor devuelva un servicio válido"
  );

  await inbound(owner, phones.direct, "Cliente Directa", "Soy Juan Fernandino");
  await waitFor(async () => {
    const messages = await body(
      await owner.get(`/api/conversations/${directConversation.id}/messages`)
    );
    return messages.messages?.filter(
      (message) => message.direction === "out" && message.aiGenerated
    ).length >= 2;
  }, "la IA no atendió el nombre del cliente");
  const afterName = await contactByPhone(owner, phones.direct);
  assert(
    afterName.service === null && afterName.assignee === null,
    "nombre del cliente no se confunde con intención comercial"
  );

  await inbound(owner, phones.direct, "Cliente Directa", "Quisiera información");
  await waitFor(async () => {
    const messages = await body(
      await owner.get(`/api/conversations/${directConversation.id}/messages`)
    );
    return messages.messages?.filter(
      (message) => message.direction === "out" && message.aiGenerated
    ).length >= 3;
  }, "la IA no atendió la consulta genérica");
  const afterGeneric = await contactByPhone(owner, phones.direct);
  assert(
    afterGeneric.service === null && afterGeneric.assignee === null,
    "consulta genérica permanece sin servicio y sin responsable"
  );

  // Con contexto suficiente, la misma conversación se clasifica y enruta.
  await inbound(
    owner,
    phones.direct,
    "Cliente Directa",
    "Necesito una tienda virtual con catálogo y carrito de compras"
  );
  const directAssigned = await waitFor(async () => {
    const contact = await contactByPhone(owner, phones.direct);
    return contact?.service?.id === web.id && contact?.assignee?.memberId === ana.id
      ? contact
      : null;
  }, "la IA no asignó Desarrollo web a Ana");
  assert(
    directAssigned.service.name === "Desarrollo web" &&
      directAssigned.assignee.name === "Ana Web",
    "servicio y responsable visibles en la operación"
  );
  const directNotification = await waitFor(async () => {
    const notifications = (await body(
      await anaSession.get("/api/notifications")
    )).notifications ?? [];
    return notifications.find(
      (item) =>
        item.type === "lead_assigned" &&
        item.body?.includes("Cliente Directa") &&
        item.body?.includes("Desarrollo web")
    );
  }, "Ana no recibió la asignación directa");
  assert(
    directNotification.href === `/inbox?contact=${directAssigned.id}`,
    "notificación directa abre la conversación correcta"
  );

  await inbound(owner, phones.direct, "Cliente Directa", "También quisiera hacerlo en Joomla");
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const notificationsAfterRepeat = (await body(
    await anaSession.get("/api/notifications")
  )).notifications.filter(
    (item) => item.type === "lead_assigned" && item.body?.includes("Cliente Directa")
  );
  assert(
    notificationsAfterRepeat.length === 1,
    "turnos posteriores no duplican la notificación"
  );

  // La transferencia humana gana: IA completa servicio, no cambia a Ana.
  await inbound(owner, phones.transferred, "Cliente Transferida", "Hola, necesito orientación");
  const transferredConversation = await waitFor(
    () => conversationByPhone(owner, phones.transferred),
    "no apareció la conversación a transferir"
  );
  const transfer = await owner.patch(
    `/api/conversations/${transferredConversation.id}/assignee`,
    { data: { memberId: pedro.id } }
  );
  assert(transfer.ok(), "transferencia manual a Pedro");
  await inbound(
    owner,
    phones.transferred,
    "Cliente Transferida",
    "Quiero desarrollar una página web para mi empresa"
  );
  const preserved = await waitFor(async () => {
    const contact = await contactByPhone(owner, phones.transferred);
    return contact?.service?.id === web.id ? contact : null;
  }, "la IA no completó el servicio transferido");
  assert(
    preserved.assignee?.memberId === pedro.id,
    "la asignación humana prevalece sobre el responsable automático"
  );

  // Salida semánticamente inválida del LLM: no cruza la allowlist.
  await inbound(
    owner,
    phones.invalid,
    "Cliente Inválido",
    "Quiero contratar el servicio fantasma"
  );
  const invalidConversation = await waitFor(
    () => conversationByPhone(owner, phones.invalid),
    "no apareció el caso inválido"
  );
  await waitFor(async () => {
    const messages = await body(
      await owner.get(`/api/conversations/${invalidConversation.id}/messages`)
    );
    return messages.messages?.some((message) => message.direction === "out");
  }, "el caso inválido bloqueó el turno");
  const invalid = await contactByPhone(owner, phones.invalid);
  assert(
    invalid.service === null && invalid.assignee === null,
    "ID inventado se rechaza y la conversación continúa"
  );

  // La alerta es secundaria: al fallar, la atribución debe sobrevivir.
  let notificationRenamed = false;
  try {
    await sql`alter table notification rename to notification_unavailable`;
    notificationRenamed = true;
    await inbound(
      owner,
      phones.notifyFailure,
      "Cliente Sin Campana",
      "Necesito una tienda virtual con pagos"
    );
    const routed = await waitFor(async () => {
      const rows = await sql`
        select l.service_id, l.assigned_member_id
        from lead l
        join contact c on c.id = l.contact_id
        where c.phone = ${phones.notifyFailure}
      `;
      return rows[0]?.service_id === web.id ? rows[0] : null;
    }, "el fallo de notificación revirtió la clasificación");
    assert(
      routed.assigned_member_id === ana.id,
      "fallo de notificación conserva servicio y responsable"
    );
  } finally {
    if (notificationRenamed) {
      await sql`alter table notification_unavailable rename to notification`;
    }
  }

  // Regresión: el form sigue siendo determinista y prioritario.
  assert(
    (await owner.post(`/api/services/${seo.id}/forms`, {
      data: { formId: "form_seo_ai_29" },
    })).ok(),
    "formulario SEO vinculado"
  );
  const leadgen = await owner.post("/api/dev/leadgen-mock/inbound", {
    data: {
      leadgenId: "lgmock_service_ai_29",
      formId: "form_seo_ai_29",
      name: "Cliente Lead Ads",
      phone: phones.leadgen,
      email: "lead-ads@test.local",
    },
  });
  assert(leadgen.ok(), "Lead Ads procesado");
  const fromForm = await waitFor(async () => {
    const contact = await contactByPhone(owner, phones.leadgen);
    return contact?.service?.id === seo.id ? contact : null;
  }, "Lead Ads perdió la clasificación por formulario");
  assert(
    fromForm.assignee?.memberId === ana.id,
    "Lead Ads conserva responsable determinista"
  );

  // Evidencia observable en la Bandeja, no solo en SQL/API.
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    storageState: await owner.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.goto(`${baseURL}/inbox?contact=${directAssigned.id}`);
  const row = page.getByTestId(`inbox-conversation-${directConversation.id}`);
  await row.waitFor();
  await row.getByText("Desarrollo web", { exact: true }).waitFor();
  await row.getByText("Ana Web", { exact: true }).waitFor();
  assert(browserErrors.length === 0, "Bandeja sin errores de navegador", browserErrors.join("\n"));
  ok("Bandeja muestra la clasificación directa y su ejecutiva");

  await context.close();
  await browser.close();
  await anaSession.dispose();
  await owner.dispose();
  await sql.end();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok ═══`);
})().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exitCode = 1;
});
JS
)
