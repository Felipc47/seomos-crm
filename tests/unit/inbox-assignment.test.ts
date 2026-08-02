import { describe, expect, it, vi } from "vitest";
import {
  deliverTransferNotification,
  isSameAssignment,
  transferAssigneeSchema,
} from "@/server/inbox/assignment";

describe("asignación de chats", () => {
  it("acepta un miembro o null y rechaza campos extra", () => {
    expect(transferAssigneeSchema.parse({ memberId: " mb_123 " })).toEqual({
      memberId: "mb_123",
    });
    expect(transferAssigneeSchema.parse({ memberId: null })).toEqual({
      memberId: null,
    });
    expect(
      transferAssigneeSchema.safeParse({ memberId: "", organizationId: "org_x" })
        .success
    ).toBe(false);
  });

  it("detecta reasignaciones idempotentes, incluido Sin asignar", () => {
    expect(isSameAssignment("mb_a", "mb_a")).toBe(true);
    expect(isSameAssignment(null, null)).toBe(true);
    expect(isSameAssignment("mb_a", "mb_b")).toBe(false);
    expect(isSameAssignment("mb_a", null)).toBe(false);
  });

  it("notifica solo un cambio hacia otra persona", async () => {
    const notify = vi.fn().mockResolvedValue(undefined);
    await expect(
      deliverTransferNotification(
        {
          changed: true,
          targetUserId: "usr_target",
          actorUserId: "usr_actor",
          organizationId: "org_a",
          contactId: "ct_a",
          contactName: "Cliente A",
        },
        notify
      )
    ).resolves.toBe(true);
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "usr_target",
        organizationId: "org_a",
        type: "conversation_assigned",
        href: "/inbox?contact=ct_a",
      })
    );

    notify.mockClear();
    await expect(
      deliverTransferNotification(
        {
          changed: false,
          targetUserId: "usr_target",
          actorUserId: "usr_actor",
          organizationId: "org_a",
          contactId: "ct_a",
          contactName: "Cliente A",
        },
        notify
      )
    ).resolves.toBe(false);
    await expect(
      deliverTransferNotification(
        {
          changed: true,
          targetUserId: "usr_actor",
          actorUserId: "usr_actor",
          organizationId: "org_a",
          contactId: "ct_a",
          contactName: "Cliente A",
        },
        notify
      )
    ).resolves.toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it("degrada si falla la notificación sin lanzar ni revertir", async () => {
    const notify = vi.fn().mockRejectedValue(new Error("notification down"));
    await expect(
      deliverTransferNotification(
        {
          changed: true,
          targetUserId: "usr_target",
          actorUserId: "usr_actor",
          organizationId: "org_a",
          contactId: "ct_a",
          contactName: "Cliente A",
        },
        notify
      )
    ).resolves.toBe(false);
    expect(notify).toHaveBeenCalledOnce();
  });
});
