import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const artifacts = path.resolve(".artifacts/us31-public-legal");
let passed = 0;

function ok(message) {
  passed += 1;
  console.log(`  ✅ ${message}`);
}

function assert(condition, message, detail = "") {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
  ok(message);
}

await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  const home = await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  assert(home?.status() === 200, "la página principal responde 200 sin sesión", String(home?.status()));
  await page.getByRole("heading", { name: "Cada conversación, convertida en una oportunidad clara." }).waitFor();
  assert(new URL(page.url()).pathname === "/", "la página principal no redirige al login", page.url());
  assert(
    (await page.getByRole("heading", { name: "Google Calendar se usa únicamente para coordinar reuniones." }).count()) === 1,
    "la landing explica el uso de Google Calendar"
  );
  assert(
    (await page.getByText("Los datos de Google no se venden, no se usan para publicidad ni para entrenar modelos de IA.").count()) === 1,
    "la landing muestra la limitación de uso de datos de Google"
  );
  await page.screenshot({ path: path.join(artifacts, "home-desktop.png"), fullPage: true });

  await page.getByRole("link", { name: "Leer cómo tratamos los datos de Google" }).click();
  await page.getByRole("heading", { name: "Política de privacidad", exact: true }).waitFor();
  assert(new URL(page.url()).pathname === "/privacy", "el enlace de Google abre la política pública", page.url());
  assert(
    (await page.getByRole("heading", { name: "3. Datos de Google Calendar" }).count()) === 1,
    "la política identifica los datos de Google Calendar"
  );
  assert(
    (await page.getByText(/revocar el acceso desde la sección de conexiones de terceros/i).count()) === 1,
    "la política explica revocación y eliminación"
  );

  await page.getByRole("link", { name: "Términos" }).first().click();
  await page.getByRole("heading", { name: "Términos del servicio", exact: true }).waitFor();
  assert(new URL(page.url()).pathname === "/terms", "la navegación abre los términos públicos", page.url());
  assert(
    (await page.getByRole("heading", { name: "7. Integraciones de terceros" }).count()) === 1,
    "los términos explican las integraciones externas"
  );

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Cada conversación, convertida en una oportunidad clara." }).waitFor();
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert(noOverflow, "la landing móvil no tiene desbordamiento horizontal");
  assert((await page.getByRole("link", { name: "Iniciar sesión" }).first().isVisible()), "el acceso al CRM es visible en móvil");
  await page.screenshot({ path: path.join(artifacts, "home-mobile.png"), fullPage: true });

  assert(browserErrors.length === 0, "las páginas públicas no generan errores de navegador", browserErrors.join(" | "));
  // El 404 intencional emite un error de recurso esperado en Chromium; desde
  // aquí validamos el estado HTTP, no la consola de esa navegación negativa.
  browserErrors.length = 0;

  const missing = await page.goto(`${baseURL}/documento-legal-inexistente`, { waitUntil: "domcontentloaded" });
  assert(missing?.status() === 404, "una URL legal inexistente responde 404", String(missing?.status()));
  console.log(`\n✅ US31 completado: ${passed} comprobaciones`);
} finally {
  await browser.close();
}
