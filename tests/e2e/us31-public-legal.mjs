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
  await page.getByRole("heading", { name: "Convierte cada conversación en una oportunidad que avanza." }).waitFor();
  assert(new URL(page.url()).pathname === "/", "la página principal no redirige al login", page.url());
  assert(
    (await page.title()) === "CRM de WhatsApp con IA | SEOMOS AI CRM",
    "el título SEO identifica producto y categoría",
    await page.title()
  );
  assert(
    (await page.locator('link[rel="canonical"]').getAttribute("href")) === "https://seomos.cloud",
    "la portada declara el dominio canónico"
  );
  assert(
    (await page.locator('meta[property="og:image"]').getAttribute("content")) === "https://seomos.cloud/og.png",
    "la metadata social usa la tarjeta oficial"
  );
  assert(
    (await page.locator('meta[name="twitter:card"]').getAttribute("content")) === "summary_large_image",
    "la vista previa para X usa formato grande"
  );
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert(
    schema["@graph"].some((item) => item["@type"] === "SoftwareApplication" && item.name === "SEOMOS AI CRM"),
    "los datos estructurados describen SEOMOS AI CRM como aplicación"
  );
  assert(
    (await page.locator('link[rel="manifest"]').getAttribute("href")) === "/manifest.webmanifest",
    "la portada publica su manifest"
  );
  assert(
    (await page.getByRole("heading", { name: "Del chat a una reunión confirmada, sin cruces de agenda." }).count()) === 1,
    "la landing explica el uso de Google Calendar"
  );
  assert(
    (await page.getByText("Los datos de Google no se usan para publicidad ni para entrenar modelos.").count()) === 1,
    "la landing muestra la limitación de uso de datos de Google"
  );
  const serviceLink = page.getByRole("link", { name: "Solicitar una demostración" }).first();
  assert(
    (await serviceLink.getAttribute("href")) === "https://www.seomos.com/seomos-ai-crm/",
    "la demostración enlaza la landing de servicio en SEOMOS.com"
  );
  await page.screenshot({ path: path.join(artifacts, "home-desktop.png"), fullPage: true });

  const robots = await context.request.get(`${baseURL}/robots.txt`);
  assert(robots.status() === 200, "robots.txt responde 200", String(robots.status()));
  assert((await robots.text()).includes("Sitemap: https://seomos.cloud/sitemap.xml"), "robots.txt enlaza el sitemap canónico");

  const sitemap = await context.request.get(`${baseURL}/sitemap.xml`);
  assert(sitemap.status() === 200, "sitemap.xml responde 200", String(sitemap.status()));
  assert((await sitemap.text()).includes("https://seomos.cloud/privacy"), "el sitemap incluye las páginas legales públicas");

  await page.getByRole("link", { name: "Cómo tratamos los datos de Google" }).click();
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

  await page.getByRole("link", { name: "Términos del servicio" }).first().click();
  await page.getByRole("heading", { name: "Términos del servicio", exact: true }).waitFor();
  assert(new URL(page.url()).pathname === "/terms", "la navegación abre los términos públicos", page.url());
  assert(
    (await page.getByRole("heading", { name: "7. Integraciones de terceros" }).count()) === 1,
    "los términos explican las integraciones externas"
  );

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Convierte cada conversación en una oportunidad que avanza." }).waitFor();
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert(noOverflow, "la landing móvil no tiene desbordamiento horizontal");
  assert((await page.getByRole("link", { name: "Iniciar sesión" }).first().isVisible()), "el acceso al CRM es visible en móvil");
  await page.screenshot({ path: path.join(artifacts, "home-mobile.png"), fullPage: true });

  await page.evaluate(() => localStorage.setItem("seomos.theme", "dark"));
  await page.reload({ waitUntil: "networkidle" });
  assert(await page.locator("html").evaluate((element) => element.classList.contains("dark")), "la landing respeta el tema oscuro guardado");
  assert(
    await page.getByRole("heading", { name: "Convierte cada conversación en una oportunidad que avanza." }).isVisible(),
    "la propuesta principal permanece visible en tema oscuro"
  );
  await page.evaluate(() => localStorage.removeItem("seomos.theme"));

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
