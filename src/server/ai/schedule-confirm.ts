/** Deterministic scheduling evidence: an explicit time in the current
 * customer turn, or a short acceptance of a unique, dated outgoing option.
 * The legacy quote helper alone must not authorize a booking. */

/** Colapsa a minúsculas alfanuméricas sin acentos: tolera puntuación y tildes. */
function squash(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Cita mínima para considerarse evidencia (evita "sí" como comodín). */
const MIN_QUOTE_LEN = 6;

export function quoteAppearsInInbound(
  quote: string | undefined,
  inboundTexts: string[]
): boolean {
  if (!quote) return false;
  const q = squash(quote);
  if (q.length < MIN_QUOTE_LEN) return false;
  return squash(inboundTexts.join(" ")).includes(q);
}

/**
 * Horas mencionadas en un texto, en minutos desde medianoche.
 *
 * Solo cuenta un número como hora si el contexto lo respalda: lleva meridiano
 * ("11 am"), minutos explícitos ("11:30"), va tras "a las"/"las"/"tipo", o el
 * mensaje ES el número ("11"). Así "tengo 11 empleados" NO se lee como las
 * 11:00 — el guard sigue protegiendo contra confirmaciones inventadas.
 */
export function parseTimeMentions(text: string): number[] {
  const out = new Set<number>();
  const bare = text.trim();
  const re =
    /(a\s+las|las|sobre\s+las|hacia\s+las|tipo|at)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/gi;

  for (const m of text.matchAll(re)) {
    const leadIn = m[1];
    const hour = Number(m[2]);
    const minuteRaw = m[3];
    const meridiem = m[4]?.toLowerCase().replace(/[.\s]/g, "");
    const minute = minuteRaw === undefined ? 0 : Number(minuteRaw);
    if (!Number.isFinite(hour) || hour > 23 || minute > 59) continue;

    // ¿El número está usado como hora? Sin señal de contexto se ignora.
    const isWholeMessage = /^\d{1,2}(?:[:.]\d{2})?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/i.test(bare);
    const hasContext =
      Boolean(meridiem) ||
      minuteRaw !== undefined ||
      Boolean(leadIn) ||
      isWholeMessage;
    if (!hasContext) continue;

    if (meridiem?.startsWith("a")) {
      out.add((hour === 12 ? 0 : hour) * 60 + minute);
    } else if (meridiem?.startsWith("p")) {
      out.add((hour < 12 ? hour + 12 : hour) * 60 + minute);
    } else {
      // Sin meridiano: "11" es ambiguo. Se aceptan ambas lecturas para las
      // horas que caben en una jornada laboral (1–7 → también por la tarde);
      // la hora final igual debe coincidir con la que se va a agendar.
      out.add(hour * 60 + minute);
      if (hour >= 1 && hour <= 7) out.add((hour + 12) * 60 + minute);
    }
  }
  return [...out];
}

/**
 * ¿El cliente mencionó la hora que se pretende agendar?
 * `targetMinutes` = minutos desde medianoche EN LA ZONA DEL NEGOCIO.
 */
export function inboundMentionsTime(
  targetMinutes: number,
  inboundTexts: string[]
): boolean {
  return inboundTexts.some((t) => parseTimeMentions(t).includes(targetMinutes));
}

export type SchedulingMessage = {
  direction: "in" | "out";
  text: string | null;
  createdAt: Date;
};

function normalizeWords(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const WEEKDAYS = [
  ["sunday", "domingo"], ["monday", "lunes"], ["tuesday", "martes"],
  ["wednesday", "miercoles"], ["thursday", "jueves"], ["friday", "viernes"],
  ["saturday", "sabado"],
];
const MONTHS = [
  ["january", "enero"], ["february", "febrero"], ["march", "marzo"],
  ["april", "abril"], ["may", "mayo"], ["june", "junio"],
  ["july", "julio"], ["august", "agosto"], ["september", "septiembre"],
  ["october", "octubre"], ["november", "noviembre"], ["december", "diciembre"],
];
const DAY_NAMES = WEEKDAYS.flat().join("|");
const MONTH_NAMES = MONTHS.flat().join("|");

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day"), minutes: part("hour") * 60 + part("minute") };
}

/** Extract only dated, discrete options from the actual outgoing message.
 * A date with several times stays several options; a range is never a slot.
 * Missing years and bare weekdays are resolved from the proposal's own date,
 * never from the datetime invented by the model. */
function proposedSlots(message: SchedulingMessage, timezone: string) {
  const text = normalizeWords(message.text ?? "");
  if ((text.match(/\?/g)?.length ?? 0) > 1 || /\b(?:unavailable|already booked|ocupado|no disponible)\b/.test(text)) return [];
  const dates = [...text.matchAll(new RegExp(
    `\\b(?:(?:${DAY_NAMES}),?\\s+)?(?:(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?|(\\d{1,2})\\s+de\\s+(${MONTH_NAMES})(?:\\s+(?:de\\s+)?(\\d{4}))?|(\\d{4})-(\\d{2})-(\\d{2}))\\b|\\b(${DAY_NAMES})\\b`, "g"
  ))];
  const reference = localDateParts(message.createdAt, timezone);
  const today = Date.UTC(reference.year, reference.month - 1, reference.day);
  const slots = new Map<string, { year: number; month: number; day: number; minutes: number; weekday: number }>();
  for (const [index, match] of dates.entries()) {
    const segment = text.slice((match.index ?? 0) + match[0].length, dates[index + 1]?.index);
    // A range or another question needs clarification, not a reservation.
    if (/\b(from|between|to|until|hasta|desde|entre)\b|\d\s*(?:a|-|–)\s*\d/.test(segment)) return [];
    let year = Number(match[3] ?? match[6] ?? match[7] ?? reference.year);
    let month = match[8] ? Number(match[8]) : MONTHS.findIndex(names => names.includes(match[1] ?? match[5] ?? "")) + 1;
    let day = Number(match[2] ?? match[4] ?? match[9]);
    if (match[10]) {
      const weekday = WEEKDAYS.findIndex(names => names.includes(match[10]!));
      const date = new Date(today + ((weekday - new Date(today).getUTCDay() + 7) % 7) * 86400_000);
      year = date.getUTCFullYear(); month = date.getUTCMonth() + 1; day = date.getUTCDate();
    } else if (!match[3] && !match[6] && !match[7] && Date.UTC(year, month - 1, day) < today) {
      year += 1;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return [];
    const namedDay = new RegExp(`^(${DAY_NAMES})\\b`).exec(match[0])?.[1];
    if (namedDay && !WEEKDAYS[date.getUTCDay()]?.includes(namedDay)) return [];
    // Keep vague date options in the count: "Thursday afternoon or Friday
    // at 10" is still ambiguous for a bare "yes". A day selection may narrow it.
    const times = parseTimeMentions(segment);
    for (const minutes of times.length ? times : [-1]) {
      slots.set(`${year}-${month}-${day}-${minutes}`, { year, month, day, minutes, weekday: date.getUTCDay() });
    }
  }
  return [...slots.values()];
}

/** Accept a short reply only when it selects exactly one option in the most
 * recent outgoing message. No historical yes, unrelated quote, negative or
 * ambiguous list can authorize the model's chosen datetime. */
export function confirmsProposedMeeting(
  start: Date,
  timezone: string,
  history: SchedulingMessage[]
): boolean {
  if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) return false;
  const outgoingIndex = history.findLastIndex(message => message.direction === "out");
  const proposal = history[outgoingIndex];
  if (!proposal?.text) return false;
  const response = normalizeWords(history.slice(outgoingIndex + 1).map(message => message.text ?? "").join(" "))
    .replace(/[.!¡,;]+/g, " ").replace(/\s+/g, " ").trim();
  const affirmative = /^(?:yes|yeah|yep|sure|ok(?:ay)?|confirmed|si|claro|dale|perfecto|de acuerdo|me sirve|me funciona|esta bien|that works(?: for me)?|works for me|sounds good)(?:\s+(?:please|thanks|thank you|por favor|gracias))?$/;
  const daySelection = new RegExp(`^(?:the |el )?(${DAY_NAMES})(?: (?:please|works(?: for me)?|is (?:fine|good)|me (?:sirve|funciona)|por favor|gracias))?$`).exec(response);
  if (!affirmative.test(response) && !daySelection) return false;
  let slots = proposedSlots(proposal, timezone);
  if (daySelection) slots = slots.filter(slot => WEEKDAYS[slot.weekday]?.includes(daySelection[1]!));
  const slot = slots.length === 1 ? slots[0] : undefined;
  if (!slot) return false;
  const target = localDateParts(start, timezone);
  return slot.year === target.year && slot.month === target.month && slot.day === target.day && slot.minutes === target.minutes;
}
