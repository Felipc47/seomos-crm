import { parsePhoneNumberFromString } from "libphonenumber-js/min";

export type PhoneCountry = {
  code: string;
  flag: string;
  name: string;
};

const displayNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["es"], { type: "region" })
    : null;

function isoToFlag(code: string): string {
  return [...code]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

/** Resuelve el país probable de un teléfono internacional sin red ni persistencia. */
export function countryFromPhone(phone: string | null | undefined): PhoneCountry | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const international = trimmed.startsWith("00")
    ? `+${trimmed.slice(2)}`
    : trimmed.startsWith("+")
      ? trimmed
      : `+${trimmed}`;

  const parsed = parsePhoneNumberFromString(international);
  if (!parsed?.country || !parsed.isValid()) return null;

  const code = parsed.country;
  return {
    code,
    flag: isoToFlag(code),
    name: displayNames?.of(code) ?? code,
  };
}
