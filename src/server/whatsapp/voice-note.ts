import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WA_MEDIA_MAX_BYTES } from "@/lib/wa-media";

const TRANSCODE_TIMEOUT_MS = 45_000;
const STDERR_LIMIT = 4_000;

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/amr": "amr",
  "audio/ogg": "ogg",
};

export class VoiceNoteConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceNoteConversionError";
  }
}

/**
 * Convierte una grabación del navegador a OGG/Opus, el formato que WhatsApp
 * exige para enviarla como nota de voz (`audio.voice=true`). Se usan archivos
 * temporales porque un MP4 normal puede necesitar seek para leer su índice.
 * El proceso es local: no sale ningún byte hacia otro proveedor.
 */
export async function normalizeVoiceNote(
  bytes: Uint8Array,
  mime: string
): Promise<{ bytes: Uint8Array; mime: "audio/ogg"; filename: string }> {
  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) {
    throw new VoiceNoteConversionError("Formato de audio no compatible");
  }

  const directory = await mkdtemp(join(tmpdir(), "seomos-voice-"));
  const inputPath = join(directory, `input.${extension}`);
  const outputPath = join(directory, "voice.ogg");

  try {
    await writeFile(inputPath, bytes);
    await runFfmpeg(inputPath, outputPath);
    const output = await readFile(outputPath);
    if (output.byteLength === 0 || output.byteLength > WA_MEDIA_MAX_BYTES) {
      throw new VoiceNoteConversionError(
        "La nota de voz convertida quedó vacía o superó el límite"
      );
    }
    return {
      bytes: new Uint8Array(
        output.buffer,
        output.byteOffset,
        output.byteLength
      ),
      mime: "audio/ogg",
      filename: "nota-de-voz.ogg",
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        inputPath,
        "-map",
        "0:a:0",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "48000",
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        "-vbr",
        "on",
        "-application",
        "voip",
        "-threads",
        "1",
        "-f",
        "ogg",
        outputPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    let stderr = "";
    let settled = false;

    const finish = (error?: VoiceNoteConversionError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new VoiceNoteConversionError("La conversión de audio agotó el tiempo"));
    }, TRANSCODE_TIMEOUT_MS);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-STDERR_LIMIT);
    });
    child.on("error", () => {
      finish(
        new VoiceNoteConversionError(
          "El conversor de notas de voz no está disponible"
        )
      );
    });
    child.on("close", (code) => {
      if (code === 0) finish();
      else {
        finish(
          new VoiceNoteConversionError(
            stderr.trim() || "El archivo de audio no se pudo convertir"
          )
        );
      }
    });
  });
}
