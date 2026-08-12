import type { DashboardRangePreset } from "@/lib/types";

export const DEFAULT_DASHBOARD_TIMEZONE = "America/Bogota";
export const MAX_DASHBOARD_DAYS = 366;

export type DashboardRange = {
  preset: DashboardRangePreset;
  from: string;
  to: string;
};

export class DashboardRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardRangeError";
  }
}

const PRESETS = new Set<DashboardRangePreset>([
  "today",
  "7d",
  "30d",
  "90d",
  "custom",
]);

export function validDashboardTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return DEFAULT_DASHBOARD_TIMEZONE;
  }
}

export function dateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validDashboardTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addCalendarDays(value: string, amount: number): string {
  if (!isIsoCalendarDate(value)) {
    throw new DashboardRangeError("La fecha no tiene formato válido");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + amount));
  return date.toISOString().slice(0, 10);
}

export function dashboardRangeDays(from: string, to: string): number {
  if (!isIsoCalendarDate(from) || !isIsoCalendarDate(to)) {
    throw new DashboardRangeError("Las fechas deben usar el formato AAAA-MM-DD");
  }
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function resolveDashboardRange(input: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  timezone: string;
  now?: Date;
}): DashboardRange {
  const requested = input.preset ?? "7d";
  if (!PRESETS.has(requested as DashboardRangePreset)) {
    throw new DashboardRangeError("El rango seleccionado no existe");
  }
  const preset = requested as DashboardRangePreset;
  const today = dateInTimezone(input.now ?? new Date(), input.timezone);

  let from: string;
  let to: string;
  if (preset === "custom") {
    from = input.from ?? "";
    to = input.to ?? "";
    if (!isIsoCalendarDate(from) || !isIsoCalendarDate(to)) {
      throw new DashboardRangeError(
        "Selecciona una fecha inicial y una fecha final válidas"
      );
    }
  } else {
    const days = preset === "today" ? 1 : Number.parseInt(preset, 10);
    from = addCalendarDays(today, -(days - 1));
    to = today;
  }

  const span = dashboardRangeDays(from, to);
  if (span < 1) {
    throw new DashboardRangeError(
      "La fecha inicial no puede ser posterior a la fecha final"
    );
  }
  if (span > MAX_DASHBOARD_DAYS) {
    throw new DashboardRangeError(
      `El rango personalizado no puede superar ${MAX_DASHBOARD_DAYS} días`
    );
  }
  return { preset, from, to };
}
