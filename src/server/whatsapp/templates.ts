import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import {
  graphCreateUploadSession,
  graphRequest,
  graphUpload,
  graphUploadToSession,
  MetaApiError,
  normalizeRecipient,
} from "@/lib/meta/client";
import { formatBytes, WA_MEDIA_MAX_BYTES } from "@/lib/wa-media";
import {
  exampleValues,
  parseStoredVariables,
  resolveTemplateVariables,
  validateTemplateVariables,
  type TemplateVariable,
} from "@/server/whatsapp/template-vars";
import { scoped } from "@/lib/db/tenant";
import { publish } from "@/server/events/bus";
import {
  getCredentialsByOrg,
  getCredentialsByWabaId,
  markReconnectRequired,
} from "@/server/whatsapp/credentials";
import { callGraphSend, SendError } from "@/server/inbox/send";
import { getLeadgenSettings, saveLeadgenSettings } from "@/server/org-settings";
import { serializeMessage } from "@/server/inbox/ingest";
import type { WebhookValue } from "@/server/inbox/webhook";

/** Errores tipados del servicio de plantillas → HTTP en la capa de API. */
export class TemplateError extends Error {
  code:
    | "not_connected"
    | "reconnect_required"
    | "invalid"
    | "not_found"
    | "meta_error"
    | "meta_unavailable";

  constructor(code: TemplateError["code"], message: string) {
    super(message);
    this.name = "TemplateError";
    this.code = code;
  }
}

const TEMPLATE_ERROR_STATUS: Record<TemplateError["code"], number> = {
  not_connected: 409,
  reconnect_required: 409,
  invalid: 422,
  not_found: 404,
  meta_error: 422,
  meta_unavailable: 503,
};

export function templateErrorStatus(err: TemplateError): number {
  return TEMPLATE_ERROR_STATUS[err.code];
}

const VARIABLE_REGEX = /\{\{\s*(\d+)\s*\}\}/g;

/** Cuenta variables {{n}} y valida el acotamiento v1: máximo UNA y debe ser {{1}}. */
export function countVariables(body: string): number {
  const matches = [...body.matchAll(VARIABLE_REGEX)];
  return matches.length;
}

export function validateBodyVariables(body: string): string | null {
  const matches = [...body.matchAll(VARIABLE_REGEX)];
  if (matches.length > 1) {
    return "v1 admite una sola variable {{1}} en el cuerpo";
  }
  if (matches.length === 1 && matches[0]![1] !== "1") {
    return "La variable debe ser {{1}}";
  }
  return null;
}

/** Sustituye variables: string único (legacy, todas iguales) o array
 * posicional ({{n}} → values[n-1], del mapeo 018). */
export function renderBody(body: string, variable?: string | string[]): string {
  if (Array.isArray(variable)) {
    return body.replace(VARIABLE_REGEX, (_, n) => variable[Number(n) - 1] ?? "");
  }
  return body.replace(VARIABLE_REGEX, variable ?? "");
}

type TemplateRow = typeof schema.template.$inferSelect;

export function serializeTemplate(t: TemplateRow) {
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    body: t.body,
    status: t.status,
    rejectionReason: t.rejectionReason,
    headerKind: t.headerKind,
    headerFilename: t.headerFilename,
    variables: parseStoredVariables(t.variables),
  };
}

/* ============================================================
 * Encabezado multimedia (016): imagen o documento en la plantilla
 * ============================================================ */

export type TemplateHeaderInput = {
  kind: "image" | "document";
  bytes: Uint8Array;
  mime: string;
  filename: string;
};

/** Formatos y topes que Meta acepta en el HEADER de una plantilla (v1:
 * imagen JPG/PNG ≤5 MB; documento solo PDF, tope operativo 16 MB). */
const HEADER_RULES: Record<
  TemplateHeaderInput["kind"],
  { mimes: string[]; maxBytes: number; label: string }
> = {
  image: {
    mimes: ["image/jpeg", "image/png"],
    maxBytes: 5 * 1024 * 1024,
    label: "una imagen JPG o PNG",
  },
  document: {
    mimes: ["application/pdf"],
    maxBytes: WA_MEDIA_MAX_BYTES,
    label: "un documento PDF",
  },
};

