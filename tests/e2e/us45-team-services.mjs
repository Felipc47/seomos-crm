import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { mkdir } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3107";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_team_036", { max: 3 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request;
const password = "TeamPrueba123!", stamp = Date.now(), errors = [];
page.on("pageerror", error => errors.push(error.message));
let count = 0;
const check = (value, label) => { assert(value, label); console.log(`✓ ${++count}. ${label}`); };
const json = async response => { assert(response.ok(), `${response.status()} ${response.url()} ${await response.text()}`); return response.json(); };
const get = async path => json(await api.get(path));
async function waitFor(read, predicate) { for (let i = 0; i < 80; i++) { const v = await read(); if (predicate(v)) return v; await new Promise(resolve => setTimeout(resolve, 250)); } throw Error("Resultado no observado"); }
async function login(email) {
  const client = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  await json(await client.post("/api/auth/sign-in/email", { data: { email, password } }));
  return client;
}
const row = id => page.getByTestId(`team-member-${id}`);
async function edit(member) { await row(member.id).getByRole("button", { name: `Editar a ${member.name}`, exact: true }).click(); return row(member.id); }
async function save(region, status = 200) {
  const pending = page.waitForResponse(response => response.request().method() === "PATCH" && response.url().includes("/api/settings/team/"));
  await region.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  check((await pending).status() === status, `guardar edición responde ${status}`);
}
try {
  await mkdir(".artifacts/us45-team-services", { recursive: true });
  const anon = await request.newContext({ baseURL });
  check((await anon.delete("/api/settings/team/missing")).status() === 401, "eliminar exige sesión");
  await anon.dispose();
  const ownerEmail = `owner-${stamp}@team.test`;
  await page.goto("/register"); await page.getByLabel("Tu nombre").fill("Fundador QA");
  await page.getByLabel("Correo").fill(ownerEmail); await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click(); await page.waitForURL(/\/inbox/);
  await page.goto("/settings/team");
  for (const [role, name] of [["commercial", "Comercial QA"], ["marketing", "Marketing QA"], ["agent_editor", "Editor QA"], ["owner", "Admin QA"]]) {
    await page.getByLabel("Nombre", { exact: true }).fill(name);
    await page.getByLabel("Correo", { exact: true }).fill(`${role}-member-${stamp}@team.test`);
    await page.getByLabel("Rol", { exact: true }).selectOption(role);
    await page.getByLabel("Contraseña temporal", { exact: true }).fill(password);
    const pending = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/api/settings/team"));
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click(); await json(await pending);
    await waitFor(() => get("/api/settings/team"), v => v.members.some(m => m.name === name));
  }
  const members = (await get("/api/settings/team")).members;
  const founder = members.find(m => m.isSelf), commercial = members.find(m => m.role === "commercial");
  const marketing = members.find(m => m.role === "marketing"), editor = members.find(m => m.role === "agent_editor");
  const admin = members.find(m => m.role === "owner" && !m.isSelf);
  const [{ organization_id: org }] = await sql`select organization_id from member where id=${founder.id}`;
  const marketingSession = await login(marketing.email);
  const commercialSession = await login(commercial.email);
  const editorSession = await login(editor.email);
  for (const client of [marketingSession, commercialSession, editorSession]) {
    check((await client.patch(`/api/settings/team/${admin.id}`, { data: { name: "Prohibido" } })).status() === 403, "rol no admin no edita miembros");
    check((await client.delete(`/api/settings/team/${admin.id}`)).status() === 403, "rol no admin no elimina miembros");
  }
  await page.goto("/services");
  await page.getByPlaceholder("Nuevo servicio", { exact: false }).fill("SEO");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  const svc = (await waitFor(() => get("/api/services"), v => v.services.length > 0)).services[0];
  const selector = () => page.getByLabel("Responsable del servicio de SEO", { exact: true });
  await selector().waitFor();
  const options = await selector().locator("option").allTextContents();
  check(options.length === members.length + 1 && options.some(x => x.includes("Editor de agente")) && options.some(x => x.includes("Marketing")), "selector incluye todos los roles y sus etiquetas");
  for (const candidate of [founder, editor, marketing, commercial, admin]) {
    const pending = page.waitForResponse(response => response.request().method() === "PATCH" && response.url().endsWith(`/api/services/${svc.id}`));
    await selector().selectOption(candidate.id); await json(await pending);
    await page.reload(); await waitFor(() => selector().inputValue(), value => value === candidate.id);
    check(true, `asignación persiste para ${candidate.role}`);
  }
  check((await commercialSession.patch(`/api/services/${svc.id}`, { data: { assignedMemberId: commercial.id } })).status() === 403, "solo admin cambia asignaciones");
  await json(await api.patch(`/api/services/${svc.id}`, { data: { assignedMemberId: marketing.id } }));
  await page.goto("/settings/team"); await row(marketing.id).getByText("SEO", { exact: true }).waitFor();
  check(true, "Equipo muestra servicios asignados a Marketing");
  let region = await edit(marketing); await region.getByLabel("Nombre del miembro").fill("No guardar");
  await region.getByRole("button", { name: "Cancelar edición" }).click();
  check((await get("/api/settings/team")).members.find(m => m.id === marketing.id).name === marketing.name, "cancelar no modifica al miembro");
  region = await edit(marketing); await region.getByLabel("Nombre del miembro").fill("Marketing editado");
  await region.getByLabel("Correo del miembro").fill(`editado-${stamp}@team.test`);
  await region.getByLabel("Rol del miembro").selectOption("agent_editor");
  await page.route(`**/api/settings/team/${marketing.id}`, route => route.abort());
  await region.getByRole("button", { name: "Guardar cambios" }).click(); await region.getByRole("alert").waitFor();
  check(await region.getByLabel("Nombre del miembro").inputValue() === "Marketing editado", "fallo de red conserva formulario editable");
  await page.unroute(`**/api/settings/team/${marketing.id}`); await save(region);
  await row(marketing.id).getByText(`editado-${stamp}@team.test`, { exact: true }).waitFor();
  check((await get("/api/services")).services[0].assignedMemberId === marketing.id, "cambiar rol conserva asignación del servicio");
  check((await marketingSession.get("/api/services")).status() === 401, "cambio de correo revoca sesión anterior");
  const renamedSession = await login(`editado-${stamp}@team.test`); await renamedSession.dispose();
  check(true, "nuevo correo inicia sesión con la misma contraseña");
  const renamed = { ...marketing, name: "Marketing editado" };
  region = await edit(renamed); await region.getByLabel("Nombre del miembro").fill("No persistir");
  await region.getByLabel("Correo del miembro").fill(commercial.email); await region.getByLabel("Rol del miembro").selectOption("marketing");
  await save(region, 409); await region.getByRole("alert").waitFor();
  const persisted = (await get("/api/settings/team")).members.find(m => m.id === marketing.id);
  check(persisted.name === "Marketing editado" && persisted.role === "agent_editor", "correo duplicado revierte nombre y rol en la misma transacción");
  await region.getByRole("button", { name: "Cancelar edición" }).click();
  check((await api.patch(`/api/settings/team/${marketing.id}`, { data: { name: "" } })).status() === 422, "nombre vacío rechazado");
  check((await api.patch(`/api/settings/team/${marketing.id}`, { data: { email: "no-es-correo" } })).status() === 422, "correo inválido rechazado");
  check((await api.delete(`/api/settings/team/${founder.id}`)).status() === 422, "no se permite eliminarse a sí mismo");
  const adminSession = await login(admin.email);
  check((await adminSession.delete(`/api/settings/team/${founder.id}`)).status() === 403, "superadmin protegido ante otro admin");
  check((await adminSession.patch(`/api/settings/team/${founder.id}`, { data: { name: "Cambio indebido" } })).status() === 403, "otro admin no modifica al superadmin");
  const bEmail = `companyb-${stamp}@team.test`;
  await json(await api.post("/api/admin/companies", { data: { companyName: "Empresa B QA", adminName: "Admin B", adminEmail: bEmail, adminPassword: password } }));
  const apiB = await login(bEmail);
  const bMembers = (await json(await apiB.get("/api/settings/team"))).members, bAdmin = bMembers[0];
  check((await apiB.patch(`/api/settings/team/${marketing.id}`, { data: { name: "Cruce" } })).status() === 404, "otra empresa no edita miembros ajenos");
  check((await apiB.delete(`/api/settings/team/${marketing.id}`)).status() === 404, "otra empresa no elimina miembros ajenos");
  check((await api.patch(`/api/services/${svc.id}`, { data: { assignedMemberId: bAdmin.id } })).status() === 422, "servicio rechaza miembro de otra empresa");
  check((await apiB.patch(`/api/settings/team/${bAdmin.id}`, { data: { role: "commercial" } })).status() === 422, "último admin no se puede degradar");
  // Identidad compartida: el rol local puede cambiar sin modificar el perfil ajeno.
  const [{ user_id: editorUser }] = await sql`select user_id from member where id=${editor.id}`;
  const [{ organization_id: bOrg }] = await sql`select organization_id from member where id=${bAdmin.id}`;
  await sql`insert into member (id,organization_id,user_id,role) values (${`shared-${stamp}`},${bOrg},${editorUser},'commercial')`;
  check((await api.patch(`/api/settings/team/${editor.id}`, { data: { name: "Global indebido", role: "marketing" } })).status() === 409, "identidad compartida rechaza edición global sin cambio parcial");
  await json(await api.patch(`/api/settings/team/${editor.id}`, { data: { role: "marketing" } }));
  check((await sql`select role from member where id=${`shared-${stamp}`}`)[0].role === "commercial", "cambio de rol permanece aislado por empresa");
  // Dos admins intentando eliminar/degradar a otro dejan siempre un admin.
  await json(await apiB.post("/api/settings/team", { data: { name: "Admin B2", email: `b2-${stamp}@team.test`, password, role: "owner" } }));
  const b2 = (await json(await apiB.get("/api/settings/team"))).members.find(m => m.name === "Admin B2");
  const b2Session = await login(b2.email);
  const race = await Promise.all([
    apiB.delete(`/api/settings/team/${b2.id}`),
    b2Session.patch(`/api/settings/team/${bAdmin.id}`, { data: { role: "commercial" } }),
  ]);
  check(race.filter(r => r.ok()).length === 1, "operaciones concurrentes no dejan empresa sin admin");
  check((await sql`select count(*)::int n from member where organization_id=${bOrg} and role in ('owner','admin')`)[0].n === 1, "queda exactamente un admin tras la carrera");
  await b2Session.dispose();
  // Distribución real por handoff con proveedores mock para cada rol.
  await json(await api.put("/api/settings/whatsapp", { data: { wabaId: "waba_test_1", phoneNumberId: "phone_test_1", token: "EAAtest-valido" } }));
  await json(await api.put("/api/agent/profile", { data: { enabled: true, name: "Agente QA" } }));
  await json(await api.post(`/api/services/${svc.id}/forms`, { data: { formId: "team_form_036" } }));
  for (const [i, candidate] of [founder, marketing, editor, commercial].entries()) {
    await json(await api.patch(`/api/services/${svc.id}`, { data: { assignedMemberId: candidate.id } }));
    const phone = `57310003600${i}`;
    await json(await api.post("/api/dev/leadgen-mock/inbound", { data: { leadgenId: `lgmock_team036-${stamp}-${i}`, formId: "team_form_036", name: `Prospecto ${i}`, phone, email: `lead${i}@qa.test` } }));
    await waitFor(() => get(`/api/contacts?q=${phone}`), v => v.contacts[0]?.service?.id === svc.id);
    await json(await api.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId: "phone_test_1", from: phone, name: `Prospecto ${i}`, text: "Hola, quiero hablar con un asesor" } }));
    const result = await waitFor(() => get(`/api/contacts?q=${phone}`), v => v.contacts[0]?.assignee?.memberId === candidate.id);
    check(result.contacts[0].assignee.memberId === candidate.id, `handoff asigna al responsable ${candidate.name}`);
  }
  // Un stream ya abierto también debe perder acceso al eliminar la membresía.
  const removedContext = await browser.newContext({ baseURL, storageState: await commercialSession.storageState() });
  const removedPage = await removedContext.newPage(); await removedPage.goto("/inbox");
  await removedPage.evaluate(() => {
    window.teamStream = { text: "", closed: false };
    void (async () => {
      const response = await fetch("/api/events"); const reader = response.body.getReader();
      while (true) { const chunk = await reader.read(); if (chunk.done) break; window.teamStream.text += new TextDecoder().decode(chunk.value); }
      window.teamStream.closed = true;
    })();
  });
  await waitFor(() => removedPage.evaluate(() => window.teamStream.text), text => text.includes("conectado"));
  // Eliminación desde la interfaz: cancelar, fallo de red y reintento.
  await page.goto("/settings/team");
  await row(commercial.id).getByRole("button", { name: `Eliminar a ${commercial.name}` }).click();
  let dialog = page.getByRole("alertdialog", { name: "Eliminar miembro del equipo" });
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  check((await get("/api/settings/team")).members.some(m => m.id === commercial.id), "cancelar eliminación conserva miembro");
  await row(commercial.id).getByRole("button", { name: `Eliminar a ${commercial.name}` }).click();
  dialog = page.getByRole("alertdialog", { name: "Eliminar miembro del equipo" });
  await page.route(`**/api/settings/team/${commercial.id}`, route => route.abort());
  await dialog.getByRole("button", { name: "Sí, eliminar" }).click(); await dialog.getByRole("alert").waitFor();
  check(await dialog.isVisible(), "fallo al eliminar mantiene confirmación y permite reintentar");
  await page.unroute(`**/api/settings/team/${commercial.id}`);
  await dialog.getByRole("button", { name: "Sí, eliminar" }).click(); await row(commercial.id).waitFor({ state: "detached" });
  check((await get("/api/services")).services[0].assignedMemberId === null, "eliminar libera servicio");
  const removedContact = (await get("/api/contacts?q=573100036003")).contacts[0];
  check(removedContact.assignee === null && removedContact.name === "Prospecto 3", "eliminar libera prospecto conservando contacto");
  check((await sql`select count(*)::int n from message m join conversation c on c.id=m.conversation_id where c.contact_id=${removedContact.id} and c.organization_id=${org}`)[0].n > 0, "eliminar conserva conversación e historial");
  check((await commercialSession.get("/api/services")).status() === 401, "miembro eliminado pierde acceso incluso con sesión previa");
  const [{ id: removedConversationId }] = await sql`select id from conversation where organization_id=${org} and contact_id=${removedContact.id}`;
  await json(await api.patch(`/api/conversations/${removedConversationId}`, { data: { markRead: true } }));
  await waitFor(() => removedPage.evaluate(() => window.teamStream.closed), value => value === true);
  check(!(await removedPage.evaluate(() => window.teamStream.text)).includes("event:"), "SSE abierto se cierra sin entregar eventos después de eliminar");
  await removedContext.close();
  await page.reload(); check(await row(commercial.id).count() === 0, "eliminación persiste al recargar");
  await page.screenshot({ path: ".artifacts/us45-team-services/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  region = await edit(renamed); await region.getByLabel("Nombre del miembro").scrollIntoViewIfNeeded();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "editor de equipo no desborda móvil");
  await page.screenshot({ path: ".artifacts/us45-team-services/mobile-edit.png", fullPage: true });
  await region.getByRole("button", { name: "Cancelar edición" }).click();
  await page.goto("/services"); await selector().waitFor();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Servicios no desborda móvil");
  await page.screenshot({ path: ".artifacts/us45-team-services/mobile-services.png", fullPage: true });
  check(errors.length === 0, `sin errores de ejecución en navegador: ${errors.join("; ")}`);
  for (const client of [marketingSession, commercialSession, editorSession, adminSession, apiB]) await client.dispose();
  console.log(`SELF-TEST EQUIPO/SERVICIOS: ${count} comprobaciones aprobadas`);
} finally { await browser.close(); await sql.end(); }
