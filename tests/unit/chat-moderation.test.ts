import { describe, expect, it } from "vitest";
import {
  bulkConversationActionSchema,
  reportReasonLabel,
} from "@/server/inbox/moderation";
import { buildBlockUsersBody } from "@/server/whatsapp/blocked-users";

describe("moderación de chats", () => {
  it("deduplica un lote explícito sin cambiar el orden", () => {
    const parsed = bulkConversationActionSchema.parse({
      action: "delete",
      conversationIds: ["cv_a", "cv_b", "cv_a"],
    });
    expect(parsed.conversationIds).toEqual(["cv_a", "cv_b"]);
  });

  it("limita los lotes a 100 conversaciones", () => {
    const ids = Array.from({ length: 101 }, (_, index) => `cv_${index}`);
    expect(
      bulkConversationActionSchema.safeParse({
        action: "block",
        conversationIds: ids,
      }).success
    ).toBe(false);
  });

  it("exige motivo al reportar y rechaza campos de reporte en otras acciones", () => {
    expect(
      bulkConversationActionSchema.safeParse({
        action: "report",
        conversationIds: ["cv_a"],
      }).success
    ).toBe(false);
    expect(
      bulkConversationActionSchema.safeParse({
        action: "delete",
        conversationIds: ["cv_a"],
        reason: "spam",
      }).success
    ).toBe(false);
  });

  it("acepta las cinco razones y entrega etiquetas legibles", () => {
    const reasons = [
      "spam",
      "harassment",
      "fraud",
      "inappropriate",
      "other",
    ] as const;
    for (const reason of reasons) {
      const parsed = bulkConversationActionSchema.parse({
        action: "report",
        conversationIds: ["cv_a"],
        reason,
        notes: "Contexto interno",
      });
      if (parsed.action !== "report") throw new Error("Acción inesperada");
      expect(parsed.reason).toBe(reason);
      expect(reportReasonLabel(reason).length).toBeGreaterThan(2);
    }
  });

  it("construye el payload oficial de Meta con teléfonos normalizados", () => {
    expect(buildBlockUsersBody(["5215512345678", "+573001112233"])).toEqual({
      messaging_product: "whatsapp",
      block_users: [{ user: "525512345678" }, { user: "573001112233" }],
    });
  });
});
