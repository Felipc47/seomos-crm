import { describe, expect, it } from "vitest";
import {
  isCommercialMemberRole,
  isEligibleServiceAssignee,
} from "@/server/services/assignment";

describe("asignación comercial por servicio", () => {
  it.each(["commercial", "member"])(
    "acepta el rol comercial vigente o legado: %s",
    (role) => {
      expect(isCommercialMemberRole(role)).toBe(true);
    }
  );

  it.each(["owner", "marketing", "agent_editor", "unknown"])(
    "rechaza roles no comerciales: %s",
    (role) => {
      expect(isCommercialMemberRole(role)).toBe(false);
    }
  );

  it("exige que el miembro pertenezca a la organización activa", () => {
    expect(
      isEligibleServiceAssignee(
        { organizationId: "org_a", role: "commercial" },
        "org_a"
      )
    ).toBe(true);
    expect(
      isEligibleServiceAssignee(
        { organizationId: "org_b", role: "commercial" },
        "org_a"
      )
    ).toBe(false);
  });

  it("rechaza candidatos ausentes aunque el servicio permita quedar sin asignar", () => {
    expect(isEligibleServiceAssignee(undefined, "org_a")).toBe(false);
    expect(isEligibleServiceAssignee(null, "org_a")).toBe(false);
  });
});
