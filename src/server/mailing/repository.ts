import { canConfigureMailingTracking } from "./access";
import { randomBytes } from "node:crypto";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { newId } from "@/lib/db/ids";
import { getEnv } from "@/lib/env";
import { canManageOrgSettings } from "@/lib/permissions";
import type { SessionContext } from "@/lib/auth/session";
import { eligibleSubscriber, renderMail, stepDueAt, type MailingAction } from "@/lib/mailing";
import { checkMailingDomain, isMailingConfigured, sendMailingEmail } from "@/lib/resend/mailing";
import { unsubscribeToken } from "./security";
export class MailingError extends Error {
    constructor(public message: string, public status = 409) { super(message); }
}
type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Store = Db | Tx;
type Program = typeof schema.mailingProgram.$inferSelect;
async function requireList(db: Store, org: string, id: string) {
    const [row] = await db.select().from(schema.mailingList).where(scoped(schema.mailingList.organizationId, org, eq(schema.mailingList.id, id)));
    if (!row)
        throw new MailingError("Lista no encontrada", 404);
    return row;
}
export async function requireSender(db: Store, org: string) {
    const [row] = await db.select().from(schema.mailingSender).where(scoped(schema.mailingSender.organizationId, org));
    if (!isMailingConfigured() || !row?.providerDomainId || row.status !== "verified")
        throw new MailingError("Verifica el dominio del remitente antes de enviar");
    return row;
}
async function audience(db: Store, org: string, list: string) {
    return db.select({ subscriber: schema.mailingSubscriber }).from(schema.mailingListMember)
        .innerJoin(schema.mailingSubscriber, and(eq(schema.mailingSubscriber.id, schema.mailingListMember.subscriberId), scoped(schema.mailingSubscriber.organizationId, org)))
        .where(scoped(schema.mailingListMember.organizationId, org, eq(schema.mailingListMember.listId, list)));
}
export async function enroll(db: Store, org: string, p: Program, sub: typeof schema.mailingSubscriber.$inferSelect, at: Date) {
    if (!eligibleSubscriber(sub))
        return;
    const id = newId("mailingEnrollment");
    const [created] = await db.insert(schema.mailingEnrollment).values({ id, organizationId: org, programId: p.id, subscriberId: sub.id, startedAt: at })
        .onConflictDoNothing().returning();
    if (!created)
        return;
    await db.insert(schema.mailingSend).values(p.steps.map((step, i) => ({ id: newId("mailingSend"), organizationId: org, programId: p.id, enrollmentId: id, subscriberId: sub.id, stepIndex: i, dueAt: stepDueAt(at, step.day) }))).onConflictDoNothing();
}
export async function mailingSnapshot(session: SessionContext) {
    const db = getDb();
    const org = session.organizationId;
    const [senders, lists, subscribers, members, programs, enrollments, sends, users] = await Promise.all([
        db.select().from(schema.mailingSender).where(scoped(schema.mailingSender.organizationId, org)),
        db.select().from(schema.mailingList).where(scoped(schema.mailingList.organizationId, org)),
        db.select().from(schema.mailingSubscriber).where(scoped(schema.mailingSubscriber.organizationId, org)).orderBy(desc(schema.mailingSubscriber.createdAt)).limit(10000),
        db.select().from(schema.mailingListMember).where(scoped(schema.mailingListMember.organizationId, org)),
        db.select().from(schema.mailingProgram).where(scoped(schema.mailingProgram.organizationId, org)).orderBy(desc(schema.mailingProgram.createdAt)),
        db.select().from(schema.mailingEnrollment).where(scoped(schema.mailingEnrollment.organizationId, org)).limit(10000),
        db.select({ id: schema.mailingSend.id, programId: schema.mailingSend.programId, subscriberId: schema.mailingSend.subscriberId, stepIndex: schema.mailingSend.stepIndex, dueAt: schema.mailingSend.dueAt, status: schema.mailingSend.status, lastError: schema.mailingSend.lastError, nextAttemptAt: schema.mailingSend.nextAttemptAt, acceptedAt: schema.mailingSend.acceptedAt, deliveredAt: schema.mailingSend.deliveredAt, openedAt: schema.mailingSend.openedAt, clickedAt: schema.mailingSend.clickedAt, outcome: schema.mailingSend.outcome }).from(schema.mailingSend).where(scoped(schema.mailingSend.organizationId, org)).orderBy(desc(schema.mailingSend.dueAt)).limit(10000),
        db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, session.userId)),
    ]);
    const sender = senders[0];
    return { sender: sender ? { canConfigureTracking: canConfigureMailingTracking(sender), domain: sender.domain, fromEmail: sender.fromEmail, fromName: sender.fromName, replyTo: sender.replyTo, trackOpens: sender.trackOpens, trackClicks: sender.trackClicks, status: sender.status, records: sender.records, lastError: sender.lastError } : null,
        configured: isMailingConfigured(), canConfigure: canManageOrgSettings(session.role), operatorEmail: users[0]?.email ?? "",
        lists: lists.map((l) => { const ids = new Set(members.filter((m) => m.listId === l.id).map((m) => m.subscriberId)); return { ...l, members: ids.size, eligible: subscribers.filter((s) => ids.has(s.id) && eligibleSubscriber(s)).length }; }),
        subscribers: subscribers.map(({ unsubscribeToken: _nonce, ...s }) => ({ ...s, listIds: members.filter((m) => m.subscriberId === s.id).map((m) => m.listId) })), programs, enrollments, sends };
}
export async function mailingAction(session: SessionContext, action: MailingAction) {
    const db = getDb();
    const org = session.organizationId;
    const now = new Date();
    if (action.action === "create_list") {
        const [list] = await db.insert(schema.mailingList).values({ id: newId("mailingList"), organizationId: org, name: action.name }).onConflictDoNothing().returning();
        if (!list)
            throw new MailingError("Ya existe una lista con ese nombre");
        return { id: list.id };
    }
    if (action.action === "add_subscribers") {
        await requireList(db, org, action.listId);
        await db.transaction(async (tx) => {
            const programs = await tx.select().from(schema.mailingProgram).where(scoped(schema.mailingProgram.organizationId, org, eq(schema.mailingProgram.kind, "sequence"), eq(schema.mailingProgram.listId, action.listId), eq(schema.mailingProgram.autoEnroll, true), inArray(schema.mailingProgram.status, ["active", "paused"])));
            for (const row of action.rows) {
                const [s] = await tx.insert(schema.mailingSubscriber).values({ id: newId("mailingSubscriber"), organizationId: org, email: row.email, name: row.name, consentAt: row.consent ? now : null, unsubscribeToken: randomBytes(32).toString("base64url") })
                    .onConflictDoUpdate({ target: [schema.mailingSubscriber.organizationId, schema.mailingSubscriber.email], set: { name: row.name, consentAt: row.consent ? sql `coalesce(${schema.mailingSubscriber.consentAt}, ${now.toISOString()}::timestamp)` : schema.mailingSubscriber.consentAt } }).returning();
                const [added] = await tx.insert(schema.mailingListMember).values({ id: newId("mailingListMember"), organizationId: org, listId: action.listId, subscriberId: s!.id }).onConflictDoNothing().returning();
                if (added)
                    for (const p of programs)
                        await enroll(tx, org, p, s!, now);
            }
        });
        return { imported: action.rows.length };
    }
    if (action.action === "unsubscribe_subscriber" || action.action === "set_consent") {
        const [s] = await db.update(schema.mailingSubscriber).set(action.action === "unsubscribe_subscriber" ? { unsubscribedAt: now } : { consentAt: action.consent ? now : null })
            .where(scoped(schema.mailingSubscriber.organizationId, org, eq(schema.mailingSubscriber.id, action.subscriberId))).returning();
        if (!s)
            throw new MailingError("Suscriptor no encontrado", 404);
        return { ok: true };
    }
    if (action.action === "remove_member") {
        await requireList(db, org, action.listId);
        await db.delete(schema.mailingListMember).where(scoped(schema.mailingListMember.organizationId, org, eq(schema.mailingListMember.listId, action.listId), eq(schema.mailingListMember.subscriberId, action.subscriberId)));
        return { ok: true };
    }
    if (action.action === "stop_enrollment") {
        const [e] = await db.update(schema.mailingEnrollment).set({ stoppedAt: now }).where(scoped(schema.mailingEnrollment.organizationId, org, eq(schema.mailingEnrollment.id, action.enrollmentId))).returning();
        if (!e)
            throw new MailingError("Inscripción no encontrada", 404);
        return { ok: true };
    }
    if (action.action === "create_program") {
        await requireList(db, org, action.listId);
        if (action.kind === "campaign" && action.steps.length !== 1)
            throw new MailingError("Una campaña contiene un correo", 422);
        const [p] = await db.insert(schema.mailingProgram).values({ id: newId("mailingProgram"), organizationId: org, kind: action.kind, name: action.name, listId: action.listId, steps: action.kind === "campaign" ? [{ ...action.steps[0]!, day: 0 }] : action.steps }).returning();
        return { id: p!.id };
    }
    const [p] = await db.select().from(schema.mailingProgram).where(scoped(schema.mailingProgram.organizationId, org, eq(schema.mailingProgram.id, action.programId)));
    if (!p)
        throw new MailingError("Programa no encontrado", 404);
    if (action.action === "duplicate_program") {
        const [copy] = await db.insert(schema.mailingProgram).values({ id: newId("mailingProgram"), organizationId: org, kind: p.kind, name: `${p.name.slice(0, 90)} (copia)`, listId: p.listId, steps: p.steps }).returning();
        return { id: copy!.id };
    }
    if (action.action === "test_program") {
        const sender = await requireSender(db, org);
        const domain = await checkMailingDomain(sender.providerDomainId!);
        if (domain.status !== "verified")
            throw new MailingError("El dominio ya no está verificado");
        const [user] = await db.select().from(schema.user).where(eq(schema.user.id, session.userId));
        const step = p.steps[action.stepIndex];
        if (!step || !user)
            throw new MailingError("Paso inválido", 422);
        const payload = renderMail(step, user.name, `${getEnv().APP_BASE_URL}/mailing`);
        await sendMailingEmail({ ...payload, from: `${sender.fromName} <${sender.fromEmail}>`, to: user.email, ...(sender.replyTo ? { reply_to: sender.replyTo } : {}) }, newId("mailingSend"));
        return { ok: true };
    }
    return db.transaction(async (tx) => {
        // Una edición o transición compite por la misma fila, antes de materializar audiencia.
        const [current] = await tx.select().from(schema.mailingProgram).where(scoped(schema.mailingProgram.organizationId, org, eq(schema.mailingProgram.id, p.id))).for("update");
        if (!current)
            throw new MailingError("Programa no encontrado", 404);
        const update = async (values: Partial<typeof schema.mailingProgram.$inferInsert>) => tx.update(schema.mailingProgram).set(values).where(scoped(schema.mailingProgram.organizationId, org, eq(schema.mailingProgram.id, p.id)));
        if (action.action === "update_program") {
            if (current.status !== "draft")
                throw new MailingError("Duplica el programa para modificar contenido ya activado");
            await requireList(tx, org, action.listId);
            if (current.kind === "campaign" && action.steps.length !== 1)
                throw new MailingError("Una campaña contiene un correo", 422);
            await update({ name: action.name, listId: action.listId, steps: current.kind === "campaign" ? [{ ...action.steps[0]!, day: 0 }] : action.steps });
        }
        else if (action.action === "start_program") {
            if (current.status !== "draft")
                throw new MailingError("El programa ya fue activado");
            await requireSender(tx, org);
            const date = action.scheduledAt ? new Date(action.scheduledAt) : now;
            if (action.scheduledAt && (date <= now || current.kind === "sequence"))
                throw new MailingError("Elige una fecha futura para la campaña", 422);
            await update({ status: date > now ? "scheduled" : "active", scheduledAt: date, autoEnroll: current.kind === "sequence" && Boolean(action.autoEnroll) });
            if (current.kind === "campaign") {
                const subscribers = (await audience(tx, org, current.listId)).filter((a) => eligibleSubscriber(a.subscriber));
                if (!subscribers.length)
                    throw new MailingError("La lista no tiene destinatarios con permiso");
                for (const { subscriber } of subscribers)
                    await enroll(tx, org, current, subscriber, date);
            }
        }
        else if (action.action === "enroll_program") {
            if (current.kind !== "sequence" || !["active", "paused"].includes(current.status))
                throw new MailingError("Activa la secuencia antes de inscribir contactos");
            for (const { subscriber } of await audience(tx, org, current.listId))
                await enroll(tx, org, current, subscriber, now);
        }
        else if (action.action === "pause_program") {
            if (!["active", "scheduled"].includes(current.status))
                throw new MailingError("El programa no está en curso");
            await update({ status: "paused" });
        }
        else if (action.action === "resume_program") {
            if (current.status !== "paused")
                throw new MailingError("El programa no está pausado");
            await requireSender(tx, org);
            await update({ status: "active" });
        }
        else if (action.action === "cancel_program") {
            if (["completed", "cancelled"].includes(current.status))
                throw new MailingError("El programa ya terminó");
            await update({ status: "cancelled", autoEnroll: false });
            await tx.update(schema.mailingSend).set({ status: "skipped", lastError: "Programa cancelado" }).where(scoped(schema.mailingSend.organizationId, org, eq(schema.mailingSend.programId, current.id), eq(schema.mailingSend.status, "pending")));
        }
        return { ok: true };
    });
}
export async function unsubscribe(org: string, id: string, nonce: string) {
    const [row] = await getDb().update(schema.mailingSubscriber).set({ unsubscribedAt: sql `coalesce(${schema.mailingSubscriber.unsubscribedAt}, now())` })
        .where(scoped(schema.mailingSubscriber.organizationId, org, eq(schema.mailingSubscriber.id, id), eq(schema.mailingSubscriber.unsubscribeToken, nonce))).returning({ id: schema.mailingSubscriber.id });
    return Boolean(row);
}
export function unsubscribeUrl(org: string, sub: typeof schema.mailingSubscriber.$inferSelect) {
    return `${getEnv().APP_BASE_URL.replace(/\/$/, "")}/api/mailing/unsubscribe?token=${unsubscribeToken(org, sub.id, sub.unsubscribeToken)}`;
}
