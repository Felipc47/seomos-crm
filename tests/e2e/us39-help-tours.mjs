import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Solo localhost con mocks");
const artifacts = path.resolve(".artifacts/us39-help-tours");
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { Origin: baseURL } });
const page = await context.newPage();
const api = context.request;
const password = "Help029-LocalTest!";
const email = "help029@seomos.test";
let passed = 0;
const errors = [];
const sentContexts = [];
const writes = [];
page.on("pageerror", (error) => errors.push(error.message));
function assert(ok, message) { if (!ok) throw new Error(message); passed++; console.log(`✅ ${message}`); }
const help = () => page.getByRole("dialog", { name: "Asistente de ayuda", exact: true });
const tour = () => page.getByRole("dialog", { name: "Guía en pantalla", exact: true });
async function openHelp() { await page.getByRole("button", { name: "Abrir ayuda", exact: true }).click(); await help().waitFor(); }
async function ask(question) {
  const response = page.waitForResponse((r) => r.url().endsWith("/api/help/chat") && r.request().method() === "POST");
  await help().getByLabel("Tu pregunta sobre el CRM").fill(question);
  await help().getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  const reply = await response;
  assert(reply.ok(), "pregunta atendida");
  const body = await reply.json();
  await help().getByText(body.answer, { exact: true }).last().waitFor();
  return body;
}
async function begin() { await help().getByRole("button", { name: "Guíame en pantalla", exact: true }).last().click(); await tour().waitFor(); }
async function rows() { return (await (await api.get("/api/conversations")).json()).conversations; }
async function closeTour() { await tour().getByRole("button", { name: "Cerrar guía", exact: true }).click(); await tour().waitFor({ state: "detached" }); }
async function compareHighlight(selector) {
  await page.waitForFunction((selector) => {
    const marker = document.querySelector('[data-testid="help-target-highlight"]')?.getBoundingClientRect();
    const target = document.querySelector(selector)?.getBoundingClientRect();
    return Boolean(marker && target && Math.abs(marker.x - target.x + 3) < 2 && Math.abs(marker.y - target.y + 3) < 2 && Math.abs(marker.width - target.width - 6) < 2);
  }, selector);
  assert(true, "resaltado sigue al control real");
}

