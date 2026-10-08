import { z } from "zod";
import { eq, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { getEnv } from "@/lib/env";
import { newId } from "@/lib/db/ids";
import { verifyMailingWebhook } from "@/server/mailing/security";
export const dynamic = "force-dynamic";
const eventSchema = z.object({ type: z.enum(["email.sent", "email.delivered", "email.bounced", "email.complained", "email.failed", "email.opened", "email.clicked", "email.delivery_delayed"]), created_at: z.string().datetime({ offset: true }), data: z.object({ email_id: z.string().min(1), tags: z.union([z.record(z.string()), z.array(z.object({ name: z.string(), value: z.string() }))]).optional() }) });
export async function POST(req: Request) {
    const secret = getEnv().RESEND_WEBHOOK_SECRET;
    if (!secret || secret.startsWith("REEMPLAZA_"))
        return new Response(null, { status: 404 });
    if (Number(req.headers.get("content-length") ?? 0) > 262144)
        return new Response(null, { status: 413 });
    const raw = await req.text();
    if (raw.length > 262144)
        return new Response(null, { status: 413 });
    if (!verifyMailingWebhook(raw, req.headers, secret))
        return new Response(null, { status: 401 });
    let json: unknown;
    try {
        json = JSON.parse(raw);
    }
    catch {
        return new Response(null, { status: 400 });
    }
    const event = eventSchema.safeParse(json);
    if (!event.success)
        return new Response(null, { status: 422 });
    const db = getDb();
    // Router de evento: solo enumera tenants; búsqueda del envío siempre scoped.
    const tags = Array.isArray(event.data.data.tags) ? Object.fromEntries(event.data.data.tags.map((t) => [t.name, t.value])) : event.data.data.tags ?? {};
    const orgs = await db.select({ id: schema.organization.id }).from(schema.organization).where(tags.mailing_org ? sql `${schema.organization.id} = ${tags.mailing_org} and ${schema.organization.deletedAt} is null` : isNull(schema.organization.deletedAt));
    for (const org of orgs) {
        const [send] = await db.select().from(schema.mailingSend).where(scoped(schema.mailingSend.organizationId, org.id, tags.mailing_send ? eq(schema.mailingSend.id, tags.mailing_send) : undefined, tags.mailing_send ? or(isNull(schema.mailingSend.providerMessageId), eq(schema.mailingSend.providerMessageId, event.data.data.email_id)) : eq(schema.mailingSend.providerMessageId, event.data.data.email_id)));
        if (!send)
            continue;
        const at = new Date(event.data.created_at);
        const kind = event.data.type;
        await db.transaction(async (tx) => {
            const [reserved] = await tx.insert(schema.mailingEvent).values({ id: newId("mailingEvent"), organizationId: org.id, sendId: send.id, providerEventId: req.headers.get("svix-id")!, kind, occurredAt: at }).onConflictDoNothing().returning();
            if (!reserved)
                return;
            await tx.update(schema.mailingSend).set({
                status: "accepted", providerMessageId: event.data.data.email_id,
                acceptedAt: sql `coalesce(${schema.mailingSend.acceptedAt}, ${at.toISOString()}::timestamp)`,
                leaseUntil: null, nextAttemptAt: null, lastError: null,
                deliveredAt: kind === "email.delivered" ? sql `coalesce(${schema.mailingSend.deliveredAt}, ${at.toISOString()}::timestamp)` : schema.mailingSend.deliveredAt,
                openedAt: kind === "email.opened" ? sql `coalesce(${schema.mailingSend.openedAt}, ${at.toISOString()}::timestamp)` : schema.mailingSend.openedAt,
                clickedAt: kind === "email.clicked" ? sql `coalesce(${schema.mailingSend.clickedAt}, ${at.toISOString()}::timestamp)` : schema.mailingSend.clickedAt,
                outcome: ["email.bounced", "email.complained", "email.failed"].includes(kind) ? sql `case when ${schema.mailingSend.outcome} = 'complained' then 'complained' when ${schema.mailingSend.outcome} = 'bounced' and ${kind} != 'email.complained' then 'bounced' else ${kind.replace("email.", "")} end` : schema.mailingSend.outcome,
            }).where(scoped(schema.mailingSend.organizationId, org.id, eq(schema.mailingSend.id, send.id)));
            if (kind === "email.bounced" || kind === "email.complained")
                await tx.update(schema.mailingSubscriber).set({ suppressedAt: at, suppressionReason: kind.replace("email.", "") }).where(scoped(schema.mailingSubscriber.organizationId, org.id, eq(schema.mailingSubscriber.id, send.subscriberId)));
        });
        return Response.json({ ok: true });
    }
    // Correos transaccionales y pruebas no pertenecen a este ledger.
    return Response.json({ ok: true, ignored: true });
}
