import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, getSql, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isMockEnabled } from "@/lib/env";
import { eligibleSubscriber, renderMail } from "@/lib/mailing";
import { checkMailingDomain, isMailingConfigured, MailingProviderError, sendMailingEmail } from "@/lib/resend/mailing";
import { unsubscribeUrl } from "./repository";
/** Lock de conexión PostgreSQL: compartido entre procesos; sin transacción durante HTTP. */
export async function sweepMailing(now = new Date(), target?: { organizationId: string; programId?: string }) {
    const result = { accepted: 0, failed: 0, deferred: 0, skipped: 0, locked: false };
    if (!isMailingConfigured())
        return result;
    const connection = await getSql().reserve();
    const [lock] = await connection `select pg_try_advisory_lock(280028) as acquired`;
    if (!lock?.acquired) {
        connection.release();
        return { ...result, locked: true };
    }
    try {
        const db = getDb();
        // Enumeración de tenants solo para el scheduler; queries de dominio scoped por tenant.
        const orgs = await db.select({ id: schema.organization.id }).from(schema.organization).where(target
            ? scoped(schema.organization.id, target.organizationId, isNull(schema.organization.deletedAt), eq(schema.organization.mailingEnabled, true))
            : and(isNull(schema.organization.deletedAt), eq(schema.organization.mailingEnabled, true)));
        let budget = 50;
        const deadline = Date.now() + 40000;
        for (const org of orgs) {
            if (budget <= 0 || Date.now() >= deadline)
                break;
            await db.update(schema.mailingSend).set({ status: "pending", leaseUntil: null }).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.status, "sending"), lte(schema.mailingSend.leaseUntil, now)));
            const [sender] = await db.select().from(schema.mailingSender).where(scoped(schema.mailingSender.organizationId, org.id));
            const candidates = await db.select().from(schema.mailingSend).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.status, "pending"), lte(schema.mailingSend.dueAt, now), or(isNull(schema.mailingSend.nextAttemptAt), lte(schema.mailingSend.nextAttemptAt, now)), ...(target?.programId ? [eq(schema.mailingSend.programId, target.programId)] : [])))
                .orderBy(asc(schema.mailingSend.dueAt), asc(schema.mailingSend.stepIndex)).limit(200);
            if (!candidates.length)
                continue;
            if (!sender?.providerDomainId || sender.status !== "verified") {
                result.deferred += candidates.length;
                continue;
            }
            budget--;
            let domain;
            try {
                domain = await checkMailingDomain(sender.providerDomainId);
            }
            catch (error) {
                await db.update(schema.mailingSender).set({ lastError: error instanceof MailingProviderError ? error.safeMessage : "No se pudo comprobar el dominio" }).where(scoped(schema.mailingSender.organizationId, org.id));
                result.deferred += candidates.length;
                if (error instanceof MailingProviderError && error.retryable)
                    break;
                continue;
            }
            await db.update(schema.mailingSender).set({ status: domain.status, records: domain.records, lastError: null }).where(scoped(schema.mailingSender.organizationId, org.id));
            if (domain.status !== "verified") {
                result.deferred += candidates.length;
                continue;
            }
            const processedEnrollments = new Set<string>();
            for (const candidate of candidates) {
                if (budget <= 0 || Date.now() >= deadline)
                    break;
                if (processedEnrollments.has(candidate.enrollmentId))
                    continue;
                const prepared = await db.transaction(async (tx) => {
                    const [p] = await tx.select().from(schema.mailingProgram).where(scoped(schema.mailingProgram.organizationId, org.id, eq(schema.mailingProgram.id, candidate.programId))).for("update");
                    const [sub] = await tx.select().from(schema.mailingSubscriber).where(scoped(schema.mailingSubscriber.organizationId, org.id, eq(schema.mailingSubscriber.id, candidate.subscriberId))).for("update");
                    const [enrollment] = await tx.select().from(schema.mailingEnrollment).where(scoped(schema.mailingEnrollment.organizationId, org.id, eq(schema.mailingEnrollment.id, candidate.enrollmentId))).for("update");
                    if (!p || !sub || !enrollment)
                        return null;
                    if (p.status === "paused" || p.status === "draft" || p.status === "completed")
                        return null;
                    const [member] = await tx.select().from(schema.mailingListMember).where(scoped(schema.mailingListMember.organizationId, org.id, eq(schema.mailingListMember.listId, p.listId), eq(schema.mailingListMember.subscriberId, sub.id)));
                    // Campaign snapshots survive removal from list; sequences stop on leaving their list.
                    if (p.status === "cancelled" || enrollment.stoppedAt || !eligibleSubscriber(sub) || (p.kind === "sequence" && !member)) {
                        await tx.update(schema.mailingSend).set({ status: "skipped", lastError: "Contacto excluido o inscripción detenida" }).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, candidate.id), eq(schema.mailingSend.status, "pending")));
                        result.skipped++;
                        return null;
                    }
                    const [prior] = await tx.select({ id: schema.mailingSend.id }).from(schema.mailingSend).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.enrollmentId, enrollment.id), sql `${schema.mailingSend.stepIndex} < ${candidate.stepIndex}`, inArray(schema.mailingSend.status, ["pending", "sending", "uncertain"]))).limit(1);
                    if (prior)
                        return null;
                    if (candidate.firstAttemptAt && now.getTime() - candidate.firstAttemptAt.getTime() >= 23 * 3600000) {
                        await tx.update(schema.mailingSend).set({ status: "uncertain", lastError: "Ventana de reintento vencida; revisar entrega antes de reenviar" }).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, candidate.id), eq(schema.mailingSend.status, "pending")));
                        result.failed++;
                        return null;
                    }
                    const url = unsubscribeUrl(org.id, sub);
                    const content = renderMail(p.steps[candidate.stepIndex]!, sub.name, url);
                    const payload = candidate.payload ?? { from: `${sender.fromName} <${sender.fromEmail}>`, to: sub.email, ...(sender.replyTo ? { reply_to: sender.replyTo } : {}), ...content, headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
                    // Nunca reenviar un snapshot bajo otro dominio ni otro email del contacto.
                    if (payload.to !== sub.email || !payload.from.endsWith(`<${sender.fromEmail}>`)) {
                        await tx.update(schema.mailingSend).set({ status: "uncertain", lastError: "Remitente o destinatario cambió; revisar entrega" }).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, candidate.id)));
                        return null;
                    }
                    const [claimed] = await tx.update(schema.mailingSend).set({ status: "sending", payload, firstAttemptAt: candidate.firstAttemptAt ?? now, attempts: sql `${schema.mailingSend.attempts} + 1`, leaseUntil: new Date(now.getTime() + 60000) })
                        .where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, candidate.id), eq(schema.mailingSend.status, "pending"))).returning();
                    if (p.status === "scheduled")
                        await tx.update(schema.mailingProgram).set({ status: "active" }).where(scoped(schema.mailingProgram.organizationId, org.id, eq(schema.mailingProgram.id, p.id)));
                    return claimed;
                });
                if (!prepared?.payload)
                    continue;
                processedEnrollments.add(prepared.enrollmentId);
                budget--;
                if (!isMockEnabled())
                    await new Promise((resolve) => setTimeout(resolve, 600));
                try {
                    const sent = await sendMailingEmail(prepared.payload, prepared.id, org.id);
                    await db.update(schema.mailingSend).set({ status: "accepted", providerMessageId: sent.id, acceptedAt: now, leaseUntil: null, lastError: null, nextAttemptAt: null }).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, prepared.id), eq(schema.mailingSend.status, "sending")));
                    result.accepted++;
                }
                catch (error) {
                    const temporary = error instanceof MailingProviderError && error.retryable;
                    const uncertain = !(error instanceof MailingProviderError) || error.uncertain;
                    const retry = temporary && prepared.attempts < 5;
                    await db.update(schema.mailingSend).set({ status: retry ? "pending" : uncertain ? "uncertain" : "failed", lastError: error instanceof MailingProviderError ? error.safeMessage : "No se pudo confirmar la entrega", leaseUntil: null, nextAttemptAt: retry ? new Date(now.getTime() + Math.max(error.retryAfterSeconds, 60 * 2 ** (prepared.attempts - 1)) * 1000) : null })
                        .where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, prepared.id), eq(schema.mailingSend.status, "sending")));
                    if (retry)
                        result.deferred++;
                    else
                        result.failed++;
                    if (temporary) {
                        budget = 0;
                        break;
                    } // aplazar el agregado, sin ráfagas ante 429/5xx
                }
            }
            const campaigns = await db.select().from(schema.mailingProgram).where(scoped(schema.mailingProgram.organizationId, org.id, eq(schema.mailingProgram.kind, "campaign"), eq(schema.mailingProgram.status, "active"), ...(target?.programId ? [eq(schema.mailingProgram.id, target.programId)] : [])));
            for (const p of campaigns) {
                const [pending] = await db.select({ id: schema.mailingSend.id }).from(schema.mailingSend).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.programId, p.id), inArray(schema.mailingSend.status, ["pending", "sending", "uncertain"]))).limit(1);
                if (!pending)
                    await db.update(schema.mailingProgram).set({ status: "completed" }).where(scoped(schema.mailingProgram.organizationId, org.id, eq(schema.mailingProgram.id, p.id), eq(schema.mailingProgram.status, "active")));
            }
        }
        return result;
    }
    finally {
        await connection `select pg_advisory_unlock(280028)`;
        connection.release();
    }
}
