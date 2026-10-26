/** Configuración comercial compartida por formulario, prompt y demo. */
export const AGENT_MISSION_IDS = ["legacy", "schedule", "sales", "ecommerce", "qualify", "support", "inform", "custom"] as const;
export type AgentMission = (typeof AGENT_MISSION_IDS)[number];
export const AGENT_MISSIONS: { id: AgentMission; label: string; description: string }[] = [
  { id: "legacy", label: "Seguir entrenamiento actual", description: "Conserva la finalidad indicada en las instrucciones existentes." },
  { id: "schedule", label: "Agendar reuniones", description: "Entender la necesidad y conducir a una cita cuando corresponda." },
  { id: "sales", label: "Vender productos o servicios", description: "Recomendar y ayudar a avanzar hacia una compra." },
  { id: "ecommerce", label: "Vender con ecommerce", description: "Orientar la compra con el conocimiento del negocio y el enlace de la tienda." },
  { id: "qualify", label: "Calificar prospectos", description: "Identificar necesidad y encaje antes de entregar la oportunidad al equipo." },
  { id: "support", label: "Atender y resolver consultas", description: "Resolver dudas con información confirmada y escalar cuando haga falta." },
  { id: "inform", label: "Informar sobre el negocio", description: "Explicar la oferta, condiciones y próximos pasos." },
  { id: "custom", label: "Misión personalizada", description: "Sigue el objetivo que describas en los detalles de la misión." },
];
export const DEFAULT_WARMUP_MESSAGES = 3;
export const MAX_WARMUP_MESSAGES = 50;
export type MissionSettings = {
  mission?: AgentMission | null;
  missionDetails?: string | null;
  ecommerceUrl?: string | null;
  schedulingWarmupEnabled?: boolean;
  schedulingWarmupMessages?: number;
  responseLanguage?: string;
};
export type SchedulingOfferContext = { sentAgentMessages: number; customerRequestedMeeting: boolean };
export type SchedulingOfferPolicy = SchedulingOfferContext & { allowed: boolean; enabled: boolean; minimum: number };
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "\'");

