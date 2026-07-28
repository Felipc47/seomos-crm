#!/bin/bash
# Self-test de COMPORTAMIENTO — control y reactivación de IA desde Bandeja (012).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
EMAIL="ia-reactiva-$(date +%s)@test.local"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)

echo "── Chrome + API: control directo, turno pendiente y guardrails"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_EMAIL="$EMAIL" node <<'JS'
const { chromium, request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const email = process.env.E2E_EMAIL;
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", {
  max: 1,
});
const phones = {
  pending: "573101111001",
  old: "573101111002",
  failure: "573101111003",
  human: "573101111004",
};
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

async function waitFor(check, message, timeout = 12000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${message}${value ? ` — ${JSON.stringify(value)}` : ""}`);
}

(async () => {
  const api = await request.newContext({ baseURL });
  const signup = await api.post("/api/auth/sign-up/email", {
    data: { name: "Tester IA reactiva", email, password: "Password123!" },
  });
  assert(signup.ok(), "registro de organización", `${signup.status()}`);
  const whatsapp = await api.put("/api/settings/whatsapp", {
    data: {
      wabaId: "waba_ia_reactiva",
      phoneNumberId: "phone_ia_reactiva",
      token: "EAAtest-valido",
    },
  });
  assert(whatsapp.ok(), "WhatsApp mock conectado", `${whatsapp.status()}`);
  await api.delete("/api/dev/wa-mock/outbox");
  await api.put("/api/agent/profile", {
    data: { enabled: false, name: "Ana" },
  });

  const inboundCases = [
    [phones.pending, "Cliente Pendiente", "Necesito información del servicio"],
    [phones.old, "Cliente Fuera de Ventana", "¿Todavía pueden ayudarme?"],
    [phones.failure, "Cliente Fallo", "Quiero conocer los planes"],
    [phones.human, "Cliente Humano", "Quiero hablar con un humano"],
  ];
  for (const [from, name, text] of inboundCases) {
    const inbound = await api.post("/api/dev/wa-mock/inbound", {
      data: {
        phoneNumberId: "phone_ia_reactiva",
        from,
        name,
        text,
      },
    });
    assert(inbound.ok(), `entrante creado para ${name}`, `${inbound.status()}`);
  }

  const conversations = await waitFor(async () => {
    const response = await api.get("/api/conversations");
    if (!response.ok()) return null;
    const rows = (await response.json()).conversations;
    return rows.length === 4 ? rows : null;
  }, "no aparecieron las cuatro conversaciones");
  const byPhone = Object.fromEntries(
    conversations.map((conversation) => [conversation.contact.phone, conversation])
  );
  for (const phone of Object.values(phones)) {
    assert(Boolean(byPhone[phone]), `conversación aislada para ${phone}`);
    const paused = await api.patch(`/api/conversations/${byPhone[phone].id}`, {
      data: { aiEnabled: false },
    });
    assert(paused.ok(), `IA pausada antes de la prueba para ${phone}`);
  }

  // Deja terminar los timers originados por la ingesta mientras la IA sigue
  // apagada tanto globalmente como en cada conversación.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await sql`
    update conversation
    set last_inbound_at = now() - interval '25 hours'
    where id = ${byPhone[phones.old].id}
  `;
  const enabled = await api.put("/api/agent/profile", {
    data: { enabled: true, name: "Ana" },
  });
  assert(enabled.ok(), "agente global encendido");

  const statusResponse = await api.get("/api/agent/status");
  const status = await statusResponse.json();
  assert(
    statusResponse.ok() &&
      status.enabled === true &&
      status.aiConfigured === true,
    "endpoint mínimo refleja disponibilidad"
  );
  assert(
    !("profile" in status) &&
      !("instructions" in status) &&
      !("escalationRules" in status),
    "endpoint mínimo no expone configuración privada"
  );

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    storageState: await api.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  const pending = byPhone[phones.pending];
  await page.goto(`${baseURL}/inbox?contact=${pending.contact.id}`);
  const headerControl = page.getByTestId("chat-ai-control");
  await headerControl.waitFor();
  const headerSwitch = headerControl.getByRole("switch", {
    name: "IA en esta conversación",
  });
  await waitFor(
    async () => !(await headerSwitch.isDisabled()),
    "el control de IA no quedó disponible"
  );
  assert(
    (await headerSwitch.getAttribute("aria-checked")) === "false",
    "encabezado muestra IA pausada sin abrir detalles"
  );

  await headerSwitch.click();
  await page
    .getByRole("status")
    .filter({ hasText: "respondiendo el mensaje pendiente" })
    .waitFor();
  ok("encendido informa que atenderá el mensaje pendiente");

  const pendingMessages = await waitFor(async () => {
    const response = await api.get(
      `/api/conversations/${pending.id}/messages`
    );
    const rows = (await response.json()).messages;
    return rows.filter(
      (message) => message.direction === "out" && message.aiGenerated
    ).length === 1
      ? rows
      : null;
  }, "la IA no respondió el entrante pendiente");
  assert(
    pendingMessages.filter(
      (message) => message.direction === "out" && message.aiGenerated
    ).length === 1,
    "reactivar produce una única respuesta IA"
  );
  await page
    .getByText("Respuesta de prueba sobre: Necesito información del servicio", {
      exact: false,
    })
    .last()
    .waitFor();
  ok("la respuesta aparece en el hilo sin nuevo mensaje del cliente");

  const outboxAfterReply = await (await api.get("/api/dev/wa-mock/outbox")).json();
  assert(
    outboxAfterReply.outbox.filter((entry) => entry.to === phones.pending)
      .length === 1,
    "la respuesta llegó una sola vez a WhatsApp"
  );

  await page.getByRole("button", { name: "Ver detalles del contacto" }).click();
  const panel = page.getByRole("dialog", {
    name: `Detalles de ${pending.contact.name}`,
  });
  await panel.waitFor();
  const panelSwitch = panel.getByRole("switch", {
    name: "IA en esta conversación",
  });
  assert(
    (await panelSwitch.getAttribute("aria-checked")) === "true",
    "Ver detalles refleja el estado activo del encabezado"
  );
  await panelSwitch.click();
  await waitFor(
    async () => (await headerSwitch.getAttribute("aria-checked")) === "false",
    "el encabezado no reflejó la pausa desde detalles"
  );
  ok("apagar desde detalles sincroniza el encabezado");
  await panel.getByRole("button", { name: "Cerrar panel" }).click();

  await headerSwitch.click();
  await page.getByRole("status").filter({ hasText: "IA activada" }).waitFor();
  await new Promise((resolve) => setTimeout(resolve, 800));
  const noDuplicateMessages = await (
    await api.get(`/api/conversations/${pending.id}/messages`)
  ).json();
  assert(
    noDuplicateMessages.messages.filter(
      (message) => message.direction === "out" && message.aiGenerated
    ).length === 1,
    "reactivar un chat ya atendido no duplica la respuesta"
  );

  const oldActivation = await api.patch(
    `/api/conversations/${byPhone[phones.old].id}`,
    { data: { reactivate: true } }
  );
  const oldBody = await oldActivation.json();
  assert(
    oldBody.agentTurn?.reason === "window_closed",
    "ventana cerrada se identifica antes de encolar"
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  const outboxAfterOld = await (await api.get("/api/dev/wa-mock/outbox")).json();
  assert(
    outboxAfterOld.outbox.every((entry) => entry.to !== phones.old),
    "ventana cerrada no envía texto libre"
  );

  // El adaptador reintenta tres veces: fallan los tres intentos para comprobar
  // la degradación persistente, no un hipo que debe recuperarse.
  await api.post("/api/dev/ai-mock/fail-next", { data: { chat: 3 } });
  const failureActivation = await api.patch(
    `/api/conversations/${byPhone[phones.failure].id}`,
    { data: { reactivate: true } }
  );
  const failureBody = await failureActivation.json();
  assert(
    failureActivation.ok() && failureBody.agentTurn?.queued === true,
    "reactivación responde sin esperar al proveedor"
  );
  const failedConversation = await waitFor(async () => {
    const rows = (await (await api.get("/api/conversations")).json())
      .conversations;
    return rows.find(
      (conversation) =>
        conversation.id === byPhone[phones.failure].id &&
        conversation.handoffReason === "error"
    );
  }, "el fallo del proveedor no degradó a handoff");
  assert(
    failedConversation.handoffReason === "error",
    "fallo del proveedor degrada sin colgar el chat"
  );

  const humanActivation = await api.patch(
    `/api/conversations/${byPhone[phones.human].id}`,
    { data: { reactivate: true } }
  );
  const humanBody = await humanActivation.json();
  assert(
    humanBody.agentTurn?.queued === true,
    "petición de humano se revalida dentro del pipeline"
  );
  const humanConversation = await waitFor(async () => {
    const rows = (await (await api.get("/api/conversations")).json())
      .conversations;
    return rows.find(
      (conversation) =>
        conversation.id === byPhone[phones.human].id &&
        conversation.handoffReason === "cliente"
    );
  }, "no se conservó el handoff solicitado por el cliente");
  assert(
    humanConversation.handoffReason === "cliente",
    "solicitud explícita conserva atención humana"
  );

  const finalOutbox = await (await api.get("/api/dev/wa-mock/outbox")).json();
  assert(
    finalOutbox.outbox.every(
      (entry) =>
        entry.to !== phones.old &&
        entry.to !== phones.failure &&
        entry.to !== phones.human
    ),
    "guardrails infelices producen cero envíos"
  );

  await headerSwitch.focus();
  await page.keyboard.press("Space");
  await waitFor(
    async () => (await headerSwitch.getAttribute("aria-checked")) === "false",
    "el switch no respondió al teclado"
  );
  ok("control operable por teclado");

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    assert(noOverflow, `encabezado sin overflow horizontal a ${width}px`);
  }

  // Los 503 del proveedor se producen server-to-server y no deben romper la
  // interfaz ni generar errores de página.
  assert(
    browserErrors.length === 0,
    "sin errores de consola o página",
    browserErrors.join(" | ")
  );
  await browser.close();
  await api.dispose();
  await sql.end();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok · 0 fallos ═══`);
})().catch(async (error) => {
  console.error(`  ❌ ${error.stack || error.message}`);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});
JS
)
