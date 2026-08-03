import { describe, expect, it } from "vitest";
import {
  isCommercialMemberRole,
  isEligibleServiceAssignee,
  resolveDetectedService,
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

  it("resuelve únicamente IDs exactos del catálogo tenant-safe", () => {
    const services = [
      { id: "svc_web", name: "Desarrollo web" },
      { id: "svc_seo", name: "SEO" },
    ];
    expect(resolveDetectedService("svc_web", services)).toEqual(services[0]);
    expect(resolveDetectedService("  svc_seo  ", services)).toEqual(services[1]);
    expect(resolveDetectedService("Desarrollo web", services)).toBeNull();
    expect(resolveDetectedService("svc_otro_tenant", services)).toBeNull();
    expect(resolveDetectedService(null, services)).toBeNull();
  });
});
