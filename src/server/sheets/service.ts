import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { fetchSheetCsv } from "@/lib/google/sheets";
import { mergeSheetContact, parseSheetContacts, parseSheetsUrl, sheetsUrl, SheetsError, type SheetContact, type SheetSnapshot, type SyncStats } from "@/lib/sheets-contacts";
import { activeCompanyCondition, isCompanyServiceActive } from "@/server/company-service";

import { publish } from "@/server/events/bus";

type Source = typeof schema.sheetsSource.$inferSelect;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const blankStats = (): SyncStats => ({ created: 0, updated: 0, unchanged: 0, skipped: 0, issues: [] });

export function sourceDto(source: Source) {
  return { id: source.id, name: source.name, url: sheetsUrl(source), intervalMinutes: source.intervalMinutes, enabled: source.enabled,
    lastSyncAt: source.lastSyncAt?.toISOString() ?? null, nextSyncAt: source.nextSyncAt.toISOString(),
    lastStatus: source.lastStatus === "running" && source.claimedAt && source.claimedAt.getTime() < Date.now() - 600000 ? "pending" : source.lastStatus, lastError: source.lastError, lastStats: source.lastStats };
}
export async function listSources(organizationId: string) {
  return (await getDb().select().from(schema.sheetsSource).where(scoped(schema.sheetsSource.organizationId, organizationId)).orderBy(asc(schema.sheetsSource.createdAt))).map(sourceDto);
}
export async function getSource(organizationId: string, id: string) {
  return (await getDb().select().from(schema.sheetsSource).where(scoped(schema.sheetsSource.organizationId, organizationId, eq(schema.sheetsSource.id, id))).limit(1))[0] ?? null;
}
export async function createSource(organizationId: string, input: { name: string; url: string; intervalMinutes: number }) {
  const target = parseSheetsUrl(input.url);
  parseSheetContacts(await fetchSheetCsv(target)); // Validate access and shape before saving.
  const [source] = await getDb().insert(schema.sheetsSource).values({ id: newId("sheetsSource"), organizationId, name: input.name, ...target, intervalMinutes: input.intervalMinutes })
    .onConflictDoNothing({ target: [schema.sheetsSource.organizationId, schema.sheetsSource.spreadsheetId, schema.sheetsSource.sheetGid] }).returning();
  if (!source) throw new SheetsError("Esta pestaña ya está conectada a la empresa.");
  return sourceDto(source);
}
export async function updateSource(organizationId: string, id: string, patch: { name?: string; intervalMinutes?: number; enabled?: boolean }) {
  const [source] = await getDb().update(schema.sheetsSource).set({ ...patch, updatedAt: new Date(), ...(patch.enabled === true || patch.intervalMinutes ? { nextSyncAt: new Date() } : {}) })
    .where(scoped(schema.sheetsSource.organizationId, organizationId, eq(schema.sheetsSource.id, id))).returning();
  return source ? sourceDto(source) : null;
}

async function importRow(source: Source, token: string, row: SheetContact) {
  const org = source.organizationId, db = getDb();
  const snapshot: SheetSnapshot = { phone: row.phone, name: row.name, email: row.email,
    noteBlock: `[Google Sheets ${source.id}/${hash(row.externalKey).slice(0, 16)}]\n${source.name}\n${row.details}\n[/Google Sheets]` };
  const fingerprint = hash(JSON.stringify(snapshot));
  return db.transaction(async tx => {
    // Fence every transaction: expired workers and paused/deleted tenants cannot continue.
    const [currentSource] = await tx.select({ id: schema.sheetsSource.id }).from(schema.sheetsSource)
      .innerJoin(schema.organization, eq(schema.organization.id, schema.sheetsSource.organizationId))
      .where(scoped(schema.sheetsSource.organizationId, org, eq(schema.sheetsSource.id, source.id), eq(schema.sheetsSource.claimToken, token), source.enabled ? eq(schema.sheetsSource.enabled, true) : undefined, activeCompanyCondition()))
      .for("update", { of: schema.sheetsSource });
    if (!currentSource) throw new SheetsError("La sincronización fue interrumpida. Puedes volver a ejecutarla.");
    const [prior] = await tx.select().from(schema.sheetsRow).where(scoped(schema.sheetsRow.organizationId, org, eq(schema.sheetsRow.sourceId, source.id), eq(schema.sheetsRow.externalKey, row.externalKey))).limit(1);
    if (prior && !prior.contactId) return { kind: "skipped" as const, reason: "Contacto eliminado en el CRM; se conserva esa decisión" };
    if (prior && prior.snapshot.phone !== row.phone) return { kind: "skipped" as const, reason: "El teléfono de este identificador cambió; revisa el contacto manualmente" };
    if (prior?.fingerprint === fingerprint) return { kind: "unchanged" as const };
    if (prior?.contactId) {
      const [linked] = await tx.select({ phone: schema.contact.phone }).from(schema.contact).where(scoped(schema.contact.organizationId, org, eq(schema.contact.id, prior.contactId))).for("update");
      if (!linked || linked.phone !== row.phone) return { kind: "skipped" as const, reason: "El teléfono del contacto cambió en el CRM; revisa la fila manualmente" };
    }
    const [inserted] = await tx.insert(schema.contact).values({ id: newId("contact"), organizationId: org, phone: row.phone, name: row.name, email: row.email, consentSource: "imported" })
      .onConflictDoNothing({ target: [schema.contact.organizationId, schema.contact.phone] }).returning({ id: schema.contact.id });
    const [contact] = await tx.select().from(schema.contact).where(scoped(schema.contact.organizationId, org, eq(schema.contact.phone, row.phone))).for("update");
    if (!contact) throw new SheetsError("No se pudo guardar un contacto. Se reintentará en el próximo ciclo.");
    if (prior && prior.contactId !== contact.id) return { kind: "skipped" as const, reason: "El teléfono del contacto cambió en el CRM; revisa la fila manualmente" };
    const merged = mergeSheetContact(contact, prior?.snapshot ?? null, snapshot);
    // Blank source names never erase a previously populated name.
    if (snapshot.name === snapshot.phone && contact.name !== contact.phone) merged.name = contact.name;
    if (merged.notes.length > 4000) return { kind: "skipped" as const, reason: "El contacto alcanzó el límite de notas de sincronización" };
    const changed = merged.name !== contact.name || merged.email !== contact.email || merged.notes !== (contact.notes ?? "");
    if (changed) await tx.update(schema.contact).set({ ...merged, updatedAt: new Date() }).where(scoped(schema.contact.organizationId, org, eq(schema.contact.id, contact.id)));
    if (inserted) {
      const [stage] = await tx.select({ id: schema.pipelineStage.id }).from(schema.pipelineStage).where(scoped(schema.pipelineStage.organizationId, org, eq(schema.pipelineStage.kind, "open"))).orderBy(asc(schema.pipelineStage.position)).limit(1);
      if (stage) await tx.insert(schema.lead).values({ id: newId("lead"), organizationId: org, contactId: contact.id, stageId: stage.id, lastActivityAt: new Date() }).onConflictDoNothing({ target: [schema.lead.contactId] });
    }
    await tx.insert(schema.sheetsRow).values({ id: newId("sheetsRow"), organizationId: org, sourceId: source.id, externalKey: row.externalKey, contactId: contact.id, fingerprint, snapshot })
      .onConflictDoUpdate({ target: [schema.sheetsRow.organizationId, schema.sheetsRow.sourceId, schema.sheetsRow.externalKey], set: { fingerprint, snapshot, updatedAt: new Date() } });
    return { kind: inserted ? "created" as const : changed ? "updated" as const : "unchanged" as const };
  });
}

