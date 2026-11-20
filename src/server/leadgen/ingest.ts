import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { graphRequest } from "@/lib/meta/client";
import { getCredentialsByOrg } from "@/server/whatsapp/credentials";
import { publish } from "@/server/events/bus";
import {
  getOrCreateContact,
  getOrCreateConversation,
} from "@/server/inbox/ingest";
import { ensureLeadActivity } from "@/server/inbox/lead-activity";
import { notifyNewLeadByEmailSafely } from "@/server/email/new-lead";
import { InitialGreetingSkipped } from "@/server/whatsapp/template-dispatch";
import {
  extractLeadEmail,
  extractLeadName,
  extractLeadPhone,
} from "@/server/leadgen/fields";
import { getLeadgenSettings } from "@/server/org-settings";
import { sendPreferredGreeting } from "@/server/leadgen/preferred-greeting";
import { smsLeadEnrollmentSql } from "@/server/sms/lead-enrollment";
import type { WebhookValue } from "@/server/inbox/webhook";

/**
 * Recupera eventos de Meta Lead Ads para la empresa vinculada al formulario.
 * Registra el contacto y el servicio antes de ejecutar el saludo del canal configurado.
 */

type LeadDetail = {
  field_data?: { name?: string; values?: string[] }[];
  campaign_name?: string;
  ad_name?: string;
  form_id?: string;
};

