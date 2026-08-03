/**
 * Better Auth conservó `member` en cuentas antiguas; para distribución de
 * servicios equivale al rol comercial migrado. Cualquier valor desconocido se
 * rechaza de forma conservadora.
 */
export function isCommercialMemberRole(role: string): boolean {
  return role === "commercial" || role === "member";
}

export function isEligibleServiceAssignee(
  member:
    | {
        organizationId: string;
        role: string;
      }
    | null
    | undefined,
  organizationId: string
): boolean {
  return Boolean(
    member &&
      member.organizationId === organizationId &&
      isCommercialMemberRole(member.role)
  );
}

export type ServiceCatalogEntry = {
  id: string;
  name: string;
};

export type ServiceIntentHistoryMessage = {
  direction: "in" | "out";
  text: string | null;
  type?: string;
};

function normalizeIntentText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const NON_SPECIFIC_WORDS = new Set([
  "a",
  "al",
  "algo",
  "ayuda",
  "con",
  "de",
  "del",
  "deseo",
  "el",
  "en",
  "empresa",
  "hacer",
  "informacion",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "mi",
  "mis",
  "necesito",
  "negocio",
  "orientacion",
  "para",
  "por",
  "proyecto",
  "que",
  "quiero",
  "quisiera",
  "requiero",
  "servicio",
  "servicios",
  "sobre",
  "solicito",
  "su",
  "sus",
  "una",
  "uno",
  "un",
  "y",
]);

function meaningfulWords(value: string): string[] {
  return normalizeIntentText(value)
    .split(" ")
    .filter((word) => word.length >= 2 && !NON_SPECIFIC_WORDS.has(word));
}

function mentionsConfiguredService(
  evidence: string,
  service: ServiceCatalogEntry
): boolean {
  const normalizedName = normalizeIntentText(service.name);
  if (!normalizedName) return false;
  if (evidence.includes(normalizedName)) return true;
  const evidenceWords = new Set(evidence.split(" "));
  return normalizedName
    .split(" ")
    .filter((word) => word.length >= 3 && word !== "servicio")
    .some((word) => evidenceWords.has(word));
}

function isQualificationQuestion(text: string | null): boolean {
  const normalized = normalizeIntentText(text ?? "");
  return /\b(que necesitas|que servicio|que buscas|en que (podemos|puedo) ayudarte|como (podemos|puedo) ayudarte|cuentame (mas )?(sobre|de) (tu )?(necesidad|proyecto))\b/.test(
    normalized
  );
}

/**
 * Segundo guard de la clasificación del LLM: un ID válido no demuestra que el
 * cliente haya expresado una necesidad. Exigimos una cita entrante verificable
 * y una señal comercial concreta. Para visión se permite una descripción no
 * textual únicamente durante el turno que contiene la imagen.
 */
export function hasExplicitServiceIntent(input: {
  evidence: string | null | undefined;
  service: ServiceCatalogEntry;
  history: readonly ServiceIntentHistoryMessage[];
  allowUnquotedVisualEvidence?: boolean;
}): boolean {
  const evidence = normalizeIntentText(input.evidence ?? "");
  if (evidence.length < 2) return false;

  let inboundIndex = -1;
  for (let index = input.history.length - 1; index >= 0; index -= 1) {
    const message = input.history[index];
    const normalizedMessage = normalizeIntentText(message?.text ?? "");
    if (
      message?.direction === "in" &&
      ` ${normalizedMessage} `.includes(` ${evidence} `)
    ) {
      inboundIndex = index;
      break;
    }
  }

  const lastInbound = [...input.history]
    .reverse()
    .find((message) => message.direction === "in");
  const visualEvidence = Boolean(
    input.allowUnquotedVisualEvidence && lastInbound?.type === "image"
  );
  if (inboundIndex < 0 && !visualEvidence) return false;

  const serviceMentioned = mentionsConfiguredService(evidence, input.service);
  const requestMarker =
    /\b(quiero|quisiera|necesito|busco|deseo|requiero|solicito|me interesa|me gustaria|cotizar|contratar|crear|disenar|desarrollar|implementar|optimizar|mejorar|posicionar|automatizar|vender)\b/.test(
      evidence
    );
  const problemStatement =
    /\b(no funciona|no aparece|no vende|no consigo|tengo (un )?problema|quiero mas clientes|necesito mas clientes)\b/.test(
      evidence
    );

  // Saludos, cierres e identidad aislada nunca son intención comercial.
  if (
    /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|holi)$/.test(
      evidence
    ) ||
    /^(gracias|muchas gracias|listo|ok|vale|adios|chao|hasta luego)$/.test(
      evidence
    ) ||
    (!requestMarker &&
      !serviceMentioned &&
      /^(hola )?(soy|me llamo|mi nombre es)\b/.test(evidence))
  ) {
    return false;
  }

  const businessContextOnly =
    /^(somos|soy (un|una)|mi empresa|mi negocio|nos dedicamos|me dedico|vendemos|ofrecemos|tengo una|tenemos una)\b/.test(
      evidence
    );
  if (businessContextOnly && !requestMarker && !problemStatement) return false;

  const specificWords = meaningfulWords(evidence);
  // “Quiero información/ayuda sobre sus servicios” sigue siendo genérico.
  if (!serviceMentioned && specificWords.length === 0) return false;
  if (serviceMentioned) return true;
  if (requestMarker && specificWords.length > 0) return true;

  if (problemStatement && specificWords.length > 0) return true;

  // Respuestas nominales concretas (“una tienda virtual”) son válidas, pero
  // no descripciones generales del negocio (“tengo una panadería”).
  if (/^(un|una)\b/.test(evidence) && specificWords.length >= 2) return true;

  if (inboundIndex > 0) {
    const previous = input.history[inboundIndex - 1];
    if (
      previous?.direction === "out" &&
      isQualificationQuestion(previous.text) &&
      specificWords.length > 0
    ) {
      return true;
    }
  }

  return visualEvidence && specificWords.length >= 2;
}

/**
 * Resuelve la clasificación del LLM contra la allowlist REAL de la empresa.
 * Se acepta únicamente el ID exacto: nunca hacemos fuzzy matching con una
 * salida inventada porque una asignación incorrecta es peor que preguntar.
 */
export function resolveDetectedService<T extends ServiceCatalogEntry>(
  requestedId: string | null | undefined,
  services: readonly T[]
): T | null {
  const id = requestedId?.trim();
  if (!id) return null;
  return services.find((service) => service.id === id) ?? null;
}
