import { beforeEach, describe, expect, it, vi } from "vitest";
import { serviceChangeSchema } from "@/lib/company-service";

const state = vi.hoisted(() => ({ row: null as null | { id: string; suspendedAt?: Date | null } }));
vi.mock("@/lib/db", async () => {
  const schema = await import("@/lib/db/schema");
  const query = { from: () => query, where: () => query, limit: async () => state.row ? [state.row] : [] };
  return { schema, getDb: () => ({ select: () => query }) };
});
import { isCompanyServiceActive, getCompanyService } from "@/server/company-service";

beforeEach(() => { state.row = null; });
describe("control del servicio", () => {
  it("una organización inexistente o excluida no habilita envíos", async () => {
    expect(await isCompanyServiceActive("org_missing")).toBe(false);
    expect(await getCompanyService("org_missing")).toBeNull();
  });
  it("la guarda exige un tenant explícito", async () => {
    await expect(isCompanyServiceActive("")).rejects.toThrow("organizationId vacío");
  });
  it("rechaza avisos vacíos, demasiado largos o motivos desconocidos", () => {
    for (const input of [
      { enabled: false, reason: "custom", message: "  " },
      { enabled: false, reason: "maintenance", message: "a".repeat(501) },
      { enabled: false, reason: "unknown" },
      { enabled: "false", reason: "payment" },
      { enabled: true, organizationId: "other" },
    ]) expect(serviceChangeSchema.safeParse(input).success).toBe(false);
  });
  it("permite reactivar sin motivo y personalizar los avisos con texto plano", () => {
    expect(serviceChangeSchema.parse({ enabled: true })).toEqual({ enabled: true });
    expect(serviceChangeSchema.parse({ enabled: false, reason: "custom", message: "  Volvemos pronto  " })).toEqual({ enabled: false, reason: "custom", message: "Volvemos pronto" });
  });
});
