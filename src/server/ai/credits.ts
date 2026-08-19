import { gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

export const AGENT_TURN_CREDIT_COST = 1;
export const FOLLOW_UP_CREDIT_COST = 1;

export type AiCreditSummary = {
  balance: number;
  totalGranted: number;
  totalUsed: number;
};

export type AiCreditConsumerKind = "agent_turn" | "follow_up";

export type AiCreditsTx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export class AiCreditsExhaustedError extends Error {
  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Créditos de IA insuficientes: requiere ${required}, disponible ${available}`
    );
    this.name = "AiCreditsExhaustedError";
  }
}

const ZERO_SUMMARY: AiCreditSummary = {
  balance: 0,
  totalGranted: 0,
  totalUsed: 0,
};

async function ensureAccount(
  tx: AiCreditsTx,
  organizationId: string
): Promise<void> {
  await tx
    .insert(schema.aiCreditAccount)
    .values({ organizationId })
    .onConflictDoNothing();
}

async function summaryIn(
  tx: AiCreditsTx,
  organizationId: string
): Promise<AiCreditSummary> {
  const rows = await tx
    .select({
      balance: schema.aiCreditAccount.balance,
      totalGranted: schema.aiCreditAccount.totalGranted,
      totalUsed: schema.aiCreditAccount.totalUsed,
    })
    .from(schema.aiCreditAccount)
    .where(scoped(schema.aiCreditAccount.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? ZERO_SUMMARY;
}

export async function getAiCreditSummary(
  organizationId: string
): Promise<AiCreditSummary> {
  const db = getDb();
  const rows = await db
    .select({
      balance: schema.aiCreditAccount.balance,
      totalGranted: schema.aiCreditAccount.totalGranted,
      totalUsed: schema.aiCreditAccount.totalUsed,
    })
    .from(schema.aiCreditAccount)
    .where(scoped(schema.aiCreditAccount.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? ZERO_SUMMARY;
}

/**
 * Reserva atómica dentro de una transacción ya abierta. Un referenceKey
 * repetido significa "ya pagado" y no vuelve a descontar.
 */
export async function consumeAiCreditsTx(
  tx: AiCreditsTx,
  input: {
    organizationId: string;
    amount: number;
    kind: AiCreditConsumerKind;
    referenceKey: string;
  }
): Promise<{ charged: boolean }> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("El consumo de créditos debe ser un entero positivo");
  }
  await ensureAccount(tx, input.organizationId);

  const inserted = await tx
    .insert(schema.aiCreditEntry)
    .values({
      id: newId("aiCreditEntry"),
      organizationId: input.organizationId,
      delta: -input.amount,
      kind: input.kind,
      referenceKey: input.referenceKey,
    })
    .onConflictDoNothing({
      target: [
        schema.aiCreditEntry.organizationId,
        schema.aiCreditEntry.referenceKey,
      ],
    })
    .returning({ id: schema.aiCreditEntry.id });

  if (!inserted[0]) return { charged: false };

  const updated = await tx
    .update(schema.aiCreditAccount)
    .set({
      balance: sql`${schema.aiCreditAccount.balance} - ${input.amount}`,
      totalUsed: sql`${schema.aiCreditAccount.totalUsed} + ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(
      scoped(
        schema.aiCreditAccount.organizationId,
        input.organizationId,
        gte(schema.aiCreditAccount.balance, input.amount)
      )
    )
    .returning({ balance: schema.aiCreditAccount.balance });

  if (!updated[0]) {
    const current = await summaryIn(tx, input.organizationId);
    // El throw revierte también el movimiento recién insertado.
    throw new AiCreditsExhaustedError(input.amount, current.balance);
  }
  return { charged: true };
}

export async function consumeAiCredits(input: {
  organizationId: string;
  amount: number;
  kind: AiCreditConsumerKind;
  referenceKey: string;
}): Promise<{ charged: boolean }> {
  return getDb().transaction((tx) => consumeAiCreditsTx(tx, input));
}

/** Recarga manual; solo debe invocarla una superficie ya autorizada. */
export async function grantAiCredits(input: {
  organizationId: string;
  amount: number;
  actorUserId: string;
}): Promise<AiCreditSummary> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("La recarga debe ser un entero positivo");
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    await ensureAccount(tx, input.organizationId);
    const entryId = newId("aiCreditEntry");
    await tx.insert(schema.aiCreditEntry).values({
      id: entryId,
      organizationId: input.organizationId,
      delta: input.amount,
      kind: "admin_grant",
      referenceKey: `admin-grant:${entryId}`,
      actorUserId: input.actorUserId,
    });
    await tx
      .update(schema.aiCreditAccount)
      .set({
        balance: sql`${schema.aiCreditAccount.balance} + ${input.amount}`,
        totalGranted: sql`${schema.aiCreditAccount.totalGranted} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(
        scoped(schema.aiCreditAccount.organizationId, input.organizationId)
      );
    return summaryIn(tx, input.organizationId);
  });
}
