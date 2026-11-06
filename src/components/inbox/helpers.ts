/** Utilidades de presentación de la bandeja. */

import { DEFAULT_TIMEZONE, localDateKey } from "@/lib/timezone";

export function formatTime(iso: string | null, timezone = DEFAULT_TIMEZONE): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = localDateKey(d, timezone) === localDateKey(new Date(), timezone);
  if (sameDay) return d.toLocaleTimeString("es-CO", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-CO", { timeZone: timezone, day: "numeric", month: "short" });
}

export function formatRemaining(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const MEDIA_LABELS: Record<string, string> = {
  image: "Imagen",
  audio: "Audio",
  video: "Video",
  document: "Documento",
  sticker: "Sticker",
  location: "Ubicación",
  contacts: "Contacto compartido",
  template: "Plantilla",
};

export function mediaLabel(type: string): string {
  return MEDIA_LABELS[type] ?? "Contenido";
}

export function previewText(preview: string | null): string {
  if (!preview) return "";
  return MEDIA_LABELS[preview] ? `📎 ${MEDIA_LABELS[preview]}` : preview;
}
