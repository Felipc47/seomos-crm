import { describe, expect, it } from "vitest";
import {
  hasExplicitServiceIntent,
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

  describe("evidencia de intención antes de enrutar", () => {
    const web = { id: "svc_web", name: "Desarrollo web" };
    const check = (
      evidence: string,
      history: { direction: "in" | "out"; text: string; type?: string }[],
      allowUnquotedVisualEvidence = false
    ) =>
      hasExplicitServiceIntent({
        evidence,
        service: web,
        history,
        allowUnquotedVisualEvidence,
      });

    it.each(["Hola", "Soy Juan Fernandino", "Quisiera información"])(
      "rechaza señal prematura aunque el proveedor cite: %s",
      (message) => {
        expect(check(message, [{ direction: "in", text: message }])).toBe(false);
      }
    );

    it("rechaza una cita inventada o tomada del negocio", () => {
      expect(
        check("Necesito desarrollo web", [
          { direction: "in", text: "Hola" },
          { direction: "out", text: "Podemos ayudarte con desarrollo web" },
        ])
      ).toBe(false);
    });

    it("acepta una necesidad concreta desde el primer mensaje", () => {
      const message = "Necesito una tienda virtual con carrito de compras";
      expect(check(message, [{ direction: "in", text: message }])).toBe(true);
    });

    it("acepta una respuesta concreta a una pregunta de calificación", () => {
      expect(
        check("un logo para mi empresa", [
          { direction: "out", text: "¿En qué podemos ayudarte?" },
          { direction: "in", text: "Un logo para mi empresa" },
        ])
      ).toBe(true);
    });

    it("no convierte una descripción general del negocio en necesidad", () => {
      const message = "Tengo una panadería en Bogotá";
      expect(check(message, [{ direction: "in", text: message }])).toBe(false);
      const serviceContext = "Somos una agencia de desarrollo web";
      expect(
        check(serviceContext, [{ direction: "in", text: serviceContext }])
      ).toBe(false);
    });

    it("admite evidencia visual específica solo en el turno de imagen", () => {
      const history = [{ direction: "in" as const, text: "", type: "image" }];
      expect(
        check("captura de una tienda virtual con carrito", history, true)
      ).toBe(true);
      expect(
        check("captura de una tienda virtual con carrito", history, false)
      ).toBe(false);
    });
  });
});
