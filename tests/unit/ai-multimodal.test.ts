import { describe, expect, it } from "vitest";
import {
  aiMockCompletion,
  flattenContent,
  hasImage,
} from "@/server/dev/ai-mock";

/**
 * El contenido multimodal (007) es el punto donde una regresión rompería en
 * silencio los turnos de solo texto. Estos tests fijan el contrato del aplanado
 * que usan tanto el mock como, por su forma, el adaptador real.
 */
describe("contenido multimodal (007)", () => {
  it("deja pasar el string de un turno de solo texto", () => {
    expect(flattenContent("hola")).toBe("hola");
  });

  it("une las partes de texto", () => {
    expect(
      flattenContent([
        { type: "text", text: "uno" },
        { type: "text", text: "dos" },
      ])
    ).toBe("uno dos");
  });

  it("decodifica el data URI de una imagen y lo anuncia", () => {
    const payload = "una factura de 250 mil";
    const dataUri = `data:image/jpeg;base64,${Buffer.from(payload).toString("base64")}`;
    const out = flattenContent([
      { type: "text", text: "mira" },
      { type: "image_url", image_url: { url: dataUri } },
    ]);
    expect(out).toContain("mira");
    expect(out).toContain(`[IMAGEN: ${payload}]`);
  });

  it("detecta si un turno lleva imagen", () => {
    expect(hasImage([{ role: "user", content: "texto" }])).toBe(false);
    expect(
      hasImage([
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: "data:...," } }],
        },
      ])
    ).toBe(true);
  });

  it("puede devolver servicio junto con la respuesta multimodal", () => {
    const payload = "captura de una tienda virtual con carrito de compras";
    const dataUri = `data:image/jpeg;base64,${Buffer.from(payload).toString("base64")}`;
    const raw = aiMockCompletion([
      {
        role: "system",
        content:
          "SERVICIOS CONFIGURADOS (allowlist):\n- svc_web: Desarrollo web",
      },
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: dataUri } }],
      },
    ]);
    expect(JSON.parse(raw)).toMatchObject({
      action: "reply",
      serviceId: "svc_web",
    });
  });
});
