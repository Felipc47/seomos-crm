import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
const baseURL = "http://127.0.0.1:3107";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_team_036");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const root = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
const password = "TeamPrueba123!", stamp = Date.now();
let count = 0;
const check = (value, label) => { assert(value, label); console.log(`✓ ${++count}. ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${await response.text()}`); return response.json(); };
async function waitFor(read, predicate) { for (let i = 0; i < 80; i++) { const v = await read(); if (predicate(v)) return v; await new Promise(resolve => setTimeout(resolve, 250)); } throw Error("Resultado no observado"); }
const tenants = [];
try {
  const [founder] = await sql`select email from "user" where is_superadmin=true`;
  await json(await root.post("/api/auth/sign-in/email", { data: { email: founder.email, password } }));
  for (const [i, companyName] of ["Baterías Conecta QA", "Lion Data QA"].entries()) {
    const adminEmail = `tenant-${i}-${stamp}@team.test`;
    await json(await root.post("/api/admin/companies", { data: { companyName, adminName: `Admin ${companyName}`, adminEmail, adminPassword: password } }));
    const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage(); page.setDefaultTimeout(45000);
    const api = context.request;
    await page.goto("/login"); await page.getByLabel("Correo", { exact: true }).fill(adminEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL(/\/inbox/);
    check((await sql`select is_superadmin from "user" where email=${adminEmail}`)[0].is_superadmin === false, `${companyName}: administrador sin privilegios de superadmin`);
    await page.goto("/settings/team");
    for (const role of ["commercial", "marketing", "agent_editor"]) {
      await page.getByLabel("Nombre", { exact: true }).fill(`${role} ${companyName}`);
      await page.getByLabel("Correo", { exact: true }).fill(`${role}-${i}-${stamp}@team.test`);
      await page.getByLabel("Rol", { exact: true }).selectOption(role);
      await page.getByLabel("Contraseña temporal").fill(password);
      const pending = page.waitForResponse(r => r.request().method() === "POST" && r.url().endsWith("/api/settings/team"));
      await page.getByRole("button", { name: "Crear cuenta", exact: true }).click(); await json(await pending);
    }
    const members = (await json(await api.get("/api/settings/team"))).members;
    check(members.length === 4, `${companyName}: solo aparecen sus cuatro miembros`);
    await page.goto("/services"); await page.getByPlaceholder("Nuevo servicio", { exact: false }).fill("Soporte");
    const created = page.waitForResponse(r => r.request().method() === "POST" && r.url().endsWith("/api/services"));
    await page.getByRole("button", { name: "Agregar", exact: true }).click(); const svc = (await json(await created)).service;
    const selector = page.getByLabel("Responsable del servicio de Soporte", { exact: true });
    await selector.waitFor();
    check(await selector.locator("option").count() === 5, `${companyName}: selector permite Admin, Comercial, Marketing y Editor`);
    for (const member of members) {
      const pending = page.waitForResponse(r => r.request().method() === "PATCH" && r.url().endsWith(`/api/services/${svc.id}`));
      await selector.selectOption(member.id); await json(await pending);
      await waitFor(async () => (await json(await api.get("/api/services"))).services[0], s => s.assignedMemberId === member.id);
      check(true, `${companyName}: admin asigna servicio al rol ${member.role}`);
    }
    const target = members.find(m => m.role === "marketing");
    await json(await api.patch(`/api/services/${svc.id}`, { data: { assignedMemberId: target.id } }));
    await page.goto("/settings/team"); const row = page.getByTestId(`team-member-${target.id}`);
    await row.getByRole("button", { name: `Editar a ${target.name}` }).click();
    await row.getByLabel("Nombre del miembro").fill(`Editado ${companyName}`);
    await row.getByLabel("Rol del miembro").selectOption("agent_editor");
    const saved = page.waitForResponse(r => r.request().method() === "PATCH" && r.url().endsWith(`/api/settings/team/${target.id}`));
    await row.getByRole("button", { name: "Guardar cambios" }).click(); await json(await saved);
    await row.getByText(`Editado ${companyName}`, { exact: true }).waitFor();
    check((await json(await api.get("/api/services"))).services[0].assignedMemberId === target.id, `${companyName}: admin modifica nombre/rol conservando servicio`);
    await row.getByRole("button", { name: `Eliminar a Editado ${companyName}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click(); await row.waitFor({ state: "detached" });
    check((await json(await api.get("/api/services"))).services[0].assignedMemberId === null, `${companyName}: admin elimina miembro y libera servicio`);
    await page.reload(); check(await row.count() === 0, `${companyName}: eliminación persiste`);
    await page.screenshot({ path: `.artifacts/us45-team-services/tenant-${i}-admin.png`, fullPage: true });
    tenants.push({ api, context, members, svc });
  }
  for (const [a, b] of [[tenants[0], tenants[1]], [tenants[1], tenants[0]]]) {
    check((await a.api.patch(`/api/settings/team/${b.members[0].id}`, { data: { name: "Cruce" } })).status() === 404, "admin de una cuenta no modifica miembros de la otra");
    check((await a.api.delete(`/api/settings/team/${b.members[0].id}`)).status() === 404, "admin de una cuenta no elimina miembros de la otra");
    check((await a.api.patch(`/api/services/${a.svc.id}`, { data: { assignedMemberId: b.members[0].id } })).status() === 422, "admin solo asigna personas de su propia cuenta");
  }
  console.log(`SELF-TEST ADMINS POR EMPRESA: ${count} comprobaciones aprobadas`);
} finally { for (const tenant of tenants) await tenant.context.close(); await root.dispose(); await browser.close(); await sql.end(); }
