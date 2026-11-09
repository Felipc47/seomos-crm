import { describe, expect, it } from "vitest";
import { confirmsProposedMeeting, type SchedulingMessage } from "@/server/ai/schedule-confirm";
import { schedulingLanguage, schedulingDate } from "@/server/ai/schedule-language";

const createdAt = new Date("2026-11-08T17:00:00Z");
const friday = new Date("2026-11-13T10:00:00-05:00");
const thursday = new Date("2026-11-12T13:00:00-05:00");
const tz = "America/New_York";
const one = "Just to confirm, does Friday, November 13 at 10:00 a.m. ET work for you?";
const many = "I can offer Thursday, November 12 at 1:00 p.m. or 3:00 p.m. ET, or Friday, November 13 at 10:00 a.m. ET. Which works best?";
function history(proposal: string, response: string): SchedulingMessage[] {
  return [{ direction: "out", text: proposal, createdAt }, { direction: "in", text: response, createdAt }];
}
function confirms(proposal: string, response: string, target = friday) {
  return confirmsProposedMeeting(target, tz, history(proposal, response));
}
describe("contextual meeting confirmation", () => {
  it.each(["Yes", "yes, thanks!", "OK", "Sure", "That works for me", "Sí", "perfecto", "de acuerdo"])("accepts %s against the exact single proposal", response => {
    expect(confirms(one, response)).toBe(true);
  });
  it("the reported exchange: Friday selects the unique Friday option immediately", () => {
    expect(confirms(many, "Friday")).toBe(true);
    expect(confirms(many, "Friday works for me")).toBe(true);
    expect(confirms(many, "Thursday", thursday)).toBe(false);
    expect(confirms("Thursday afternoon or Friday at 10 am?", "Yes")).toBe(false);
    expect(confirms("Thursday afternoon or Friday at 10 am?", "Friday")).toBe(true);
  });
  it.each(["Yes", "OK", "?", "No", "Yes, but later", "I'm not available", "Thanks"])("rejects ambiguous or non-confirming %s", response => {
    expect(confirms(many, response)).toBe(false);
  });
  it.each(["No", "?", "Yes?", "No, Friday doesn't work", "yes but not at 10", "Yes, can you explain your pricing?"])("does not accept %s", response => {
    expect(confirms(one, response)).toBe(false);
  });
  it("cannot book a different date, time, year or business timezone", () => {
    for (const target of [thursday, new Date("2026-11-13T11:00:00-05:00"), new Date("2027-11-13T10:00:00-05:00")]) {
      expect(confirms(one, "Yes", target)).toBe(false);
    }
    expect(confirmsProposedMeeting(friday, "America/Los_Angeles", history(one, "Yes"))).toBe(false);
  });
  it("accepts Spanish dates and an unambiguous day selection", () => {
    expect(confirms("¿Te sirve el viernes, 13 de noviembre a las 10:00 a. m.?", "Sí")).toBe(true);
    expect(confirms("Jueves, 12 de noviembre a la 1:00 p. m. o 3:00 p. m.; viernes, 13 de noviembre a las 10:00 a. m.", "viernes")).toBe(true);
  });
  it("does not treat a range, unrelated question, missing time or stale yes as a slot", () => {
    expect(confirms("Friday, November 13 from 9:00 a.m. to 5:00 p.m.", "Yes")).toBe(false);
    expect(confirms("Viernes, 13 de noviembre de 9:00 a. m. a 5:00 p. m.", "sí")).toBe(false);
    expect(confirms("Can I have your email?", "Yes")).toBe(false);
    expect(confirms("Does Friday work?", "Yes")).toBe(false);
    expect(confirmsProposedMeeting(friday, tz, [...history(one, "Yes"), ...history("Can I help with anything else?", "OK")])).toBe(false);
    expect(confirmsProposedMeeting(friday, tz, [...history(one, "Yes"), { direction: "in", text: "Actually no", createdAt }])).toBe(false);
  });
  it("rejects inconsistent weekdays, occupied offers, multiple questions and fractional minutes", () => {
    expect(confirms("Friday, November 12 at 10 am?", "Yes", new Date("2026-11-12T10:00:00-05:00"))).toBe(false);
    expect(confirms("Friday, November 13 at 10 am is already booked.", "Yes")).toBe(false);
    expect(confirms("Does Friday, November 13 at 10 am work? Can I have your email?", "Yes")).toBe(false);
    expect(confirms(one, "Yes", new Date("2026-11-13T10:00:30-05:00"))).toBe(false);
  });
  it("resolves weekday and year from the proposal date across New Year and DST", () => {
    expect(confirms("Does Friday at 10 am work?", "Yes")).toBe(true);
    expect(confirmsProposedMeeting(new Date("2027-01-04T10:00:00-05:00"), tz, history("Monday, January 4 at 10 am?", "Yes").map(m => ({ ...m, createdAt: new Date("2026-12-30T15:00:00Z") })))).toBe(true);
    expect(confirmsProposedMeeting(new Date("2027-03-15T10:00:00-04:00"), tz, history("Monday, March 15, 2027 at 10 am?", "Yes"))).toBe(true);
  });
});

describe("scheduling language", () => {
  it("honors fixed profiles and bilingual short confirmations", () => {
    expect(schedulingLanguage("en", history(one, "Sí"))).toBe("en");
    expect(schedulingLanguage("es", history(one, "Yes"))).toBe("es");
    expect(schedulingLanguage(undefined, [])).toBe("es");
    expect(schedulingLanguage("es-en", history(one, "OK"))).toBe("en");
    expect(schedulingLanguage("es-en", history("¿Te sirve el viernes a las 10?", "OK"))).toBe("es");
    expect(schedulingLanguage("es-en", history(one, "Sí"))).toBe("es");
    expect(schedulingLanguage("es-en", history(one, "Please reply in Spanish"))).toBe("es");
    expect(schedulingLanguage("es-en", history(one, "Por favor en inglés"))).toBe("en");
  });
  it("formats dates in the selected language and business timezone", () => {
    expect(schedulingDate(friday, tz, "en")).toMatch(/Friday.*November 13.*10:00.*EST/);
    expect(schedulingDate(friday, tz, "es")).toContain("viernes");
  });
});
