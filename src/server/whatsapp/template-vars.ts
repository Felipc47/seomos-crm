/**
 * Variables de plantilla con personalización real (018).
 *
 * El MAPEO vive en la plantilla (`template.variables`, jsonb): un array
 * posicional donde la entrada i-ésima dice cómo llenar {{i+1}} en cada
 * envío — con un dato del contacto/lead o un valor fijo. La resolución
 * ocurre en el servidor por destinatario: una campaña de 35.000 produce
 * 35.000 mensajes distintos sin que el operador escriba nada.
 *
 * `variables` NULL = plantilla legacy: conserva la regla v1 (máximo una
 * {{1}}, valor manual o modo de campaña).
 */

export type TemplateVariableSource =
  | "first_name"
  | "name"
  | "phone"
  | "email"
  | "notes"
  | "service"
  | "stage"
  | "fixed";

export type TemplateVariable = {
  source: TemplateVariableSource;
  /** Texto literal — solo cuando source = fixed. */
  value?: string | null;
  /** Respaldo cuando el dato del contacto/lead está vacío. */
  fallback?: string | null;
};

/** Tope v1: suficientes para personalizar sin volver ilegible el cuerpo. */
export const MAX_TEMPLATE_VARIABLES = 5;

/** Catálogo de fuentes: etiqueta para la UI + ejemplo para la revisión de
 * Meta (el alta exige `example.body_text` con un valor por variable). */
export const VARIABLE_SOURCES: Record<
  TemplateVariableSource,
  { label: string; example: string }
> = {
  first_name: { label: "Primer nombre", example: "Ana" },
  name: { label: "Nombre completo", example: "Ana Pérez" },
  phone: { label: "Teléfono", example: "573001112233" },
  email: { label: "Correo", example: "ana@ejemplo.com" },
  notes: { label: "Notas del contacto", example: "Interesada en el plan pro" },
  service: { label: "Servicio del lead", example: "SEO" },
  stage: { label: "Etapa del prospecto", example: "En calificación" },
  fixed: { label: "Valor fijo", example: "" },
};

const VARIABLE_REGEX = /\{\{\s*(\d+)\s*\}\}/g;

/** Índices distintos usados en el cuerpo ({{1}} dos veces cuenta una). */
export function distinctVariableIndexes(body: string): number[] {
  const seen = new Set<number>();
  for (const match of body.matchAll(VARIABLE_REGEX)) {
    seen.add(Number(match[1]));
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Valida cuerpo + mapeo. `null` = válido. Con mapeo: {{1}}..{{N}} contiguas,
 * N ≤ 5, una entrada por variable y los fijos con valor. Sin mapeo (legacy):
 * máximo una {{1}} — la regla v1 intacta.
 */
export function validateTemplateVariables(
  body: string,
  mapping: TemplateVariable[] | null | undefined
): string | null {
  const indexes = distinctVariableIndexes(body);

  if (!mapping || mapping.length === 0) {
    if (indexes.length > 1) {
      return "Con varias variables debes asignar a cada una su fuente de datos";
    }
    if (indexes.length === 1 && indexes[0] !== 1) {
      return "La variable debe ser {{1}}";
    }
    return null;
  }

  if (indexes.length > MAX_TEMPLATE_VARIABLES) {
    return `Máximo ${MAX_TEMPLATE_VARIABLES} variables por plantilla`;
  }
  const expected = Array.from({ length: indexes.length }, (_, i) => i + 1);
  if (!indexes.every((n, i) => n === expected[i])) {
    return "Las variables deben ser consecutivas desde {{1}} (sin saltos)";
  }
  if (mapping.length !== indexes.length) {
    return indexes.length === 0
      ? "El cuerpo no tiene variables: quita el mapeo o agrega {{1}}"
      : `El cuerpo tiene ${indexes.length} variable(s) pero el mapeo define ${mapping.length}`;
  }
  for (const [i, entry] of mapping.entries()) {
    if (!VARIABLE_SOURCES[entry.source]) {
      return `Fuente desconocida en {{${i + 1}}}`;
    }
    if (entry.source === "fixed" && !entry.value?.trim()) {
      return `Escribe el valor fijo de {{${i + 1}}}`;
    }
  }
  return null;
}

/** Valores de ejemplo para `example.body_text` del alta/edición en Meta. */
export function exampleValues(mapping: TemplateVariable[]): string[] {
  return mapping.map((entry) =>
    entry.source === "fixed"
      ? (entry.value?.trim() ?? "ejemplo")
      : VARIABLE_SOURCES[entry.source].example
  );
}

/** Contexto de resolución: el contacto + lo que aporte su lead. */
export type VariableContext = {
  contactName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  serviceName?: string | null;
  stageName?: string | null;
};

export type ResolvedVariables =
  | { ok: true; values: string[] }
  | { ok: false; missing: string };

/**
 * Resuelve el mapeo para un destinatario. Dato vacío → respaldo; si tampoco
 * hay respaldo, se reporta la variable y su fuente — el llamador decide si
 * es un 422 (envío manual) o un destinatario fallido (campaña).
 */
export function resolveTemplateVariables(
  mapping: TemplateVariable[],
  ctx: VariableContext
): ResolvedVariables {
  const values: string[] = [];
  for (const [i, entry] of mapping.entries()) {
    const raw = rawValue(entry, ctx);
    const value = (raw ?? "").trim() || (entry.fallback ?? "").trim();
    if (!value) {
      return {
        ok: false,
        missing: `{{${i + 1}}} (${VARIABLE_SOURCES[entry.source].label.toLowerCase()})`,
      };
    }
    values.push(value);
  }
  return { ok: true, values };
}

function rawValue(
  entry: TemplateVariable,
  ctx: VariableContext
): string | null | undefined {
  switch (entry.source) {
    case "first_name":
      return ctx.contactName.split(/\s+/)[0];
    case "name":
      return ctx.contactName;
    case "phone":
      return ctx.phone;
    case "email":
      return ctx.email;
    case "notes":
      return ctx.notes;
    case "service":
      return ctx.serviceName;
    case "stage":
      return ctx.stageName;
    case "fixed":
      return entry.value;
  }
}

/** Lee el jsonb crudo de la BD como mapeo tipado (o null si no aplica). */
export function parseStoredVariables(
  raw: unknown
): TemplateVariable[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const entries: TemplateVariable[] = [];
  for (const item of raw) {
    const e = item as Partial<TemplateVariable> | null;
    if (!e?.source || !VARIABLE_SOURCES[e.source]) return null;
    entries.push({
      source: e.source,
      value: typeof e.value === "string" ? e.value : null,
      fallback: typeof e.fallback === "string" ? e.fallback : null,
    });
  }
  return entries;
}
