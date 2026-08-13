import { and, eq, isNull, lt, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { publish } from "@/server/events/bus";
import { notifyNewLeadByEmailSafely } from "@/server/email/new-lead";
import {
  getOrCreateContact,
  getOrCreateConversation,
} from "@/server/inbox/ingest";
import { ensureLeadActivity } from "@/server/inbox/lead-activity";
import { notifyUser } from "@/server/notifications";
import { getLeadgenSettings } from "@/server/org-settings";
import { sendTemplate } from "@/server/whatsapp/templates";
import type { WebFormSubmissionInput } from "./contract";

export type WebFormIntegrationContext = {
  id: string;
  organizationId: string;
  name: string;
  serviceId: string | null;
};

export type WebFormIngestResult = {
  duplicate: boolean;
  submissionId: string;
  contactId: string | null;
  leadId: string | null;
  conversationId: string | null;
  contactName: string | null;
  contactCreated: boolean;
  leadCreated: boolean;
  consent: boolean;
};

const PROCESSING_STALE_MS = 2 * 60_000;

function cleanNote(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

export function buildWebFormSourceNote(
  integration: WebFormIntegrationContext,
  input: WebFormSubmissionInput
): { marker: string; note: string } {
  const marker = `[Formulario web ${integration.id}/${cleanNote(input.externalId)}]`;
  const context = [
    input.source ? `Origen: ${cleanNote(input.source)}` : null,
    input.campaign ? `Campaña: ${cleanNote(input.campaign)}` : null,
    input.pageUrl ? `Página: ${cleanNote(input.pageUrl)}` : null,
    input.message ? `Consulta: ${cleanNote(input.message)}` : null,
  ].filter(Boolean);
  return {
    marker,
    note: `${marker} ${cleanNote(integration.name)}${context.length ? ` · ${context.join(" · ")}` : ""}`,
  };
}

export function canSendWebFormGreeting(input: {
  contactCreated: boolean;
  consent: boolean;
  blockedAt: Date | null;
  optedOutAt: Date | null;
}): boolean {
  return (
    input.contactCreated &&
    input.consent &&
    !input.blockedAt &&
    !input.optedOutAt
  );
}

async function markIntegration(
  integration: WebFormIntegrationContext,
  status: "success" | "duplicate" | "failed",
  error: string | null
): Promise<void> {
  await getDb()
    .update(schema.webFormIntegration)
    .set({
      lastUsedAt: new Date(),
      lastStatus: status,
      lastError: error,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.webFormIntegration.organizationId, integration.organizationId),
        eq(schema.webFormIntegration.id, integration.id)
      )
    );
}

async function reserveSubmission(
  integration: WebFormIntegrationContext,
  externalId: string
): Promise<{ id: string; duplicate: boolean }> {
  const db = getDb();
  const id = newId("webFormSubmission");
  const inserted = await db
    .insert(schema.webFormSubmission)
    .values({
      id,
      organizationId: integration.organizationId,
      integrationId: integration.id,
      externalId,
    })
    .onConflictDoNothing({
      target: [
        schema.webFormSubmission.organizationId,
        schema.webFormSubmission.integrationId,
        schema.webFormSubmission.externalId,
      ],
    })
    .returning({ id: schema.webFormSubmission.id });
  if (inserted[0]) return { id: inserted[0].id, duplicate: false };

  const existing = await db
    .select({
      id: schema.webFormSubmission.id,
      status: schema.webFormSubmission.status,
      updatedAt: schema.webFormSubmission.updatedAt,
    })
    .from(schema.webFormSubmission)
    .where(
      and(
        eq(schema.webFormSubmission.organizationId, integration.organizationId),
        eq(schema.webFormSubmission.integrationId, integration.id),
        eq(schema.webFormSubmission.externalId, externalId)
      )
    )
    .limit(1);
  const row = existing[0];
  if (!row || row.status === "processed") {
    return { id: row?.id ?? id, duplicate: true };
  }

  const claimed = await db
    .update(schema.webFormSubmission)
    .set({ status: "processing", lastError: null, updatedAt: new Date() })
    .where(
      and(
        eq(schema.webFormSubmission.organizationId, integration.organizationId),
        eq(schema.webFormSubmission.id, row.id),
        or(
          eq(schema.webFormSubmission.status, "failed"),
          lt(
            schema.webFormSubmission.updatedAt,
            new Date(Date.now() - PROCESSING_STALE_MS)
          )
        )
      )
    )
    .returning({ id: schema.webFormSubmission.id });
  return { id: row.id, duplicate: !claimed[0] };
}

export async function ingestWebFormSubmission(
  integration: WebFormIntegrationContext,
  input: WebFormSubmissionInput
): Promise<WebFormIngestResult> {
  const db = getDb();
  const reservation = await reserveSubmission(integration, input.externalId);
  if (reservation.duplicate) {
    await markIntegration(integration, "duplicate", null);
    return {
      duplicate: true,
      submissionId: reservation.id,
      contactId: null,
      leadId: null,
      conversationId: null,
      contactName: null,
      contactCreated: false,
      leadCreated: false,
      consent: input.consent,
    };
  }

  try {
    const { contact, isNew } = await getOrCreateContact(
      integration.organizationId,
      input.phone,
      input.name,
      "web_form"
    );
    const sourceNote = buildWebFormSourceNote(integration, input);
    const nextNotes = contact.notes?.includes(sourceNote.marker)
      ? contact.notes
      : contact.notes
        ? `${contact.notes}\n${sourceNote.note}`
        : sourceNote.note;
    await db
      .update(schema.contact)
      .set({
        name:
          input.name && contact.name === contact.phone
            ? input.name
            : contact.name,
        email: contact.email ?? input.email ?? null,
        notes: nextNotes,
        consentGrantedAt:
          contact.consentGrantedAt ?? (input.consent ? new Date() : null),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.contact.organizationId, integration.organizationId),
          eq(schema.contact.id, contact.id)
        )
      );

    const conversation = await getOrCreateConversation(
      integration.organizationId,
      contact.id
    );
    const lead = await ensureLeadActivity(
      integration.organizationId,
      contact.id,
      new Date(),
      { notifyByEmail: false }
    );
    if (!lead.leadId) {
      throw new Error("pipeline_without_open_stage");
    }

    if (integration.serviceId) {
      const service = await db
        .select({ id: schema.service.id })
        .from(schema.service)
        .where(
          and(
            eq(schema.service.organizationId, integration.organizationId),
            eq(schema.service.id, integration.serviceId)
          )
        )
        .limit(1);
      if (service[0]) {
        await db
          .update(schema.lead)
          .set({ serviceId: service[0].id, updatedAt: new Date() })
          .where(
            and(
              eq(schema.lead.organizationId, integration.organizationId),
              eq(schema.lead.id, lead.leadId),
              isNull(schema.lead.serviceId)
            )
          );
      }
    }

    await db
      .update(schema.webFormSubmission)
      .set({
        contactId: contact.id,
        leadId: lead.leadId,
        status: "processed",
        processedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            schema.webFormSubmission.organizationId,
            integration.organizationId
          ),
          eq(schema.webFormSubmission.id, reservation.id)
        )
      );
    await markIntegration(integration, "success", null);

    return {
      duplicate: false,
      submissionId: reservation.id,
      contactId: contact.id,
      leadId: lead.leadId,
      conversationId: conversation.id,
      contactName: input.name?.trim() || contact.name,
      contactCreated: isNew,
      leadCreated: lead.created,
      consent: input.consent,
    };
  } catch (error) {
    const safeError =
      error instanceof Error && error.message === "pipeline_without_open_stage"
        ? "La empresa no tiene una etapa abierta en el pipeline"
        : "No se pudo completar el prospecto";
    await db
      .update(schema.webFormSubmission)
      .set({ status: "failed", lastError: safeError, updatedAt: new Date() })
      .where(
        and(
          eq(
            schema.webFormSubmission.organizationId,
            integration.organizationId
          ),
          eq(schema.webFormSubmission.id, reservation.id)
        )
      );
    await markIntegration(integration, "failed", safeError);
    throw error;
  }
}

