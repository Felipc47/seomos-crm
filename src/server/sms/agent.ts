import { smsCrmContactCondition } from "./crm-contact";
import { createHash } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { chatJson, type ChatMessage } from "@/lib/ai";
import { decryptSecret } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isAiConfigured, getEnv } from "@/lib/env";
import { smsSegments, isSmsStop } from "@/lib/sms";
import { getSmsAccount } from "@/lib/brevo/account";
import { AgentAction } from "@/server/ai/actions";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import { buildAvailabilityLabel, buildSchedulingContext, fetchAvailabilityByDay } from "@/server/ai/pipeline";
import { guardSchedulingAction } from "@/server/ai/mission-policy";
import { getCalendarSettings } from "@/server/org-settings";
import { getGoogleConnection } from "@/server/google/credentials";
import { listServiceRoutingOptions } from "@/server/services/ai-routing";
import { AGENT_TURN_CREDIT_COST, AiCreditsExhaustedError, consumeAiCredits } from "@/server/ai/credits";
import { matchesHandoffIntent } from "@/server/ai/handoff";
import { activeCompanyCondition, isCompanyServiceActive } from "@/server/company-service";
import { connection } from "./connections";
import { sendSms, SmsError } from "./service";
import { executeSmsAction, smsSchedulingPolicy } from "./agent-actions";
import { handoffSms } from "./handoff";

type PendingTurn = { timer: ReturnType<typeof setTimeout> | null; running: boolean; pending: boolean };
const globalForSmsAgent = globalThis as unknown as { __smsAgentTurns?: Map<string, PendingTurn> };
function turns() {
  return globalForSmsAgent.__smsAgentTurns ??= new Map<string, PendingTurn>();
}

export function scheduleSmsAgentTurn(org: string, contactId: string, immediate = false): void {
  const key = `${org}:${contactId}`;
  const state = turns().get(key) ?? { timer: null, running: false, pending: false };
  turns().set(key, state);
  if (state.running) { state.pending = true; return; }
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    void execute(org, contactId, key);
  }, immediate ? 0 : getEnv().AGENT_COALESCE_MS);
}

async function execute(org: string, contactId: string, key: string): Promise<void> {
  const state = turns().get(key);
  if (!state || state.running) return;
  state.running = true;
  try {
    await runSmsAgentTurn(org, contactId);
  } catch (error) {
    // No registrar contenido de SMS, prompt ni secretos.
    console.error("[sms-agent] turno falló:", error instanceof Error ? error.name : "unknown");
  } finally {
    state.running = false;
    if (state.pending) {
      state.pending = false;
      scheduleSmsAgentTurn(org, contactId, true);
    } else turns().delete(key);
  }
}

async function markHandled(org: string, contactId: string, inboundId: string): Promise<void> {
  await getDb().update(schema.smsContact).set({ aiLastInboundId: inboundId })
    .where(scoped(schema.smsContact.organizationId, org, eq(schema.smsContact.id, contactId), eq(schema.smsContact.aiEnabled, true)));
}

