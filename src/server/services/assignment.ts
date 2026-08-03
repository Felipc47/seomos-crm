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
