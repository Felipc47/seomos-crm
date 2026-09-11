import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WA_MEDIA_MAX_BYTES } from "@/lib/wa-media";

const TRANSCODE_TIMEOUT_MS = 45_000;
const STDERR_LIMIT = 4_000;

/** MP3 se envía como audio estándar: es compatible con Cloud API y clientes
 * móviles sin depender del tratamiento especial de las notas OGG/Opus. */
export const WHATSAPP_AUDIO_CONTENT_TYPE = "audio/mpeg" as const;

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/amr": "amr",
  "audio/ogg": "ogg",
};

export class OutgoingAudioConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutgoingAudioConversionError";
  }
}

/**
 * Convierte una grabación del navegador a MP3 mono y la envía como audio
 * estándar. En producción comprobamos que la misma OGG/Opus se reproducía en
 * el CRM pero el cliente oficial de WhatsApp para iOS la marcaba como no
 * disponible pese a figurar entregada. MP3 evita ese camino especial.
 *
 * Se usan archivos temporales porque un MP4 normal puede necesitar seek para
 * leer su índice. El proceso es local: no sale ningún byte a otro proveedor.
 */
export async function normalizeOutgoingAudio(
  bytes: Uint8Array,
  mime: string
): Promise<{
  bytes: Uint8Array;
  mime: "audio/mpeg";
  contentType: typeof WHATSAPP_AUDIO_CONTENT_TYPE;
  filename: string;
}> {
  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) {
    throw new OutgoingAudioConversionError("Formato de audio no compatible");
  }

  const directory = await mkdtemp(join(tmpdir(), "seomos-audio-"));
  const inputPath = join(directory, `input.${extension}`);
  const outputPath = join(directory, "audio.mp3");

  try {
    await writeFile(inputPath, bytes);
    await runFfmpeg(inputPath, outputPath);
    const output = await readFile(outputPath);
    if (output.byteLength === 0 || output.byteLength > WA_MEDIA_MAX_BYTES) {
      throw new OutgoingAudioConversionError(
        "El audio convertido quedó vacío o superó el límite"
      );
    }
    return {
      bytes: new Uint8Array(
        output.buffer,
        output.byteOffset,
        output.byteLength
      ),
      mime: "audio/mpeg",
      contentType: WHATSAPP_AUDIO_CONTENT_TYPE,
      filename: "audio.mp3",
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
        "44100",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        "-write_xing",
        "1",
        "-id3v2_version",
        "3",
        "-threads",
        "1",
        "-f",
        "mp3",
        outputPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    let stderr = "";
    let settled = false;

    const finish = (error?: OutgoingAudioConversionError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(
        new OutgoingAudioConversionError(
          "La conversión de audio agotó el tiempo"
        )
      );
    }, TRANSCODE_TIMEOUT_MS);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-STDERR_LIMIT);
    });
    child.on("error", () => {
      finish(
        new OutgoingAudioConversionError(
          "El conversor de notas de voz no está disponible"
        )
      );
    });
    child.on("close", (code) => {
      if (code === 0) finish();
      else {
        finish(
          new OutgoingAudioConversionError(
            stderr.trim() || "El archivo de audio no se pudo convertir"
          )
        );
      }
    });
  });
}
