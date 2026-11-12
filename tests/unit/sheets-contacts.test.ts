import { describe, it, expect, vi, afterEach } from "vitest";
import { parseSheetsUrl, parseSheetContacts, mergeSheetContact } from "@/lib/sheets-contacts";
import { allowedSheetsRedirect, fetchSheetCsv } from "@/lib/google/sheets";
const sheet = "123456789012345678901234567890", source = { spreadsheetId: sheet, sheetGid: "0" };
const header = 'id,full_name,phone_number,email,company_name,"what_needs_improvement?"\n';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Sheets contact synchronization", () => {
  it("normalizes Google links without forwarding arbitrary query parameters", () => {
    expect(parseSheetsUrl(`https://docs.google.com/spreadsheets/d/${sheet}/edit?gid=2&bad=1#gid=3`)).toEqual({ spreadsheetId: sheet, sheetGid: "3" });
    for (const url of ["http://localhost", `https://docs.google.com.evil.test/spreadsheets/d/${sheet}`, `https://a:b@docs.google.com/spreadsheets/d/${sheet}`, `https://docs.google.com/spreadsheets/d/${sheet}?gid=foo`]) expect(() => parseSheetsUrl(url)).toThrow();
  });
  it("imports Meta prefixes, multiline answers and stable IDs", () => {
    const { contacts, issues } = parseSheetContacts(header + 'l:123,Ana,p:+1 (202) 555-0101,ana@example.test,Example,"Stock, orders\nand invoicing"');
    expect(issues).toEqual([]); expect(contacts[0]).toMatchObject({ externalKey: "l:123", name: "Ana", phone: "12025550101" });
    expect(contacts[0]?.details).toContain('Stock, orders\\nand invoicing');
  });
  it("reports source row numbers across blank rows, rejects junk and duplicates", () => {
    const result = parseSheetContacts(header + 'l:1,Ana,p:+12025550101,,,\n,,,,,\nl:2,Invalid,abc12025550102,,,\nl:1,Dup,+12025550103,,,');
    expect(result.contacts).toHaveLength(1); expect(result.issues.map(i => i.row)).toEqual([4, 5]);
    expect(() => parseSheetContacts("id,ad_name,campaign_id\n1,Something,123456789")).toThrow();
    expect(() => parseSheetContacts(header + '1,"unclosed')).toThrow();
  });
  it("preserves manual edits and empty incoming values while refreshing owned fields", () => {
    const old = { phone: "12025550101", name: "Ana", email: "ana@example.test", noteBlock: "[source]\nold" };
    const next = { ...old, name: "Ana Updated", email: null, noteBlock: "[source]\nnew" };
    expect(mergeSheetContact({ phone: old.phone, name: "Manual", email: "manual@example.test", notes: "Operator notes\n\n[source]\nold" }, old, next))
      .toEqual({ name: "Manual", email: "manual@example.test", notes: "Operator notes\n\n[source]\nnew" });
    expect(mergeSheetContact({ phone: old.phone, name: "Ana", email: old.email, notes: "Edited notes" }, old, next))
      .toEqual({ name: "Ana Updated", email: old.email, notes: "Edited notes" });
  });
  it("accepts only Google export redirect hosts", () => {
    expect(allowedSheetsRedirect(new URL("https://doc-123.googleusercontent.com/export"))).toBe(true);
    for (const url of ["http://docs.google.com", "https://googleusercontent.com.evil.test", "https://127.0.0.1", "https://docs.google.com:444"]) expect(allowedSheetsRedirect(new URL(url))).toBe(false);
  });
  it("rejects HTML, untrusted redirects and oversized bodies without leaking responses", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const response of [new Response("private secret", { headers: { "content-type": "text/html" } }), new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } }), new Response("csv", { headers: { "content-type": "text/csv", "content-length": "6000000" } })]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(fetchSheetCsv(source)).rejects.toThrow(/hoja|5 MB/);
    }
  });
  it("caps network failures with a safe retry message", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret-token")));
    await expect(fetchSheetCsv(source)).rejects.toThrow("Se reintentará");
  });
});
