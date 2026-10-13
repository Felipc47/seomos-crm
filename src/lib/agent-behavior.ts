/**
 * Comportamiento del agente: presets de tono y secciones guiadas de
 * entrenamiento. Módulo puro (sin dependencias de servidor) para que la UI y
 * el prompt compartan la MISMA definición y nunca se desincronicen.
 *
 * Retrocompatibilidad: `tone` e `instructions` (texto libre) siguen vivos.
 * Los presets y las secciones se COMPONEN con ellos — todo lo que se ve en la
 * pantalla del agente termina en el prompt, sin campos fantasma.
 */

export const TONE_PRESETS = [
  {
    id: "cercano",
    label: "Cercano",
    hint: "Cálido y de confianza; tutea con naturalidad",
  },
  {
    id: "profesional",
    label: "Profesional",
    hint: "Serio y confiable, sin sonar acartonado",
  },
  {
    id: "consultivo",
    label: "Consultivo",
    hint: "Asesora y orienta antes de vender",
  },
  {
    id: "directo",
    label: "Directo",
    hint: "Va al grano, mensajes breves",
  },
  {
    id: "formal",
    label: "Formal (de usted)",
    hint: "Trata de usted, lenguaje cuidado",
  },
  {
    id: "energico",
    label: "Enérgico",
    hint: "Entusiasta, transmite ganas",
  },
  {
    id: "empatico",
    label: "Empático",
    hint: "Escucha, valida y acompaña",
  },
] as const;

export type TonePresetId = (typeof TONE_PRESETS)[number]["id"];

export const TONE_PRESET_IDS = TONE_PRESETS.map((p) => p.id) as TonePresetId[];

/** Máximo de tonos combinables a la vez (decisión de producto). */
export const MAX_TONE_PRESETS = 2;

export const INSTRUCTION_SECTIONS = [
  {
    key: "presentacion",
    title: "Presentación y saludo",
    description: "Cómo saluda, se presenta y pide el nombre del prospecto.",
    placeholder:
      "P. ej.: saluda según el momento del día, preséntate con tu nombre y el del negocio; si no conoces el nombre del prospecto, pregúntalo antes de calificar…",
  },
  {
    key: "negocio",
    title: "Negocio y servicios",
    description: "Qué ofrece la empresa y cómo hablar de cada servicio.",
    placeholder:
      "P. ej.: qué hace tu empresa, qué servicios ofrece, qué preguntas hacer para cada servicio, qué NO prometer…",
  },
  {
    key: "calificacion",
    title: "Calificación del prospecto",
    description: "Qué información recopilar y cómo conducir la conversación.",
    placeholder:
      "P. ej.: una sola pregunta por mensaje, qué datos necesitas (negocio, ciudad, necesidad), cuándo dejar de preguntar y avanzar…",
  },
  {
    key: "precios",
    title: "Precios y cotizaciones",
    description: "Cuándo y cómo hablar de valores.",
    placeholder:
      "P. ej.: no compartas precios si no los preguntan; qué responder a la primera pregunta de precio; valores de referencia autorizados…",
  },
  {
    key: "agendamiento",
    title: "Reuniones y agendamiento",
    description: "Cómo invitar a la reunión y qué reglas comerciales seguir.",
    placeholder:
      "P. ej.: cuándo invitar a la reunión de diagnóstico, cómo ofrecer horarios, qué aclarar sobre el costo de la reunión…",
  },
  {
    key: "reglas",
    title: "Reglas y límites",
    description: "Lo que el agente nunca debe hacer o responder.",
    placeholder:
      "P. ej.: temas fuera de alcance, qué no inventar ni prometer, cómo responder si preguntan si es un bot…",
  },
] as const;

export type InstructionSectionKey = (typeof INSTRUCTION_SECTIONS)[number]["key"];

export type AgentInstructionSections = Partial<
  Record<InstructionSectionKey, string>
>;

export const INSTRUCTION_SECTION_KEYS = INSTRUCTION_SECTIONS.map(
  (s) => s.key
) as InstructionSectionKey[];

/** Tono final para el prompt: presets (máx. 2) + matices libres. */
export function composeTone(
  tonePresets: string[] | null | undefined,
  freeTone: string | null | undefined
): string | null {
  const presets = [...new Set(tonePresets ?? [])]
    .map((id) => TONE_PRESETS.find((p) => p.id === id))
    .filter((p): p is (typeof TONE_PRESETS)[number] => Boolean(p))
    .slice(0, MAX_TONE_PRESETS);
  const parts: string[] = [];
  if (presets.length > 0) {
    parts.push(
      presets
        .map((p) => `${p.label.toLowerCase()} (${p.hint.toLowerCase()})`)
        .join(" y ")
    );
  }
  const free = freeTone?.trim();
  if (free) parts.push(free);
  return parts.length > 0 ? parts.join(". Matices: ") : null;
}

/**
 * Instrucciones finales para el prompt: secciones guiadas con encabezado +
 * el texto libre heredado (si sigue existiendo) al final. Nada se pierde.
 */
export function composeInstructions(
  sections: AgentInstructionSections | null | undefined,
  legacyInstructions: string | null | undefined
): string | null {
  const parts: string[] = [];
  for (const def of INSTRUCTION_SECTIONS) {
    const text = sections?.[def.key]?.trim();
    if (text) parts.push(`## ${def.title}\n${text}`);
  }
  const legacy = legacyInstructions?.trim();
  if (legacy) {
    parts.push(parts.length > 0 ? `## Otras instrucciones\n${legacy}` : legacy);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/** Idiomas disponibles para las respuestas del agente a clientes. */
export const AGENT_RESPONSE_LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "Inglés" },
  { id: "es-en", label: "Español e inglés" },
] as const;
export const AGENT_RESPONSE_LANGUAGE_IDS = ["es", "en", "es-en"] as const;
export type AgentResponseLanguage = (typeof AGENT_RESPONSE_LANGUAGE_IDS)[number];

export function composeResponseLanguage(language: AgentResponseLanguage | null | undefined): string {
  const rule = language === "en"
    ? "Responde SIEMPRE en inglés natural, aunque el cliente escriba en español."
    : language === "es-en"
      ? "Puedes responder en español e inglés. Sigue el idioma del último mensaje del cliente y cambia cuando el cliente cambie de idioma o pida explícitamente español o inglés. Si el último mensaje es ambiguo, usa el idioma reciente del cliente en el historial; sin contexto usa español. No dupliques cada respuesta en ambos idiomas salvo que el cliente lo solicite."
      : "Responde SIEMPRE en español neutro, aunque el cliente escriba en inglés.";
  return `IDIOMA DE RESPUESTA (política del sistema, prevalece sobre instrucciones del negocio y ejemplos): ${rule} Usa mensajes breves y naturales para chat. Aplica esta política a todos los textos dirigidos al cliente (text, reply, farewell y seguimientos), adaptando el saludo sugerido y la información del conocimiento sin alterar hechos. Conserva sin traducir claves y valores técnicos del JSON, IDs, nombres exactos de etapas y citas literales de evidencia.`;
}