async function notifyOwners(result: WebFormIngestResult, organizationId: string) {
  if (!result.leadCreated || !result.contactId || !result.contactName) return;
  const owners = await getDb()
    .select({ userId: schema.member.userId })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.role, "owner")
      )
    );
  await Promise.allSettled(
    owners.map(({ userId }) =>
      notifyUser({
        userId,
        organizationId,
        type: "new_web_lead",
        title: "Nuevo prospecto desde la web",
        body: result.contactName,
        href: `/inbox?contact=${result.contactId}`,
      })
    )
  );
}

async function maybeSendGreeting(
  integration: WebFormIntegrationContext,
  result: WebFormIngestResult
): Promise<void> {
  if (!result.contactId || !result.conversationId) {
    return;
  }
  const db = getDb();
  const contacts = await db
    .select({
      blockedAt: schema.contact.blockedAt,
      optedOutAt: schema.contact.optedOutAt,
    })
    .from(schema.contact)
    .where(
      and(
        eq(schema.contact.organizationId, integration.organizationId),
        eq(schema.contact.id, result.contactId)
      )
    )
    .limit(1);
  if (
    !contacts[0] ||
    !canSendWebFormGreeting({
      contactCreated: result.contactCreated,
      consent: result.consent,
      blockedAt: contacts[0].blockedAt,
      optedOutAt: contacts[0].optedOutAt,
    })
  ) {
    return;
  }

  let templateId: string | null = null;
  if (integration.serviceId) {
    const services = await db
      .select({ greetingTemplateId: schema.service.greetingTemplateId })
      .from(schema.service)
      .where(
        and(
          eq(schema.service.organizationId, integration.organizationId),
          eq(schema.service.id, integration.serviceId)
        )
      )
      .limit(1);
    templateId = services[0]?.greetingTemplateId ?? null;
  }
  if (!templateId) {
    templateId = (await getLeadgenSettings(integration.organizationId))
      .greetingTemplateId;
  }
  if (!templateId) return;

  const claimed = await db
    .update(schema.webFormSubmission)
    .set({ greetingAttemptedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(
          schema.webFormSubmission.organizationId,
          integration.organizationId
        ),
        eq(schema.webFormSubmission.id, result.submissionId),
        isNull(schema.webFormSubmission.greetingAttemptedAt)
      )
    )
    .returning({ id: schema.webFormSubmission.id });
  if (!claimed[0]) return;

  await sendTemplate({
    organizationId: integration.organizationId,
    conversationId: result.conversationId,
    templateId,
    variable: (result.contactName ?? "Hola").split(/\s+/)[0],
  });
}

export async function runWebFormPostProcessing(
  integration: WebFormIntegrationContext,
  result: WebFormIngestResult
): Promise<void> {
  if (result.duplicate || !result.leadId) return;
  publish(integration.organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: result.conversationId } },
  });
  const outcomes = await Promise.allSettled([
    notifyOwners(result, integration.organizationId),
    result.leadCreated
      ? notifyNewLeadByEmailSafely({
          organizationId: integration.organizationId,
          leadId: result.leadId,
        })
      : Promise.resolve(),
    maybeSendGreeting(integration, result),
  ]);
  if (outcomes.some((outcome) => outcome.status === "rejected")) {
    await getDb()
      .update(schema.webFormIntegration)
      .set({
        lastStatus: "failed",
        lastError: "El prospecto se guardó, pero una automatización secundaria falló",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            schema.webFormIntegration.organizationId,
            integration.organizationId
          ),
          eq(schema.webFormIntegration.id, integration.id)
        )
      );
    console.warn(
      `[web-form] una automatización secundaria falló para ${integration.id}`
    );
  }
}
