import { isCompanyServiceActive } from "@/server/company-service";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getEnv, isAiConfigured } from "@/lib/env";
import { getSmsAccount } from "@/lib/brevo/account";
import { registerSmsWebhook, sendBrevoSms, SmsProviderError } from "@/lib/brevo/client";
import { type SmsWebhookEvent, smsEventKey } from "@/lib/brevo/events";
import { isSmsStop, nextSmsStatus, type smsContactInput, type smsSenderInput, type smsSendInput } from "@/lib/sms";
import type { z } from "zod";
import { connection, publicConnection } from "./connections";
import { smsCrmContactCondition, smsCrmContactMatch } from "./crm-contact";
import { SmsError } from "./errors";
export { SmsError } from "./errors";

const { smsContact: contacts, smsMessage: messages, smsEvent: events, smsConnection: connections } = schema;
function apiKey(c: typeof connections.$inferSelect) {
  return decryptSecret({ cipher: c.secretCipher, iv: c.secretIv, tag: c.secretTag });
}
export async function configureSmsSender(org: string, input: z.infer<typeof smsSenderInput>) {
  const [updated] = await getDb().update(connections).set({ sender: input.sender, approvalEvidence: input.approvalEvidence, deliveryEnabled: true })
    .where(scoped(connections.organizationId, org)).returning();
  if (!updated) throw new SmsError("not_connected", "Conecta Brevo antes de configurar el remitente.");
  return publicConnection(updated);
}
export async function setupSmsWebhook(org: string) {
  const token = randomBytes(32).toString("hex");
  const c = await getDb().transaction(async tx => {
    const [current] = await tx.select().from(connections).where(scoped(connections.organizationId,org)).for("update");
    if (!current) throw new SmsError("not_connected", "Conecta Brevo primero.");
    if (current.webhookId) {
      if (["pending", "uncertain"].includes(current.webhookId)) throw new SmsError("webhook_uncertain", "La configuración anterior está pendiente de revisión en Brevo. No se creará un duplicado.");
      return null;
    }
    await tx.update(connections).set({ webhookId: "pending", webhookSecret: encryptSecret(token) }).where(scoped(connections.organizationId,org,eq(connections.id,current.id)));
    return current;
  });
  if (!c) return publicConnection((await connection(org))!);
  try {
    const webhookId = await registerSmsWebhook(apiKey(c), `${getEnv().APP_BASE_URL}/api/webhooks/brevo/${encodeURIComponent(org)}`, token);
    const [updated] = await getDb().update(connections).set({ webhookId })
      .where(scoped(connections.organizationId,org,eq(connections.id,c.id),eq(connections.secretCipher,c.secretCipher),eq(connections.webhookId,"pending"))).returning();
    if (!updated) throw new SmsError("connection_changed", "La conexión cambió durante la configuración.");
    return publicConnection(updated);
  } catch (error) {
    const uncertain = !(error instanceof SmsProviderError) || error.code === "uncertain";
    await getDb().update(connections).set({ webhookId: uncertain ? "uncertain" : null, ...(uncertain ? {} : { webhookSecret: null }) })
      .where(scoped(connections.organizationId,org,eq(connections.id,c.id),eq(connections.secretCipher,c.secretCipher),eq(connections.webhookId,"pending")));
    throw error;
  }
}
export async function smsSnapshot(org: string, contactId?: string) {
  // A process restart may leave an attempt in-flight. Never automatically resend it.
  await getDb().update(messages).set({ status: "uncertain", errorCode: "interrupted" })
    .where(scoped(messages.organizationId,org,eq(messages.status,"sending"),sql`${messages.createdAt} < now() - interval '90 seconds'`));
  const lastMessageAt = sql<Date | null>`(
    select m.created_at from sms_message m
    where m.organization_id = ${org} and m.contact_id = sms_contact.id
    order by m.created_at desc, m.id desc limit 1
  )`;
  const lastMessagePreview = sql<string | null>`(
    select m.content from sms_message m
    where m.organization_id = ${org} and m.contact_id = sms_contact.id
    order by m.created_at desc, m.id desc limit 1
  )`;
  const people = (await getDb().select({ contact: contacts, crmName: schema.contact.name, lastMessageAt, lastMessagePreview })
    .from(contacts).leftJoin(schema.contact, smsCrmContactMatch(org)).where(scoped(contacts.organizationId, org))
    .orderBy(desc(sql`coalesce(${lastMessageAt}, ${contacts.createdAt})`)).limit(200))
    .map(({ contact, crmName, lastMessageAt: at, lastMessagePreview: preview }) => ({
      ...contact, name: crmName ?? contact.name, lastMessageAt: at, lastMessagePreview: preview,
    }));
  const history = contactId ? await getDb().select().from(messages).where(scoped(messages.organizationId,org,eq(messages.contactId,contactId)))
    .orderBy(desc(messages.createdAt),desc(messages.id)).limit(200) : [];
  const c = await connection(org);
  return { contacts: people, messages: history.reverse(), connection: c ? {
    sender: c.sender, deliveryEnabled: c.deliveryEnabled, smsCredits: c.smsCredits,
    webhookReady: !!c.webhookId && !["pending","uncertain"].includes(c.webhookId),
  } : null };
}
export async function createSmsContact(org: string, input: z.infer<typeof smsContactInput>) {
  const [row] = await getDb().insert(contacts).values({ id: newId("smsContact"), organizationId: org, ...input })
    .onConflictDoNothing({ target: [contacts.organizationId,contacts.phone] }).returning();
  if (!row) throw new SmsError("duplicate_phone", "Este número ya tiene un contacto SMS. Su consentimiento o baja se conserva.");
  return row;
}
export async function setSmsAgentEnabled(org: string, id: string, enabled: boolean) {
  return getDb().transaction(async tx => {
    const [contact] = await tx.select().from(contacts)
      .where(scoped(contacts.organizationId, org, eq(contacts.id, id))).for("update");
    if (!contact || (enabled && contact.optedOutAt))
      throw new SmsError("not_found", "Contacto SMS no encontrado o dado de baja.", 404);
    if (enabled) {
      if (!isAiConfigured()) throw new SmsError("agent_unavailable", "El proveedor de IA no está configurado.");
      const [profile] = await tx.select({ enabled: schema.agentProfile.enabled })
        .from(schema.agentProfile).where(scoped(schema.agentProfile.organizationId, org)).limit(1);
      if (!profile?.enabled) throw new SmsError("agent_unavailable", "Activa primero el agente de la empresa.");
    }
    // Encender IA atiende únicamente respuestas NUEVAS, nunca un historial anterior.
    const [latest] = enabled ? await tx.select({ id: messages.id, direction: messages.direction })
      .from(messages).where(scoped(messages.organizationId, org, eq(messages.contactId, id)))
      .orderBy(desc(messages.createdAt), desc(messages.id)).limit(1) : [];
    const [row] = await tx.update(contacts).set({
      aiEnabled: enabled,
      ...(enabled ? { handoffAt: null, handoffReason: null } : {}),
      ...(enabled && latest?.direction === "in" ? { aiLastInboundId: latest.id } : {}),
    }).where(scoped(contacts.organizationId, org, eq(contacts.id, id)))
      .returning({ id: contacts.id, aiEnabled: contacts.aiEnabled });
    return row!;
  });
}