/** Valida el archivo del encabezado; null = válido. */
export function validateTemplateHeader(
  header: Pick<TemplateHeaderInput, "kind" | "mime"> & { size: number }
): string | null {
  const rule = HEADER_RULES[header.kind];
  const mime = header.mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!rule.mimes.includes(mime)) {
    return `El encabezado de ${header.kind === "image" ? "imagen" : "documento"} debe ser ${rule.label}`;
  }
  if (header.size <= 0) return "El archivo está vacío";
  if (header.size > rule.maxBytes) {
    return `El archivo supera el máximo permitido (${formatBytes(rule.maxBytes)})`;
  }
  return null;
}

/** El media_id de Meta caduca a los ~30 días; se renueva con margen. */
const HEADER_MEDIA_TTL_MS = 25 * 24 * 60 * 60 * 1000;

/** Bytes del encabezado guardados en `template_media` (fuente de verdad). */
async function loadHeaderBytes(templateId: string): Promise<Uint8Array> {
  const rows = await getDb()
    .select({ bytes: schema.templateMedia.bytes })
    .from(schema.templateMedia)
    .where(eq(schema.templateMedia.templateId, templateId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new TemplateError(
      "invalid",
      "La plantilla tiene encabezado pero el archivo no está guardado; edítala y vuelve a subirlo"
    );
  }
  return new Uint8Array(row.bytes);
}

/** Guarda (o reemplaza) el binario del encabezado. */
async function saveHeaderBytes(
  organizationId: string,
  templateId: string,
  bytes: Uint8Array
): Promise<void> {
  await getDb()
    .insert(schema.templateMedia)
    .values({
      templateId,
      organizationId,
      bytes: Buffer.from(bytes),
    })
    .onConflictDoUpdate({
      target: schema.templateMedia.templateId,
      set: { bytes: Buffer.from(bytes), updatedAt: new Date() },
    });
}

/** Sube el ejemplo a la Resumable Upload API → header_handle para el alta. */
async function uploadHeaderExample(
  organizationId: string,
  creds: NonNullable<Awaited<ReturnType<typeof getCredentialsByOrg>>>,
  header: { bytes: Uint8Array; mime: string; filename: string }
): Promise<string> {
  try {
    const sessionId = await graphCreateUploadSession(creds.token, {
      length: header.bytes.byteLength,
      type: header.mime,
      name: header.filename,
    });
    return await graphUploadToSession(creds.token, sessionId, header.bytes);
  } catch (err) {
    await toTemplateError(organizationId, err);
    throw err; // inalcanzable
  }
}

/** Componente HEADER del alta/edición en Meta. */
function headerComponent(
  kind: "image" | "document",
  handle: string
): Record<string, unknown> {
  return {
    type: "HEADER",
    format: kind.toUpperCase(),
    example: { header_handle: [handle] },
  };
}

/**
 * Garantiza un media_id vigente para ENVIAR el encabezado: reusa el actual
 * si tiene menos de 25 días; si no, re-sube los bytes guardados. Una campaña
 * entera reutiliza así UN solo media_id.
 */
async function ensureHeaderMediaId(
  organizationId: string,
  creds: NonNullable<Awaited<ReturnType<typeof getCredentialsByOrg>>>,
  template: TemplateRow
): Promise<string> {
  const fresh =
    template.headerMediaId &&
    template.headerMediaUploadedAt &&
    Date.now() - template.headerMediaUploadedAt.getTime() < HEADER_MEDIA_TTL_MS;
  if (fresh) return template.headerMediaId!;

  const bytes = await loadHeaderBytes(template.id);
  const form = new FormData();
  form.set("messaging_product", "whatsapp");
  form.set("type", template.headerMime ?? "application/octet-stream");
  form.set(
    "file",
    new Blob([bytes as BlobPart], {
      type: template.headerMime ?? "application/octet-stream",
    }),
    template.headerFilename ?? "archivo"
  );
  let mediaId: string;
  try {
    const uploaded = await graphUpload<{ id?: string }>(
      `${creds.phoneNumberId}/media`,
      { token: creds.token, form }
    );
    if (!uploaded.id) {
      throw new TemplateError("meta_error", "Meta no devolvió ID del archivo");
    }
    mediaId = uploaded.id;
  } catch (err) {
    if (err instanceof TemplateError) throw err;
    await toTemplateError(organizationId, err);
    throw err; // inalcanzable
  }

  await getDb()
    .update(schema.template)
    .set({
      headerMediaId: mediaId,
      headerMediaUploadedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.template.id, template.id));
  return mediaId;
}

/**
 * Crea la plantilla. Camino normal (admin): se manda a aprobación de Meta
 * (FR-050). Con `requiresApproval` (comercial): queda LOCAL en
 * `awaiting_approval` — jamás toca Meta hasta que un admin la apruebe.
 */
export async function createTemplate(
  organizationId: string,
  input: {
    name: string;
    language: string;
    category: string;
    body: string;
    header?: TemplateHeaderInput | null;
    /** Mapeo de variables (018); null/vacío = plantilla legacy. */
    variables?: TemplateVariable[] | null;
  },
  opts: { requiresApproval?: boolean; requestedById?: string | null } = {}
): Promise<TemplateRow> {
  const mapping =
    input.variables && input.variables.length > 0 ? input.variables : null;
  const variableError = validateTemplateVariables(input.body, mapping);
  if (variableError) throw new TemplateError("invalid", variableError);
  if (input.header) {
    const headerError = validateTemplateHeader({
      kind: input.header.kind,
      mime: input.header.mime,
      size: input.header.bytes.byteLength,
    });
    if (headerError) throw new TemplateError("invalid", headerError);
  }

  const name = input.name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (!name) throw new TemplateError("invalid", "Nombre de plantilla inválido");

  let waTemplateId: string | null = null;
  if (!opts.requiresApproval) {
    const creds = await requireConnectedCredentials(organizationId);
    // El ejemplo del encabezado viaja ANTES del alta: Meta lo exige en el
    // componente HEADER como header_handle.
    const headerHandle = input.header
      ? await uploadHeaderExample(organizationId, creds, input.header)
      : null;
    waTemplateId = await pushCreateToMeta(organizationId, creds, {
      name,
      language: input.language,
      category: input.category,
      body: input.body,
      examples: bodyExamples(input.body, mapping),
      ...(input.header && headerHandle
        ? { header: { kind: input.header.kind, handle: headerHandle } }
        : {}),
    });
  }

  const status = opts.requiresApproval ? "awaiting_approval" : "pending";
  const db = getDb();
  const inserted = await db
    .insert(schema.template)
    .values({
      id: newId("template"),
      organizationId,
      name,
      language: input.language,
      category: input.category,
      body: input.body,
      status,
      requestedById: opts.requestedById ?? null,
      waTemplateId,
      headerKind: input.header?.kind ?? null,
      headerFilename: input.header?.filename ?? null,
      headerMime: input.header?.mime ?? null,
      variables: mapping,
    })
    .onConflictDoUpdate({
      target: [
        schema.template.organizationId,
        schema.template.name,
        schema.template.language,
      ],
      set: {
        category: input.category,
        body: input.body,
        status,
        rejectionReason: null,
        requestedById: opts.requestedById ?? null,
        ...(waTemplateId ? { waTemplateId } : {}),
        headerKind: input.header?.kind ?? null,
        headerFilename: input.header?.filename ?? null,
        headerMime: input.header?.mime ?? null,
        // Archivo nuevo (o sin encabezado): el media de envío anterior ya no vale.
        headerMediaId: null,
        headerMediaUploadedAt: null,
        variables: mapping,
        updatedAt: new Date(),
      },
    })
    .returning();
  const row = inserted[0]!;

  if (input.header) {
    await saveHeaderBytes(organizationId, row.id, input.header.bytes);
  } else {
    // Re-creación sin encabezado sobre un nombre reutilizado: limpiar restos.
    await db
      .delete(schema.templateMedia)
      .where(eq(schema.templateMedia.templateId, row.id));
  }
  return row;
}

async function requireConnectedCredentials(organizationId: string) {
  const creds = await getCredentialsByOrg(organizationId);
  if (!creds) {
    throw new TemplateError("not_connected", "Conecta tu número de WhatsApp primero");
  }
  if (creds.status === "reconnect_required") {
    throw new TemplateError("reconnect_required", "Reconecta tu número antes de continuar");
  }
  return creds;
}

/** Alta real en Meta (`POST {waba}/message_templates`) → id remoto. */
async function pushCreateToMeta(
  organizationId: string,
  creds: NonNullable<Awaited<ReturnType<typeof getCredentialsByOrg>>>,
  tpl: {
    name: string;
    language: string;
    category: string;
    body: string;
    header?: { kind: "image" | "document"; handle: string };
    /** Un valor de ejemplo por variable (Meta lo exige en la revisión). */
    examples?: string[];
  }
): Promise<string | null> {
  try {
    const res = await graphRequest<{ id?: string; status?: string }>(
      `${creds.wabaId}/message_templates`,
      {
        method: "POST",
        token: creds.token,
        body: {
          name: tpl.name,
          language: tpl.language,
          category: tpl.category,
          components: [
            ...(tpl.header
              ? [headerComponent(tpl.header.kind, tpl.header.handle)]
              : []),
            {
              type: "BODY",
              text: tpl.body,
              ...(tpl.examples && tpl.examples.length > 0
                ? { example: { body_text: [tpl.examples] } }
                : {}),
            },
          ],
        },
      }
    );
    return res.id ?? null;
  } catch (err) {
    await toTemplateError(organizationId, err);
    return null; // inalcanzable: toTemplateError siempre lanza
  }
}

/** Ejemplos de `body_text` para el alta/edición: del mapeo si existe; una
 * plantilla legacy con {{1}} conserva el "ejemplo" genérico. */
function bodyExamples(
  body: string,
  mapping: TemplateVariable[] | null
): string[] {
  if (mapping && mapping.length > 0) return exampleValues(mapping);
  return countVariables(body) >= 1 ? ["ejemplo"] : [];
}

/** Localiza una plantilla de la organización o lanza `not_found`. */
async function requireTemplate(
  organizationId: string,
  templateId: string
): Promise<TemplateRow> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.template)
    .where(
      scoped(
        schema.template.organizationId,
        organizationId,
        eq(schema.template.id, templateId)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new TemplateError("not_found", "Plantilla no encontrada");
  return row;
}

/** Traduce un fallo de Graph a TemplateError conservando la semántica. */
async function toTemplateError(
  organizationId: string,
  err: unknown
): Promise<never> {
  if (err instanceof MetaApiError) {
    if (err.isAuthError) {
      await markReconnectRequired(organizationId);
      throw new TemplateError(
        "reconnect_required",
        "El token expiró: reconecta el número"
      );
    }
    if (err.status === 0 || err.status >= 500) {
      throw new TemplateError("meta_unavailable", "Meta no está disponible ahora");
    }
    throw new TemplateError("meta_error", err.message);
  }
  throw err;
}

/**
 * Elimina la plantilla en Meta y localmente. Si Meta ya no la tiene (404 /
 * "does not exist") se limpia igual el registro local: el objetivo del
 * operador es que desaparezca del CRM, y dejar una fila huérfana lo bloquearía
 * para siempre. Limpia además la referencia del saludo global (guardado en
 * metadata, sin FK); la de los servicios cae por `ON DELETE SET NULL`.
 */
export async function deleteTemplate(
  organizationId: string,
  templateId: string
): Promise<void> {
  const template = await requireTemplate(organizationId, templateId);
  const creds = await getCredentialsByOrg(organizationId);

  if (creds && creds.status !== "reconnect_required") {
    // Con hsm_id se borra SOLO esta versión de idioma; sin él, Meta borraría
    // todos los idiomas que compartan el nombre.
    const query = new URLSearchParams({ name: template.name });
    if (template.waTemplateId) query.set("hsm_id", template.waTemplateId);
    try {
      await graphRequest(
        `${creds.wabaId}/message_templates?${query.toString()}`,
        { method: "DELETE", token: creds.token }
      );
    } catch (err) {
      const missing =
        err instanceof MetaApiError &&
        (err.status === 404 || /does not exist|not found/i.test(err.message));
      if (!missing) await toTemplateError(organizationId, err);
    }
  }

  const db = getDb();
  await db.delete(schema.template).where(eq(schema.template.id, template.id));

  const settings = await getLeadgenSettings(organizationId);
  if (settings.greetingTemplateId === template.id) {
    await saveLeadgenSettings(organizationId, { greetingTemplateId: null });
  }
}

/**
 * Edita el cuerpo/categoría en Meta. Meta NO permite cambiar nombre ni idioma
 * (para eso hay que borrar y recrear) y devuelve la plantilla a revisión, así
 * que el estado local vuelve a `pending`.
 */
export async function updateTemplate(
  organizationId: string,
  templateId: string,
  input: {
    body: string;
    category: string;
    /** Reemplazo del archivo del encabezado (mismo tipo que el actual). */
    headerFile?: Omit<TemplateHeaderInput, "kind"> | null;
    /** Mapeo de variables (018). `undefined` = conservar el guardado. */
    variables?: TemplateVariable[] | null;
  },
  opts: { requiresApproval?: boolean; requestedById?: string | null } = {}
): Promise<TemplateRow> {
  const template = await requireTemplate(organizationId, templateId);

  const mapping =
    input.variables === undefined
      ? parseStoredVariables(template.variables)
      : input.variables && input.variables.length > 0
        ? input.variables
        : null;
  const variableError = validateTemplateVariables(input.body, mapping);
  if (variableError) throw new TemplateError("invalid", variableError);

  const db = getDb();

  if (input.headerFile) {
    if (!template.headerKind) {
      throw new TemplateError(
        "invalid",
        "Esta plantilla no tiene encabezado; para agregar uno, elimínala y créala de nuevo"
      );
    }
    const headerError = validateTemplateHeader({
      kind: template.headerKind,
      mime: input.headerFile.mime,
      size: input.headerFile.bytes.byteLength,
    });
    if (headerError) throw new TemplateError("invalid", headerError);
  }

  /** El archivo nuevo invalida el media de envío vigente. */
  const headerFileSet = input.headerFile
    ? {
        headerFilename: input.headerFile.filename,
        headerMime: input.headerFile.mime,
        headerMediaId: null,
        headerMediaUploadedAt: null,
      }
    : {};

  // Comercial: el cambio queda local esperando el visto bueno del admin.
  if (opts.requiresApproval) {
    const updated = await db
      .update(schema.template)
      .set({
        body: input.body,
        category: input.category,
        status: "awaiting_approval",
        rejectionReason: null,
        requestedById: opts.requestedById ?? null,
        variables: mapping,
        ...headerFileSet,
        updatedAt: new Date(),
      })
      .where(eq(schema.template.id, template.id))
      .returning();
    if (input.headerFile) {
      await saveHeaderBytes(organizationId, template.id, input.headerFile.bytes);
    }
    return updated[0]!;
  }

  const creds = await requireConnectedCredentials(organizationId);

  // Con encabezado, el push a Meta SIEMPRE re-incluye el componente HEADER
  // (la edición reemplaza todos los componentes): handle fresco del archivo
  // nuevo o del guardado.
  let header: { kind: "image" | "document"; handle: string } | undefined;
  if (template.headerKind) {
    const bytes = input.headerFile?.bytes ?? (await loadHeaderBytes(template.id));
    const handle = await uploadHeaderExample(organizationId, creds, {
      bytes,
      mime: input.headerFile?.mime ?? template.headerMime ?? "application/octet-stream",
      filename: input.headerFile?.filename ?? template.headerFilename ?? "archivo",
    });
    header = { kind: template.headerKind, handle };
  }

  const examples = bodyExamples(input.body, mapping);
  if (template.waTemplateId) {
    await pushEditToMeta(organizationId, creds, template.waTemplateId, {
      body: input.body,
      category: input.category,
      header,
      examples,
    });
  } else {
    // Nunca llegó a Meta (nació esperando aprobación): se crea allá ahora.
    const waTemplateId = await pushCreateToMeta(organizationId, creds, {
      name: template.name,
      language: template.language,
      category: input.category,
      body: input.body,
      header,
      examples,
    });
    await db
      .update(schema.template)
      .set({ waTemplateId })
      .where(eq(schema.template.id, template.id));
  }

  const updated = await db
    .update(schema.template)
    .set({
      body: input.body,
      category: input.category,
      status: "pending",
      rejectionReason: null,
      variables: mapping,
      ...headerFileSet,
      updatedAt: new Date(),
    })
    .where(eq(schema.template.id, template.id))
    .returning();
  if (input.headerFile) {
    await saveHeaderBytes(organizationId, template.id, input.headerFile.bytes);
  }
  return updated[0]!;
}

/** Edición real en Meta (`POST {template_id}`); vuelve a revisión allá. */
async function pushEditToMeta(
  organizationId: string,
  creds: NonNullable<Awaited<ReturnType<typeof getCredentialsByOrg>>>,
  waTemplateId: string,
  input: {
    body: string;
    category: string;
    header?: { kind: "image" | "document"; handle: string };
    examples?: string[];
  }
): Promise<void> {
  try {
    await graphRequest(`${waTemplateId}`, {
      method: "POST",
      token: creds.token,
      body: {
        category: input.category,
        // Meta REEMPLAZA todos los componentes al editar: si la plantilla
        // tiene encabezado hay que volver a mandarlo con un handle vigente.
        components: [
          ...(input.header
            ? [headerComponent(input.header.kind, input.header.handle)]
            : []),
          {
            type: "BODY",
            text: input.body,
            ...(input.examples && input.examples.length > 0
              ? { example: { body_text: [input.examples] } }
              : {}),
          },
        ],
      },
    });
  } catch (err) {
    await toTemplateError(organizationId, err);
  }
}

/**
 * Aprobación interna: un admin (o el superadmin) da el visto bueno a una
 * plantilla `awaiting_approval` y AHÍ recién viaja a Meta (alta o edición
 * según tenga o no id remoto). Devuelve la fila ya `pending` de Meta.
 */
export async function submitTemplate(
  organizationId: string,
  templateId: string
): Promise<TemplateRow> {
  const template = await requireTemplate(organizationId, templateId);
  if (template.status !== "awaiting_approval") {
    throw new TemplateError("invalid", "La plantilla no está pendiente de aprobación");
  }
  const creds = await requireConnectedCredentials(organizationId);

  // El encabezado guardado localmente viaja a Meta recién ahora (016).
  let header: { kind: "image" | "document"; handle: string } | undefined;
  if (template.headerKind) {
    const bytes = await loadHeaderBytes(template.id);
    const handle = await uploadHeaderExample(organizationId, creds, {
      bytes,
      mime: template.headerMime ?? "application/octet-stream",
      filename: template.headerFilename ?? "archivo",
    });
    header = { kind: template.headerKind, handle };
  }

  const db = getDb();
  const examples = bodyExamples(
    template.body,
    parseStoredVariables(template.variables)
  );
  let waTemplateId = template.waTemplateId;
  if (waTemplateId) {
    await pushEditToMeta(organizationId, creds, waTemplateId, {
      body: template.body,
      category: template.category,
      header,
      examples,
    });
  } else {
    waTemplateId = await pushCreateToMeta(organizationId, creds, {
      name: template.name,
      language: template.language,
      category: template.category,
      body: template.body,
      header,
      examples,
    });
  }

  const updated = await db
    .update(schema.template)
    .set({
      status: "pending",
      rejectionReason: null,
      waTemplateId,
      updatedAt: new Date(),
    })
    .where(eq(schema.template.id, template.id))
    .returning();
  return updated[0]!;
}

/** Rechazo interno: vuelve a borrador local, con el motivo del admin. */
export async function rejectTemplateInternally(
  organizationId: string,
  templateId: string,
  reason: string | null
): Promise<TemplateRow> {
  const template = await requireTemplate(organizationId, templateId);
  if (template.status !== "awaiting_approval") {
    throw new TemplateError("invalid", "La plantilla no está pendiente de aprobación");
  }
  const db = getDb();
  const updated = await db
    .update(schema.template)
    .set({
      status: "draft",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(schema.template.id, template.id))
    .returning();
  return updated[0]!;
}

function mapMetaStatus(
  status: string | undefined
): TemplateRow["status"] | null {
  const s = (status ?? "").toUpperCase();
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "rejected";
  if (s === "PENDING" || s === "IN_APPEAL" || s === "PENDING_DELETION") {
    return "pending";
  }
  return null;
}

/**
 * Sincroniza estados desde Graph (`GET {waba}/message_templates`). Cubre el
 * modo agencia: los webhooks de plantillas NO siguen el override de callback,
 * así que el pull es la vía universal (DV-VC-04/DV-VC-15).
 */
export async function syncTemplates(organizationId: string): Promise<number> {
  const creds = await getCredentialsByOrg(organizationId);
  if (!creds) {
    throw new TemplateError("not_connected", "Conecta tu número de WhatsApp primero");
  }

  let data: {
    data?: { id?: string; name?: string; language?: string; status?: string; category?: string; quality_score?: unknown; rejected_reason?: string }[];
  };
  try {
    data = await graphRequest(`${creds.wabaId}/message_templates`, {
      token: creds.token,
    });
  } catch (err) {
    if (err instanceof MetaApiError) {
      if (err.isAuthError) {
        await markReconnectRequired(organizationId);
        throw new TemplateError("reconnect_required", "El token expiró: reconecta el número");
      }
      throw new TemplateError("meta_unavailable", "No se pudo consultar Meta");
    }
    throw err;
  }

  const db = getDb();
  const local = await db
    .select()
    .from(schema.template)
    .where(scoped(schema.template.organizationId, organizationId));

  let updated = 0;
  for (const remote of data.data ?? []) {
    const status = mapMetaStatus(remote.status);
    if (!status) continue;
    const match = local.find(
      (t) =>
        (remote.id && t.waTemplateId === remote.id) ||
        (t.name === remote.name && t.language === remote.language)
    );
    if (!match) continue;
    // Meta RECATEGORIZA plantillas por su cuenta (una UTILITY puede pasar a
    // MARKETING y quedar sujeta al límite por destinatario, error 131049), así
    // que la categoría remota manda: sin esto el CRM muestra una categoría que
    // ya no es la real.
    const category = remote.category?.toUpperCase() ?? match.category;
    if (match.status === status && match.category === category) continue;
    await db
      .update(schema.template)
      .set({
        status,
        category,
        rejectionReason: remote.rejected_reason ?? null,
        waTemplateId: match.waTemplateId ?? remote.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.template.id, match.id));
    updated += 1;
  }
  return updated;
}

/** Evento webhook `message_template_status_update` (modo directo, FR-050). */
export async function applyTemplateStatusEvent(
  wabaId: string | null,
  value: WebhookValue
): Promise<void> {
  if (!wabaId) return;
  const creds = await getCredentialsByWabaId(wabaId);
  if (!creds) return;

  const status = mapMetaStatus(value.event);
  const name = value.message_template_name;
  const language = value.message_template_language;
  if (!status || !name || !language) return;

  const db = getDb();
  await db
    .update(schema.template)
    .set({
      status,
      rejectionReason: status === "rejected" ? (value.reason ?? null) : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.template.organizationId, creds.organizationId),
        eq(schema.template.name, name),
        eq(schema.template.language, language)
      )
    );
}

/** Contexto de personalización del destinatario: contacto + su lead (el
 * lead es 1:1 con el contacto) con nombres de servicio y etapa. */
async function loadVariableContext(
  organizationId: string,
  contact: typeof schema.contact.$inferSelect
): Promise<{
  contactName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  serviceName: string | null;
  stageName: string | null;
}> {
  const rows = await getDb()
    .select({
      serviceName: schema.service.name,
      stageName: schema.pipelineStage.name,
    })
    .from(schema.lead)
    .leftJoin(schema.service, eq(schema.service.id, schema.lead.serviceId))
    .leftJoin(
      schema.pipelineStage,
      eq(schema.pipelineStage.id, schema.lead.stageId)
    )
    .where(
      scoped(
        schema.lead.organizationId,
        organizationId,
        eq(schema.lead.contactId, contact.id)
      )
    )
    .limit(1);
  return {
    contactName: contact.name,
    phone: contact.phone,
    email: contact.email,
    notes: contact.notes,
    serviceName: rows[0]?.serviceName ?? null,
    stageName: rows[0]?.stageName ?? null,
  };
}

/** Envía una plantilla APROBADA a una conversación (ventana cerrada, FR-051). */
export async function sendTemplate(input: {
  organizationId: string;
  conversationId: string;
  templateId: string;
  variable?: string;
}): Promise<{ messageId: string }> {
  const db = getDb();

  const templates = await db
    .select()
    .from(schema.template)
    .where(
      scoped(
        schema.template.organizationId,
        input.organizationId,
        eq(schema.template.id, input.templateId)
      )
    )
    .limit(1);
  const template = templates[0];
  if (!template) throw new TemplateError("not_found", "Plantilla no encontrada");
  if (template.status !== "approved") {
    throw new TemplateError("invalid", "Solo se pueden enviar plantillas aprobadas");
  }
  // Mapeo 018: las variables se resuelven solas con datos del destinatario
  // (el `variable` legacy se ignora). Sin mapeo, rige la regla v1.
  const mapping = parseStoredVariables(template.variables);
  const needsVariable = !mapping && countVariables(template.body) === 1;
  if (needsVariable && !input.variable?.trim()) {
    throw new TemplateError("invalid", "La plantilla requiere el valor de {{1}}");
  }

  const rows = await db
    .select({ conversation: schema.conversation, contact: schema.contact })
    .from(schema.conversation)
    .innerJoin(
      schema.contact,
      eq(schema.conversation.contactId, schema.contact.id)
    )
    .where(
      scoped(
        schema.conversation.organizationId,
        input.organizationId,
        eq(schema.conversation.id, input.conversationId)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new TemplateError("not_found", "Conversación no encontrada");
  if (row.conversation.isTest) {
    // Aserción dura del sandbox (FR-031)
    throw new SendError(
      "sandbox_violation",
      "Conversación de prueba del Laboratorio: el envío real está prohibido"
    );
  }
  if (row.contact.blockedAt) {
    throw new SendError(
      "blocked",
      "Este contacto está bloqueado. Desbloquéalo antes de enviar plantillas."
    );
  }

  const creds = await getCredentialsByOrg(input.organizationId);
  if (!creds) throw new TemplateError("not_connected", "Sin número conectado");
  if (creds.status === "reconnect_required") {
    throw new TemplateError("reconnect_required", "Reconecta el número");
  }

  // Resolución del mapeo por destinatario (018): dato → respaldo → error
  // claro. En campañas esto marca fallido SOLO a este destinatario.
  let bodyValues: string[] | undefined;
  if (mapping) {
    const ctx = await loadVariableContext(input.organizationId, row.contact);
    const resolved = resolveTemplateVariables(mapping, ctx);
    if (!resolved.ok) {
      throw new TemplateError(
        "invalid",
        `Falta el dato de ${resolved.missing} para este contacto: complétalo o define un valor de respaldo en la plantilla`
      );
    }
    bodyValues = resolved.values;
  }

  // Encabezado multimedia (016): media_id vigente — una campaña entera
  // reutiliza el mismo; solo se re-sube si caducó. Va DESPUÉS de los guards:
  // una conversación de prueba jamás debe disparar esta subida real.
  let headerMediaId: string | null = null;
  const components: Record<string, unknown>[] = [];
  if (template.headerKind) {
    headerMediaId = await ensureHeaderMediaId(
      input.organizationId,
      creds,
      template
    );
    components.push({
      type: "header",
      parameters: [
        template.headerKind === "image"
          ? { type: "image", image: { id: headerMediaId } }
          : {
              type: "document",
              document: {
                id: headerMediaId,
                filename: template.headerFilename ?? "documento.pdf",
              },
            },
      ],
    });
  }
  if (bodyValues) {
    components.push({
      type: "body",
      parameters: bodyValues.map((text) => ({ type: "text", text })),
    });
  } else if (needsVariable) {
    components.push({
      type: "body",
      parameters: [{ type: "text", text: input.variable!.trim() }],
    });
  }

  const waMessageId = await callGraphSend(creds, {
    messaging_product: "whatsapp",
    to: normalizeRecipient(row.contact.phone),
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length > 0 ? { components } : {}),
    },
  });

  const inserted = await db
    .insert(schema.message)
    .values({
      id: newId("message"),
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      waMessageId,
      direction: "out",
      type: "template",
      text: renderBody(template.body, bodyValues ?? input.variable?.trim()),
      // El hilo muestra el encabezado como adjunto descargable bajo demanda.
      mediaId: headerMediaId,
      mediaMime: template.headerKind ? template.headerMime : null,
      mediaFilename:
        template.headerKind === "document" ? template.headerFilename : null,
      status: "pending",
    })
    .returning();
  const message = inserted[0]!;

  await db
    .update(schema.conversation)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.conversation.id, input.conversationId));

  publish(input.organizationId, {
    type: "message.new",
    data: {
      conversationId: input.conversationId,
      message: serializeMessage(message),
    },
  });

  return { messageId: message.id };
}
