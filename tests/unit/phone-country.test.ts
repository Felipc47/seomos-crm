import { describe, expect, it } from "vitest";
import { countryFromPhone } from "@/lib/phone-country";

describe("countryFromPhone", () => {
  it.each([
    ["573001234567", "CO", "🇨🇴"],
    ["+52 55 1234 5678", "MX", "🇲🇽"],
    ["0034 612 345 678", "ES", "🇪🇸"],
    ["+1 (415) 555-2671", "US", "🇺🇸"],
    ["+1 604 555 2671", "CA", "🇨🇦"],
    ["+1 809 555 2671", "DO", "🇩🇴"],
    ["+7 701 123 4567", "KZ", "🇰🇿"],
  ])("resuelve %s como %s", (phone, code, flag) => {
    expect(countryFromPhone(phone)).toMatchObject({ code, flag });
  });

  it.each([null, undefined, "", "abc", "1234", "999123456789"])(
    "degrada %s sin inventar un país",
    (phone) => {
      expect(countryFromPhone(phone)).toBeNull();
    }
  );
});
