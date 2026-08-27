import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const artifacts = path.resolve(".artifacts/us32-agent-config-assistant");
const review = path.resolve(".impeccable/review");
let passed = 0;

function ok(message) {
  passed += 1;
  console.log(`  ✅ ${message}`);
}

function assert(condition, message, detail = "") {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
  ok(message);
}

await Promise.all([
  mkdir(artifacts, { recursive: true }),
  mkdir(review, { recursive: true }),
]);
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  const existingSession = await context.request.post(`${baseURL}/api/auth/sign-in/email`, {
    data: { email: "us32@seomos.test", password: "PruebaUS32!2026" },
  });
  if (existingSession.ok()) {
    ok("el usuario aislado de prueba puede reanudar el guion");
  } else {
    await page.goto(`${baseURL}/register`, { waitUntil: "networkidle" });
    await page.getByLabel("Tu nombre").fill("Prueba US32");
    await page.getByLabel("Correo").fill("us32@seomos.test");
    await page.getByLabel("Contraseña").fill("PruebaUS32!2026");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL(/\/inbox/);
    ok("el primer usuario obtiene una organización aislada de prueba");
  }

  await page.goto(`${baseURL}/agent`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Agente de IA" }).waitFor();
  assert(
    await page.getByRole("button", { name: /Configurar con IA/ }).isEnabled(),
    "el acceso al asistente está habilitado cuando la IA está configurada"
  );

  const profileBefore = await page.evaluate(async () => {
    const response = await fetch("/api/agent/profile");
    return response.json();
  });

  await page.getByRole("button", { name: /Configurar con IA/ }).click();
  await page.getByRole("heading", { name: "Configurar con IA" }).waitFor();
  assert(
    await page.getByText("Nada se guarda ni enciende hasta que tú lo revises.").isVisible(),
    "el asistente explica que la propuesta no se guarda automáticamente"
  );
  assert(
    (await page.evaluate(() => document.activeElement?.id)) === "assistant-website",
    "el diálogo coloca el foco inicial en el primer campo"
  );
  await page.keyboard.press("Shift+Tab");
  assert(
    (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) ===
      "Cerrar asistente",
    "Shift+Tab respeta el orden interno del diálogo"
  );
  await page.keyboard.press("Shift+Tab");
  assert(
    (await page.evaluate(() => document.activeElement?.textContent ?? "")).includes(
      "Crear borrador"
    ),
    "el foco queda atrapado y envuelve hacia la última acción"
  );
  await page.keyboard.press("Tab");
  assert(
    (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) ===
      "Cerrar asistente",
    "Tab envuelve desde la última acción al primer control"
  );

  await page.getByRole("button", { name: "Crear borrador" }).click();
  assert(
    await page.getByRole("alert").getByText(/Agrega el sitio web/).isVisible(),
    "la validación exige sitio o descripción sin iniciar generación"
  );
  await page.waitForFunction(
    () => document.activeElement?.id === "assistant-website"
  );
  assert(
    (await page.evaluate(() => document.activeElement?.id)) === "assistant-website",
    "la validación enfoca el primer campo que permite corregir el error"
  );

  await page.getByLabel(/Sitio web/).fill("http://127.0.0.1/admin");
  await page.getByRole("button", { name: "Crear borrador" }).click();
  await page.getByRole("alert").getByText(/direcciones privadas o locales/).waitFor();
  assert(
    await page.getByRole("button", { name: "Crear borrador" }).isEnabled(),
    "una URL privada se rechaza y el panel abandona el estado de carga"
  );

  await page.getByLabel(/Sitio web/).fill("");
  await page
    .getByLabel("¿Qué ofrece el negocio?")
    .fill("Nova instala paneles solares para hogares en Bogotá y ofrece asesoría personalizada.");
  await page.getByRole("button", { name: /^Vender/ }).click();
  await page
    .getByLabel(/¿Qué nunca debe prometer o hacer?/)
    .fill("No prometer ahorros, precios ni fechas de instalación sin confirmación.");

  await context.request.post(`${baseURL}/api/dev/ai-mock/fail-next`, {
    data: { chat: 3 },
  });
  await page.getByRole("button", { name: "Crear borrador" }).click();
  await page.getByRole("alert").getByText(/no pudo preparar el borrador/i).waitFor();
  assert(
    (await page.getByLabel("¿Qué ofrece el negocio?").inputValue()).includes("Nova instala"),
    "el fallo del proveedor conserva las respuestas para reintentar"
  );
  assert(
    await page.getByRole("button", { name: "Crear borrador" }).isEnabled(),
    "el fallo del proveedor no deja el asistente colgado"
  );

  await page.getByRole("button", { name: "Crear borrador" }).click();
  await page.getByText("Borrador completo", { exact: true }).waitFor();
  // Chromium registra los 422/503 deliberados como errores de recurso. Ya
  // fueron comprobados arriba; desde aquí cualquier error sí es inesperado.
  browserErrors.length = 0;
  const applyButton = page.getByRole("button", { name: "Usar este borrador", exact: true });
  assert(
    await applyButton.isVisible(),
    "la generación exitosa muestra una revisión antes de aplicar"
  );
  assert(
    await page.getByText("Instrucciones preparadas", { exact: true }).isVisible(),
    "la vista previa incluye las instrucciones por sección"
  );
  await page.screenshot({ path: path.join(review, "desktop.png"), fullPage: true });
  await page.screenshot({ path: path.join(artifacts, "preview-desktop.png"), fullPage: true });

  const profileDuringPreview = await page.evaluate(async () => {
    const response = await fetch("/api/agent/profile");
    return response.json();
  });
  assert(
    JSON.stringify(profileDuringPreview.profile) === JSON.stringify(profileBefore.profile),
    "ver la propuesta no modifica el perfil persistido"
  );

  await applyButton.click();
  await page.getByText(/Borrador aplicado/).waitFor();
  await page.waitForFunction(
    () => document.querySelector("#agent-name")?.value === "Asesor IA"
  );
  assert(
    (await page.getByLabel("Nombre del agente").inputValue()) === "Asesor IA",
    "aplicar rellena el nombre del agente"
  );
  assert(
    (
      await page.getByRole("textbox", { name: "Saludo", exact: true }).inputValue()
    ).includes("Nova instala paneles solares"),
    "aplicar rellena el saludo generado"
  );
  assert(
    (await page.getByRole("button", { name: "Cercano", exact: true }).getAttribute("aria-pressed")) === "true" &&
      (await page.getByRole("button", { name: "Consultivo", exact: true }).getAttribute("aria-pressed")) === "true",
    "aplicar selecciona como máximo dos tonos existentes"
  );
  const knowledgeDraft = await page
    .getByPlaceholder("Horarios, direcciones, políticas…")
    .inputValue();
  assert(
    knowledgeDraft.includes("Nova instala") && knowledgeDraft.includes("Confirma con el equipo"),
    "aplicar rellena el conocimiento con hechos y límites de confirmación"
  );

  const profileAfterApply = await page.evaluate(async () => {
    const response = await fetch("/api/agent/profile");
    return response.json();
  });
  assert(
    JSON.stringify(profileAfterApply.profile) === JSON.stringify(profileBefore.profile),
    "aplicar mantiene intacta la configuración persistida"
  );
  assert(
    (await page.getByRole("switch", { name: "Agente encendido" }).isChecked()) === false,
    "el asistente no activa el agente automáticamente"
  );

  await page.getByRole("button", { name: "Guardar comportamiento" }).click();
  await page.getByText("Guardado ✓").waitFor();
  await page.getByRole("button", { name: "Agregar bloque" }).click();
  await page.getByText(/Nova instala paneles solares/).last().waitFor();
  ok("los controles existentes guardan comportamiento y conocimiento por separado");

  await page.reload({ waitUntil: "domcontentloaded" });
  assert(
    (await page.getByLabel("Nombre del agente").inputValue()) === "Asesor IA",
    "el comportamiento guardado sobrevive a la recarga"
  );
  assert(
    (await page.getByText(/Nova instala paneles solares/).count()) >= 1,
    "el conocimiento guardado sobrevive a la recarga"
  );

  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: "domcontentloaded" });
  const noPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  assert(noPageOverflow, "la pantalla del agente no desborda horizontalmente a 375 px");
  await page.getByRole("button", { name: /Configurar con IA/ }).click();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return dialog && getComputedStyle(dialog).transform === "none";
  });
  const noDialogOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  assert(noDialogOverflow, "el asistente móvil no desborda horizontalmente");
  assert(
    await page.getByRole("button", { name: "Crear borrador" }).isVisible(),
    "la acción principal permanece visible en móvil"
  );
  await page.screenshot({ path: path.join(review, "mobile.png"), fullPage: true });
  await page.screenshot({ path: path.join(artifacts, "questions-mobile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Configurar agente con IA" }).waitFor({ state: "detached" });
  assert(
    (await page.evaluate(() => document.activeElement?.textContent ?? "")).includes(
      "Configurar con IA"
    ),
    "Escape cierra el diálogo y devuelve el foco al disparador"
  );

  assert(browserErrors.length === 0, "el flujo no genera errores de navegador", browserErrors.join(" | "));
  console.log(`\n✅ US32 completado: ${passed} comprobaciones`);
} finally {
  await browser.close();
}
