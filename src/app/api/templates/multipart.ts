import { z } from "zod";
import type { TemplateHeaderInput } from "@/server/whatsapp/templates";

/**
 * Las rutas de plantillas aceptan dos formatos: JSON (sin encabezado, el
 * histórico) y multipart/form-data cuando viaja un archivo de encabezado
 * (016). Aquí se normaliza el multipart a los mismos campos del JSON.
 */

export function isMultipart(req: Request): boolean {
  return (req.headers.get("content-type") ?? "").includes("multipart/form-data");
}

const headerKindSchema = z.enum(["image", "document"]);

export type ParsedMultipart<T> =
  | { ok: true; fields: T; header: TemplateHeaderInput | null }
  | { ok: false; message: string };

/**
 * Lee el form-data: los campos escalares se validan con el MISMO esquema Zod
 * del camino JSON; `headerKind` + `headerFile` se convierten en el input del
 * encabezado. `headerFile` sin `headerKind` (o al revés) es inválido.
 */
export async function parseTemplateMultipart<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ParsedMultipart<T>> {
  const form = await req.formData().catch(() => null);
  if (!form) return { ok: false, message: "No se pudo leer el formulario" };

  const scalars: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") scalars[key] = value;
  }
  const parsed = schema.safeParse(scalars);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue ? `${issue.path.join(".")}: ${issue.message}` : "Campos inválidos",
    };
  }

  const rawKind = form.get("headerKind");
  const file = form.get("headerFile");
  if (!rawKind && !file) return { ok: true, fields: parsed.data, header: null };

  const kind = headerKindSchema.safeParse(rawKind);
  if (!kind.success) {
    return { ok: false, message: "Tipo de encabezado inválido" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Adjunta el archivo del encabezado" };
  }
  return {
    ok: true,
    fields: parsed.data,
    header: {
      kind: kind.data,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type || "application/octet-stream",
      filename: file.name || "archivo",
    },
  };
}
