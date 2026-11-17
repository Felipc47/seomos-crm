import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { isOrgAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";
const key = z.string().trim().min(1).max(200);
const source = z.object({ sourceType: z.enum(["meta_form", "sheet"]), sourceKey: key }).strict();
const putInput = source.extend({ consentEvidence: z.string().trim().min(10).max(800) });

export const GET = withAuth(async session => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona el consentimiento SMS.");
  const db = getDb(), org = session.organizationId;
  const [configured, events, links, sheets] = await Promise.all([
    db.select().from(schema.smsLeadSource).where(scoped(schema.smsLeadSource.organizationId, org)),
    db.selectDistinct({ formId: schema.leadgenEvent.formId }).from(schema.leadgenEvent)
      .where(scoped(schema.leadgenEvent.organizationId, org, isNotNull(schema.leadgenEvent.formId))),
    db.select({ formId: schema.serviceForm.formId }).from(schema.serviceForm)
      .where(scoped(schema.serviceForm.organizationId, org)),
    db.select({ id: schema.sheetsSource.id, name: schema.sheetsSource.name }).from(schema.sheetsSource)
      .where(scoped(schema.sheetsSource.organizationId, org)),
  ]);
  return Response.json({ sources: configured.map(c => ({ sourceType: c.sourceType, sourceKey: c.sourceKey, consentEvidence: c.consentEvidence })),
    forms: [...new Set([...events.map(e => e.formId), ...links.map(l => l.formId)].filter((id): id is string => !!id))], sheets });
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona el consentimiento SMS.");
  const body = await parseBody(req, putInput); if (!body.ok) return body.response;
  const db = getDb(), org = session.organizationId, { sourceType, sourceKey, consentEvidence } = body.data;
  const known = sourceType === "sheet"
    ? (await db.select({ id: schema.sheetsSource.id }).from(schema.sheetsSource).where(scoped(schema.sheetsSource.organizationId, org, eq(schema.sheetsSource.id, sourceKey))).limit(1)).length > 0
    : (await db.select({ id: schema.leadgenEvent.id }).from(schema.leadgenEvent).where(scoped(schema.leadgenEvent.organizationId, org, eq(schema.leadgenEvent.formId, sourceKey))).limit(1)).length > 0
      || (await db.select({ id: schema.serviceForm.id }).from(schema.serviceForm).where(scoped(schema.serviceForm.organizationId, org, eq(schema.serviceForm.formId, sourceKey))).limit(1)).length > 0;
  if (!known) return apiError(422, "unknown_source", "El formulario o la hoja no pertenece a esta empresa.");
  await db.insert(schema.smsLeadSource).values({ id: newId("smsLeadSource"), organizationId: org, sourceType, sourceKey, consentEvidence })
    .onConflictDoUpdate({ target: [schema.smsLeadSource.organizationId, schema.smsLeadSource.sourceType, schema.smsLeadSource.sourceKey],
      set: { consentEvidence, updatedAt: new Date() } });
  return Response.json({ ok: true });
});

export const DELETE = withAuth(async (session, req: Request) => {
  if (!isOrgAdmin(session.role)) return apiError(403, "forbidden", "Solo el administrador gestiona el consentimiento SMS.");
  const body = await parseBody(req, source); if (!body.ok) return body.response;
  await getDb().delete(schema.smsLeadSource).where(scoped(schema.smsLeadSource.organizationId, session.organizationId,
    and(eq(schema.smsLeadSource.sourceType, body.data.sourceType), eq(schema.smsLeadSource.sourceKey, body.data.sourceKey))));
  return Response.json({ ok: true });
});
