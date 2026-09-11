import { describe, expect, it } from "vitest";
import { classifyWaMedia, normalizeWaMediaMime } from "@/lib/wa-media";

describe("MIME de adjuntos WhatsApp", () => {
  it("normaliza parámetros de códec antes de subir una nota OGG", () => {
    expect(normalizeWaMediaMime("audio/ogg; codecs=opus")).toBe("audio/ogg");
    expect(classifyWaMedia("audio/ogg; codecs=opus")).toEqual({
      kind: "audio",
      maxBytes: 16 * 1024 * 1024,
    });
  });

  it("conserva AAC/MP4 y rechaza un contenedor no compatible", () => {
    expect(normalizeWaMediaMime("audio/mp4; codecs=mp4a.40.2")).toBe(
      "audio/mp4"
    );
    expect(normalizeWaMediaMime("audio/webm; codecs=opus")).toBeNull();
  });
});