export async function processLeadgenValue(value: WebhookValue): Promise<void> {
  const leadgenId = value.leadgen_id;
  if (!leadgenId) return;

  const db = getDb();

  // A shared instance may hold several companies. Route a known form only to
  // its linked tenant; never assign it to an arbitrary first credential.
  const credentialOrgs = await db.select({ organizationId: schema.metaCredentials.organizationId })
    .from(schema.metaCredentials);
  const formIdFromEvent = value.form_id ?? null;
  let organizationId: string | null = null;
  if (formIdFromEvent) {
    const [serviceLinks, smsLinks] = await Promise.all([
      db.select({ organizationId: schema.serviceForm.organizationId }).from(schema.serviceForm)
        .where(eq(schema.serviceForm.formId, formIdFromEvent)),
      db.select({ organizationId: schema.smsLeadSource.organizationId }).from(schema.smsLeadSource)
        .where(and(eq(schema.smsLeadSource.sourceType, "meta_form"), eq(schema.smsLeadSource.sourceKey, formIdFromEvent))),
    ]);
    const candidates = [...new Set([...serviceLinks, ...smsLinks].map(link => link.organizationId))]
      .filter(org => credentialOrgs.some(c => c.organizationId === org));
    if (candidates.length === 1) organizationId = candidates[0]!;
    if (candidates.length > 1) {
      console.warn("[leadgen] formulario asociado a varias empresas: evento omitido");
      return;
    }
  }
  if (!organizationId && credentialOrgs.length === 1) organizationId = credentialOrgs[0]!.organizationId;
  if (!organizationId) {
    console.warn("[leadgen] evento sin empresa inequívoca: vincula el formulario a un servicio");
    return;
  }

  // Idempotencia por leadgen_id: el mismo evento repetido no duplica nada.
  const eventRow = await db
    .insert(schema.leadgenEvent)
    .values({
      id: newId("leadgenEvent"),
      organizationId,
      leadgenId,
      formId: value.form_id ?? null,
    })
    .onConflictDoNothing({ target: [schema.leadgenEvent.leadgenId] })
    .returning();
  if (!eventRow[0]) return; // ya procesado

  // Recuperar el lead. Si Graph falla, se libera el registro de idempotencia
  // para que el reintento de Meta sí pueda procesarlo (spec B, criterio 4).
  let detail: LeadDetail;
  try {
    const credentials = await getCredentialsByOrg(organizationId);
    if (!credentials) throw new Error("conexión de WhatsApp no encontrada");
    detail = await graphRequest<LeadDetail>(
      `${leadgenId}?fields=field_data,campaign_name,ad_name,form_id`,
      { token: credentials.token }
    );
  } catch (err) {
    await db
      .delete(schema.leadgenEvent)
      .where(eq(schema.leadgenEvent.id, eventRow[0].id));
    console.error(
      `[leadgen] no se pudo recuperar el lead ${leadgenId} de Graph:`,
      err
    );
    return;
  }

  const fields = detail.field_data ?? [];
  const phone = extractLeadPhone(fields);
  if (!phone) {
    // Los nombres de campo van al log: cada formulario los nombra distinto y
    // así el próximo fallo se diagnostica de una.
    console.warn(
      `[leadgen] lead ${leadgenId} sin teléfono utilizable: se registra sin contacto (campos: ${
        fields.map((f) => f.name ?? "?").join(", ") || "ninguno"
      })`
    );
    return;
  }
  const name = extractLeadName(fields);
  const email = extractLeadEmail(fields);

  // Vinculación de forms (Ajustes → Servicios): el form del lead define el
  // servicio y su plantilla de saludo; sin vínculo, saludo global.
  const formId = detail.form_id ?? value.form_id ?? null;
  let linkedService: {
    id: string;
    name: string;
    greetingTemplateId: string | null;
  } | null = null;
  if (formId) {
    const rows = await db
      .select({
        id: schema.service.id,
        name: schema.service.name,
        greetingTemplateId: schema.service.greetingTemplateId,
      })
      .from(schema.serviceForm)
      .innerJoin(
        schema.service,
        eq(schema.service.id, schema.serviceForm.serviceId)
      )
      .where(
        and(
          eq(schema.serviceForm.organizationId, organizationId),
          eq(schema.service.organizationId, organizationId),
          eq(schema.serviceForm.formId, formId)
        )
      )
      .limit(1);
    linkedService = rows[0] ?? null;
  }

  const { contact, isNew } = await getOrCreateContact(
    organizationId,
    phone,
    name,
    // Llenó un formulario de Meta Lead Ads: consentimiento de origen (006).
    "meta_lead_ads"
  );

  // Rastro de la campaña + correo del form (sin pisar datos del operador).
  const campaignParts = [
    linkedService ? `Servicio: ${linkedService.name}` : null,
    detail.campaign_name ? `Campaña: ${detail.campaign_name}` : null,
    detail.ad_name ? `Anuncio: ${detail.ad_name}` : null,
    formId ? `Form: ${formId}` : null,
  ].filter(Boolean);
  const campaignNote = `[Meta Ads] ${campaignParts.join(" · ") || "Lead de formulario"}`;
  await db
    .update(schema.contact)
    .set({
      email: contact.email ?? email,
      notes: contact.notes
        ? `${contact.notes}\n${campaignNote}`
        : campaignNote,
      updatedAt: new Date(),
    })
    .where(eq(schema.contact.id, contact.id));

  const conversation = await getOrCreateConversation(
    organizationId,
    contact.id
  );
  const { leadId, created } = await ensureLeadActivity(organizationId, contact.id, new Date(), { notifyByEmail: false });

  // El form define el SERVICIO, no el responsable: el comercial se marca
  // únicamente cuando la conversación se deriva a atención humana
  // (assignLeadOnHumanHandoff), igual que en el canal directo.
  if (leadId && linkedService) {
    await db
      .update(schema.lead)
      .set({
        serviceId: linkedService.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.lead.organizationId, organizationId),
          eq(schema.lead.id, leadId),
          isNull(schema.lead.serviceId)
        )
      );
  }

  await db
    .update(schema.leadgenEvent)
    .set({ contactId: contact.id })
    .where(eq(schema.leadgenEvent.id, eventRow[0].id));

  // Only forms with a tenant-specific SMS attestation enroll automatically.
  // This never lifts a prior SMS opt-out or sends an SMS on its own.
  if (formId && !contact.optedOutAt && !contact.blockedAt && !contact.archivedAt) {
    const enrollment = smsLeadEnrollmentSql({ organizationId, sourceType: "meta_form",
      sourceKey: formId, leadKey: leadgenId, contactId: contact.id, phone, name: contact.name });
    if (enrollment) {
      try { await db.execute(enrollment); }
      catch (error) { console.error(`[leadgen] no se pudo registrar SMS para ${leadgenId}:`, error); }
    }
  }

  // Saludo automático SOLO para contactos nuevos (spec B: existente no se
  // vuelve a saludar). Sin plantilla configurada, el lead entra igual.
  if (isNew) {
    // Prioridad: plantilla del servicio vinculado al form → saludo global.
    let greetingTemplateId = linkedService?.greetingTemplateId ?? null;
    if (!greetingTemplateId) {
      const settings = await getLeadgenSettings(organizationId);
      greetingTemplateId = settings.greetingTemplateId;
    }
    if (greetingTemplateId) {
      try {
        await sendPreferredGreeting({ organizationId, contactId: contact.id,
          conversationId: conversation.id, templateId: greetingTemplateId });
      } catch (err) {
        if (!(err instanceof InitialGreetingSkipped)) {
          console.error(
            `[leadgen] el saludo automático falló para ${contact.id} (el lead queda en la bandeja):`,
            err
          );
        }
      }
    } else {
      console.warn(
        `[leadgen] sin plantilla de saludo (ni por servicio ni global) para el form ${formId ?? "?"}: el lead entra sin mensaje`
      );
    }
  }

  if (leadId && created) await notifyNewLeadByEmailSafely({ organizationId, leadId });

  publish(organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: conversation.id } },
  });
}
