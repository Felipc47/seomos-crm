import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  balance: 0,
  totalGranted: 0,
  totalUsed: 0,
  references: new Set<string>(),
  pendingDelta: 0,
}));

function thenable<T>(value: T) {
  return {
    then: <R>(
      resolve: (result: T) => R | PromiseLike<R>,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(value).then(resolve, reject),
  };
}

vi.mock("@/lib/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db")>();
  const schema = original.schema;

  function createTx() {
    return {
      insert: (table: unknown) => ({
        values: (values: {
          referenceKey?: string;
          delta?: number;
        }) => {
          const persistEntry = () => {
            if (table !== schema.aiCreditEntry || !values.referenceKey) return;
            fake.references.add(values.referenceKey);
            fake.pendingDelta = values.delta ?? 0;
          };
          const chain = {
            onConflictDoNothing: () => ({
              returning: async () => {
                if (
                  values.referenceKey &&
                  fake.references.has(values.referenceKey)
                ) {
                  return [];
                }
                persistEntry();
                return [{ id: "aic_test" }];
              },
              ...thenable(undefined),
            }),
            then: <R>(
              resolve: (result: undefined) => R | PromiseLike<R>,
              reject?: (reason: unknown) => unknown
            ) => {
              persistEntry();
              return Promise.resolve(undefined).then(resolve, reject);
            },
          };
          return chain;
        },
      }),
      update: (table: unknown) => ({
        set: () => ({
          where: () => {
            const applyUpdate = () => {
              if (table !== schema.aiCreditAccount) return [];
              if (fake.pendingDelta < 0) {
                const amount = -fake.pendingDelta;
                if (fake.balance < amount) return [];
                fake.balance -= amount;
                fake.totalUsed += amount;
              } else if (fake.pendingDelta > 0) {
                fake.balance += fake.pendingDelta;
                fake.totalGranted += fake.pendingDelta;
              }
              fake.pendingDelta = 0;
              return [{ balance: fake.balance }];
            };
            return {
              returning: async () => applyUpdate(),
              then: <R>(
                resolve: (result: unknown[]) => R | PromiseLike<R>,
                reject?: (reason: unknown) => unknown
              ) => Promise.resolve(applyUpdate()).then(resolve, reject),
            };
          },
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                balance: fake.balance,
                totalGranted: fake.totalGranted,
                totalUsed: fake.totalUsed,
              },
            ],
          }),
        }),
      }),
    };
  }

  return {
    ...original,
    getDb: () => ({
      transaction: async <T>(callback: (tx: ReturnType<typeof createTx>) => Promise<T>) => {
        const snapshot = {
          balance: fake.balance,
          totalGranted: fake.totalGranted,
          totalUsed: fake.totalUsed,
          references: new Set(fake.references),
          pendingDelta: fake.pendingDelta,
        };
        try {
          return await callback(createTx());
        } catch (error) {
          fake.balance = snapshot.balance;
          fake.totalGranted = snapshot.totalGranted;
          fake.totalUsed = snapshot.totalUsed;
          fake.references = snapshot.references;
          fake.pendingDelta = snapshot.pendingDelta;
          throw error;
        }
      },
      select: createTx().select,
    }),
  };
});

describe("billetera de créditos de IA", () => {
  beforeEach(() => {
    fake.balance = 2;
    fake.totalGranted = 2;
    fake.totalUsed = 0;
    fake.references = new Set();
    fake.pendingDelta = 0;
  });

  it("cobra una referencia una sola vez", async () => {
    const { consumeAiCredits } = await import("@/server/ai/credits");
    const input = {
      organizationId: "org_1",
      amount: 1,
      kind: "agent_turn" as const,
      referenceKey: "agent-turn:cv_1:msg_1",
    };

    await expect(consumeAiCredits(input)).resolves.toEqual({ charged: true });
    await expect(consumeAiCredits(input)).resolves.toEqual({ charged: false });
    expect(fake.balance).toBe(1);
    expect(fake.totalUsed).toBe(1);
  });

  it("revierte el movimiento si no hay saldo", async () => {
    const { AiCreditsExhaustedError, consumeAiCredits } = await import(
      "@/server/ai/credits"
    );
    fake.balance = 0;

    await expect(
      consumeAiCredits({
        organizationId: "org_1",
        amount: 1,
        kind: "follow_up",
        referenceKey: "follow-up:ld_1:1",
      })
    ).rejects.toBeInstanceOf(AiCreditsExhaustedError);
    expect(fake.balance).toBe(0);
    expect(fake.totalUsed).toBe(0);
    expect(fake.references.size).toBe(0);
  });

  it("recarga saldo y conserva los totales auditables", async () => {
    const { grantAiCredits } = await import("@/server/ai/credits");
    await expect(
      grantAiCredits({
        organizationId: "org_1",
        amount: 500,
        actorUserId: "usr_admin",
      })
    ).resolves.toEqual({ balance: 502, totalGranted: 502, totalUsed: 0 });
  });
});
