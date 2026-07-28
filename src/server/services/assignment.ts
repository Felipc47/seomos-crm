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