/** Reconoce solicitud explícita; una mención de software de agenda no basta. */
export function customerRequestsMeeting(texts: string[]): boolean {
  for (const text of [...texts].reverse()) {
    const s = normalize(text);
    const meeting = /\b(reunion(?:es)?|cita(?:s)?|sesion|llamada|meeting|appointment|call)\b/.test(s);
    if (/\b(no quiero|no deseo|no necesito|no puedo|no podemos|no me interesa|dont want|don't want|do not want|cancel(?:ar|a|emos)?|cancela)\b/.test(s) && (meeting || /agend/.test(s))) return false;
    if (/\b(agendemos|agendame|agendanos|reunamonos|podemos reunirnos|quiero reunirme|me gustaria reunirme|quisiera reunirme)\b/.test(s)) return true;
    if (meeting && /\b(quiero|quisiera|deseo|necesito|me gustaria|podemos|podriamos|puedo|como|cuando|horario|disponibilidad|i want|i need|i would like|can we|could we|please|what time|available)\b/.test(s)) return true;
    if (/\b(quiero|quisiera|me gustaria|podemos|deseo)\s+(?:una?\s+)?(?:agendar)\b/.test(s)) return true;
  }
  return false;
}

export function schedulingOfferPolicy(settings: MissionSettings, context?: Partial<SchedulingOfferContext>): SchedulingOfferPolicy {
  const enabled = settings.schedulingWarmupEnabled === true;
  const minimum = settings.schedulingWarmupMessages ?? DEFAULT_WARMUP_MESSAGES;
  const sentAgentMessages = Math.max(0, context?.sentAgentMessages ?? 0);
  const customerRequestedMeeting = context?.customerRequestedMeeting === true;
  return { enabled, minimum, sentAgentMessages, customerRequestedMeeting,
    allowed: !enabled || sentAgentMessages >= minimum || customerRequestedMeeting };
}

export function renderMission(settings: MissionSettings): string | null {
  const mission = settings.mission ?? "legacy";
  if (mission === "legacy" && !settings.missionDetails?.trim()) return null;
  const option = AGENT_MISSIONS.find(item => item.id === mission)!;
  return [
    "MISIÓN PRINCIPAL DEL AGENTE (prioriza este objetivo comercial sobre sugerencias de otro objetivo en el entrenamiento; respeta siempre conocimiento, consentimiento y reglas del sistema):",
    `${option.label}: ${option.description}`,
    settings.missionDetails?.trim() ? `Detalles del objetivo: ${settings.missionDetails.trim()}` : null,
    mission === "schedule" ? "Propón una reunión cuando la necesidad esté clara y el cliente encaje, respetando la espera opcional antes de proponer citas." : null,
    mission !== "legacy" && mission !== "schedule" && mission !== "custom" ? "No conviertas la conversación en una búsqueda de citas: ayuda primero a cumplir la misión. Atiende una solicitud explícita de reunión si el cliente la hace." : null,
    mission === "ecommerce" ? `Ayuda a elegir con productos, precios y condiciones confirmados en el conocimiento. ${settings.ecommerceUrl?.trim() ? `Tienda configurada: ${settings.ecommerceUrl.trim()}. Puedes compartir ese enlace para continuar la compra.` : "Pregunta qué producto necesita y orienta con lo documentado; no inventes un enlace de tienda."} Esta misión no acredita conexión de catálogo, stock, carrito, pagos o pedidos. No afirmes consultar ni ejecutar operaciones de tienda que el sistema no ofrece.` : null,
  ].filter(Boolean).join("\n");
}

export function renderSchedulingOfferPolicy(policy: SchedulingOfferPolicy): string | null {
  if (!policy.enabled) return null;
  return [
    "RITMO PARA PROPONER AGENDAMIENTO (regla obligatoria del sistema):",
    `El bot ya envió ${policy.sentAgentMessages} mensajes válidos en esta conversación. El mínimo configurado es ${policy.minimum} mensajes ANTES de proponer una cita. La respuesta que estás preparando todavía NO cuenta.`,
    policy.allowed
      ? policy.customerRequestedMeeting ? "El cliente solicitó explícitamente una reunión: puedes atenderla sin esperar el mínimo, respetando el resto de validaciones de la agenda." : "El mínimo ya se cumplió: puedes proponer una reunión cuando sea pertinente a la misión, sin forzarla."
      : "Todavía NO puedes proponer ni ofrecer reuniones, citas, llamadas o sesiones, ni usar schedule_meeting. Responde la necesidad actual y continúa orientando o calificando con una sola pregunta útil; no menciones esta espera al cliente. Si pide una reunión de forma explícita, se puede atender sin esperar.",
  ].join("\n");
}

/** Evidencia textual de una propuesta. No confunde una negación con una invitación. */
export function isMeetingOffer(text: string): boolean {
  return text.split(/(?<=[.!?])\s+|\n+/u).some(sentence => {
    const s = normalize(sentence);
    if (/\b(no (?:necesitas?|es necesario|hace falta|vamos a|podemos) (?:una? )?(?:agendar|programar|reservar)|no meeting|no appointment)\b/.test(s)) return false;
    const directScheduling = /\b(agend(?:ar|amos|emos|arte)|reunirnos|reunamonos)\b/.test(s);
    const scheduling = /\b(program(?:ar|amos|emos)|reserv(?:ar|amos|emos)|book|schedule|scheduling|arrange)\b/.test(s);
    const meeting = /\b(reunion(?:es)?|cita(?:s)?|sesion|llamada|meeting|appointment|call|consultation|session|meet)\b/.test(s);
    return directScheduling || (meeting && (scheduling || /\b(agenda (?:una?|tu|la)|te (?:propongo|invito|gustaria|interesaria|parece)|podemos|podriamos|coordinemos|coordinar|invitarte|horarios?|disponibilidad|would you|lets|let's|shall we|can we|how about|available|availability|join)\b/.test(s)));
  });
}

export function guardMeetingOfferText(text: string, policy: SchedulingOfferPolicy, settings: MissionSettings, latestInbound = ""): string {
  if (policy.allowed || !isMeetingOffer(text)) return text;
  const safe = text.split(/(?<=[.!?])\s+|\n+/u).filter(sentence => !isMeetingOffer(sentence)).join(" ").trim();
  if (safe.split(/\s+/).length >= 5) return safe;
  const english = settings.responseLanguage === "en" || (settings.responseLanguage === "es-en" && /\b(hello|what|how|want|need|would|please|looking)\b/i.test(latestInbound));
  const choices = english
    ? ["To guide you better, what do you need help with?", "What result would you like to achieve?", "Which part of your need would you like us to address first?"]
    : ["Para orientarte mejor, ¿qué necesitas resolver?", "¿Qué resultado te gustaría conseguir?", "¿Qué parte de tu necesidad te gustaría que revisemos primero?"];
  return choices[policy.sentAgentMessages % choices.length]!;
}

export function isSafeStoreUrl(value: string): boolean {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !/^(localhost|127\.|\[?::1\]?$)/i.test(url.hostname); }
  catch { return false; }
}
