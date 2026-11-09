import { describe, expect, it } from "vitest";
import { DEFAULT_MEETING_DESCRIPTION, renderMeetingDescription } from "@/lib/calendar-description";

const contact = { name: "Ana María", phone: "573001234567" };

describe("descripción de la invitación", () => {
  it("conserva el texto heredado al no existir configuración", () => {
    expect(renderMeetingDescription(undefined, contact)).toBe("Agendada desde Seomos CRM para Ana María (573001234567).");
    expect(renderMeetingDescription(DEFAULT_MEETING_DESCRIPTION, contact)).toBe(renderMeetingDescription(undefined, contact));
  });
  it("respeta el texto personalizado y los saltos de línea", () => {
    expect(renderMeetingDescription("Hola {{nombre}},\nrevisaremos tu tienda.\nWhatsApp: {{telefono}}", contact))
      .toBe("Hola Ana María,\nrevisaremos tu tienda.\nWhatsApp: 573001234567");
  });
  it("permite omitir la descripción", () => {
    expect(renderMeetingDescription("", contact)).toBe("");
  });
  it("sustituye literalmente, sin interpretar texto del contacto ni variables desconocidas", () => {
    expect(renderMeetingDescription("{{nombre}} / {{telefono}} / {{nombre}} / {{otro}}", { name: "$& {{telefono}}", phone: "123" }))
      .toBe("$& {{telefono}} / 123 / $& {{telefono}} / {{otro}}");
  });
});
