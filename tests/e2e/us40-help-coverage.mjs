import { chromium, request } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Solo localhost con mocks");
const artifacts = path.resolve(".artifacts/us40-help-coverage");
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, timezoneId: "America/Bogota", extraHTTPHeaders: { Origin: baseURL } });
const page = await context.newPage();
const api = context.request;
const password = "Help029-LocalTest!";
const stamp = Date.now();
let passed = 0, helpCalls = 0;
const errors = [], writes = [], questions = [];
page.on("pageerror", (error) => errors.push(error.message));
function assert(ok, message) { if (!ok) throw new Error(message); passed++; console.log(`✅ ${message}`); }
const panel = () => page.getByRole("dialog", { name: "Asistente de ayuda", exact: true });
const tour = () => page.getByRole("dialog", { name: "Guía en pantalla", exact: true });
async function open() { await page.getByRole("button", { name: "Abrir ayuda", exact: true }).click(); await panel().waitFor(); }
async function ask(question) {
  const pending = page.waitForResponse((r) => r.url().endsWith("/api/help/chat") && r.request().method() === "POST");
  await panel().getByLabel("Tu pregunta sobre el CRM").fill(question);
  await panel().getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  const response = await pending; assert(response.ok(), "consulta atendida");
  const body = await response.json();
  await panel().getByText(body.answer, { exact: true }).last().waitFor();
  questions.push({ question, guideId: body.guides[0]?.id, mode: body.mode });
  return body;
}
async function begin() { await panel().getByRole("button", { name: "Guíame en pantalla", exact: true }).last().click(); await tour().waitFor(); }
async function endTour() { await tour().getByRole("button", { name: "Cerrar guía", exact: true }).click(); await tour().waitFor({ state: "detached" }); }
async function highlight(selector) {
  await page.waitForFunction((selector) => {
    const marker = document.querySelector('[data-testid="help-target-highlight"]')?.getBoundingClientRect();
    const target = document.querySelector(selector)?.getBoundingClientRect();
    return marker && target && Math.abs(marker.x - target.x + 3) < 2 && Math.abs(marker.y - target.y + 3) < 2;
  }, selector);
  assert(true, "señala el control real");
}

