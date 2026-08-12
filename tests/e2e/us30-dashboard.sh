#!/bin/bash
# Self-test de COMPORTAMIENTO — Dashboard comercial (019).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)

echo "── API + Chrome: métricas, rangos, aislamiento y responsive"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { chromium, request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", { max: 1 });
let passed = 0;
let browser = null;
let owner = null;
let editor = null;
let foreign = null;

function ok(message) {
  passed += 1;
  console.log(`  ✅ ${message}`);
}

function assert(condition, message, detail = "") {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
  ok(message);
}

async function body(response) {
  return response.json().catch(() => ({}));
}

async function login(email) {
  const context = await request.newContext({ baseURL });
  const response = await context.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  assert(response.ok(), `sesión iniciada: ${email}`, `${response.status()}`);
  return context;
}

function metricValue(page, testId) {
  return page.getByTestId(testId).locator("p").nth(1);
}

(async () => {
  const ownerEmail = `owner-dashboard-${stamp}@test.local`;
  const commercialEmail = `ana-dashboard-${stamp}@test.local`;
  const editorEmail = `editor-dashboard-${stamp}@test.local`;
  const foreignEmail = `foreign-dashboard-${stamp}@test.local`;

  owner = await request.newContext({ baseURL });
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: { name: "Admin Dashboard", email: ownerEmail, password },
  });
  assert(signup.ok(), "empresa principal creada", `${signup.status()}`);

  for (const member of [
    { name: "Ana Comercial", email: commercialEmail, role: "commercial" },
    { name: "Eva Editora", email: editorEmail, role: "agent_editor" },
  ]) {
    const response = await owner.post("/api/settings/team", {
      data: { ...member, password },
    });
    assert(response.ok(), `miembro creado: ${member.name}`, `${response.status()}`);
  }
  const members = (await body(await owner.get("/api/settings/team"))).members;
  const commercial = members.find((member) => member.email === commercialEmail);
  assert(commercial?.id, "ejecutiva comercial recuperada");

  const web = (await body(await owner.post("/api/services", {
    data: { name: "Desarrollo web" },
  }))).service;
  const seo = (await body(await owner.post("/api/services", {
    data: { name: "SEO" },
  }))).service;
  assert(web?.id && seo?.id, "servicios para la distribución creados");

  const orgRows = await sql`
    select m.organization_id
    from member m join "user" u on u.id = m.user_id
    where u.email = ${ownerEmail}
    limit 1
  `;
  const organizationId = orgRows[0]?.organization_id;
  assert(Boolean(organizationId), "organización principal resuelta");
  const stages = await sql`
    select id, name, kind from pipeline_stage
    where organization_id = ${organizationId}
  `;
  const stageId = (name) => stages.find((stage) => stage.name === name)?.id;
  assert(
    ["Nuevo", "En calificación", "Calificado", "Cita agendada", "Cliente", "No calificado"]
      .every((name) => stageId(name)),
    "embudo canónico disponible"
  );

  const recent = [
    { stage: "Nuevo", age: 0, service: web.id, assigned: commercial.id },
    { stage: "Nuevo", age: 1, service: web.id, assigned: commercial.id },
    { stage: "Nuevo", age: 6, service: null, assigned: null },
    { stage: "En calificación", age: 1, service: seo.id, assigned: commercial.id },
    { stage: "En calificación", age: 2, service: seo.id, assigned: commercial.id },
    { stage: "Calificado", age: 3, service: web.id, assigned: null },
    { stage: "Cita agendada", age: 4, service: web.id, assigned: commercial.id, meetingAge: 4 },
    { stage: "Cliente", age: 2, service: web.id, assigned: commercial.id, meetingAge: 1 },
    { stage: "Cliente", age: 5, service: seo.id, assigned: commercial.id },
    { stage: "No calificado", age: 0, service: web.id, assigned: null },
  ];
  const older = [
    { stage: "Nuevo", age: 10, service: web.id, assigned: commercial.id },
    { stage: "Calificado", age: 15, service: seo.id, assigned: commercial.id, meetingAge: 15 },
    { stage: "Cliente", age: 20, service: web.id, assigned: commercial.id },
    { stage: "No calificado", age: 29, service: null, assigned: null },
    { stage: "Cliente", age: 40, service: web.id, assigned: commercial.id },
  ];

  let fixtureIndex = 0;
  for (const item of [...recent, ...older]) {
    fixtureIndex += 1;
    const suffix = `${stamp}_${fixtureIndex}`;
    const contactId = `ct_dash_${suffix}`;
    const leadId = `lead_dash_${suffix}`;
    await sql`
      insert into contact (
        id, organization_id, phone, name, consent_source, created_at, updated_at
      ) values (
        ${contactId}, ${organizationId}, ${`5731200${String(fixtureIndex).padStart(4, "0")}`},
        ${`Lead Dashboard ${fixtureIndex}`}, 'manual',
        now() - make_interval(days => ${item.age}),
        now() - make_interval(days => ${item.age})
      )
    `;
    await sql`
      insert into lead (
        id, organization_id, contact_id, stage_id, service_id,
        assigned_member_id, position, created_at, updated_at
      ) values (
        ${leadId}, ${organizationId}, ${contactId}, ${stageId(item.stage)},
        ${item.service}, ${item.assigned}, ${fixtureIndex},
        now() - make_interval(days => ${item.age}),
        now() - make_interval(days => ${item.age})
      )
    `;
    if (item.meetingAge !== undefined) {
      await sql`
        insert into conversation (
          id, organization_id, contact_id, is_test, ai_enabled,
          meeting_scheduled_for, created_at, updated_at
        ) values (
          ${`cv_dash_${suffix}`}, ${organizationId}, ${contactId}, false, false,
          now() - make_interval(days => ${item.meetingAge}),
          now() - make_interval(days => ${item.age}), now()
        )
      `;
    }
  }
  ok("fixture exacto de 7, 30 y más de 30 días creado");

  const defaultResponse = await owner.get("/api/dashboard");
  const defaultData = await body(defaultResponse);
  assert(defaultResponse.ok(), "Dashboard responde con el rango predeterminado", JSON.stringify(defaultData));
  assert(
    defaultData.range.preset === "7d" && defaultData.summary.newLeads === 10,
    "7 días incluye exactamente diez leads",
    JSON.stringify(defaultData.summary)
  );
  assert(
    defaultData.summary.activeOpportunities === 7 &&
      defaultData.summary.meetings === 2 &&
      defaultData.summary.wonLeads === 2 &&
      defaultData.summary.conversionRate === 20 &&
      defaultData.summary.unassignedLeads === 3,
    "resumen comercial coincide con el fixture",
    JSON.stringify(defaultData.summary)
  );
  const funnel = Object.fromEntries(defaultData.funnel.map((stage) => [stage.name, stage.count]));
  assert(
    defaultData.funnel.length === 7 &&
      funnel.Nuevo === 3 &&
      funnel["En calificación"] === 2 &&
      funnel.Calificado === 1 &&
      funnel["Cita agendada"] === 1 &&
      funnel.Cliente === 2 &&
      funnel["No calificado"] === 1 &&
      funnel["No convertido"] === 0,
    "todas las etapas aparecen, incluida la etapa en cero",
    JSON.stringify(funnel)
  );
  assert(
    defaultData.trend.length === 7 &&
      defaultData.trend.reduce((sum, day) => sum + day.leads, 0) === 10 &&
      defaultData.trend.reduce((sum, day) => sum + day.meetings, 0) === 2,
    "tendencia diaria conserva los totales"
  );
  assert(
    defaultData.services.some((row) => row.name === "Desarrollo web" && row.count === 6) &&
      defaultData.services.some((row) => row.name === "SEO" && row.count === 3) &&
      defaultData.services.some((row) => row.name === "Sin servicio" && row.count === 1),
    "demanda por servicio incluye datos faltantes"
  );
  assert(
    defaultData.assignees.some((row) => row.name === "Ana Comercial" && row.count === 7) &&
      defaultData.assignees.some((row) => row.name === "Sin asignar" && row.count === 3),
    "distribución del equipo coincide con responsables"
  );

  const thirty = await body(await owner.get("/api/dashboard?range=30d"));
  assert(
    thirty.summary.newLeads === 14 && thirty.summary.meetings === 3 && thirty.summary.wonLeads === 3,
    "preset de 30 días actualiza toda la cohorte",
    JSON.stringify(thirty.summary)
  );
  const dateRows = await sql`
    select
      to_char((current_date - interval '20 days')::date, 'YYYY-MM-DD') as from_date,
      to_char((current_date - interval '10 days')::date, 'YYYY-MM-DD') as to_date,
      to_char((current_date - interval '400 days')::date, 'YYYY-MM-DD') as too_old,
      to_char(current_date, 'YYYY-MM-DD') as today
  `;
  const dates = dateRows[0];
  const customUrl = `/api/dashboard?range=custom&from=${dates.from_date}&to=${dates.to_date}`;
  const custom = await body(await owner.get(customUrl));
  assert(
    custom.summary.newLeads === 3 && custom.summary.meetings === 1,
    "rango personalizado es inclusivo y exacto",
    JSON.stringify(custom.summary)
  );
  const invalid = await owner.get(
    `/api/dashboard?range=custom&from=${dates.too_old}&to=${dates.today}`
  );
  assert(invalid.status() === 422, "rango mayor a 366 días se rechaza con 422");
  const anonymous = await request.newContext({ baseURL });
  assert((await anonymous.get("/api/dashboard")).status() === 401, "sesión ausente recibe 401");
  await anonymous.dispose();

  editor = await login(editorEmail);
  assert((await editor.get("/api/dashboard")).status() === 403, "Editor de agente recibe 403");

  const foreignCompany = await owner.post("/api/admin/companies", {
    data: {
      companyName: "Empresa Dashboard Vacía",
      adminName: "Admin Ajena",
      adminEmail: foreignEmail,
      adminPassword: password,
    },
  });
  assert(foreignCompany.ok(), "segunda empresa creada");
  foreign = await login(foreignEmail);
  const foreignData = await body(await foreign.get("/api/dashboard"));
  assert(
    foreignData.summary.newLeads === 0 &&
      foreignData.summary.meetings === 0 &&
      foreignData.funnel.length === 7,
    "empresa ajena ve ceros y sus propias etapas",
    JSON.stringify(foreignData.summary)
  );

  browser = await chromium.launch({ channel: "chrome", headless: true });
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

  await page.goto(`${baseURL}/dashboard`);
  await page.getByTestId("dashboard-page").waitFor();
  await metricValue(page, "metric-new-leads").getByText("10", { exact: true }).waitFor();
  assert(page.url().endsWith("/dashboard"), "Dashboard abre con 7 días sin parámetros obligatorios");
  const desktopLinks = page.locator("aside nav a");
  assert(
    (await desktopLinks.first().innerText()).includes("Dashboard") &&
      (await desktopLinks.first().getAttribute("class")).includes("bg-brand"),
    "Dashboard es la primera opción y aparece activo"
  );
  await page.getByRole("button", { name: "30 días", exact: true }).click();
  await page.waitForURL(/range=30d/);
  await metricValue(page, "metric-new-leads").getByText("14", { exact: true }).waitFor();
  assert(true, "preset de 30 días actualiza la UI y la URL");

  await page.getByRole("button", { name: "Personalizado", exact: true }).click();
  await page.getByLabel("Desde", { exact: true }).fill(dates.from_date);
  await page.getByLabel("Hasta", { exact: true }).fill(dates.to_date);
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.waitForURL(/range=custom/);
  await metricValue(page, "metric-new-leads").getByText("3", { exact: true }).waitFor();
  await page.reload();
  await metricValue(page, "metric-new-leads").getByText("3", { exact: true }).waitFor();
  assert(page.url().includes(`from=${dates.from_date}`), "recargar conserva el rango personalizado");

  for (const viewport of [
    { width: 375, height: 780 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByTestId("dashboard-page").waitFor();
    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    );
    assert(overflow <= 1, `Dashboard sin overflow a ${viewport.width}px`, `${overflow}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  assert(
    await page.locator("html").evaluate((element) => element.classList.contains("dark")),
    "Dashboard funciona en modo oscuro"
  );
  assert(browserErrors.length === 0, "navegador sin errores", browserErrors.join("\n"));

  const foreignContext = await browser.newContext({
    storageState: await foreign.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const foreignPage = await foreignContext.newPage();
  await foreignPage.goto(`${baseURL}/dashboard`);
  await metricValue(foreignPage, "metric-new-leads").getByText("0", { exact: true }).waitFor();
  await foreignPage.getByText("No se crearon leads en este periodo.", { exact: true }).waitFor();
  assert(true, "empresa sin actividad recibe un estado vacío comprensible");

  const editorContext = await browser.newContext({
    storageState: await editor.storageState(),
  });
  const editorPage = await editorContext.newPage();
  await editorPage.goto(`${baseURL}/dashboard`);
  await editorPage.waitForURL(/\/inbox/);
  assert(
    (await editorPage.getByRole("link", { name: "Dashboard", exact: true }).count()) === 0,
    "Editor no ve Dashboard y una URL directa vuelve a Bandeja"
  );

  await editorContext.close();
  await foreignContext.close();
  await context.close();
  await browser.close();
  browser = null;
  await owner.dispose();
  await editor.dispose();
  await foreign.dispose();
  await sql.end();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok ═══`);
})().catch(async (error) => {
  console.error(error);
  if (browser) await browser.close().catch(() => {});
  if (owner) await owner.dispose().catch(() => {});
  if (editor) await editor.dispose().catch(() => {});
  if (foreign) await foreign.dispose().catch(() => {});
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exitCode = 1;
});
JS
)