export async function optOutSms(org: string, id: string) {
  const [row] = await getDb().update(contacts).set({ optedOutAt: new Date(), aiEnabled: false })
    .where(scoped(contacts.organizationId,org,eq(contacts.id,id))).returning();
  if (!row) throw new SmsError("not_found", "Contacto SMS no encontrado.",404);
  return row;
}
export async function sendSms(org: string, input: z.infer<typeof smsSendInput>, options: { source?: "manual" | "agent" | "automation"; expectedLatestInboundId?: string } = {}) {
  if (!(await isCompanyServiceActive(org))) throw new SmsError("service_suspended", "El servicio de esta empresa está en pausa", 403);
  const findExisting = async () => (await getDb().select().from(messages)
    .where(scoped(messages.organizationId,org,eq(messages.operationId,input.operationId))).limit(1))[0];
  const checkExisting = (row: typeof messages.$inferSelect) => {
    if (row.contactId !== input.contactId || row.content !== input.content) throw new SmsError("operation_conflict", "La operación ya existe con otro contenido.");
    return row;
  };
  const prior = await findExisting(); if (prior) return checkExisting(prior);
  const c = await connection(org);
  if (!c?.deliveryEnabled || !c.sender) throw new SmsError("sender_pending", "Configura un número aprobado en Ajustes → SMS.");
  if (!c.webhookId || ["pending","uncertain"].includes(c.webhookId)) throw new SmsError("webhook_pending", "Activa la recepción de respuestas en Ajustes → SMS.");
  const key = apiKey(c), account = await getSmsAccount(key);
  if (account.smsCredits === null || account.smsCredits <= 0) throw new SmsError("no_credits", "Brevo no informa saldo SMS disponible. Revisa los créditos de la cuenta.");
  const reservation = await getDb().transaction(async tx => {
    const [person] = await tx.select().from(contacts).where(scoped(contacts.organizationId,org,eq(contacts.id,input.contactId))).for("update");
    if (!person) throw new SmsError("not_found", "Contacto SMS no encontrado.",404);
    if (person.optedOutAt || !person.consentEvidence) throw new SmsError("opted_out", "El contacto no permite envíos SMS.");
    const [crmContact] = await tx.select({ blockedAt: schema.contact.blockedAt, optedOutAt: schema.contact.optedOutAt,
      archivedAt: schema.contact.archivedAt, phone: schema.contact.phone }).from(schema.contact)
      .where(scoped(schema.contact.organizationId, org, smsCrmContactCondition(person))).limit(1);
    if (person.crmContactId && crmContact?.phone !== person.phone.slice(1)) {
      throw new SmsError("crm_phone_changed", "El teléfono de la ficha cambió. Para escribir al número nuevo, regístralo con su consentimiento SMS.");
    }
    if (crmContact?.blockedAt || crmContact?.optedOutAt || crmContact?.archivedAt)
      throw new SmsError("crm_blocked", "El contacto está bloqueado, archivado o pidió no recibir mensajes.");
    if (options.expectedLatestInboundId) {
      if (!person.aiEnabled) throw new SmsError("agent_paused", "La IA está pausada.");
      const [latest] = await tx.select({ id: messages.id, direction: messages.direction }).from(messages)
        .where(scoped(messages.organizationId, org, eq(messages.contactId, person.id)))
        .orderBy(desc(messages.createdAt), desc(messages.id)).limit(1);
      if (latest?.id !== options.expectedLatestInboundId || latest.direction !== "in")
        throw new SmsError("stale_agent_turn", "El hilo cambió mientras el agente preparaba su respuesta.");
    }
    const [row] = await tx.insert(messages).values({ id: newId("smsMessage"), organizationId: org,
      contactId: person.id, operationId: input.operationId, direction: "out", content: input.content,
      sender: c.sender!, source: options.source ?? "manual", status: "sending" }).onConflictDoNothing({ target: [messages.organizationId,messages.operationId] }).returning();
    return { row, person };
  });
  if (!reservation.row) return checkExisting((await findExisting())!);
  const row = reservation.row;
  try {
    const providerMessageId = await sendBrevoSms(key,{ recipient: reservation.person.phone, sender: c.sender, content: row.content, tag: row.id });
    await getDb().update(messages).set({ providerMessageId,
      status: sql`case when ${messages.status} in ('sending','uncertain') then 'accepted' else ${messages.status} end`, errorCode: null })
      .where(scoped(messages.organizationId,org,eq(messages.id,row.id)));
  } catch (error) {
    const code = error instanceof SmsProviderError ? error.code : "uncertain";
    await getDb().update(messages).set({ status: code === "uncertain" ? "uncertain" : "failed", errorCode: code })
      .where(scoped(messages.organizationId,org,eq(messages.id,row.id),inArray(messages.status,["sending","uncertain"])));
  }
  await processSmsEvents(org);
  return (await findExisting())!;
}
export async function authenticateSmsWebhook(org: string, authorization: string | null) {
  const c = await connection(org); if (!c?.webhookSecret || !authorization?.startsWith("Bearer ")) return false;
  const actual = createHash("sha256").update(authorization.slice(7)).digest();
  const expected = createHash("sha256").update(decryptSecret(c.webhookSecret)).digest();
  return timingSafeEqual(actual,expected);
}
export async function ingestSmsEvent(org: string, event: SmsWebhookEvent) {
  await getDb().insert(events).values({ id: newId("smsEvent"), organizationId: org, eventKey: smsEventKey(event), payload: event })
    .onConflictDoNothing({ target: [events.organizationId,events.eventKey] });
  await processSmsEvents(org);
}
async function processSmsEvents(org: string) {
  const pending = await getDb().select({ id: events.id }).from(events).where(scoped(events.organizationId,org,isNull(events.processedAt)))
    .orderBy(asc(events.createdAt)).limit(100);
  for (const item of pending) {
    const processed = await getDb().transaction(async tx => {
    const [record] = await tx.select().from(events).where(scoped(events.organizationId,org,eq(events.id,item.id),isNull(events.processedAt))).for("update");
    if (!record) return;
    const e = record.payload;
    const [message] = await tx.select().from(messages).where(scoped(messages.organizationId,org,eq(messages.direction,"out"),
      or(eq(messages.providerMessageId,e.messageId), e.tags.length ? inArray(messages.id,e.tags) : undefined))).for("update").limit(1);
    if (!message) return; // Durable early event: process again after provider acceptance.
    const [person] = await tx.select().from(contacts).where(scoped(contacts.organizationId,org,eq(contacts.id,message.contactId))).for("update");
    if (!person || person.phone !== e.phone) {
      await tx.update(events).set({ processedAt: new Date() }).where(scoped(events.organizationId,org,eq(events.id,record.id))); return;
    }
    let insertedInbound = false;
    if (e.status === "replied" && e.reply) {
      const inserted = await tx.insert(messages).values({ id: newId("smsMessage"), organizationId: org,
        contactId: person.id, operationId: `event:${record.eventKey}`, direction: "in", content: e.reply,
        sender: person.phone, status: "received" }).onConflictDoNothing({ target: [messages.organizationId,messages.operationId] }).returning({ id: messages.id });
      insertedInbound = !!inserted[0];
    }
    if (["unsubscribe","unsubscribed","bl"].includes(e.status) || (e.status === "replied" && e.reply && isSmsStop(e.reply)))
      await tx.update(contacts).set({ optedOutAt: person.optedOutAt ?? new Date(), aiEnabled: false }).where(scoped(contacts.organizationId,org,eq(contacts.id,person.id)));
    if (!message.providerMessageId && e.messageId !== "0") await tx.update(messages).set({ providerMessageId: e.messageId })
      .where(scoped(messages.organizationId,org,eq(messages.id,message.id)));
    const next = nextSmsStatus(message.status,e.status);
    if (next !== message.status) await tx.update(messages).set({ status: next, errorCode: next === "failed" ? "provider_delivery" : null })
      .where(scoped(messages.organizationId,org,eq(messages.id,message.id)));
    await tx.update(events).set({ processedAt: new Date() }).where(scoped(events.organizationId,org,eq(events.id,record.id)));
    return { inboundPhone: insertedInbound ? person.phone : null,
      agentContactId: insertedInbound && person.aiEnabled && !person.optedOutAt && e.reply && !isSmsStop(e.reply)
        ? person.id : null };
    });
    if (processed?.inboundPhone) {
      const [crm] = await getDb().select({ id: schema.contact.id }).from(schema.contact)
        .where(scoped(schema.contact.organizationId, org,
          eq(schema.contact.phone, processed.inboundPhone.replace(/^\+/, "")))).limit(1);
      if (crm) {
        try {
          const { cancelFollowUpOnInbound } = await import("@/server/ai/follow-up");
          await cancelFollowUpOnInbound(org, crm.id);
        } catch (error) {
          console.error("[sms] no se pudo cancelar el seguimiento tras la respuesta:", error instanceof Error ? error.name : "unknown");
        }
      }
    }
    if (processed?.agentContactId) {
      // La respuesta al webhook no depende del LLM; el barrido recupera un turno perdido por reinicio.
      try {
        const { scheduleSmsAgentTurn } = await import("./agent");
        scheduleSmsAgentTurn(org, processed.agentContactId);
      } catch (error) {
        console.error("[sms-agent] no se pudo encolar el turno:", error);
      }
    }
  }
}
