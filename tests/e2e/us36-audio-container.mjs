/**
 * Regresión 131053: la nota grabada por Chromium debe llegar al pipeline como
 * un OGG/Opus normalizado por el servidor, no como MP4 fragmentado. Requiere
 * `pnpm dev` con wa-mock, PostgreSQL local en :5433 y ffprobe.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { chromium, request } from "playwright";

const baseURL = "http://localhost:3000";
const repo = new URL("../..", import.meta.url).pathname;
const stamp = Date.now();
const email = `audio-container-${stamp}@test.local`;

function assert(condition, message, detail = "") {
  if (!condition) throw new Error(`${message}${detail ? `: ${detail}` : ""}`);
  console.log(`  ✅ ${message}`);
}

async function waitFor(fn, message) {
  for (let i = 0; i < 40; i += 1) {
    const value = await fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(message);
}

console.log("── Reset de BD y mocks");
execFileSync(
  "psql",
  [
    "-h", "localhost", "-p", "5433", "-U", "postgres", "-d", "vocero", "-q",
    "-c", "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
  ],
  { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: "ignore" }
);
execFileSync("pnpm", ["db:migrate"], { cwd: repo, stdio: "ignore" });

const api = await request.newContext({ baseURL });
try {
  const reset = await api.delete("/api/dev/wa-mock/outbox");
  assert(reset.ok(), "estado del mock reiniciado");
  const signUp = await api.post("/api/auth/sign-up/email", {
    data: { name: "Tester Audio", email, password: "Password123!" },
  });
  assert(signUp.ok(), "sesión de operador creada");
  const configured = await api.put("/api/settings/whatsapp", {
    data: {
      wabaId: "waba_test_1",
      phoneNumberId: "phone_test_1",
      token: "EAAtest-valido",
    },
  });
  assert(configured.ok(), "número mock conectado");

  await fetch(`${baseURL}/api/dev/wa-mock/inbound`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phoneNumberId: "phone_test_1",
      from: "573001234567",
      name: "Cliente Audio",
      type: "text",
      text: "abre la ventana para la prueba de audio",
    }),
  });
  const conversation = await waitFor(async () => {
    const result = await api.get("/api/conversations");
    const data = await result.json();
    return data.conversations?.[0];
  }, "la conversación no llegó");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  try {
    const context = await browser.newContext({
      storageState: await api.storageState(),
      permissions: ["microphone"],
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/inbox?contact=${conversation.contact.id}`);

    await page.getByRole("button", { name: "Grabar nota de voz" }).click();
    await page.getByText(/Grabando nota de voz/).waitFor();
    await page.waitForTimeout(1_600);
    await page.getByRole("button", { name: "Detener grabación" }).first().click();
    await page.getByText("Nota de voz", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Enviar" }).click();

    const audioOut = await waitFor(async () => {
      const response = await fetch(`${baseURL}/api/dev/wa-mock/outbox`);
      const data = await response.json();
      return data.outbox?.find((entry) => entry.type === "audio");
    }, "el audio no llegó al outbox de WhatsApp");
    const mediaId = audioOut.body?.audio?.id;
    assert(typeof mediaId === "string", "el envío usa un media_id");
    assert(
      audioOut.body?.audio?.voice === true,
      "Meta recibe la marca de nota de voz"
    );

    const mediaResponse = await fetch(
      `${baseURL}/api/dev/wa-mock/media/${mediaId}`
    );
    assert(mediaResponse.ok, "el binario subido se puede recuperar");
    assert(
      mediaResponse.headers.get("content-type") === "audio/ogg",
      "Meta recibe MIME canónico audio/ogg",
      mediaResponse.headers.get("content-type") ?? "sin content-type"
    );
    const bytes = Buffer.from(await mediaResponse.arrayBuffer());
    const probe = spawnSync(
      "ffprobe",
      [
        "-v", "error",
        "-show_packets",
        "-show_entries", "format=format_name:stream=codec_name,codec_type:packet=pts_time,duration_time",
        "-of", "json",
        "pipe:0",
      ],
      { input: bytes, encoding: "utf8" }
    );
    assert(probe.status === 0, "ffprobe acepta el contenedor", probe.stderr);
    const metadata = JSON.parse(probe.stdout);
    const audioStream = metadata.streams?.find(
      (stream) => stream.codec_type === "audio"
    );
    assert(audioStream?.codec_name === "opus", "el códec final es Opus");
    assert(
      metadata.format?.format_name?.includes("ogg"),
      "el contenedor final es OGG"
    );
    const packetEnd = Math.max(
      ...(metadata.packets ?? []).map(
        (packet) =>
          Number(packet.pts_time ?? 0) + Number(packet.duration_time ?? 0)
      )
    );
    assert(
      packetEnd >= 1.2,
      "el OGG conserva la duración completa de la grabación",
      String(packetEnd)
    );

    const countBeforeInvalid = (
      await (await fetch(`${baseURL}/api/dev/wa-mock/outbox`)).json()
    ).outbox.filter((entry) => entry.type === "audio").length;
    const invalid = await api.post(
      `/api/conversations/${conversation.id}/messages/attachment`,
      {
        multipart: {
          file: {
            name: "nota-invalida.m4a",
            mimeType: "audio/mp4",
            buffer: Buffer.from("esto no es un mp4"),
          },
          voice: "true",
        },
      }
    );
    assert(
      invalid.status() === 422,
      "una grabación ilegible falla antes de contactar a Meta",
      await invalid.text()
    );
    const countAfterInvalid = (
      await (await fetch(`${baseURL}/api/dev/wa-mock/outbox`)).json()
    ).outbox.filter((entry) => entry.type === "audio").length;
    assert(
      countAfterInvalid === countBeforeInvalid,
      "el camino infeliz no crea un mensaje fantasma"
    );
    await context.close();
  } finally {
    await browser.close();
  }
} finally {
  await api.dispose();
}
