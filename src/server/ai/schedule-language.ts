import type { AgentResponseLanguage } from "@/lib/agent-behavior";
import type { SchedulingMessage } from "@/server/ai/schedule-confirm";

export type SchedulingLanguage = "es" | "en";

/** Fixed-language profiles win. In bilingual mode, short neutral replies like
 * "ok" inherit the latest identifiable language of the actual conversation. */
export function schedulingLanguage(
  preference: AgentResponseLanguage | null | undefined,
  history: Pick<SchedulingMessage, "direction" | "text">[]
): SchedulingLanguage {
  if (preference !== "es-en") return preference === "en" ? "en" : "es";
  for (const message of [...history].reverse()) {
    const text = message.text?.toLowerCase() ?? "";
    if (/\b(?:in spanish|en espa[nñ]ol)\b/.test(text)) return "es";
    if (/\b(?:in english|en ingl[eé]s)\b/.test(text)) return "en";
    if (/\b(yes|yeah|yep|please|thanks|hello|friday|thursday|wednesday|tuesday|monday|morning|afternoon|works|would|does|available|confirm|meeting)\b/.test(text)) return "en";
    if (/\b(hola|gracias|viernes|jueves|miercoles|miércoles|martes|lunes|tarde|manana|mañana|horario|confirmar|reunion|reunión|sirve|perfecto|claro)\b|(?:^|\s)s[íi](?:\s|[.!¡,]|$)/.test(text)) return "es";
  }
  return "es";
}

export function schedulingDate(start: Date, timezone: string, language: SchedulingLanguage): string {
  return start.toLocaleString(language === "en" ? "en-US" : "es-CO", {
    timeZone: timezone, weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true, timeZoneName: "short",
  });
}
