import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { newId } from "@/lib/db/ids";
import { getSmsAccount } from "@/lib/brevo/account";

type Connection = typeof schema.smsConnection.$inferSelect;
export function publicConnection(row: Connection) {
  return {
    email: row.email, companyName: row.companyName, smsCredits: row.smsCredits,
    keyLast4: row.keyLast4, verifiedAt: row.verifiedAt.toISOString(),
    deliveryEnabled: row.deliveryEnabled, sender: row.sender,
    approvalEvidence: row.approvalEvidence,
    webhookReady: !!row.webhookId && !["pending", "uncertain"].includes(row.webhookId),
    webhookUncertain: row.webhookId === "uncertain" || row.webhookId === "pending",
  };
}
export async function connection(org: string) {
  const [row] = await getDb().select().from(schema.smsConnection)
    .where(scoped(schema.smsConnection.organizationId, org)).limit(1);
  return row;
}
export async function smsConnectionSnapshot(org: string) {
  const row = await connection(org);
  return row ? publicConnection(row) : null;
}
export async function saveSmsConnection(org: string, apiKey: string) {
  const account = await getSmsAccount(apiKey);
  const secret = encryptSecret(apiKey);
  const values = {
    id: newId("smsConnection"), organizationId: org,
    secretCipher: secret.cipher, secretIv: secret.iv, secretTag: secret.tag,
    keyLast4: apiKey.slice(-4), ...account, verifiedAt: new Date(),
  };
  // Validate before mutation: a rejected replacement preserves the saved connection.
  const [row] = await getDb().insert(schema.smsConnection).values(values)
    .onConflictDoUpdate({ target: schema.smsConnection.organizationId, set: {
      secretCipher: values.secretCipher, secretIv: values.secretIv, secretTag: values.secretTag,
      keyLast4: values.keyLast4, ...account, verifiedAt: values.verifiedAt,
      // A replacement must explicitly re-confirm sender and callback setup.
      deliveryEnabled: false, sender: null, approvalEvidence: null,
      webhookId: null, webhookSecret: null,
    } }).returning();
  return publicConnection(row!);
}
export async function refreshSmsConnection(org: string) {
  const row = await connection(org);
  if (!row) return null;
  const apiKey = decryptSecret({ cipher: row.secretCipher, iv: row.secretIv, tag: row.secretTag });
  const account = await getSmsAccount(apiKey);
  // An in-flight check cannot recreate or overwrite a concurrent replacement/disconnection.
  const [updated] = await getDb().update(schema.smsConnection).set({ ...account, verifiedAt: new Date() })
    .where(scoped(schema.smsConnection.organizationId, org, eq(schema.smsConnection.id, row.id))).returning();
  return updated ? publicConnection(updated) : null;
}
export async function disconnectSms(org: string) {
  await getDb().delete(schema.smsConnection).where(scoped(schema.smsConnection.organizationId, org));
}
