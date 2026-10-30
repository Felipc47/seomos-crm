import { z } from "zod";

/** Datos de la ficha, separados del perfil del remitente en value.contacts. */
export type SharedContact = {
  name: string;
  phones: { number: string; label: string }[];
  emails: { email: string; label: string }[];
  organization: string;
  addresses: string[];
  urls: string[];
  birthday: string;
};

const objectSchema = z.record(z.unknown());
const textSchema = z.string().trim().max(2000);
function object(value: unknown): Record<string, unknown> {
  const parsed = objectSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}
function text(value: unknown): string {
  const parsed = textSchema.safeParse(value);
  return parsed.success ? parsed.data : "";
}
function items(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.slice(0, 100).map(object) : [];
}

/** Tolerante a campos opcionales/ilegibles; conserva solo datos conocidos. */
export function parseSharedContacts(value: unknown): SharedContact[] {
  return items(value).flatMap((card) => {
    const name = object(card.name), org = object(card.org);
    const phones = items(card.phones).flatMap((entry) => {
      const waId = text(entry.wa_id);
      const number = text(entry.phone) || (/^\d{3,20}$/.test(waId) ? `+${waId}` : "");
      return number ? [{ number, label: text(entry.type) }] : [];
    });
    const emails = items(card.emails).flatMap((entry) => {
      const email = text(entry.email);
      return email ? [{ email, label: text(entry.type) }] : [];
    });
    const addresses = items(card.addresses).map((entry) =>
      ["street", "city", "state", "zip", "country"].map((key) => text(entry[key])).filter(Boolean).join(", ")
    ).filter(Boolean);
    const urls = items(card.urls).map((entry) => text(entry.url)).filter(Boolean);
    const organization = [org.company, org.department, org.title].map(text).filter(Boolean).join(" · ");
    const birthday = text(card.birthday);
    const displayName = text(name.formatted_name) ||
      [name.prefix, name.first_name, name.middle_name, name.last_name, name.suffix].map(text).filter(Boolean).join(" ");
    if (!displayName && !phones.length && !emails.length && !addresses.length && !urls.length && !organization && !birthday) return [];
    return [{ name: displayName || "Contacto compartido", phones, emails, organization, addresses, urls, birthday }];
  });
}

export function contactPhoneHref(value: string): string | undefined {
  if (!/^\+?[\d\s().-]+$/.test(value)) return undefined;
  const number = value.replace(/[^\d+]/g, "");
  return /^\+?\d{3,20}$/.test(number) ? `tel:${number}` : undefined;
}
export function contactEmailHref(value: string): string | undefined {
  return /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value) ? `mailto:${encodeURIComponent(value)}` : undefined;
}
export function contactWebHref(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