try {
  let login = await api.post("/api/auth/sign-in/email", { data: { email, password } });
  if (!login.ok()) login = await api.post("/api/auth/sign-up/email", { data: { name: "Admin Ayuda", email, password } });
  assert(login.ok(), "sesión local aislada");
  assert((await api.put("/api/settings/whatsapp", { data: { wabaId: "waba_help_guided", phoneNumberId: "phone_help_guided", token: "EAAtest-valido" } })).ok(), "canal usa el mock local");
  await api.put("/api/agent/profile", { data: { enabled: false, name: "Guía Local" } });
  await api.delete("/api/dev/wa-mock/outbox");
  const stamp = Date.now();
  const phones = [String(573100000000 + stamp % 999999), String(573200000000 + stamp % 999999)];
  for (let i = 0; i < phones.length; i++) {
    assert((await api.post("/api/dev/wa-mock/inbound", { data: { phoneNumberId: "phone_help_guided", from: phones[i], name: `Guía Chat ${i + 1}`, text: "Prueba local de ayuda", timestamp: Math.floor(Date.now() / 1000) - 26 * 3600 } })).ok(), "conversación de prueba creada fuera de ventana");
  }
  let seeded;
  for (let i = 0; i < 30; i++) {
    seeded = (await rows()).filter((row) => phones.includes(row.contact.phone));
    if (seeded.length === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert(seeded?.length === 2, "dos chats independientes disponibles");
  const first = seeded.find((row) => row.contact.phone === phones[0]);
  const other = seeded.find((row) => row.contact.phone === phones[1]);
  // Deja acabar el debounce de los entrantes con el agente general apagado.
  // Así el test observa únicamente la acción explícita del operador, sin un
  // handoff por ventana cerrada compitiendo con la guía.
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.AGENT_COALESCE_MS ?? 6000) + 500));
  for (const row of seeded) assert((await api.patch(`/api/conversations/${row.id}`, { data: { reactivate: true } })).ok(), "chat de prueba preparado con permiso de IA, sin agente general activo");
  await api.put("/api/agent/profile", { data: { enabled: true } });
  page.on("request", (request) => {
    if (request.url().endsWith("/api/help/chat")) sentContexts.push(request.postDataJSON());
    else if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push({ url: request.url(), method: request.method() });
  });

  await page.goto("/inbox"); await openHelp();
  const firstReply = await ask("comp uedo inactivar la ia en un chat especifico");
  assert(firstReply.guides[0]?.id === "pause-agent" && firstReply.answer.includes("Primero abre el chat"), "reconoce la duda de la captura y detecta que falta seleccionar");
  assert(await help().getByRole("listitem").count() === 0, "respuesta compacta sin repetir una lista larga");
  const writesBefore = writes.length;
  await begin();
  await tour().getByRole("heading", { name: "Abre el chat que quieres atender" }).waitFor();
  assert(writes.length === writesBefore, "iniciar guía no modifica datos ni pulsa controles");
  await page.getByTestId(`inbox-conversation-${first.id}`).getByRole("button").first().click();
  await tour().getByRole("heading", { name: "Apaga este interruptor" }).waitFor();
  await compareHighlight('[data-help="chat-ai"] [role="switch"]');
  await page.screenshot({ path: path.join(artifacts, "desktop-pause-control.png") });
  await tour().getByRole("button", { name: "Tengo una duda" }).click();
  assert(await help().getByRole("button", { name: "Retomar guía" }).isVisible(), "puede preguntar sin perder su progreso");
  await help().getByRole("button", { name: "Retomar guía" }).click();
  assert(await tour().getByText("Paso 2 de 2", { exact: true }).isVisible(), "retoma el paso pendiente");

  // Control ausente: no hay un botón Continuar ni una confirmación inventada.
  await page.locator('[data-help="chat-ai"]').evaluate((element) => element.removeAttribute("data-help"));
  await tour().getByText(/Todavía no veo este control/).waitFor();
  assert(await tour().getByRole("button", { name: "Continuar", exact: true }).count() === 0, "control ausente no permite completar un paso ficticio");
  await page.getByTestId("chat-ai-control").evaluate((element) => element.setAttribute("data-help", "chat-ai"));
  await page.getByTestId("help-target-highlight").waitFor();

  const pauseResponse = page.waitForResponse((r) => r.url().endsWith(`/api/conversations/${first.id}`) && r.request().method() === "PATCH");
  await page.getByRole("switch", { name: "IA en esta conversación", exact: true }).click();
  assert((await pauseResponse).ok(), "el usuario pausa usando el control real del CRM");
  await tour().getByRole("heading", { name: "Estado comprobado" }).waitFor();
  const after = await rows();
  assert(after.find((row) => row.id === first.id)?.aiEnabled === false, "pausa guardada en el chat elegido");
  assert(after.find((row) => row.id === other.id)?.aiEnabled === true, "los demás chats conservan IA activa");
  await page.screenshot({ path: path.join(artifacts, "desktop-paused-confirmed.png") });
  await closeTour(); await openHelp();
  const already = await ask("desactivar ia de esta conversacion");
  assert(already.answer.includes("ya muestra IA pausada"), "no pide apagar un chat que ya está pausado");
  const writesPaused = writes.length;
  await begin(); await tour().getByRole("heading", { name: "Estado comprobado" }).waitFor();
  assert(writes.length === writesPaused, "estado ya satisfecho se reconoce sin nuevos cambios");
  await closeTour();

  await page.goto("/settings/profile"); await openHelp();
  await help().getByRole("button", { name: "Nueva conversación de ayuda" }).click();
  await ask("pausar ia de un chat"); await begin();
  assert(await tour().getByRole("heading", { name: "Vamos a la pantalla correcta" }).isVisible(), "guía detecta que está en otra sección");
  await tour().getByRole("button", { name: "Ir a la pantalla", exact: true }).click();
  await page.waitForURL("**/inbox");
  await tour().getByRole("heading", { name: "Abre el chat que quieres atender" }).waitFor();
  await closeTour(); await openHelp();
  assert(await help().getByText("pausar ia de un chat", { exact: true }).isVisible(), "navegar conserva la conversación de ayuda");
  await help().getByRole("button", { name: "Nueva conversación de ayuda" }).click();
  await ask("¿Cómo cambio los datos de mi perfil?"); await begin();
  await tour().getByRole("button", { name: "Ir a la pantalla", exact: true }).click();
  await page.waitForURL("**/settings/profile");
  await tour().getByRole("heading", { name: "Cambia tu nombre" }).waitFor();
  await tour().getByRole("button", { name: "Continuar", exact: true }).click();
  await tour().getByRole("heading", { name: "Elige tu foto" }).waitFor();
  await compareHighlight('[data-help="profile-photo"]');
  await page.screenshot({ path: path.join(artifacts, "desktop-profile-control.png") });
  await page.keyboard.press("Escape"); await tour().waitFor({ state: "detached" });
  assert(await page.getByRole("button", { name: "Abrir ayuda", exact: true }).evaluate((element) => document.activeElement === element), "Escape termina guía y devuelve foco");

  // Móvil: el switch sigue accesible mientras el coach está abierto.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inbox"); await openHelp();
  await help().getByRole("button", { name: "Nueva conversación de ayuda" }).click();
  await ask("pausar la ia de este chat"); await begin();
  await page.getByTestId(`inbox-conversation-${other.id}`).getByRole("button").first().click();
  await tour().getByRole("heading", { name: "Apaga este interruptor" }).waitFor();
  await compareHighlight('[data-help="chat-ai"] [role="switch"]');
  assert(await tour().evaluate((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }), "coach completo dentro de móvil");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "móvil sin desbordamiento horizontal");
  const switchBox = await page.getByRole("switch", { name: "IA en esta conversación", exact: true }).boundingBox();
  const coachBox = await tour().boundingBox();
  assert(switchBox.y + switchBox.height < coachBox.y, "coach deja visible y pulsable el interruptor móvil");
  await page.screenshot({ path: path.join(artifacts, "mobile-pause-control.png") });
  await closeTour();

  await api.put("/api/agent/profile", { data: { enabled: false } });
  await page.reload(); await page.getByTestId(`inbox-conversation-${other.id}`).getByRole("button").first().click();
  await page.locator('[data-help="inbox"][data-help-ai="unavailable"]').waitFor();
  await openHelp();
  const unavailable = await ask("reactivar la ia en esta conversacion");
  assert(unavailable.answer.includes("interruptor está deshabilitado"), "explica IA no disponible sin pedir un clic imposible");
  await begin(); await tour().getByRole("heading", { name: "La IA no está disponible" }).waitFor();
  assert(await tour().getByRole("button", { name: "Terminar guía" }).isEnabled(), "camino infeliz no deja al usuario atrapado");
  await page.screenshot({ path: path.join(artifacts, "mobile-unavailable.png") });
  await closeTour();
  assert(sentContexts.every((data) => !JSON.stringify(data.context ?? {}).includes("Guía Chat") && !phones.some((phone) => JSON.stringify(data.context ?? {}).includes(phone))), "contexto de ayuda no incluye nombres ni teléfonos");
  assert(sentContexts.some((data) => data.context?.conversation === "selected" && data.context.ai === "paused"), "consulta incluye solo el estado enumerado útil");
  const outbox = await (await api.get("/api/dev/wa-mock/outbox")).json();
  assert((outbox.outbox ?? outbox.messages ?? []).length === 0, "recorridos no generan envíos WhatsApp");
  assert(errors.length === 0, `sin errores de navegador: ${errors.join(" | ")}`);
  await writeFile(path.join(artifacts, "result.json"), JSON.stringify({ passed, completedAt: new Date().toISOString(), errors, contexts: sentContexts.map((data) => data.context) }, null, 2));
  console.log(`RESULTADO: ${passed} comprobaciones verdes`);
} catch (error) {
  await page.screenshot({ path: path.join(artifacts, "failure.png") });
  console.log(JSON.stringify(await page.evaluate(() => {
    const marker = document.querySelector('[data-testid="help-target-highlight"]');
    const target = document.querySelector('[data-help="chat-ai"]');
    return { marker: marker?.getBoundingClientRect().toJSON(), target: target?.getBoundingClientRect().toJSON(), style: marker?.getAttribute("style"), tour: document.querySelector('[data-testid="help-tour"]')?.innerText };
  })));
  throw error;
} finally { await context.close(); await browser.close(); }