try {
  assert((await api.post("/api/auth/sign-in/email", { data: { email: "help029@seomos.test", password } })).ok(), "admin de la base aislada inicia sesión");
  const companies = await (await api.get("/api/admin/companies")).json();
  await api.patch(`/api/admin/companies/${companies.ownOrganizationId}/mailing`, { data: { enabled: true } });
  const ownName = `Contacto exportación ${stamp}`, archivedName = `Archivado exportación ${stamp}`, foreignName = `Ajeno no exportar ${stamp}`;
  const phone = `57307${String(stamp).slice(-7)}`;
  const created = await api.post("/api/contacts", { data: { name: ownName, phone, email: "csv@seomos.test", notes: "Nota con coma, y acentos" } });
  assert(created.ok(), "contacto de exportación preparado");
  const active = (await created.json()).contact;
  const archivedResponse = await api.post("/api/contacts", { data: { name: archivedName, phone: `57308${String(stamp).slice(-7)}`, notes: "Archivado de prueba" } });
  assert(archivedResponse.ok(), "contacto para comprobar archivados preparado");
  const archived = (await archivedResponse.json()).contact;
  assert((await api.patch(`/api/contacts/${archived.id}`, { data: { archived: true } })).ok(), "contacto archivado en la base de pruebas");
  const foreignEmail = `csv-foreign-${stamp}@seomos.test`;
  assert((await api.post("/api/admin/companies", { data: { companyName: `CSV ajena ${stamp}`, adminName: "Admin CSV ajeno", adminEmail: foreignEmail, adminPassword: password } })).ok(), "empresa ajena aislada preparada");
  const foreign = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  assert((await foreign.post("/api/auth/sign-in/email", { data: { email: foreignEmail, password } })).ok(), "admin ajeno entra a su empresa");
  assert((await foreign.post("/api/contacts", { data: { name: foreignName, phone: `57306${String(stamp).slice(-7)}` } })).ok(), "contacto ajeno creado para comprobar aislamiento");

  page.on("request", (r) => {
    if (r.url().endsWith("/api/help/chat")) helpCalls++;
    else if (["POST", "PUT", "PATCH", "DELETE"].includes(r.method())) writes.push(r.url());
  });
  await page.goto("/inbox"); await open();
  // El proveedor falla, pero una acción documentada inequívoca no lo necesita.
  await api.post("/api/dev/ai-mock/fail-next", { data: { chat: 3 } });
  const downloadReply = await ask("como descargo mis leads");
  assert(downloadReply.guides[0]?.id === "contacts-export" && downloadReply.notice === null, "primera consulta del dueño encuentra Exportar CSV incluso con proveedor caído");
  assert(downloadReply.answer.includes("archivados") && downloadReply.answer.includes("filtros"), "explica alcance real de la exportación");
  const texts = await panel().getByRole("listitem").allTextContents();
  assert(texts.length >= 6 && texts.every((text) => text.trim().length > 20), "pasos detallados contienen texto visible y copiable");
  const beforeTour = writes.length;
  await begin(); await tour().getByRole("button", { name: "Ir a la pantalla", exact: true }).click();
  await page.waitForURL("**/contacts"); await tour().getByRole("heading", { name: "Pulsa Exportar CSV", exact: true }).waitFor();
  assert(writes.length === beforeTour, "iniciar/navegar guía no descarga ni modifica contactos");
  await page.getByPlaceholder("Buscar por nombre o teléfono…").fill(ownName);
  await page.getByRole("button", { name: `Ver detalles de ${ownName}`, exact: true }).waitFor();
  assert(await page.getByText(archivedName, { exact: true }).count() === 0, "la pantalla está filtrada y el archivado no aparece antes de exportar");
  await highlight('[data-help="contacts-export"]');
  await page.screenshot({ path: path.join(artifacts, "desktop-export-control.png") });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const download = await downloading;
  assert(download.suggestedFilename() === "contactos.csv", "el clic del usuario descarga el archivo real");
  const csvPath = path.join(artifacts, "contactos.csv"); await download.saveAs(csvPath);
  const csv = await readFile(csvPath, "utf8");
  assert(csv.startsWith("\uFEFFnombre,telefono,correo,notas,etapa,archivado"), "CSV con UTF-8 y columnas documentadas");
  assert(csv.includes(ownName) && csv.includes(archivedName) && csv.includes("sí"), "incluye archivados aunque el buscador muestre solo otro contacto");
  assert(!csv.includes(foreignName), "no incluye contactos de otra empresa");
  const foreignCsv = await (await foreign.get("/api/contacts/export")).text();
  assert(foreignCsv.includes(foreignName) && !foreignCsv.includes(ownName), "exportación también aislada en la empresa ajena");
  await endTour(); await open();
  const second = await ask("necesito exportar mis contactos");
  assert(second.guides[0]?.id === "contacts-export" && second.notice === null && !/no esta documentad/i.test(second.answer), "segunda consulta del dueño responde con la función existente");
  await api.post("/api/dev/ai-mock/fail-next", { data: { chat: 0 } });

  await panel().getByRole("button", { name: "Funciones del CRM", exact: true }).click();
  assert(await panel().getByRole("button", { name: "Funciones del CRM", exact: true }).getAttribute("aria-pressed") === "true", "el índice activa su pestaña correctamente");
  await panel().getByRole("textbox", { name: "Buscar funciones del CRM" }).fill("exportar");
  const callsBeforeLibrary = helpCalls;
  await panel().getByRole("button", { name: "Ver guía: Descargar contactos y leads en CSV", exact: true }).click();
  assert(helpCalls === callsBeforeLibrary, "abrir una guía del índice funciona sin llamar al proveedor");
  assert(await panel().getByText(/Resultado esperado:/).last().isVisible(), "incluye requisitos y resultado esperado");
  await panel().getByRole("button", { name: "Funciones del CRM", exact: true }).click();
  await panel().getByRole("combobox", { name: "Filtrar guías por sección" }).selectOption("/agent");
  await panel().getByRole("textbox", { name: "Buscar funciones del CRM" }).fill("seguimiento");
  await panel().getByRole("button", { name: "Ver guía: Configurar el seguimiento automático de prospectos", exact: true }).click();
  await begin(); await tour().getByRole("button", { name: "Ir a la pantalla", exact: true }).click();
  await page.waitForURL("**/agent"); await page.getByTestId("help-target-highlight").waitFor();
  assert(await page.locator('[data-help="agent-followup"]').isVisible(), "guía del índice conduce al seguimiento real del agente");
  await endTour();

  await page.goto("/contacts"); await open();
  await panel().getByRole("button", { name: "Nueva conversación de ayuda" }).click();
  const importReply = await ask("necesito importar contactos con teléfono y correo");
  assert(importReply.guides[0]?.id === "contacts-import", "distingue CSV de Contactos de suscriptores de Mailing");
  await begin(); await highlight('[data-help="contacts-template"]');
  await tour().getByRole("button", { name: "Continuar", exact: true }).click();
  await tour().getByRole("heading", { name: "Elige el CSV que quieres importar", exact: true }).waitFor();
  await highlight('[data-help="contacts-import"]');
  const importName = `Importado guía ${stamp}`;
  const importText = `nombre;telefono;correo;notas\n${importName};57305${String(stamp).slice(-7)};importado@seomos.test;Nota importada\nDuplicado;${phone};;No debe reemplazar el contacto\nInválido;123;;Teléfono demasiado corto`;
  const imported = page.waitForResponse((r) => r.url().endsWith("/api/contacts/import") && r.request().method() === "POST");
  await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({ name: "importar.csv", mimeType: "text/csv", buffer: Buffer.from(importText) });
  const result = await (await imported).json();
  assert(result.created === 1 && result.duplicates === 1 && result.invalid.includes(4), "importación real coincide con la guía: creado, duplicado omitido y línea inválida");
  const contacts = (await (await api.get("/api/contacts?archived=true")).json()).contacts;
  assert(contacts.some((contact) => contact.name === importName && !contact.consentGrantedAt), "el importado existe sin permiso de marketing inventado");
  assert(contacts.find((contact) => contact.id === active.id)?.name === ownName, "importación no actualiza un teléfono existente");
  await endTour();

  await page.setViewportSize({ width: 390, height: 844 }); await open();
  await panel().getByRole("button", { name: "Funciones del CRM", exact: true }).click();
  assert(await panel().evaluate((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }), "índice de funciones cabe completo en móvil");
  await panel().getByRole("textbox", { name: "Buscar funciones del CRM" }).fill("exportar");
  await page.waitForTimeout(200); // Dejar asentarse la transición visual de pestañas antes de la evidencia.
  await page.screenshot({ path: path.join(artifacts, "mobile-function-index.png") });
  await panel().getByRole("button", { name: "Ver guía: Descargar contactos y leads en CSV", exact: true }).click();
  await begin(); await tour().getByRole("heading", { name: "Pulsa Exportar CSV", exact: true }).waitFor();
  await highlight('[data-help="contacts-export"]');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "guía detallada sin desbordamiento horizontal móvil");
  await page.screenshot({ path: path.join(artifacts, "mobile-export-control.png") });
  await endTour();

  const editorEmail = `coverage-editor-${stamp}@seomos.test`;
  assert((await api.post("/api/settings/team", { data: { name: "Editor cobertura", email: editorEmail, password, role: "agent_editor" } })).ok(), "editor preparado con permisos reales");
  const editor = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  await editor.post("/api/auth/sign-in/email", { data: { email: editorEmail, password } });
  const editorContext = await browser.newContext({ baseURL, storageState: await editor.storageState() });
  const editorPage = await editorContext.newPage(); await editorPage.goto("/agent");
  await editorPage.getByRole("button", { name: "Abrir ayuda", exact: true }).click();
  await editorPage.getByRole("button", { name: "Funciones del CRM", exact: true }).click();
  const options = await editorPage.getByRole("combobox", { name: "Filtrar guías por sección" }).locator("option").allTextContents();
  assert(!options.some((item) => /Contactos|Empresas|Mailing|Equipo/.test(item)), "índice del editor no expone rutas de módulos sin acceso");
  await editorPage.getByRole("textbox", { name: "Buscar funciones del CRM" }).fill("exportar");
  assert(await editorPage.getByRole("button", { name: "Ver guía: Descargar contactos y leads en CSV", exact: true }).count() === 0, "editor no recibe guía de exportación no autorizada");
  assert(errors.length === 0, `sin errores de navegador: ${errors.join(" | ")}`);
  await Promise.all([foreign.dispose(), editor.dispose(), editorContext.close()]);
  await writeFile(path.join(artifacts, "result.json"), JSON.stringify({ passed, completedAt: new Date().toISOString(), errors, questions }, null, 2));
  console.log(`RESULTADO: ${passed} comprobaciones verdes`);
} catch (error) { await page.screenshot({ path: path.join(artifacts, "failure.png") }); throw error; }
finally { await context.close(); await browser.close(); }
