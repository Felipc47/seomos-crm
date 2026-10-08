import { isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { getEnv } from "@/lib/env";

export function canConfigureMailingTracking(sender: { managesDomain: boolean; domain: string }): boolean {
  const transactionalDomain = getEnv().RESEND_FROM_EMAIL?.split("@")[1]?.toLowerCase();
  return sender.managesDomain && sender.domain !== transactionalDomain;
}

/** Se consulta siempre en BD: deshabilitar no depende de cookies antiguas. */
export async function isMailingEnabled(organizationId: string): Promise<boolean> {
  const [org] = await getDb()
    .select({ enabled: schema.organization.mailingEnabled })
    .from(schema.organization)
    .where(scoped(schema.organization.id, organizationId, isNull(schema.organization.deletedAt)));
  return org?.enabled === true;
}
