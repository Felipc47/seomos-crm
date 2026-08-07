#!/bin/bash
# Self-test de COMPORTAMIENTO — distribución de leads por servicio (013).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)

echo "── API + Chrome: configuración, enrutamiento y vistas"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { chromium, request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", {
  max: 1,
});
let passed = 0;
let browser = null;
let context = null;

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

async function json(response) {
  return response.json().catch(() => ({}));
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

async function createSession(name, email) {
  const context = await request.newContext({ baseURL });
  const response = await context.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  assert(response.ok(), `inicio de sesión: ${name}`, `${response.status()}`);
  return context;
}

(async () => {
  const ownerEmail = `owner-servicios-${stamp}@test.local`;
  const commercialEmail = `ana-servicios-${stamp}@test.local`;
  const marketingEmail = `mario-servicios-${stamp}@test.local`;

  const owner = await request.newContext({ baseURL });
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: {
      name: "Admin Distribución",
      email: ownerEmail,
      password,
    },
  });
  assert(signup.ok(), "registro de organización", `${signup.status()}`);

  const whatsapp = await owner.put("/api/settings/whatsapp", {
    data: {
      wabaId: "waba_service_assignment",
      phoneNumberId: "phone_service_assignment",
      token: "EAAtest-valido",
    },
  });
  assert(whatsapp.ok(), "WhatsApp mock conectado");
  // El comercial se marca al DERIVAR a atención humana: el agente debe estar
  // encendido para que la petición de asesor dispare el handoff.
  const agent = await owner.put("/api/agent/profile", {
    data: { enabled: true, name: "Agente Distribución" },
  });
  assert(agent.ok(), "agente encendido");

  async function inbound(phone, name, text) {
    const response = await owner.post("/api/dev/wa-mock/inbound", {
      data: {
        phoneNumberId: "phone_service_assignment",
        from: phone,
        name,
        text,
      },
    });
    assert(response.ok(), `entrante: ${name}`, `${response.status()}`);
  }

  for (const member of [
    {
      name: "Ana Comercial",
      email: commercialEmail,
      role: "commercial",
    },
    {
      name: "Mario Marketing",
      email: marketingEmail,
      role: "marketing",
    },
  ]) {
    const response = await owner.post("/api/settings/team", {
      data: { ...member, password },
    });
    assert(response.ok(), `miembro creado: ${member.name}`, `${response.status()}`);
  }

  const teamResponse = await owner.get("/api/settings/team");
  const team = (await teamResponse.json()).members;
  const commercial = team.find((member) => member.email === commercialEmail);
  const marketing = team.find((member) => member.email === marketingEmail);
  assert(
    commercial && marketing,
    "equipo recupera IDs de los ejecutivos"
  );

  const seoResponse = await owner.post("/api/services", {
    data: { name: "SEO" },
  });
  const seo = (await seoResponse.json()).service;
  const webResponse = await owner.post("/api/services", {
    data: { name: "Desarrollo web" },
  });
  const web = (await webResponse.json()).service;
  const failureResponse = await owner.post("/api/services", {
    data: { name: "Automatización" },
  });
  const failureService = (await failureResponse.json()).service;
  assert(seo?.id && web?.id && failureService?.id, "servicios creados");

  const assignSeo = await owner.patch(`/api/services/${seo.id}`, {
    data: { assignedMemberId: commercial.id },
  });
  const assignFailure = await owner.patch(
    `/api/services/${failureService.id}`,
    { data: { assignedMemberId: commercial.id } }
  );
  assert(assignSeo.ok() && assignFailure.ok(), "responsables guardados");

  const servicesResponse = await owner.get("/api/services");
  const servicesBody = await servicesResponse.json();
  const seoConfigured = servicesBody.services.find(
    (service) => service.id === seo.id
  );
  assert(
    seoConfigured.assignedExecutive?.name === "Ana Comercial",
    "GET Servicios devuelve responsable y ejecutivos elegibles"
  );
  assert(
    servicesBody.executives.every(
      (member) => member.name === "Ana Comercial"
    ),
    "Marketing no aparece como responsable elegible"
  );

  const ownerTeam = (await (await owner.get("/api/settings/team")).json())
    .members;
  assert(
    ownerTeam
      .find((member) => member.id === commercial.id)
      .services.some((service) => service.name === "SEO"),
    "Equipo resume los servicios de Ana"
  );

  const commercialSession = await createSession(
    "Ana Comercial",
    commercialEmail
  );
  const forbidden = await commercialSession.patch(`/api/services/${seo.id}`, {
    data: { assignedMemberId: null },
  });
  assert(
    forbidden.status() === 403,
    "un comercial no cambia responsables",
    `${forbidden.status()} ${JSON.stringify(await json(forbidden))}`
  );

  const invalidRole = await owner.patch(`/api/services/${seo.id}`, {
    data: { assignedMemberId: marketing.id },
  });
  assert(
    invalidRole.status() === 422,
    "Marketing no puede ser responsable",
    `${invalidRole.status()}`
  );
  const invalidId = await owner.patch(`/api/services/${seo.id}`, {
    data: { assignedMemberId: "org_member_inexistente" },
  });
  assert(invalidId.status() === 422, "ID inexistente se rechaza");

  const foreignEmail = `foreign-${stamp}@test.local`;
  const company = await owner.post("/api/admin/companies", {
    data: {
      companyName: "Empresa Ajena",
      adminName: "Admin Ajeno",
      adminEmail: foreignEmail,
      adminPassword: password,
    },
  });
  assert(company.ok(), "segunda organización creada para probar aislamiento");
  const [foreign] = await sql`
    select m.id
    from member m
    join "user" u on u.id = m.user_id
    where u.email = ${foreignEmail}
    limit 1
  `;
  const crossTenant = await owner.patch(`/api/services/${seo.id}`, {
    data: { assignedMemberId: foreign.id },
  });
  assert(
    crossTenant.status() === 422,
    "miembro de otra organización se rechaza"
  );

  for (const [serviceId, formId] of [
    [seo.id, "form_seo_26"],
    [web.id, "form_web_26"],
    [failureService.id, "form_failure_26"],
  ]) {
    const link = await owner.post(`/api/services/${serviceId}/forms`, {
      data: { formId },
    });
    assert(link.ok(), `formulario vinculado: ${formId}`, `${link.status()}`);
  }

  const inboundSeo = await owner.post("/api/dev/leadgen-mock/inbound", {
    data: {
      leadgenId: "lgmock_us26_seo",
      formId: "form_seo_26",
      name: "Laura SEO",
      phone: "573100026001",
      email: "laura-seo@test.local",
      campaignName: "Campaña SEO",
    },
  });
  assert(inboundSeo.ok(), "leadgen SEO procesado", `${inboundSeo.status()}`);

  const lauraIngested = await waitFor(async () => {
    const response = await owner.get("/api/contacts?q=573100026001");
    if (!response.ok()) return null;
    const contact = (await response.json()).contacts[0] ?? null;
    return contact?.service?.name === "SEO" ? contact : null;
  }, "Laura SEO no apareció en Contactos");
  assert(
    lauraIngested.assignee === null,
    "el form clasifica el servicio SIN marcar comercial al llegar"
  );
  const preHandoff = await commercialSession.get("/api/notifications");
  assert(
    !((await json(preHandoff)).notifications ?? []).some(
      (notification) => notification.type === "lead_assigned"
    ),
    "sin derivación no hay notificación de asignación"
  );

  // La derivación a atención humana ES el momento de la asignación.
  await inbound("573100026001", "Laura SEO", "Hola, quiero hablar con un asesor");
  const laura = await waitFor(async () => {
    const response = await owner.get("/api/contacts?q=573100026001");
    if (!response.ok()) return null;
    const contact = (await response.json()).contacts[0] ?? null;
    return contact?.assignee?.name === "Ana Comercial" ? contact : null;
  }, "la derivación no asignó a Ana Comercial");
  assert(
    laura.service?.name === "SEO" &&
      laura.assignee?.name === "Ana Comercial",
    "Contactos muestra servicio y responsable tras derivar"
  );

  const board = await waitFor(async () => {
    const response = await owner.get("/api/pipeline/board");
    const body = await response.json();
    return body.leads.find((lead) => lead.contact.id === laura.id) ?? null;
  }, "Laura SEO no apareció en el pipeline");
  assert(
    board.service?.name === "SEO" &&
      board.assignee?.name === "Ana Comercial",
    "Etapas del prospecto muestra la misma asignación"
  );

  const conversation = await waitFor(async () => {
    const response = await owner.get("/api/conversations");
    const body = await response.json();
    return (
      body.conversations.find(
        (item) => item.contact.id === laura.id
      ) ?? null
    );
  }, "Laura SEO no apareció en Bandeja");
  assert(
    conversation.service?.name === "SEO" &&
      conversation.assignee?.name === "Ana Comercial",
    "Bandeja muestra la misma asignación"
  );

  const detail = await (await owner.get(`/api/contacts/${laura.id}`)).json();
  assert(
    detail.lead.service?.name === "SEO" &&
      detail.lead.assignee?.name === "Ana Comercial",
    "ficha del prospecto conserva la asignación"
  );

  const notifications = await waitFor(async () => {
    const response = await commercialSession.get("/api/notifications");
    const body = await response.json();
    return body.notifications.filter(
      (notification) => notification.type === "lead_assigned"
    ).length === 1
      ? body.notifications
      : null;
  }, "Ana no recibió la notificación");
  const assignmentNotification = notifications.find(
    (notification) => notification.type === "lead_assigned"
  );
  assert(
    assignmentNotification.body.includes("Laura SEO") &&
      assignmentNotification.body.includes("SEO") &&
      assignmentNotification.href === `/inbox?contact=${laura.id}`,
    "notificación identifica lead, servicio y conversación"
  );

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await owner.post("/api/dev/leadgen-mock/inbound", {
      data: {
        leadgenId: "lgmock_us26_seo",
        formId: "form_seo_26",
        name: "Laura SEO",
        phone: "573100026001",
        email: "laura-seo@test.local",
      },
    });
  }
  const afterDuplicates = await (
    await commercialSession.get("/api/notifications")
  ).json();
  assert(
    afterDuplicates.notifications.filter(
      (notification) => notification.type === "lead_assigned"
    ).length === 1,
    "diez reintentos conservan una sola notificación"
  );
  const [eventCount] = await sql`
    select count(*)::int as count
    from leadgen_event
    where leadgen_id = 'lgmock_us26_seo'
  `;
  assert(eventCount.count === 1, "leadgen duplicado conserva un solo evento");

  const inboundWeb = await owner.post("/api/dev/leadgen-mock/inbound", {
    data: {
      leadgenId: "lgmock_us26_web",
      formId: "form_web_26",
      name: "Diego Web",
      phone: "573100026002",
      email: "diego-web@test.local",
    },
  });
  assert(inboundWeb.ok(), "leadgen sin responsable no se bloquea");
  const diego = await waitFor(async () => {
    const response = await owner.get("/api/contacts?q=573100026002");
    const contact = (await response.json()).contacts[0] ?? null;
    return contact?.service?.name === "Desarrollo web" ? contact : null;
  }, "Diego Web no apareció");
  assert(
    diego.service?.name === "Desarrollo web" && diego.assignee === null,
    "servicio sin ejecutivo queda explícitamente sin asignar"
  );

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

  await page.goto(`${baseURL}/services`);
  const seoAssignee = page.getByRole("combobox", {
    name: "Ejecutivo responsable de SEO",
  });
  await seoAssignee.waitFor();
  assert(
    (await seoAssignee.inputValue()) === commercial.id,
    "Servicios refleja la asignación guardada"
  );

  await page.goto(`${baseURL}/settings/team`);
  await page.getByText("Ana Comercial", { exact: true }).waitFor();
  await page.getByText("SEO", { exact: true }).last().waitFor();
  ok("Equipo muestra el servicio bajo la ejecutiva");

  await page.goto(`${baseURL}/contacts`);
  const contactRow = page.getByTestId("contact-list-row").filter({
    hasText: "Laura SEO",
  });
  await contactRow.waitFor();
  assert(
    (await contactRow.getByTestId("lead-assignment").innerText()).includes(
      "Ana Comercial"
    ),
    "Contactos renderiza el indicador comercial"
  );

  await page.goto(`${baseURL}/pipeline`);
  const leadCard = page.getByTestId("lead-board-card").filter({
    hasText: "Laura SEO",
  });
  await leadCard.waitFor();
  assert(
    (await leadCard.getByTestId("lead-assignment").innerText()).includes(
      "Ana Comercial"
    ),
    "Pipeline renderiza el indicador comercial"
  );

  await page.goto(`${baseURL}${assignmentNotification.href}`);
  await page.getByText("Laura SEO", { exact: true }).first().waitFor();
  const inboxAssignment = page.getByTestId("lead-assignment").filter({
    hasText: "Ana Comercial",
  });
  await inboxAssignment.first().waitFor();
  ok("la notificación navega a una Bandeja con asignación visible");

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/services`);
    await page
      .getByRole("heading", { name: "Servicios", level: 2 })
      .waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    assert(!overflow, `Servicios sin overflow a ${width}px`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/settings/team`);
  await page.getByText("Ana Comercial", { exact: true }).waitFor();
  assert(browserErrors.length === 0, "navegador sin errores", browserErrors.join("\n"));

  let notificationTableRenamed = false;
  let failureLead = null;
  try {
    await sql`alter table notification rename to notification_unavailable`;
    notificationTableRenamed = true;
    const failureInbound = await owner.post("/api/dev/leadgen-mock/inbound", {
      data: {
        leadgenId: "lgmock_us26_failure",
        formId: "form_failure_26",
        name: "Sofía Automatización",
        phone: "573100026003",
        email: "sofia-auto@test.local",
      },
    });
    assert(
      failureInbound.ok(),
      "fallo de notificación no bloquea el webhook",
      `${failureInbound.status()}`
    );
    await waitFor(async () => {
      const rows = await sql`
        select s.name as service_name
        from lead l
        join contact c on c.id = l.contact_id
        left join service s on s.id = l.service_id
        where c.phone = '573100026003'
      `;
      return rows[0]?.service_name === "Automatización" ? rows[0] : null;
    }, "el lead no persistió mientras fallaba la notificación");
    // La derivación asigna aunque la campana esté rota.
    await inbound(
      "573100026003",
      "Sofía Automatización",
      "Quiero hablar con un asesor"
    );
    failureLead = await waitFor(async () => {
      const rows = await sql`
        select l.assigned_member_id, s.name as service_name
        from lead l
        join contact c on c.id = l.contact_id
        left join service s on s.id = l.service_id
        where c.phone = '573100026003'
      `;
      return rows[0]?.assigned_member_id ? rows[0] : null;
    }, "el fallo de notificación impidió asignar al derivar");
  } finally {
    if (notificationTableRenamed) {
      await sql`alter table notification_unavailable rename to notification`;
    }
  }
  assert(
    failureLead?.assigned_member_id === commercial.id &&
      failureLead?.service_name === "Automatización",
    "el lead persiste asignado aunque la campana falle"
  );

  const roleChange = await owner.patch(
    `/api/settings/team/${commercial.id}`,
    { data: { role: "marketing" } }
  );
  assert(roleChange.ok(), "cambio de rol comercial a Marketing");
  const servicesAfterRole = await (await owner.get("/api/services")).json();
  assert(
    servicesAfterRole.services
      .filter(
        (service) =>
          service.id === seo.id || service.id === failureService.id
      )
      .every((service) => service.assignedMemberId === null),
    "cambiar el rol libera todos sus servicios para ingresos futuros"
  );
  const [historical] = await sql`
    select assigned_member_id
    from lead
    where contact_id = ${laura.id}
  `;
  assert(
    historical.assigned_member_id === commercial.id,
    "el prospecto anterior conserva el responsable histórico"
  );

  const restoreCommercial = await owner.patch(
    `/api/settings/team/${commercial.id}`,
    { data: { role: "commercial" } }
  );
  const reassignSeo = await owner.patch(`/api/services/${seo.id}`, {
    data: { assignedMemberId: commercial.id },
  });
  assert(
    restoreCommercial.ok() && reassignSeo.ok(),
    "ejecutiva restaurada para validar administración global"
  );
  const [ownerOrganization] = await sql`
    select organization_id
    from member
    where id = ${commercial.id}
  `;
  const globalRoleChange = await owner.patch(
    `/api/admin/companies/${ownerOrganization.organization_id}/members`,
    { data: { memberId: commercial.id, role: "marketing" } }
  );
  assert(
    globalRoleChange.ok(),
    "superadmin puede cambiar el rol comercial",
    `${globalRoleChange.status()} ${JSON.stringify(await json(globalRoleChange))}`
  );
  const [serviceAfterGlobalRole] = await sql`
    select assigned_member_id
    from service
    where id = ${seo.id}
  `;
  assert(
    serviceAfterGlobalRole.assigned_member_id === null,
    "cambio de rol por superadmin también libera servicios futuros"
  );

  await context.close();
  await browser.close();
  await commercialSession.dispose();
  await owner.dispose();
  await sql.end();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok ═══`);
})().catch(async (error) => {
  console.error(error);
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exitCode = 1;
});
JS
)
