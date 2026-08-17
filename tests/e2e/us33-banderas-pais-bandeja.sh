#!/bin/bash
# Self-test de comportamiento — bandera de país en avatares de Bandeja (024).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD y mocks"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)
curl -sS -X DELETE "$BASE/api/dev/wa-mock/outbox" >/dev/null

echo "── API + Chrome: países válidos, fallback inválido y responsive"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { chromium, request } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const token = "EAAtest-valido";
const phoneNumberId = `phone_flags_${stamp}`;
const screenshotDir = fs.mkdtempSync(path.join(os.tmpdir(), "seomos-us33-flags-"));
let passed = 0;
let browser = null;
let context = null;
let owner = null;
let publicApi = null;

function ok(message) {
  passed += 1;
  console.log(`  ✅ ${message}`);
}

function assert(condition, message, detail = "") {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
  ok(message);
}

async function inbound(phone, name) {
  const response = await publicApi.post("/api/dev/wa-mock/inbound", {
    data: {
      phoneNumberId,
      from: phone,
      name,
      text: `Hola desde ${name}`,
      waMessageId: `wamid.us33.${stamp}.${phone}`,
    },
  });
  assert(response.ok(), `entrante procesado: ${name}`, `${response.status()}`);
}

async function waitForConversation(phone) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const response = await owner.get("/api/conversations");
    if (response.ok()) {
      const item = (await response.json()).conversations.find(
        (conversation) => conversation.contact.phone === phone
      );
      if (item) return item;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No apareció la conversación ${phone}`);
}

async function assertRowFlag(page, conversation, countryCode, countryName) {
  const row = page.getByTestId(`inbox-conversation-${conversation.id}`);
  await row.waitFor();
  const flag = row.locator(`[data-country-code="${countryCode}"]`);
  await flag.waitFor();
  assert((await flag.getAttribute("title")) === countryName, `${conversation.contact.name} muestra ${countryName}`);
}

(async () => {
  publicApi = await request.newContext({ baseURL });
  owner = await request.newContext({ baseURL });
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: {
      name: "Admin Banderas",
      email: `owner-flags-${stamp}@test.local`,
      password,
    },
  });
  assert(signup.ok(), "organización creada", `${signup.status()}`);

  const whatsapp = await owner.put("/api/settings/whatsapp", {
    data: {
      wabaId: `waba_flags_${stamp}`,
      phoneNumberId,
      token,
    },
  });
  assert(whatsapp.ok(), "WhatsApp mock conectado", `${whatsapp.status()}`);

  const contacts = [
    { phone: "573001230033", name: "Camila Colombia", code: "CO", country: "Colombia" },
    { phone: "525512340033", name: "Mateo México", code: "MX", country: "México" },
    { phone: "34612123033", name: "Lucía España", code: "ES", country: "España" },
    { phone: "999123450033", name: "Número desconocido", code: null, country: null },
  ];

  for (const contact of contacts) await inbound(contact.phone, contact.name);
  for (const contact of contacts) contact.conversation = await waitForConversation(contact.phone);

  browser = await chromium.launch({ channel: "chrome", headless: true });
  context = await browser.newContext({
    storageState: await owner.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto(`${baseURL}/inbox`);
  await page.getByRole("heading", { name: "Bandeja" }).waitFor();
  for (const contact of contacts.filter((item) => item.code)) {
    await assertRowFlag(page, contact.conversation, contact.code, contact.country);
  }

  const unknownRow = page.getByTestId(`inbox-conversation-${contacts[3].conversation.id}`);
  await unknownRow.waitFor();
  assert(
    (await unknownRow.locator("[data-country-code]").count()) === 0,
    "un prefijo desconocido conserva el avatar sin bandera"
  );

  const colombiaRow = page.getByTestId(`inbox-conversation-${contacts[0].conversation.id}`);
  await colombiaRow.click();
  await page.getByRole("main").getByText("Camila Colombia", { exact: true }).first().waitFor();
  assert(
    (await page.locator('[data-country-code="CO"]').count()) === 2,
    "la bandera se conserva en fila y encabezado del chat"
  );

  await page.getByRole("button", { name: "Ver detalles del contacto" }).click();
  await page.getByRole("dialog", { name: "Detalles de Camila Colombia" }).waitFor();
  assert(
    (await page.locator('[data-country-code="CO"]').count()) === 3,
    "el panel de contacto conserva la misma bandera"
  );
  await page.getByRole("button", { name: "Cerrar panel" }).click();

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/inbox`);
    await page.getByRole("heading", { name: "Bandeja" }).waitFor();
    await assertRowFlag(page, contacts[0].conversation, "CO", "Colombia");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    assert(!overflow, `Bandeja sin overflow a ${width}px`);
    await page.screenshot({ path: path.join(screenshotDir, `inbox-flags-${width}-light.png`) });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Modo oscuro" }).click();
  await page.screenshot({ path: path.join(screenshotDir, "inbox-flags-1440-dark.png") });
  assert(
    (await page.locator("html").getAttribute("class"))?.includes("dark"),
    "la bandera se renderiza en tema oscuro"
  );
  assert(browserErrors.length === 0, "navegador sin errores", browserErrors.join("\n"));

  await context.close();
  await browser.close();
  await owner.dispose();
  await publicApi.dispose();
  console.log(`\nE2E_SCREENSHOT_DIR=${screenshotDir}`);
  console.log(`═══ RESULTADO: ${passed} verificaciones ok ═══`);
})().catch(async (error) => {
  console.error(error);
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await owner?.dispose().catch(() => {});
  await publicApi?.dispose().catch(() => {});
  process.exitCode = 1;
});
JS
)
