#!/bin/bash
# Self-test de COMPORTAMIENTO — edición unificada del prospecto (011).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
EMAIL="edicion-prospecto-$(date +%s)@test.local"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)

echo "── Chrome + API: edición, atomicidad, historial y responsive"
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

async function editor(page) {
  const dialog = page.getByRole("dialog", { name: "Editar prospecto" });
  await dialog.waitFor();
  await dialog.getByLabel("Nombre").waitFor();
  return dialog;
}

async function assertEditorContract(dialog, source) {
  for (const label of [
    "Nombre",
    "WhatsApp (con código de país)",
    "Correo (opcional)",
    "Etapa del prospecto",
    "Notas",
  ]) {
    assert((await dialog.getByLabel(label).count()) === 1, `${source}: campo ${label}`);
  }
}

(async () => {
  const api = await request.newContext({ baseURL });
  const signup = await api.post("/api/auth/sign-up/email", {
    data: { name: "Tester edición", email, password: "Password123!" },
  });
  assert(signup.ok(), "registro de organización para el self-test", `${signup.status()}`);
  const seeded = await api.post("/api/seed/demo");
  assert(seeded.ok(), "carga de datos demo", `${seeded.status()}`);

  const contactsResponse = await api.get("/api/contacts");
  const contacts = (await contactsResponse.json()).contacts;
  const primary = contacts.find((item) => item.name === "María Fernanda López");
  const duplicate = contacts.find((item) => item.id !== primary?.id);
  assert(Boolean(primary && duplicate), "contactos de prueba disponibles");

  const detailBefore = await (await api.get(`/api/contacts/${primary.id}`)).json();
  const originalStageId = detailBefore.stage.id;
  const originalLeadId = detailBefore.lead.id;
  const originalPhone = primary.phone;
  const stages = (await (await api.get("/api/pipeline/stages")).json()).stages;
  const qualifying = stages.find((stage) => stage.name === "En calificación");
  const unqualified = stages.find((stage) => stage.kind === "unqualified");
  assert(Boolean(qualifying && unqualified), "etapas de prueba disponibles");

  const relationsBefore = await sql`
    select
      (select count(*)::int from conversation where contact_id = ${primary.id}) as conversations,
      (select count(*)::int from message m join conversation c on c.id = m.conversation_id where c.contact_id = ${primary.id}) as messages
  `;
  await sql`
    update contact
    set ai_profile = '{"needs":[],"summary":"Ficha protegida"}',
        consent_granted_at = now()
    where id = ${primary.id}
  `;

  const duplicatePatch = await api.patch(`/api/contacts/${primary.id}`, {
    data: {
      name: "No debe persistir",
      phone: duplicate.phone,
      stageId: qualifying.id,
      closureReason: null,
    },
  });
  assert(duplicatePatch.status() === 409, "teléfono duplicado responde 409");
  const afterConflict = await (await api.get(`/api/contacts/${primary.id}`)).json();
  assert(afterConflict.contact.name === primary.name, "conflicto no cambia el nombre");
  assert(afterConflict.contact.phone === originalPhone, "conflicto no cambia el teléfono");
  assert(afterConflict.stage.id === originalStageId, "conflicto no cambia la etapa");

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

  await page.goto(`${baseURL}/contacts`);
  await page.getByRole("heading", { name: "Contactos" }).waitFor();
  await page.getByRole("button", { name: `Editar ${primary.name}` }).first().click();
  let dialog = await editor(page);
  await assertEditorContract(dialog, "Contactos");
  await dialog.getByLabel("Nombre").fill("María Editada");
  await dialog.getByLabel("WhatsApp (con código de país)").fill("+57 (301) 222-3344");
  await dialog.getByLabel("Correo (opcional)").fill("maria.editada@example.com");
  await dialog.getByLabel("Etapa del prospecto").selectOption(qualifying.id);
  await dialog.getByLabel("Notas").fill("Nota editada desde el modal unificado");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByText("María Editada", { exact: true }).first().waitFor();
  ok("Contactos guarda todos los atributos y refresca la lista");

  const saved = await (await api.get(`/api/contacts/${primary.id}`)).json();
  assert(saved.contact.phone === "573012223344", "WhatsApp se normaliza a dígitos");
  assert(saved.contact.email === "maria.editada@example.com", "correo persiste");
  assert(saved.contact.notes === "Nota editada desde el modal unificado", "notas persisten");
  assert(saved.stage.id === qualifying.id, "etapa persiste en la misma operación");
  assert(saved.lead.id === originalLeadId, "lead conserva su ID");
  const protectedAfter = await sql`
    select ai_profile, consent_granted_at from contact where id = ${primary.id}
  `;
  assert(
    protectedAfter[0].ai_profile.includes("Ficha protegida") &&
      Boolean(protectedAfter[0].consent_granted_at),
    "ficha IA y consentimiento permanecen intactos"
  );
  const relationsAfter = await sql`
    select
      (select count(*)::int from conversation where contact_id = ${primary.id}) as conversations,
      (select count(*)::int from message m join conversation c on c.id = m.conversation_id where c.contact_id = ${primary.id}) as messages
  `;
  assert(
    relationsAfter[0].conversations === relationsBefore[0].conversations &&
      relationsAfter[0].messages === relationsBefore[0].messages,
    "conversación y mensajes se conservan"
  );

  await page.goto(`${baseURL}/pipeline`);
  await page.getByRole("heading", { name: "Etapas del prospecto" }).waitFor();
  const card = page.getByTestId("lead-board-card").filter({ hasText: "María Editada" });
  await card.getByRole("button", { name: "Editar María Editada" }).click();
  dialog = await editor(page);
  await assertEditorContract(dialog, "Pipeline");
  assert(
    (await dialog.getByLabel("WhatsApp (con código de país)").inputValue()) === "573012223344",
    "Pipeline carga el teléfono actualizado"
  );
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await page.goto(`${baseURL}/inbox?contact=${primary.id}`);
  await page.getByText("María Editada", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Ver detalles" }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = await editor(page);
  await assertEditorContract(dialog, "Bandeja");
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await page.goto(`${baseURL}/contacts`);
  await page.getByRole("button", { name: "Editar María Editada" }).first().click();
  dialog = await editor(page);
  await dialog.getByLabel("Etapa del prospecto").selectOption(unqualified.id);
  assert(
    (await dialog.getByLabel(`Motivo de ${unqualified.name}`).count()) === 1,
    "etapa negativa muestra el motivo"
  );
  assert(
    await dialog.getByRole("button", { name: "Guardar cambios" }).isDisabled(),
    "etapa negativa no permite guardar sin motivo"
  );
  await dialog.getByLabel(`Motivo de ${unqualified.name}`).selectOption("no_fit");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.waitFor({ state: "detached" });
  const closed = await (await api.get(`/api/contacts/${primary.id}`)).json();
  assert(
    closed.stage.id === unqualified.id &&
      closed.lead.closureReason === "no_fit" &&
      Boolean(closed.lead.closedAt),
    "cierre negativo persiste etapa, motivo y fecha"
  );

  await page.getByRole("button", { name: "Editar María Editada" }).first().click();
  dialog = await editor(page);
  await dialog.getByLabel("Nombre").fill("Valor que debe conservarse");
  await page.route(`**/api/contacts/${primary.id}`, (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Fallo simulado" } }),
      });
    }
    return route.continue();
  });
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.getByRole("alert").filter({ hasText: "Fallo simulado" }).waitFor();
  assert(
    (await dialog.getByLabel("Nombre").inputValue()) === "Valor que debe conservarse",
    "fallo mantiene el modal y los valores escritos"
  );
  await page.unroute(`**/api/contacts/${primary.id}`);
  browserErrors.length = 0;
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await page.getByRole("button", { name: "Editar María Editada" }).first().focus();
  await page.keyboard.press("Enter");
  dialog = await editor(page);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  ok("editor abre y cierra con teclado");

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 760 });
    await page.getByRole("button", { name: "Editar María Editada" }).first().click();
    dialog = await editor(page);
    const fits = await dialog.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return (
        rect.left >= 0 &&
        rect.right <= window.innerWidth &&
        node.scrollWidth <= node.clientWidth
      );
    });
    assert(fits, `editor sin overflow horizontal a ${width}px`);
    await dialog.getByRole("button", { name: "Cancelar" }).click();
  }

  assert(browserErrors.length === 0, "sin errores de consola o página", browserErrors.join(" | "));
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
