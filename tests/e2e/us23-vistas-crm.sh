#!/bin/bash
# Self-test de COMPORTAMIENTO — vistas alternativas del pipeline y contactos (010).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
EMAIL="vistas-$(date +%s)@test.local"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)

echo "── Chrome: pipeline, contactos, persistencia y responsive"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_EMAIL="$EMAIL" node <<'JS'
const { chromium, request } = require("playwright");

const baseURL = process.env.E2E_BASE;
const email = process.env.E2E_EMAIL;
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

async function pressed(page, name, expected = true) {
  const value = await page.getByRole("button", { name }).getAttribute("aria-pressed");
  return value === String(expected);
}

async function waitPressed(page, name) {
  await page.getByRole("button", { name }).waitFor();
  await page.waitForFunction(
    (accessibleName) => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (item) => item.getAttribute("aria-label") === accessibleName
      );
      return button?.getAttribute("aria-pressed") === "true";
    },
    name
  );
}

async function waitCount(page, testId, expected) {
  await page.waitForFunction(
    ({ testId, expected }) =>
      document.querySelectorAll(`[data-testid="${testId}"]`).length === expected,
    { testId, expected }
  );
}

(async () => {
  const api = await request.newContext({ baseURL });
  const signup = await api.post("/api/auth/sign-up/email", {
    data: { name: "Tester vistas", email, password: "Password123!" },
  });
  assert(signup.ok(), "registro de organización para el self-test", `${signup.status()}`);
  const seeded = await api.post("/api/seed/demo");
  assert(seeded.ok(), "carga de ocho contactos demo", `${seeded.status()}`);

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

  await page.goto(`${baseURL}/pipeline`);
  await page.getByRole("heading", { name: "Etapas del prospecto" }).waitFor();
  assert(await pressed(page, "Vista Tablero"), "pipeline inicia en Tablero");
  await waitCount(page, "lead-board-card", 8);
  assert(
    (await page.getByTestId("lead-board-card").count()) === 8,
    "Tablero muestra los ocho leads"
  );

  const pipelineSearch = page.getByPlaceholder("Buscar lead…");
  await pipelineSearch.fill("María Fernanda");
  await page.getByRole("button", { name: "Vista Lista" }).click();
  await waitCount(page, "lead-list-row", 1);
  assert(await pressed(page, "Vista Lista"), "selector activa Lista");
  assert((await pipelineSearch.inputValue()) === "María Fernanda", "búsqueda del pipeline se conserva");
  assert(
    (await page.getByTestId("lead-list-row").count()) === 1,
    "Lista y Tablero aplican la misma búsqueda"
  );

  await pipelineSearch.fill("");
  await waitCount(page, "lead-list-row", 8);
  assert(
    (await page.getByTestId("lead-list-row").count()) === 8,
    "Lista muestra los ocho leads"
  );
  const jorgeStage = page.getByRole("combobox", { name: "Cambiar etapa de Jorge Castillo" });
  await jorgeStage.selectOption({ label: "En calificación" });
  await page.waitForFunction(() => {
    const select = document.querySelector('[aria-label="Cambiar etapa de Jorge Castillo"]');
    return select && select.options[select.selectedIndex]?.text === "En calificación";
  });
  ok("Lista cambia una etapa abierta");

  await jorgeStage.selectOption({ label: "No calificado" });
  const closureDialog = page.getByRole("dialog", { name: "Mover a No calificado" });
  await closureDialog.waitFor();
  await closureDialog.getByRole("button", { name: "Cancelar" }).click();
  assert(
    (await jorgeStage.locator("option:checked").textContent()) === "En calificación",
    "cancelar cierre negativo conserva la etapa"
  );

  await jorgeStage.selectOption({ label: "No calificado" });
  await closureDialog.getByLabel("Motivo").selectOption("no_fit");
  await closureDialog.getByRole("button", { name: "Confirmar" }).click();
  await page.waitForFunction(() => {
    const select = document.querySelector('[aria-label="Cambiar etapa de Jorge Castillo"]');
    return select && select.options[select.selectedIndex]?.text === "No calificado";
  });
  ok("cierre negativo confirmado actualiza la lista");

  const carlosStage = page.getByRole("combobox", { name: "Cambiar etapa de Carlos Ramírez" });
  const beforeFailure = await carlosStage.inputValue();
  await page.route("**/api/pipeline/leads/*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Fallo simulado" } }),
    })
  );
  await carlosStage.selectOption({ label: "Calificado" });
  await page.getByRole("status").filter({ hasText: "Fallo simulado" }).waitFor();
  assert((await carlosStage.inputValue()) === beforeFailure, "fallo de movimiento restaura la etapa");
  await page.unroute("**/api/pipeline/leads/*");
  // El 500 provocado emite un error de recurso esperado; desde aquí cualquier
  // error nuevo sí representa una regresión de la interfaz.
  browserErrors.length = 0;

  await page.reload();
  await page.getByRole("heading", { name: "Etapas del prospecto" }).waitFor();
  await waitPressed(page, "Vista Lista");
  assert(await pressed(page, "Vista Lista"), "pipeline recuerda Lista tras recargar");

  await page.goto(`${baseURL}/contacts`);
  await page.getByRole("heading", { name: "Contactos" }).waitFor();
  assert(await pressed(page, "Vista Lista"), "Contactos inicia en Lista");
  await page.getByRole("button", { name: "Vista Cuadrícula" }).click();
  await waitCount(page, "contact-grid-card", 8);
  assert(
    (await page.getByTestId("contact-grid-card").count()) === 8,
    "Cuadrícula muestra los ocho contactos"
  );

  const contactSearch = page.getByPlaceholder("Buscar por nombre o teléfono…");
  await contactSearch.fill("María Fernanda");
  await page.getByLabel("Filtrar por etapa del lead").selectOption({ label: "Calificado" });
  await waitCount(page, "contact-grid-card", 1);
  assert(
    (await page.getByTestId("contact-grid-card").count()) === 1,
    "Cuadrícula respeta búsqueda y etapa"
  );
  assert((await contactSearch.inputValue()) === "María Fernanda", "búsqueda de contactos se conserva");
  const mariaCard = page.getByTestId("contact-grid-card");
  await mariaCard.getByRole("button", { name: "Ver detalles de María Fernanda López" }).click();
  await page.getByRole("dialog", { name: "Detalles de María Fernanda López" }).waitFor();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  assert(
    (await mariaCard.getByRole("link", { name: "Abrir conversación de María Fernanda López" }).count()) === 1,
    "Cuadrícula conserva la acción de chat"
  );
  await mariaCard.getByRole("button", { name: "Editar María Fernanda López" }).click();
  await page.getByRole("heading", { name: "Editar prospecto" }).waitFor();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await mariaCard.getByRole("button", { name: "Eliminar María Fernanda López" }).click();
  await page.getByRole("alertdialog", { name: "Eliminar contacto" }).waitFor();
  await page.getByRole("button", { name: "Cancelar" }).click();
  assert(
    (await mariaCard.getByRole("button", { name: "Archivar María Fernanda López" }).count()) === 1,
    "Cuadrícula conserva detalle, edición, archivo y eliminación"
  );

  await page.reload();
  await page.getByRole("heading", { name: "Contactos" }).waitFor();
  await waitPressed(page, "Vista Cuadrícula");
  assert(await pressed(page, "Vista Cuadrícula"), "Contactos recuerda Cuadrícula tras recargar");

  await page.evaluate(() => {
    localStorage.setItem("seomos.pipeline.view", "desconocida");
    localStorage.setItem("seomos.contacts.view", "desconocida");
  });
  await page.goto(`${baseURL}/pipeline`);
  await page.getByRole("heading", { name: "Etapas del prospecto" }).waitFor();
  assert(await pressed(page, "Vista Tablero"), "preferencia inválida del pipeline usa Tablero");
  await page.goto(`${baseURL}/contacts`);
  await page.getByRole("heading", { name: "Contactos" }).waitFor();
  assert(await pressed(page, "Vista Lista"), "preferencia inválida de contactos usa Lista");

  await page.getByRole("button", { name: "Vista Cuadrícula" }).focus();
  await page.keyboard.press("Enter");
  assert(await pressed(page, "Vista Cuadrícula"), "selector se activa por teclado");

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.getByRole("heading", { name: "Contactos" }).waitFor();
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    assert(noOverflow, `Cuadrícula sin overflow horizontal a ${width}px`);
  }

  await page.goto(`${baseURL}/pipeline`);
  await page.getByRole("heading", { name: "Etapas del prospecto" }).waitFor();
  await page.getByRole("button", { name: "Vista Lista" }).click();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    assert(noOverflow, `Lista del pipeline sin overflow horizontal a ${width}px`);
  }

  assert(browserErrors.length === 0, "sin errores de consola o página", browserErrors.join(" | "));
  await browser.close();
  await api.dispose();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok · 0 fallos ═══`);
})().catch((error) => {
  console.error(`  ❌ ${error.stack || error.message}`);
  process.exit(1);
});
JS
)
