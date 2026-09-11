/**
 * Self-test de UI: el navegador renderiza una imagen al abrir el hilo, sin
 * interacción, y conserva la reproducción explícita de notas de voz.
 * Requiere `pnpm dev` con wa-mock y Postgres local en :5433.
 */
import { execFileSync } from "node:child_process";
import { chromium, request } from "playwright";

const baseURL = "http://localhost:3000";
const repo = new URL("../..", import.meta.url).pathname;
const stamp = Date.now();
const email = `media-ui-${stamp}@test.local`;
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✅ ${message}`);
}

async function waitFor(fn, message) {
  for (let i = 0; i < 30; i += 1) {
    const value = await fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(message);
}

console.log("── Reset de BD y mocks");
execFileSync("psql", [
  "-h", "localhost", "-p", "5433", "-U", "postgres", "-d", "vocero", "-q",
  "-c", "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
], { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: "ignore" });
execFileSync("pnpm", ["db:migrate"], { cwd: repo, stdio: "ignore" });

const api = await request.newContext({ baseURL });
try {
  const signUp = await api.post("/api/auth/sign-up/email", {
    data: { name: "Tester UI", email, password: "Password123!" },
  });
  assert(signUp.ok(), "sesión de operador creada");
  const configured = await api.put("/api/settings/whatsapp", {
    data: { wabaId: "waba_test_1", phoneNumberId: "phone_test_1", token: "EAAtest-valido" },
  });
  assert(configured.ok(), "número mock conectado");

  const media = await (await fetch(`${baseURL}/api/dev/wa-mock/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ base64: png, mime: "image/png" }),
  })).json();
  await fetch(`${baseURL}/api/dev/wa-mock/inbound`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phoneNumberId: "phone_test_1",
      from: "573001234567",
      name: "Cliente Imagen",
      type: "image",
      mediaId: media.mediaId,
      mediaMime: "image/png",
      text: "imagen de prueba automática",
    }),
  });
  const conversation = await waitFor(async () => {
    const result = await api.get("/api/conversations");
    const data = await result.json();
    return data.conversations?.[0];
  }, "la conversación no llegó");

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: await api.storageState() });
    const page = await context.newPage();
    await page.goto(`${baseURL}/inbox?contact=${conversation.contact.id}`);
    const image = page.getByRole("img", { name: "imagen de prueba automática" });
    await image.waitFor({ state: "visible" });
    const imageState = await waitFor(async () => {
      const state = await image.evaluate((element) => {
          const img = element;
          return {
            complete: img.complete,
            currentSrc: img.currentSrc,
            naturalWidth: img.naturalWidth,
          };
        });
      return state.complete && state.naturalWidth > 0 ? state : null;
    }, "la imagen no terminó de cargar");
    assert(
      imageState.complete && imageState.naturalWidth > 0,
      `la imagen se muestra automáticamente al abrir el hilo (${JSON.stringify(imageState)})`
    );
    assert(
      await page.getByText("Presiona para descargar").count() === 0,
      "la imagen no exige una descarga manual"
    );
    await context.close();
  } finally {
    await browser.close();
  }
} finally {
  await api.dispose();
}