export async function syncSource(organizationId: string, id: string, manual = false, now = new Date()) {
  if (!await isCompanyServiceActive(organizationId)) throw new SheetsError("La empresa no está activa.");
  const token = randomUUID();
  // Persistent lease excludes overlapping cron/manual requests and recovers after a crash.
  const [source] = await getDb().update(schema.sheetsSource).set({ claimedAt: new Date(), claimToken: token, lastStatus: "running", lastError: null })
    .where(scoped(schema.sheetsSource.organizationId, organizationId, eq(schema.sheetsSource.id, id),
      or(isNull(schema.sheetsSource.claimedAt), lte(schema.sheetsSource.claimedAt, new Date(Date.now() - 600000))),
      manual ? undefined : and(eq(schema.sheetsSource.enabled, true), lte(schema.sheetsSource.nextSyncAt, now)))).returning();
  if (!source) return { started: false, stats: null };
  const stats = blankStats(), started = Date.now();
  let error: string | null = null;
  try {
    const parsed = parseSheetContacts(await fetchSheetCsv(source));
    stats.skipped = parsed.issues.length; stats.issues = parsed.issues.slice(0, 20);
    for (const row of parsed.contacts) {
      if (Date.now() - started > 240000) throw new SheetsError("El ciclo alcanzó su límite de tiempo. Los registros pendientes se retomarán en el próximo ciclo.");
      const result = await importRow(source, token, row);
      stats[result.kind]++;
      if (result.kind === "skipped" && stats.issues.length < 20) stats.issues.push({ row: row.row, reason: result.reason ?? "No se pudo importar esta fila" });
    }
  } catch (err) {
    error = err instanceof SheetsError ? err.message : "No se pudo completar la sincronización. Se reintentará en el próximo ciclo.";
  }
  await getDb().update(schema.sheetsSource).set({ claimedAt: null, claimToken: null, lastSyncAt: new Date(),
    nextSyncAt: sql`now() + (${schema.sheetsSource.intervalMinutes} * interval '1 minute')`,
    lastStatus: error ? "failed" : "success", lastError: error, lastStats: stats, updatedAt: new Date() })
    .where(scoped(schema.sheetsSource.organizationId, organizationId, eq(schema.sheetsSource.id, id), eq(schema.sheetsSource.claimToken, token)));
  if (stats.created || stats.updated) publish(organizationId, { type: "contacts.updated", data: { source: "sheets" } });
  return { started: true, stats, error };
}

export async function sweepSheets(now = new Date()) {
  // Cross-tenant enumeration only. Each subsequent read/write is scoped to its source tenant.
  const due = await getDb().select({ id: schema.sheetsSource.id, organizationId: schema.sheetsSource.organizationId })
    .from(schema.sheetsSource).innerJoin(schema.organization, eq(schema.organization.id, schema.sheetsSource.organizationId))
    .where(and(activeCompanyCondition(), eq(schema.sheetsSource.enabled, true), lte(schema.sheetsSource.nextSyncAt, now),
      or(isNull(schema.sheetsSource.claimedAt), lte(schema.sheetsSource.claimedAt, new Date(Date.now() - 600000)))))
    .orderBy(asc(schema.sheetsSource.nextSyncAt)).limit(10);
  let completed = 0, failed = 0;
  for (const source of due) {
    try { const result = await syncSource(source.organizationId, source.id, false, now); if (result.started) { if (result.error) failed++; else completed++; } }
    catch { failed++; }
  }
  return { completed, failed };
}
