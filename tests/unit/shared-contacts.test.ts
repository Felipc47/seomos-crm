import { describe, expect, it } from "vitest";
import { contactEmailHref, contactPhoneHref, contactWebHref, parseSharedContacts } from "@/lib/shared-contacts";

describe("contactos compartidos", () => {
  it("extrae todas las fichas sin confundir perfil ni guardar campos desconocidos", () => {
    const cards = parseSharedContacts([{ name: { formatted_name: " Ana " }, phones: [{ phone: "+57 300 123 4567", type: "WORK" }, { wa_id: "14155550100" }], emails: [{ email: "ana@example.test" }], org: { company: "Empresa", title: "Directora" }, addresses: [{ street: "Calle 1", city: "Bogotá" }], urls: [{ url: "https://example.test" }], birthday: "1990-01-02", token: "must-not-persist" }, { name: { first_name: "Luis", last_name: "Pérez" } }]);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ name: "Ana", phones: [{ number: "+57 300 123 4567", label: "WORK" }, { number: "+14155550100", label: "" }], organization: "Empresa · Directora", addresses: ["Calle 1, Bogotá"] });
    expect(cards[1]?.name).toBe("Luis Pérez");
    expect(cards[0]).not.toHaveProperty("token");
  });
  it("datos inesperados no impiden conservar campos o fichas válidos", () => {
    for (const value of [null, {}, "oops", [null, 1, {}, { name: 3, phones: "bad" }]]) expect(parseSharedContacts(value)).toEqual([]);
    expect(parseSharedContacts([{ name: null, phones: [null, { phone: 4 }, { phone: "123456" }], emails: {}, urls: [null] }])[0]?.phones).toEqual([{ number: "123456", label: "" }]);
    expect(parseSharedContacts([{ name: { formatted_name: "a".repeat(2001), first_name: "Válido" } }])[0]?.name).toBe("Válido");
    expect(parseSharedContacts(Array.from({ length: 110 }, () => ({ name: { formatted_name: "Persona" } })))).toHaveLength(100);
  });
  it("solo permite acciones con protocolos y destinos seguros", () => {
    expect(contactPhoneHref("+57 (300) 123-4567")).toBe("tel:+573001234567");
    expect(contactEmailHref("ana@example.test")).toBe("mailto:ana%40example.test");
    expect(contactWebHref("https://example.test/contacto")).toBe("https://example.test/contacto");
    for (const value of ["javascript:alert(1)", "data:text/html,bad", "https://user:secret@example.test", "invalid"]) expect(contactWebHref(value)).toBeUndefined();
    for (const value of ["javascript:alert(1)", "++1234", "12"]) expect(contactPhoneHref(value)).toBeUndefined();
    for (const value of ["ana@example.test?bcc=otro@example.test", "a\nb@example.test", "bad"]) expect(contactEmailHref(value)).toBeUndefined();
  });
});