function operationId(inboundId: string): string {
  const hex = createHash("sha256").update(`sms-agent:${inboundId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function runSmsAgentTurn(org: string, contactId: string): Promise<void> {
  if (!isAiConfigured() || !(await isCompanyServiceActive(org))) return;
  const db = getDb();
  const [[contact], [profile], history, kb, smsConnection] = await Promise.all([
    db.select().from(schema.smsContact).where(scoped(schema.smsContact.organizationId, org, eq(schema.smsContact.id, contactId))).limit(1),
    db.select().from(schema.agentProfile).where(scoped(schema.agentProfile.organizationId, org)).limit(1),
    db.select().from(schema.smsMessage).where(scoped(schema.smsMessage.organizationId, org, eq(schema.smsMessage.contactId, contactId)))
      .orderBy(desc(schema.smsMessage.createdAt), desc(schema.smsMessage.id)).limit(12),
    db.select().from(schema.kbEntry).where(scoped(schema.kbEntry.organizationId, org)).limit(100),
    connection(org),
  ]);
  if (!contact?.aiEnabled || contact.optedOutAt || !contact.consentEvidence || !profile?.enabled) return;
  const latest = history[0];
  if (!latest || latest.direction !== "in" || latest.id === contact.aiLastInboundId || isSmsStop(latest.content)) return;
  if (matchesHandoffIntent(latest.content)) { await handoffSms(org, contactId, "cliente"); return; }
  if (!smsConnection?.deliveryEnabled || !smsConnection.sender || !smsConnection.webhookId ||
      ["pending", "uncertain"].includes(smsConnection.webhookId)) return;

  // Comprobar el saldo real antes de gastar un crédito IA; sendSms lo revalida antes del envío.
  try {
    const key = decryptSecret({ cipher: smsConnection.secretCipher, iv: smsConnection.secretIv, tag: smsConnection.secretTag });
    const credits = (await getSmsAccount(key)).smsCredits;
    if (credits === null || credits <= 0) { await handoffSms(org, contactId, "creditos_sms"); return; }
  } catch { return; }

  try {
    await consumeAiCredits({
      organizationId: org, amount: AGENT_TURN_CREDIT_COST, kind: "agent_turn",
      referenceKey: `sms-agent:${contactId}:${latest.id}`,
    });
  } catch (error) {
    if (error instanceof AiCreditsExhaustedError) { await handoffSms(org, contactId, "creditos_ia"); return; }
    throw error;
  }

  const chronological = history.slice().reverse();
  const [stages, services, policy, settings, crm] = await Promise.all([
    db.select({ name: schema.pipelineStage.name, kind: schema.pipelineStage.kind }).from(schema.pipelineStage)
      .where(eq(schema.pipelineStage.organizationId, org)).orderBy(schema.pipelineStage.position),
    listServiceRoutingOptions(org),
    smsSchedulingPolicy(org, contactId, profile, chronological),
    getCalendarSettings(org),
    db.select({ name: schema.contact.name, email: schema.contact.email, notes: schema.contact.notes,
      consentSource: schema.contact.consentSource })
      .from(schema.contact).where(scoped(schema.contact.organizationId, org,
        smsCrmContactCondition(contact))).limit(1).then(rows => rows[0]),
  ]);
  let calendarAvailable = false;
  const scheduling = buildSchedulingContext(settings);
  if (policy.allowed) {
    calendarAvailable = (await getGoogleConnection(org))?.status === "connected";
    const days = await fetchAvailabilityByDay(org, settings);
    if (days.length) scheduling.availabilityLabel = buildAvailabilityLabel(days, settings.timezone);
  }
  const prompt = buildAgentSystemPrompt({ profile, channel: "sms", kb, stages, services,
    offerPolicy: policy, schedulingAvailable: true, scheduling, calendarAvailable,
    contactEmail: crm?.email, contactName: crm?.consentSource === "meta_lead_ads" ? crm.name : null });
  const conversation: ChatMessage[] = [
    { role: "system", content: prompt },
    ...chronological.map(message => ({
      role: message.direction === "in" ? "user" as const : "assistant" as const,
      content: message.content,
    })),
  ];
  let result = await chatJson(AgentAction, conversation);
  const modelText = (action: typeof result) => {
    if (!action.ok) return undefined;
    switch (action.data.action) {
      case "reply": return action.data.text;
      case "update_lead": case "move_stage": case "follow_up_later": return action.data.reply;
      case "handoff": return action.data.farewell;
      default: return undefined;
    }
  };
  if (result.ok && modelText(result) && smsSegments(modelText(result)!).segments > 1) {
    result = await chatJson(AgentAction, [
      ...conversation,
      { role: "system", content: "Tu texto anterior excedía un segmento SMS. Mantén la acción y reduce el texto visible a una frase de máximo 70 caracteres." },
    ]);
  }
  if (!result.ok || (modelText(result) && smsSegments(modelText(result)!).segments > 1)) {
    await handoffSms(org, contactId, "error_modelo"); return;
  }
  const [fresh] = await db.select({ aiEnabled: schema.smsContact.aiEnabled }).from(schema.smsContact)
    .where(scoped(schema.smsContact.organizationId, org, eq(schema.smsContact.id, contactId))).limit(1);
  const [lastNow] = await db.select({ id: schema.smsMessage.id, direction: schema.smsMessage.direction })
    .from(schema.smsMessage).where(scoped(schema.smsMessage.organizationId, org, eq(schema.smsMessage.contactId, contactId)))
    .orderBy(desc(schema.smsMessage.createdAt), desc(schema.smsMessage.id)).limit(1);
  if (!fresh?.aiEnabled || lastNow?.id !== latest.id || lastNow.direction !== "in") return;

  try {
    await executeSmsAction({ org, sms: contact, profile, history: chronological, inbound: latest,
      action: guardSchedulingAction(result.data, policy, profile, latest.content),
      send: async content => {
        await sendSms(org, { contactId, content, operationId: operationId(latest.id) },
          { source: "agent", expectedLatestInboundId: latest.id });
      },
    });
    await markHandled(org, contactId, latest.id);
  } catch (error) {
    if (error instanceof SmsError && ["stale_agent_turn", "agent_paused", "opted_out"].includes(error.code)) return;
    if (error instanceof SmsError && error.code === "no_credits") await handoffSms(org, contactId, "creditos_sms");
    // Un fallo transitorio se recupera por barrido con la misma operación determinística.
  }
}

/** Reencola turnos perdidos tras reinicios, sin tocar chats con IA apagada. */
export async function sweepSmsAgentTurns(): Promise<{ scanned: number; queued: number }> {
  const lastId = sql<string | null>`(
    select m.id from sms_message m
    where m.organization_id = sms_contact.organization_id and m.contact_id = sms_contact.id
    order by m.created_at desc, m.id desc limit 1
  )`;
  const lastDirection = sql<string | null>`(
    select m.direction from sms_message m
    where m.organization_id = sms_contact.organization_id and m.contact_id = sms_contact.id
    order by m.created_at desc, m.id desc limit 1
  )`;
  // Filtrar ANTES del límite evita que 200 contactos sin pendientes oculten los siguientes.
  const contacts = await getDb().select({
    id: schema.smsContact.id, organizationId: schema.smsContact.organizationId,
  }).from(schema.smsContact)
    .innerJoin(schema.organization, eq(schema.smsContact.organizationId, schema.organization.id))
    .where(and(
      activeCompanyCondition(), eq(schema.smsContact.aiEnabled, true), isNull(schema.smsContact.optedOutAt),
      sql`${lastDirection} = 'in'`,
      sql`${lastId} is distinct from ${schema.smsContact.aiLastInboundId}`,
    )).limit(200);
  for (const contact of contacts) scheduleSmsAgentTurn(contact.organizationId, contact.id);
  return { scanned: contacts.length, queued: contacts.length };
}
