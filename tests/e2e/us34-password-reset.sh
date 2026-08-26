#!/bin/bash
# Self-test de COMPORTAMIENTO — restablecimiento seguro de contraseñas (026).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3100}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
STAMP="$(date +%s)"

echo "── Reset de BD"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && DATABASE_URL=postgresql://postgres:postgres@localhost:5433/vocero pnpm db:migrate >/dev/null 2>&1)

echo "── UI real + Better Auth + Resend mock: feliz, aislamiento e infeliz"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_STAMP="$STAMP" node <<'JS'
const { chromium, request } = require("playwright");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_STAMP;
const oldPassword = "Password123!";
const ownerNewPassword = "OwnerNueva123!";
const memberNewPassword = "EquipoNueva123!";
const ownerEmail = `admin-reset-${stamp}@test.local`;
const memberEmail = `equipo-reset-${stamp}@test.local`;
let passed = 0;

function assert(condition, message, context = "") {
  if (!condition) throw new Error(`${message}${context ? ` — ${context}` : ""}`);
  passed++;
  console.log(`  ✅ ${message}`);
}

async function json(response) {
  return response.json().catch(() => ({}));
}

async function waitFor(check, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(message);
}

async function outbox(publicApi) {
  return (await json(await publicApi.get("/api/dev/resend-mock"))).outbox ?? [];
}

function resetLink(email) {
  const match = email?.text?.match(/https?:\/\/[^\s]+/);
  if (!match) throw new Error("El correo no contiene enlace de recuperación");
  return match[0];
}

