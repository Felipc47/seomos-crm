import { and, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { SERVICE_NOTICES } from "@/lib/company-service";

export class ServiceSuspendedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceSuspendedError";
  }
}

/** Solo para enumeración de tenants y joins de schedulers/credenciales. */
export function activeCompanyCondition() {
  return and(isNull(schema.organization.deletedAt), isNull(schema.organization.suspendedAt))!;
}

export async function getCompanyService(organizationId: string) {
  const [org] = await getDb().select({
    name: schema.organization.name,
    suspendedAt: schema.organization.suspendedAt,
    reason: schema.organization.suspensionReason,
    message: schema.organization.suspensionMessage,
  }).from(schema.organization)
    .where(scoped(schema.organization.id, organizationId, isNull(schema.organization.deletedAt))).limit(1);
  if (!org) return null;
  const reason = org.reason ?? "custom";
  return { ...org, reason, title: SERVICE_NOTICES[reason].title, message: org.message ?? SERVICE_NOTICES[reason].message };
}

export async function isCompanyServiceActive(organizationId: string): Promise<boolean> {
  const [org] = await getDb().select({ id: schema.organization.id }).from(schema.organization)
    .where(scoped(schema.organization.id, organizationId, activeCompanyCondition())).limit(1);
  return Boolean(org);
}
