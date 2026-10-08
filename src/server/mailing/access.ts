import { isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

/** Se consulta siempre en BD: deshabilitar no depende de cookies antiguas. */
export async function isMailingEnabled(organizationId: string): Promise<boolean> {
  const [org] = await getDb()
    .select({ enabled: schema.organization.mailingEnabled })
    .from(schema.organization)
    .where(scoped(schema.organization.id, organizationId, isNull(schema.organization.deletedAt)));
  return org?.enabled === true;
}
