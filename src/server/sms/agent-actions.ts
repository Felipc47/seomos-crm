import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { customerRequestsMeeting, schedulingOfferPolicy } from "@/lib/agent-mission";
import { isValidMeetingStart, localMinutesOfDay, minSchedulableStart } from "@/lib/business-days";
import { isGoogleConfigured } from "@/lib/env";
import { isNegativeStage, isReasonForStage } from "@/lib/lead-closure";
import { inboundMentionsTime, confirmsProposedMeeting, type SchedulingMessage } from "@/server/ai/schedule-confirm";
import { schedulingLanguage } from "@/server/ai/schedule-language";
import { appendLeadNote, fetchAvailabilityByDay, moveLeadToScheduledStage, moveLeadToStage } from "@/server/ai/pipeline";
import { resolveStage, type AgentActionType } from "@/server/ai/actions";
import { getCalendarSettings, getFollowUpSettings } from "@/server/org-settings";
import { getGoogleConnection } from "@/server/google/credentials";
import { ScheduleError, scheduleMeeting } from "@/server/google/scheduling";
import { getMeeting } from "@/server/meetings/repository";
import { listServiceRoutingOptions, routeUnclassifiedLeadByService } from "@/server/services/ai-routing";
import { resolveDetectedService } from "@/server/services/assignment";
import { handoffSms } from "./handoff";
import { armFollowUp, disarmFollowUp } from "@/server/ai/follow-up";

type Sms = typeof schema.smsContact.$inferSelect;
type Profile = typeof schema.agentProfile.$inferSelect;
type SmsMessage = typeof schema.smsMessage.$inferSelect;

export function asksSmsAvailability(text: string, history: SmsMessage[]): boolean {
  const explicit = customerRequestsMeeting([text]);
  if (explicit) return true;
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const asksTimes = /\b(horarios?|agenda|disponibilidad|available|availability|openings|time slots?)\b/.test(normalized);
  return asksTimes && (/(\bagenda\b|horarios disponibles|available|availability)/.test(normalized) ||
    history.some(message => message.direction === "in" && customerRequestsMeeting([message.content])));
}

/** Dos fechas distintas, no horas inventadas ni un rango ambiguo. */
export async function smsSlotOffer(org: string, profile: Profile, history: SmsMessage[]): Promise<string | null> {
  const settings = await getCalendarSettings(org);
  const connected = isGoogleConfigured() && (await getGoogleConnection(org))?.status === "connected";
  const days = await fetchAvailabilityByDay(org, settings);
  const slots = days.filter(day => day.ranges.length > 0).slice(0, 2).map(day => day.ranges[0]!.start);
  const lang = schedulingLanguage(profile.responseLanguage, history.map(message => ({
    direction: message.direction, text: message.content, createdAt: message.createdAt,
  })));
  if (!slots.length) return null;
  const locale = lang === "en" ? "en-US" : "es-CO";
  const label = (date: Date) => date.toLocaleString(locale, {
    timeZone: settings.timezone, weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: settings.timezone, timeZoneName: "short" })
    .formatToParts(slots[0]!).find(part => part.type === "timeZoneName")?.value ?? settings.timezone;
  const times = slots.map(label).join("; ");
  return lang === "en"
    ? `${connected ? "Available" : "Proposed"} (${zone}): ${times}. Which works? Please confirm your email.`
    : `${connected ? "Disponibles" : "Propuestos"} (${zone}): ${times}. ¿Cuál te sirve? Confirma tu correo.`;
}

export async function smsSchedulingPolicy(org: string, smsId: string, profile: Profile, history: SmsMessage[]) {
  const sent = profile.schedulingWarmupEnabled
    ? (await getDb().select({ id: schema.smsMessage.id }).from(schema.smsMessage)
        .where(scoped(schema.smsMessage.organizationId, org,
          eq(schema.smsMessage.contactId, smsId), eq(schema.smsMessage.direction, "out"), eq(schema.smsMessage.source, "agent"))))
        .length
    : 0;
  return schedulingOfferPolicy(profile, { sentAgentMessages: sent,
    customerRequestedMeeting: customerRequestsMeeting(history.filter(message => message.direction === "in").map(message => message.content)) });
}

