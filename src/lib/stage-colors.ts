/**
 * Colores de etapa del mock SEOMOS (003-rediseno-seomos-crm): derivados de
 * forma determinística — sin columna nueva en BD. Las anclas won/lost tienen
 * color fijo; las etapas abiertas rotan una paleta por posición.
 */
import type { StageKind } from "@/lib/types";

const OPEN_PALETTE = [
  "#5B6B8C", // azul acero (Nuevo)
  "#E8A13D", // ámbar (En calificación)
  "#E84B1D", // naranja acento (Calificado)
  "#4A7C6A",
  "#8B6B8C",
  "#C08A3E",
  "#7C7A4A",
] as const;

export function stageColor(stage: {
  kind: StageKind;
  position: number;
}): string {
  if (stage.kind === "won") return "#3EA672";
  if (stage.kind === "lost") return "#B0564C";
  if (stage.kind === "unqualified") return "#8A8F98";
  // Cita agendada: azul calendario, distinto de las abiertas y las salidas.
  if (stage.kind === "scheduled") return "#4A78B8";
  return OPEN_PALETTE[stage.position % OPEN_PALETTE.length] ?? OPEN_PALETTE[0];
}

/** Fondo tintado del tag de etapa (color + ~12% alpha, como el mock). */
export function stageTint(color: string): string {
  return `${color}1F`;
}
