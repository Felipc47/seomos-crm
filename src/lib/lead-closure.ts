import type { StageKind } from "@/lib/types";

export const UNQUALIFIED_REASONS = [
  { value: "spam_or_irrelevant", label: "Spam o contacto irrelevante" },
  { value: "wrong_contact", label: "Número o contacto equivocado" },
  { value: "no_fit", label: "No cumple el perfil" },
  { value: "outside_scope", label: "Fuera de cobertura" },
  { value: "duplicate", label: "Contacto duplicado" },
  { value: "other", label: "Otro motivo" },
] as const;

export const LOST_REASONS = [
  { value: "no_response", label: "No respondió" },
  { value: "no_budget", label: "Sin presupuesto" },
  { value: "price", label: "Precio" },
  { value: "competitor", label: "Eligió otra opción" },
  { value: "timing", label: "No es el momento" },
  { value: "cancelled", label: "Canceló" },
  { value: "other", label: "Otro motivo" },
] as const;

export type UnqualifiedReason = (typeof UNQUALIFIED_REASONS)[number]["value"];
export type LostReason = (typeof LOST_REASONS)[number]["value"];
export type LeadClosureReason = UnqualifiedReason | LostReason;

export function isNegativeStage(
  kind: StageKind
): kind is "unqualified" | "lost" {
  return kind === "unqualified" || kind === "lost";
}

export function reasonsForStage(kind: StageKind) {
  if (kind === "unqualified") return UNQUALIFIED_REASONS;
  if (kind === "lost") return LOST_REASONS;
  return [];
}

export function isReasonForStage(
  kind: StageKind,
  reason: string | null | undefined
): reason is LeadClosureReason {
  if (!reason) return false;
  return reasonsForStage(kind).some((option) => option.value === reason);
}

export function closureReasonLabel(
  reason: string | null | undefined
): string | null {
  if (!reason) return null;
  const options = [...UNQUALIFIED_REASONS, ...LOST_REASONS];
  return options.find((option) => option.value === reason)?.label ?? reason;
}
