import { describe, expect, it } from "vitest";
import {
  buildWebFormSourceNote,
  canSendWebFormGreeting,
  type WebFormIntegrationContext,
} from "@/server/web-forms/ingest";
import type { WebFormSubmissionInput } from "@/server/web-forms/contract";

const integration: WebFormIntegrationContext = {
  id: "wfi_test",
  organizationId: "org_test",
  name: "Formulario principal",
  serviceId: null,
};

describe("ingesta de formularios web", () => {
  it("construye una nota trazable y elimina controles del contenido externo", () => {
    const input: WebFormSubmissionInput = {
      externalId: "wp-1\ninyectado",
      phone: "573001234567",
      name: "Ada",
      email: "ada@example.com",
      message: "SEO\nurgente",
      source: "landing\tprincipal",
      campaign: "agosto",
      pageUrl: "https://example.com/contacto",
      consent: true,
    };

    expect(buildWebFormSourceNote(integration, input)).toEqual({
      marker: "[Formulario web wfi_test/wp-1 inyectado]",
      note:
        "[Formulario web wfi_test/wp-1 inyectado] Formulario principal · Origen: landing principal · Campaña: agosto · Página: https://example.com/contacto · Consulta: SEO urgente",
    });
  });

  it("permite saludo solo para un contacto nuevo con consentimiento vigente", () => {
    expect(
      canSendWebFormGreeting({
        contactCreated: true,
        consent: true,
        blockedAt: null,
        optedOutAt: null,
      })
    ).toBe(true);

    for (const ineligible of [
      { contactCreated: false, consent: true, blockedAt: null, optedOutAt: null },
      { contactCreated: true, consent: false, blockedAt: null, optedOutAt: null },
      { contactCreated: true, consent: true, blockedAt: new Date(), optedOutAt: null },
      { contactCreated: true, consent: true, blockedAt: null, optedOutAt: new Date() },
    ]) {
      expect(canSendWebFormGreeting(ineligible)).toBe(false);
    }
  });
});
