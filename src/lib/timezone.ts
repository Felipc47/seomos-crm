import { z } from "zod";

export const DEFAULT_TIMEZONE = "America/Bogota";

export function isValidTimezone(value: string): boolean {
  // Exigir identificadores IANA: no aceptar offsets fijos (+05:00).
  if (value !== "UTC" && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("es-CO", { timeZone: value }).format();
    return true;
  } catch { return false; }
}

export const timezoneSchema = z.string().trim().min(1).max(100)
  .refine(isValidTimezone, "Selecciona una zona horaria válida");

export function localDateKey(value: Date | string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const ZONE_LABELS: Record<string, string> = {
  "America/Bogota": "Bogotá, Colombia",
  "America/New_York": "Miami / Florida (hora del Este)",
  "America/Chicago": "Chicago / Florida occidental (hora Central)",
  "UTC": "UTC — tiempo universal",
};

export function timezoneOptions(current: string): { value: string; label: string }[] {
  const all = new Set([DEFAULT_TIMEZONE, "America/New_York", "America/Chicago", "UTC", current,
    ...Intl.supportedValuesOf("timeZone")]);
  return [...all].map(value => ({ value, label: `${ZONE_LABELS[value] ?? value.replaceAll("_", " ")} · ${value}` }));
}
