#!/bin/bash
# Self-test de COMPORTAMIENTO — formularios WordPress (022).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3100}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD y migraciones"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && DATABASE_URL=postgresql://postgres:postgres@localhost:5433/vocero pnpm db:migrate >/dev/null)

echo "── API real: configuración, webhook, efectos, aislamiento e infeliz"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
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
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`${message}${value ? ` — ${JSON.stringify(value)}` : ""}`);
}

(async () => {
  const publicApi = await request.newContext({ baseURL });
  const owner = await request.newContext({ baseURL });
  const ownerEmail = `admin-web-${stamp}@test.local`;
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: { name: "Admin Web", email: ownerEmail, password },
  });
  assert(signup.ok(), "empresa y administrador creados", `${signup.status()}`);

  assert(
    (await owner.put("/api/settings/whatsapp", {
      data: { wabaId: `waba_web_${stamp}`, phoneNumberId: `phone_web_${stamp}`, token: "EAAtest-valido" },
    })).ok(),
    "WhatsApp mock conectado"
  );
  const serviceResponse = await owner.post("/api/services", { data: { name: "SEO Web" } });
  const service = (await body(serviceResponse)).service;
  assert(serviceResponse.ok() && service?.id, "servicio creado");

  const createdResponse = await owner.post("/api/settings/web-forms", {
    data: { name: "Formulario SEO", serviceId: service.id },
  });
  const created = await body(createdResponse);
  assert(createdResponse.status() === 201 && created.secret?.startsWith("wf_"), "integración creada y secreto revelado una vez");
  const integration = created.integration;
  const secret = created.secret;
  assert(!JSON.stringify(integration).includes(secret), "DTO listado no contiene secreto completo");

  const unauthorized = await publicApi.post(`/api/integrations/forms/${integration.id}/submissions`, {
    headers: { authorization: "Bearer incorrecto" },
    data: { externalId: "secret-leak", phone: "573001110032" },
  });
  const unauthorizedBody = await body(unauthorized);
  assert(unauthorized.status() === 401 && !JSON.stringify(unauthorizedBody).includes(integration.name), "auth incorrecta no revela la integración");

  const submit = (payload, token = secret) =>
    publicApi.post(`/api/integrations/forms/${integration.id}/submissions`, {
      headers: { authorization: `Bearer ${token}` },
      data: payload,
    });

  const first = await submit({
    externalId: `wp-json-${stamp}`,
    phone: "+57 (300) 111-0032",
    name: "Ana Web",
    email: "ana.web@example.com",
    message: "Necesito una propuesta SEO",
    source: "WordPress principal",
    campaign: "organic",
    pageUrl: "https://example.com/seo",
    consent: true,
    password: "debe-descartarse",
  });
  const firstBody = await body(first);
  assert(first.status() === 201 && firstBody.status === "processed", "JSON canónico crea el prospecto");

  const [domain] = await sql`
    select c.name, c.email, c.phone, c.consent_source, c.consent_granted_at,
           c.notes, l.service_id, s.status, s.external_id
    from web_form_submission s
    join contact c on c.id = s.contact_id and c.organization_id = s.organization_id
    join lead l on l.id = s.lead_id and l.organization_id = s.organization_id
    where s.integration_id = ${integration.id} and s.external_id = ${`wp-json-${stamp}`}
  `;
  assert(domain?.status === "processed" && domain.phone === "573001110032", "ledger enlaza contacto y lead normalizados");
  assert(domain.consent_source === "web_form" && domain.consent_granted_at, "origen web y consentimiento explícito registrados");
  assert(domain.service_id === service.id, "servicio configurado aplicado");
  assert(domain.notes.includes("Necesito una propuesta SEO") && !domain.notes.includes("debe-descartarse"), "nota allowlist conserva contexto y descarta extras");

  const contacts = (await body(await owner.get("/api/contacts"))).contacts ?? [];
  const conversations = (await body(await owner.get("/api/conversations"))).conversations ?? [];
  const board = await body(await owner.get("/api/pipeline/board"));
  assert(contacts.some((item) => item.id === firstBody.contactId), "prospecto aparece en Contactos");
  assert(conversations.some((item) => item.contact.id === firstBody.contactId), "prospecto aparece en Bandeja");
  assert(JSON.stringify(board).includes(firstBody.leadId), "prospecto aparece en Pipeline");

  const duplicates = await Promise.all(
    Array.from({ length: 10 }, () => submit({ externalId: `wp-json-${stamp}`, phone: "573001110032" }))
  );
  assert(duplicates.every((response) => response.status() === 200), "diez reintentos concurrentes responden como duplicados");
  const [{ count: ledgerCount }] = await sql`
    select count(*)::int as count from web_form_submission
    where integration_id = ${integration.id} and external_id = ${`wp-json-${stamp}`}
  `;
  assert(ledgerCount === 1, "reintentos conservan un solo ledger");

  await waitFor(async () => {
    const result = await body(await owner.get("/api/notifications"));
    return (result.notifications ?? []).filter((item) => item.type === "new_web_lead").length === 1;
  }, "no llegó aviso interno");
  assert(true, "nuevo prospecto crea un solo aviso interno");

  const form = await publicApi.post(`/api/integrations/forms/${integration.id}/submissions`, {
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    data: new URLSearchParams({
      submission_id: `wp-form-${stamp}`,
      "your-phone": "+573002220032",
      "your-name": "Bruno Form",
      "your-email": "bruno@example.com",
      "your-message": "Formulario codificado",
      utm_campaign: "brand",
      acceptance: "on",
    }).toString(),
  });
  assert(form.status() === 201, "form-urlencoded y aliases WordPress procesados");

  const preserve = await submit({
    externalId: `wp-existing-${stamp}`,
    phone: "573001110032",
    name: "Nombre que no debe pisar",
    email: "otro@example.com",
    message: "Segunda consulta",
  });
  assert(preserve.status() === 201, "nuevo envío del mismo contacto se registra");
  const [preserved] = await sql`select name, email from contact where id = ${firstBody.contactId}`;
  assert(preserved.name === "Ana Web" && preserved.email === "ana.web@example.com", "formulario no pisa nombre/email humanos");

  const [org] = await sql`select organization_id from web_form_integration where id = ${integration.id}`;
  await sql`
    insert into template (id, organization_id, name, language, category, body, status, wa_template_id)
    values (${`tpl_web_${stamp}`}, ${org.organization_id}, ${`saludo_web_${stamp}`}, 'es', 'UTILITY', 'Hola {{1}}, recibimos tu solicitud', 'approved', ${`wa_tpl_${stamp}`})
  `;
  await sql`update service set greeting_template_id = ${`tpl_web_${stamp}`} where id = ${service.id}`;
  await publicApi.delete("/api/dev/wa-mock/outbox");
  const greeted = await submit({
    externalId: `wp-greeting-${stamp}`,
    phone: "573003330032",
    name: "Carla Consentida",
    consent: true,
  });
  assert(greeted.status() === 201, "lead con consentimiento procesado");
  const outbox = await waitFor(async () => {
    const result = await body(await publicApi.get("/api/dev/wa-mock/outbox"));
    return result.outbox?.length === 1 ? result.outbox : null;
  }, "no llegó saludo a WhatsApp mock");
  assert(outbox[0].to === "573003330032", "consentimiento dispara un solo saludo");

  const noConsent = await submit({
    externalId: `wp-no-consent-${stamp}`,
    phone: "573004440032",
    name: "Diana Sin Permiso",
    consent: false,
  });
  assert(noConsent.status() === 201, "lead sin consentimiento también entra");
  await new Promise((resolve) => setTimeout(resolve, 400));
  const outboxAfterNoConsent = (await body(await publicApi.get("/api/dev/wa-mock/outbox"))).outbox ?? [];
  assert(outboxAfterNoConsent.length === 1, "sin consentimiento no envía WhatsApp");

  assert((await publicApi.post("/api/dev/wa-mock/fail-next", { data: { count: 1 } })).ok(), "fallo de WhatsApp preparado");
  const resilient = await submit({
    externalId: `wp-failure-${stamp}`,
    phone: "573005550032",
    name: "Eva Resiliente",
    consent: true,
  });
  assert(resilient.status() === 201, "fallo secundario no revierte ni demora el lead");
  await waitFor(async () => {
    const [row] = await sql`
      select s.status, s.greeting_attempted_at, i.last_error
      from web_form_submission s
      join web_form_integration i on i.id = s.integration_id
      where s.external_id = ${`wp-failure-${stamp}`}
    `;
    return row?.status === "processed" && row.greeting_attempted_at && row.last_error;
  }, "no quedó marcador de intento fallido");
  const [failureState] = await sql`select last_error from web_form_integration where id = ${integration.id}`;
  assert(failureState.last_error === "El prospecto se guardó, pero una automatización secundaria falló", "fallo secundario queda deduplicado y sanitizado");

  const invalidPhone = await submit({ externalId: `wp-bad-${stamp}`, phone: "valor-secreto-abc" });
  const invalidPhoneBody = await body(invalidPhone);
  assert(invalidPhone.status() === 422 && !JSON.stringify(invalidPhoneBody).includes("valor-secreto-abc"), "validación no refleja valores recibidos");
  const unsupported = await publicApi.post(`/api/integrations/forms/${integration.id}/submissions`, {
    headers: { authorization: `Bearer ${secret}`, "content-type": "text/plain" },
    data: "hola",
  });
  assert(unsupported.status() === 415, "content-type no soportado se rechaza");

  const rotate = await owner.post(`/api/settings/web-forms/${integration.id}/rotate`);
  const rotatedSecret = (await body(rotate)).secret;
  assert(rotate.ok() && rotatedSecret && rotatedSecret !== secret, "rotación entrega un secreto nuevo");
  assert((await submit({ externalId: `wp-old-${stamp}`, phone: "573006660032" })).status() === 401, "secreto anterior queda inválido inmediatamente");
  const withRotated = await submit({ externalId: `wp-new-${stamp}`, phone: "573006660032" }, rotatedSecret);
  assert(withRotated.status() === 201, "secreto rotado acepta entregas");

  assert((await owner.patch(`/api/settings/web-forms/${integration.id}`, { data: { enabled: false } })).ok(), "integración desactivada");
  assert((await submit({ externalId: `wp-disabled-${stamp}`, phone: "573007770032" }, rotatedSecret)).status() === 401, "integración desactivada usa auth genérica");

  const commercialEmail = `commercial-web-${stamp}@test.local`;
  assert((await owner.post("/api/settings/team", {
    data: { name: "Comercial Web", email: commercialEmail, password, role: "commercial" },
  })).ok(), "comercial creado");
  const commercial = await request.newContext({ baseURL });
  assert((await commercial.post("/api/auth/sign-in/email", { data: { email: commercialEmail, password } })).ok(), "comercial inicia sesión");
  assert((await commercial.get("/api/settings/web-forms")).status() === 403, "comercial no puede listar secretos ni integraciones");

  const foreignEmail = `foreign-web-${stamp}@test.local`;
  const company = await owner.post("/api/admin/companies", {
    data: { companyName: "Empresa Web Ajena", adminName: "Admin Ajena", adminEmail: foreignEmail, adminPassword: password },
  });
  assert(company.ok(), "segunda empresa creada");
  const foreign = await request.newContext({ baseURL });
  assert((await foreign.post("/api/auth/sign-in/email", { data: { email: foreignEmail, password } })).ok(), "admin ajena inicia sesión");
  const foreignList = await body(await foreign.get("/api/settings/web-forms"));
  assert((foreignList.integrations ?? []).length === 0, "listado no cruza empresas");
  assert((await foreign.patch(`/api/settings/web-forms/${integration.id}`, { data: { enabled: true } })).status() === 404, "mutación ajena se oculta como no encontrada");

  const columns = await sql`
    select column_name from information_schema.columns
    where table_name = 'web_form_submission'
  `;
  const names = columns.map((row) => row.column_name);
  assert(!names.includes("payload") && !names.includes("headers") && !names.includes("secret"), "ledger no tiene columnas de payload, cabeceras o secreto");

  console.log(`\n═══ RESULTADO: ${passed} verificaciones verdes ═══`);
  await Promise.all([owner.dispose(), commercial.dispose(), foreign.dispose(), publicApi.dispose()]);
  await sql.end();
})().catch(async (error) => {
  console.error(error);
  await sql.end().catch(() => {});
  process.exit(1);
});
JS
)