export async function executeSmsAction(input: {
  org: string; sms: Sms; profile: Profile; history: SmsMessage[]; inbound: SmsMessage;
  action: AgentActionType; send: (content: string) => Promise<void>;
}): Promise<void> {
  const { org, sms, profile, history, inbound, send } = input;
  const db = getDb();
  const [crm] = await db.select({ id: schema.contact.id, email: schema.contact.email })
    .from(schema.contact).where(scoped(schema.contact.organizationId, org,
      eq(schema.contact.phone, sms.phone.replace(/^\+/, "")))).limit(1);
  const services = await listServiceRoutingOptions(org);
  const detected = resolveDetectedService(input.action.serviceId, services);
  if (detected && crm) {
    await routeUnclassifiedLeadByService({ organizationId: org, contactId: crm.id,
      conversationId: sms.id, serviceId: detected.id, serviceEvidence: input.action.serviceEvidence,
      history: history.map(message => ({ direction: message.direction, text: message.content, type: "text" }))
    }).catch(error => console.error("[sms-agent] servicio:", error instanceof Error ? error.name : "unknown"));
  }
  const language = schedulingLanguage(profile.responseLanguage, history.map(message => ({
    direction: message.direction, text: message.content, createdAt: message.createdAt,
  })));
  const en = language === "en";
  const action = input.action;
  switch (action.action) {
    case "none":
      if (asksSmsAvailability(inbound.content, history)) {
        const offer = await smsSlotOffer(org, profile, history);
        if (offer) await send(offer);
        else await handoffSms(org, sms.id, "agenda");
      }
      return;
    case "reply": {
      // Si el cliente pide horarios, el servidor ofrece franjas concretas aunque
      // el modelo dé una respuesta vaga como la vista en la conversación real.
      if (asksSmsAvailability(inbound.content, history)) {
        const offer = await smsSlotOffer(org, profile, history);
        if (offer) { await send(offer); return; }
        await send(en ? "I can't verify the schedule now. A teammate will confirm available times." : "No puedo verificar la agenda ahora. Una persona confirmará los horarios.");
        await handoffSms(org, sms.id, "agenda"); return;
      }
      await send(action.text); return;
    }
    case "handoff":
      if (asksSmsAvailability(inbound.content, history)) {
        const offer = await smsSlotOffer(org, profile, history);
        if (offer) { await send(offer); return; }
      }
      if (action.farewell) await send(action.farewell);
      await handoffSms(org, sms.id, "modelo"); return;
    case "update_lead":
      if (!crm) { await handoffSms(org, sms.id, "sin_contacto"); return; }
      await appendLeadNote(org, crm.id, action.note);
      if (action.reply) await send(action.reply);
      return;
    case "move_stage": {
      const stages = await db.select({ id: schema.pipelineStage.id, name: schema.pipelineStage.name, kind: schema.pipelineStage.kind })
        .from(schema.pipelineStage).where(eq(schema.pipelineStage.organizationId, org)).orderBy(asc(schema.pipelineStage.position));
      const stage = resolveStage(action.stage, stages);
      if (!crm) { await handoffSms(org, sms.id, "sin_contacto"); return; }
      if (stage && (!isNegativeStage(stage.kind) || isReasonForStage(stage.kind, action.reason))) {
        await moveLeadToStage(org, crm.id, stage, action.reason);
      }
      if (action.reply) await send(action.reply);
      return;
    }
    case "follow_up_later": {
      if (!crm) { await handoffSms(org, sms.id, "sin_contacto"); return; }
      if (!(await getFollowUpSettings(org)).enabled) {
        await send(en ? "A teammate will contact you later by SMS." : "Una persona del equipo te contactará luego por SMS.");
        await handoffSms(org, sms.id, "seguimiento"); return;
      }
      const requested = action.datetime ? new Date(action.datetime) : null;
      const due = await armFollowUp({ organizationId: org, contactId: crm.id, channel: "sms",
        requestedAt: requested && Number.isFinite(requested.getTime()) ? requested : null });
      if (!due) { await handoffSms(org, sms.id, "seguimiento"); return; }
      try {
        await send(action.reply ?? (en ? "I will follow up by SMS at the time you requested." : "Te escribiré por SMS más adelante, como pediste."));
      } catch (error) {
        await disarmFollowUp(crm.id);
        throw error;
      }
      return;
    }
    case "schedule_meeting": {
      const settings = await getCalendarSettings(org);
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(action.email.trim()) ? action.email.trim()
        : crm?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(crm.email) ? crm.email : null;
      if (!email) { await send(en ? "To book the call, please confirm your email address." : "Para agendar, confirma tu correo electrónico."); return; }
      const start = new Date(action.datetime);
      if (!Number.isFinite(start.getTime())) { await send(en ? "Which exact date and time works for your call?" : "¿Qué fecha y hora exactas te sirven para la llamada?"); return; }
      const min = minSchedulableStart(new Date(), settings.timezone, { leadDays: settings.leadTimeBusinessDays, workStartMin: settings.workStartMin });
      if (start < min || !isValidMeetingStart(start, settings.timezone, { workStartMin: settings.workStartMin,
        workEndMin: settings.workEndMin, slotMinutes: settings.slotMinutes })) {
        await send((await smsSlotOffer(org, profile, history)) ?? (en ? "Please suggest another business-hour time." : "Propón otra hora de atención.")); return;
      }
      const schedulingHistory: SchedulingMessage[] = history.map(message => ({ direction: message.direction,
        text: message.content, createdAt: message.createdAt }));
      const lastOutgoing = schedulingHistory.findLastIndex(message => message.direction === "out");
      const currentTexts = schedulingHistory.slice(lastOutgoing + 1).map(message => message.text ?? "");
      const rejected = currentTexts.some(text => /\b(?:not available|doesn['’]?t work|can['’]?t|cannot|no puedo|no me sirve|no me funciona)\b|^\s*(?:no|not)\b/i.test(text));
      if (rejected || (!inboundMentionsTime(localMinutesOfDay(start, settings.timezone), currentTexts) &&
        !confirmsProposedMeeting(start, settings.timezone, schedulingHistory))) {
        await send((await smsSlotOffer(org, profile, history)) ?? (en ? "Please confirm your preferred date and time." : "Confirma la fecha y hora que prefieres.")); return;
      }
      if (!crm) { await send(en ? "A teammate will confirm the call with you shortly." : "Una persona del equipo confirmará la llamada."); await handoffSms(org, sms.id, "sin_contacto"); return; }
      const existing = await getMeeting(org, crm.id);
      if (existing?.startAt.getTime() === start.getTime()) return;
      try {
        const booked = await scheduleMeeting({ organizationId: org, contactId: crm.id,
          prospectEmail: email, startIso: start.toISOString(), title: action.title });
        await moveLeadToScheduledStage(org, crm.id);
        const when = start.toLocaleString(en ? "en-US" : "es-CO", { timeZone: settings.timezone, dateStyle: "medium", timeStyle: "short" });
        await send(en
          ? `Booked for ${when}. ${booked.calendarSynced ? `Invite sent to ${email}.` : "Confirmed here by SMS."}`
          : `Reunión para el ${when}. ${booked.calendarSynced ? `Invitación a ${email}.` : "Confirmada aquí por SMS."}`);
      } catch (error) {
        if (error instanceof ScheduleError && error.code === "slot_taken") {
          await send((await smsSlotOffer(org, profile, history)) ?? (en ? "That time is taken. Which other time works?" : "Esa hora está ocupada. ¿Qué otra te sirve?"));
        } else {
          await send(en ? "I couldn't book the call. A teammate will confirm it with you." : "No pude agendar. Una persona del equipo te confirmará.");
          await handoffSms(org, sms.id, "agenda");
        }
      }
      return;
    }
    default:
      await send(en ? "A teammate will help with this request." : "Una persona del equipo te ayudará con esta solicitud.");
      await handoffSms(org, sms.id, "accion_no_disponible");
  }
}
