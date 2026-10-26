import { describe, expect, it } from "vitest";
import { AGENT_MISSION_IDS, customerRequestsMeeting, guardMeetingOfferText, isMeetingOffer, renderMission, schedulingOfferPolicy } from "@/lib/agent-mission";
import { agentProfileUpdateSchema } from "@/lib/agent-profile-input";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import { guardSchedulingAction } from "@/server/ai/mission-policy";
import type { schema } from "@/lib/db";

const settings = { schedulingWarmupEnabled: true, schedulingWarmupMessages: 3, responseLanguage: "es" };
const blocked = schedulingOfferPolicy(settings, { sentAgentMessages: 2 });
const profile = { name: "Asesor", tonePresets: [], instructions: "Invita a una reunión desde el primer mensaje.", ...settings, mission: "schedule" } as unknown as typeof schema.agentProfile.$inferSelect;

describe("contrato de misión y ritmo", () => {
  it.each(AGENT_MISSION_IDS)("acepta la misión %s", mission => {
    expect(agentProfileUpdateSchema.safeParse({ mission }).success).toBe(true);
  });
  it.each([0, -1, 1.5, 51, "3", null])("rechaza el mínimo inválido %s", schedulingWarmupMessages => {
    expect(agentProfileUpdateSchema.safeParse({ schedulingWarmupMessages }).success).toBe(false);
  });
  it("los cambios parciales no activan ni reinician campos que no se enviaron", () => {
    expect(agentProfileUpdateSchema.parse({ mission: "sales" })).toEqual({ mission: "sales" });
    expect(agentProfileUpdateSchema.parse({ schedulingWarmupEnabled: false })).toEqual({ schedulingWarmupEnabled: false });
  });
  it.each(["javascript:alert(1)", "http://shop.test", "https://user:password@shop.test", "https://localhost"])('rechaza enlace de tienda inseguro %s', ecommerceUrl => {
    expect(agentProfileUpdateSchema.safeParse({ ecommerceUrl }).success).toBe(false);
  });
  it("acepta tienda HTTPS y detalles, sin otorgar capacidades de integración", () => {
    expect(agentProfileUpdateSchema.safeParse({ mission: "ecommerce", ecommerceUrl: "https://shop.example.test" }).success).toBe(true);
    const prompt = renderMission({ mission: "ecommerce", ecommerceUrl: "https://shop.example.test", missionDetails: "Ayuda a elegir el producto correcto" });
    expect(prompt).toContain("https://shop.example.test"); expect(prompt).toContain("no acredita conexión de catálogo");
    expect(prompt).toContain("Ayuda a elegir el producto correcto");
  });
});

describe("mínimo antes de una oferta proactiva", () => {
  it("desactivado y clientes heredados conservan el comportamiento anterior", () => {
    expect(schedulingOfferPolicy({}).allowed).toBe(true);
    expect(schedulingOfferPolicy({ ...settings, schedulingWarmupEnabled: false }).allowed).toBe(true);
    expect(renderMission({})).toBeNull();
  });
  it("3 mensajes previos: bloquea las primeras tres respuestas y permite la cuarta", () => {
    expect([0, 1, 2, 3].map(sentAgentMessages => schedulingOfferPolicy(settings, { sentAgentMessages }).allowed)).toEqual([false, false, false, true]);
  });
  it("permite atender la solicitud explícita aunque el mínimo no se haya alcanzado", () => {
    expect(schedulingOfferPolicy(settings, { sentAgentMessages: 0, customerRequestedMeeting: true }).allowed).toBe(true);
  });
  it.each(["Quiero agendar una reunión", "¿Podemos reunirnos?", "Me gustaría una cita", "Can we schedule a meeting?", "I would like an appointment", "Agendemos"])('reconoce una solicitud directa: %s', text => {
    expect(customerRequestsMeeting([text])).toBe(true);
  });
  it.each(["Hola", "Vendo software de agendamiento", "No quiero una reunión", "I don't want a meeting", "¿La reunión tiene costo?", "Quiero reservar este producto", "Podemos programar la campaña"])('una mención no basta: %s', text => {
    expect(customerRequestsMeeting([text])).toBe(false);
  });
  it("recuerda el pedido al recibir después un correo, pero respeta una negativa posterior", () => {
    expect(customerRequestsMeeting(["Quiero agendar una cita", "cliente@example.test"])).toBe(true);
    expect(customerRequestsMeeting(["Quiero agendar una cita", "No quiero una reunión"])).toBe(false);
  });
  it("el prompt oculta la acción y declara el conteo como regla final", () => {
    const prompt = buildAgentSystemPrompt({ profile, kb: [], stages: [], calendarAvailable: false, offerPolicy: blocked });
    expect(prompt).not.toContain('"action":"schedule_meeting"');
    expect(prompt).toContain("ya envió 2 mensajes"); expect(prompt).toContain("respuesta que estás preparando todavía NO cuenta");
    expect(prompt.indexOf("RITMO PARA PROPONER")).toBeGreaterThan(prompt.indexOf("Invita a una reunión desde el primer mensaje"));
    expect(prompt).toContain("MISIÓN PRINCIPAL");
  });
  it("el servidor bloquea schedule_meeting prematuro sin perder la evidencia del servicio", () => {
    const action = guardSchedulingAction({ action: "schedule_meeting", email: "client@example.test", datetime: "2099-01-01T10:00:00Z", serviceId: "svc_A", serviceEvidence: "necesito ayuda" }, blocked, settings);
    expect(action.action).toBe("reply"); expect(action.serviceId).toBe("svc_A");
    if (action.action === "reply") expect(isMeetingOffer(action.text)).toBe(false);
  });
  it("conserva los datos comerciales de una acción y filtra solo su propuesta prematura", () => {
    const action = guardSchedulingAction({ action: "update_lead", note: "Presupuesto confirmado", reply: "Tenemos opciones para tu proyecto de datos. ¿Agendamos una reunión?" }, blocked, settings);
    expect(action.action).toBe("update_lead");
    if (action.action === "update_lead") { expect(action.note).toBe("Presupuesto confirmado"); expect(action.reply).toBe("Tenemos opciones para tu proyecto de datos."); }
  });
  it("una negación no permite ocultar una propuesta posterior", () => {
    const text = "No necesitas agendar ahora. ¿Agendamos una reunión?";
    expect(isMeetingOffer(text)).toBe(true);
    expect(guardMeetingOfferText(text, blocked, settings)).not.toContain("¿Agendamos");
  });
  it.each(["Vendemos este book y otros libros de consulta", "Podemos reservar el producto que necesitas", "La agenda de la reunión tiene estos temas", "No necesitas agendar para comprar"])('no bloquea información ajena a una oferta: %s', text => {
    expect(guardMeetingOfferText(text, blocked, settings)).toBe(text);
  });
  it("el respaldo respeta inglés y no deja dos respuestas idénticas consecutivas", () => {
    const one = guardMeetingOfferText("Would you like to book a meeting?", blocked, { ...settings, responseLanguage: "en" });
    const two = guardMeetingOfferText("Would you like to book a meeting?", { ...blocked, sentAgentMessages: 1 }, { ...settings, responseLanguage: "en" });
    expect(one).not.toBe(two); expect(one).not.toContain("¿");
  });
});