(async () => {
  const publicApi = await request.newContext({ baseURL });
  const staleOwner = await request.newContext({ baseURL });
  await publicApi.delete("/api/dev/resend-mock");

  const signup = await staleOwner.post("/api/auth/sign-up/email", {
    data: { name: "Admin Reset", email: ownerEmail, password: oldPassword },
  });
  assert(signup.ok(), "admin creado con sesión previa", `${signup.status()}`);
  const createdMember = await staleOwner.post("/api/settings/team", {
    data: {
      name: "Ana Equipo",
      email: memberEmail,
      password: oldPassword,
      role: "commercial",
    },
  });
  assert(createdMember.ok(), "integrante creado", `${createdMember.status()}`);
  const members = (await json(await staleOwner.get("/api/settings/team"))).members;
  const member = members.find((item) => item.email === memberEmail);
  assert(Boolean(member?.id), "integrante resuelto dentro del tenant");

  const browser = await chromium.launch({ headless: true });
  const publicIp = `203.0.113.${(Number(stamp) % 200) + 1}`;
  const limitedIp = `198.51.100.${(Number(stamp) % 200) + 1}`;
  const publicContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "x-forwarded-for": publicIp },
  });
  const page = await publicContext.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByRole("link", { name: /olvidé mi contraseña/i }).click();
  await page.waitForURL(/\/forgot-password$/);
  await page.reload();
  await page.getByLabel("Correo").fill(`inexistente-${stamp}@test.local`);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByText(/si existe una cuenta/i).waitFor();
  assert((await outbox(publicApi)).length === 0, "correo inexistente conserva respuesta neutra");

  const limitedApi = await request.newContext({
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": limitedIp },
  });
  for (let index = 0; index < 10; index++) {
    const allowed = await limitedApi.post("/api/auth/request-password-reset", {
      data: { email: `limit-${stamp}@test.local`, redirectTo: "/reset-password" },
    });
    assert(allowed.ok(), `solicitud pública ${index + 1} dentro del límite`);
  }
  const limited = await limitedApi.post("/api/auth/request-password-reset", {
    data: { email: `limit-${stamp}@test.local`, redirectTo: "/reset-password" },
  });
  assert(limited.status() === 429, "solicitud pública 11 se limita sin entrega");

  await page.goto(`${baseURL}/forgot-password`);
  await page.getByLabel("Correo").fill(ownerEmail);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByText(/si existe una cuenta/i).waitFor();
  const ownerEmailMessage = await waitFor(async () => {
    const emails = await outbox(publicApi);
    return emails.find((email) => email.to[0] === ownerEmail);
  }, "No llegó el enlace del admin");
  assert(!ownerEmailMessage.idempotencyKey.includes("token"), "clave de entrega no expone el token");

  await page.goto(resetLink(ownerEmailMessage));
  await page.getByLabel("Nueva contraseña").fill(ownerNewPassword);
  await page.getByLabel("Confirmar contraseña").fill(ownerNewPassword);
  await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await page.getByText("Contraseña actualizada").waitFor();
  assert(true, "admin completa recuperación propia en móvil");

  const stale = await staleOwner.get("/api/settings/team");
  assert(stale.status() === 401, "restablecimiento revoca la sesión previa");
  const oldOwner = await request.newContext({ baseURL });
  const oldOwnerLogin = await oldOwner.post("/api/auth/sign-in/email", {
    data: { email: ownerEmail, password: oldPassword },
  });
  assert(!oldOwnerLogin.ok(), "contraseña anterior del admin deja de funcionar");
  const ownerApi = await request.newContext({ baseURL });
  const newOwnerLogin = await ownerApi.post("/api/auth/sign-in/email", {
    data: { email: ownerEmail, password: ownerNewPassword },
  });
  assert(newOwnerLogin.ok(), "contraseña nueva del admin inicia sesión");

  await page.goto(resetLink(ownerEmailMessage));
  await page.getByText(/enlace ya no es válido/i).waitFor();
  assert(true, "enlace consumido no puede reutilizarse");

  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Correo").fill(ownerEmail);
  await page.getByLabel("Contraseña").fill(ownerNewPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/inbox/);
  await page.goto(`${baseURL}/settings/team`);
  const memberRow = page.getByTestId(`team-member-${member.id}`);
  await memberRow.getByRole("button", { name: /restablecer contraseña/i }).click();
  await page.getByText(/enlace de restablecimiento enviado/i).waitFor();
  const memberEmailMessage = await waitFor(async () => {
    const emails = await outbox(publicApi);
    return emails.find((email) => email.to[0] === memberEmail);
  }, "No llegó el enlace del integrante");
  assert(
    !(await memberRow.textContent()).toLowerCase().includes("token"),
    "la fila no muestra el token"
  );

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await memberPage.goto(resetLink(memberEmailMessage));
  await memberPage.getByLabel("Nueva contraseña").fill(memberNewPassword);
  await memberPage.getByLabel("Confirmar contraseña").fill(memberNewPassword);
  await memberPage.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await memberPage.getByText("Contraseña actualizada").waitFor();
  assert(true, "integrante define su propia contraseña sin revelarla al admin");

  const oldMember = await request.newContext({ baseURL });
  assert(
    !(await oldMember.post("/api/auth/sign-in/email", {
      data: { email: memberEmail, password: oldPassword },
    })).ok(),
    "contraseña anterior del integrante deja de funcionar"
  );
  const memberApi = await request.newContext({ baseURL });
  assert(
    (await memberApi.post("/api/auth/sign-in/email", {
      data: { email: memberEmail, password: memberNewPassword },
    })).ok(),
    "contraseña nueva del integrante inicia sesión"
  );
  const forbidden = await memberApi.post(`/api/settings/team/${member.id}/password-reset`);
  assert(forbidden.status() === 403, "rol no admin no restablece a otras personas");

  const foreignEmail = `admin-ajeno-reset-${stamp}@test.local`;
  const foreignPassword = "Foreign123!";
  const company = await ownerApi.post("/api/admin/companies", {
    data: {
      companyName: "Empresa Ajena Reset",
      adminName: "Admin Ajeno",
      adminEmail: foreignEmail,
      adminPassword: foreignPassword,
    },
  });
  assert(company.ok(), "segunda organización creada");
  const foreignApi = await request.newContext({ baseURL });
  assert(
    (await foreignApi.post("/api/auth/sign-in/email", {
      data: { email: foreignEmail, password: foreignPassword },
    })).ok(),
    "admin de segunda organización inicia sesión"
  );
  const foreignMembers = (await json(await foreignApi.get("/api/settings/team"))).members;
  const foreignMemberId = foreignMembers[0]?.id;
  const beforeCrossTenant = (await outbox(publicApi)).length;
  const crossTenant = await ownerApi.post(
    `/api/settings/team/${foreignMemberId}/password-reset`
  );
  assert(crossTenant.status() === 404, "admin no resuelve miembros de otro tenant");
  assert((await outbox(publicApi)).length === beforeCrossTenant, "cruce de tenant no entrega correo");

  await memberPage.goto(`${baseURL}/reset-password?token=alterado-${stamp}`);
  await memberPage.getByLabel("Nueva contraseña").fill("Alterada123!");
  await memberPage.getByLabel("Confirmar contraseña").fill("Alterada123!");
  await memberPage.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await memberPage.getByText(/enlace ya no es válido/i).waitFor();
  assert(true, "token alterado se rechaza sin cambiar credenciales");

  await publicApi.post("/api/dev/resend-mock", { data: { failNext: 1 } });
  const beforeAdminFailure = (await outbox(publicApi)).length;
  const startedAdminFailure = Date.now();
  const adminFailure = await ownerApi.post(
    `/api/settings/team/${member.id}/password-reset`
  );
  const adminFailureMs = Date.now() - startedAdminFailure;
  const adminFailureBody = JSON.stringify(await json(adminFailure));
  assert(adminFailure.status() === 503, "fallo Resend informa indisponibilidad al admin");
  assert(adminFailureMs < 10000, "fallo admin termina antes de 10 segundos", `${adminFailureMs}ms`);
  assert(!/https?:|token|password|contraseña nueva/i.test(adminFailureBody), "error admin no expone secretos");
  assert((await outbox(publicApi)).length === beforeAdminFailure, "fallo admin no crea falsa entrega");

  await publicApi.post("/api/dev/resend-mock", { data: { failNext: 1 } });
  await page.goto(`${baseURL}/forgot-password`);
  await page.getByLabel("Correo").fill(ownerEmail);
  const startedPublicFailure = Date.now();
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByText(/si existe una cuenta/i).waitFor();
  const publicFailureMs = Date.now() - startedPublicFailure;
  assert(publicFailureMs < 10000, "fallo público termina antes de 10 segundos", `${publicFailureMs}ms`);
  assert((await outbox(publicApi)).length === beforeAdminFailure, "fallo público es neutro y no crea entrega");

  assert(
    (await memberApi.get("/api/conversations")).ok(),
    "fallos de entrega no cambian la contraseña vigente"
  );

  console.log(`\n═══ RESULTADO: ${passed} verificaciones verdes ═══`);
  await Promise.all([
    publicApi.dispose(),
    staleOwner.dispose(),
    limitedApi.dispose(),
    oldOwner.dispose(),
    ownerApi.dispose(),
    oldMember.dispose(),
    memberApi.dispose(),
    foreignApi.dispose(),
    publicContext.close(),
    memberContext.close(),
  ]);
  await browser.close();
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
JS
)
