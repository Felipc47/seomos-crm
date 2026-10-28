import { and, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { customerRequestsMeeting, guardMeetingOfferText, schedulingOfferPolicy, type MissionSettings, type SchedulingOfferPolicy } from "@/lib/agent-mission";
import type { AgentActionType } from "./actions";

/** El conteo usa toda la conversación y aceptación del canal, no la ventana de historial del LLM. */
export async function getSchedulingOfferPolicy(organizationId: string, conversationId: string, settings: MissionSettings, inboundTexts: string[]): Promise<SchedulingOfferPolicy> {
  let count = 0;
  if (settings.schedulingWarmupEnabled) {
    const rows = await getDb().select({ count: sql<number>`count(*)::int` }).from(schema.message)
      .where(scoped(schema.message.organizationId, organizationId, and(
        eq(schema.message.conversationId, conversationId), eq(schema.message.direction, "out"),
        eq(schema.message.aiGenerated, true), ne(schema.message.type, "template"), ne(schema.message.status, "failed"),
        or(isNotNull(schema.message.waMessageId), inArray(schema.message.status, ["sent", "delivered", "read"]))
      )));
    count = rows[0]?.count ?? 0;
  }
  return schedulingOfferPolicy(settings, { sentAgentMessages: count, customerRequestedMeeting: customerRequestsMeeting(inboundTexts) });
}

/** Una acción prematura no puede crear una reunión aunque el proveedor ignore las instrucciones. */
export function guardSchedulingAction(action: AgentActionType, policy: SchedulingOfferPolicy, settings: MissionSettings, latestInbound = ""): AgentActionType {
  if (policy.allowed) return action;
  if (action.action === "schedule_meeting") return { action: "reply", text: guardMeetingOfferText("¿Quieres agendar una reunión?", policy, settings, latestInbound), serviceId: action.serviceId, serviceEvidence: action.serviceEvidence };
  if (action.action === "reply") return { ...action, text: guardMeetingOfferText(action.text, policy, settings, latestInbound) };
  if ("reply" in action && action.reply) return { ...action, reply: guardMeetingOfferText(action.reply, policy, settings, latestInbound) };
  if (action.action === "handoff" && action.farewell) return { ...action, farewell: guardMeetingOfferText(action.farewell, policy, settings, latestInbound) };
  return action;
}
