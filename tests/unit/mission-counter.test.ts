import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ where: vi.fn(), count: 28 }));
vi.mock("@/lib/db", async original => ({ ...await original<typeof import("@/lib/db")>(), getDb: () => ({ select: () => ({ from: () => ({ where: (condition: unknown) => { mocks.where(condition); return Promise.resolve([{ count: mocks.count }]); } }) }) }) }));
import { getSchedulingOfferPolicy } from "@/server/ai/mission-policy";
beforeEach(() => { vi.clearAllMocks(); });
describe("conteo del bot acotado por empresa", () => {
  it("no agrega lecturas para el control apagado", async () => {
    expect((await getSchedulingOfferPolicy("org_A", "cv_A", { schedulingWarmupEnabled: false }, [])).allowed).toBe(true);
    expect(mocks.where).not.toHaveBeenCalled();
  });
  it("usa el total de la conversación y excluye humanos, plantillas, fallos y pendientes sin aceptación", async () => {
    const policy = await getSchedulingOfferPolicy("org_A", "cv_A", { schedulingWarmupEnabled: true, schedulingWarmupMessages: 25 }, []);
    expect(policy.sentAgentMessages).toBe(28); expect(policy.allowed).toBe(true);
    const query = new PgDialect().sqlToQuery(mocks.where.mock.calls[0]![0]);
    expect(query.params).toEqual(expect.arrayContaining(["org_A", "cv_A", "out", true, "template", "failed", "sent", "delivered", "read"]));
    expect(query.sql).toContain("wa_message_id"); expect(query.sql).not.toContain("limit");
  });
});
