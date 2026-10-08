import { isMailingEnabled } from "@/server/mailing/access";
import { z } from "zod";
import { apiError, withAuth } from "@/lib/api";
import { getDb, getSql, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { canManageOrgSettings } from "@/lib/permissions";
import { senderSchema } from "@/lib/mailing";
import { checkMailingDomain, createMailingDomain, MailingProviderError, setMailingTracking } from "@/lib/resend/mailing";
export const dynamic = "force-dynamic";
export const POST = withAuth(async (session, req: Request) => {
    if (!canManageOrgSettings(session.role))
        return apiError(403, "forbidden", "Solo el administrador configura el remitente");
    if (!await isMailingEnabled(session.organizationId))
        return apiError(404, "mailing_disabled", "Mailing no está habilitado para esta empresa");
    const raw: unknown = await req.json().catch(() => null);
    const verify = z.object({ action: z.literal("verify") }).safeParse(raw);
    const parsed = senderSchema.safeParse(raw);
    if (!parsed.success && !verify.success)
        return apiError(422, "invalid_sender", "Revisa dominio, nombre y dirección del remitente");
    const connection = await getSql().reserve();
    const [lock] = await connection `select pg_try_advisory_lock(280028) as acquired`;
    if (!lock?.acquired) {
        connection.release();
        return apiError(409, "busy", "Hay un envío o cambio de remitente en curso. Intenta nuevamente.");
    }
    try {
        if (!await isMailingEnabled(session.organizationId))
            return apiError(404, "mailing_disabled", "Mailing no está habilitado para esta empresa");
        const db = getDb();
        const org = session.organizationId;
        let [sender] = await db.select().from(schema.mailingSender).where(scoped(schema.mailingSender.organizationId, org));
        if (parsed.success) {
            if (!sender) {
                const [reserved] = await db.insert(schema.mailingSender).values({ organizationId: org, domain: parsed.data.domain, fromEmail: parsed.data.fromEmail, fromName: parsed.data.fromName, replyTo: parsed.data.replyTo ?? null, trackOpens: parsed.data.trackOpens, trackClicks: parsed.data.trackClicks }).onConflictDoNothing().returning();
                if (!reserved)
                    return apiError(409, "domain_reserved", "Este dominio ya está configurado o se está registrando");
                sender = reserved;
            }
            else {
                const changingDomain = sender.domain !== parsed.data.domain;
                try {
                    const [updated] = await db.update(schema.mailingSender).set({ domain: parsed.data.domain, fromEmail: parsed.data.fromEmail, fromName: parsed.data.fromName, replyTo: parsed.data.replyTo ?? null, trackOpens: parsed.data.trackOpens, trackClicks: parsed.data.trackClicks,
                        ...(changingDomain ? { providerDomainId: null, status: "not_started", records: [], lastError: null } : {})
                    }).where(scoped(schema.mailingSender.organizationId, org)).returning();
                    sender = updated;
                }
                catch {
                    return apiError(409, "domain_reserved", "No se pudo reservar ese dominio. Comprueba si ya está configurado.");
                }
            }
        }
        if (!sender)
            return apiError(409, "no_sender", "Configura primero el remitente");
        try {
            let domain = sender.providerDomainId ? await checkMailingDomain(sender.providerDomainId, verify.success) : await createMailingDomain(sender.domain, session.isSuperadmin);
            if (domain.name !== sender.domain)
                return apiError(502, "domain_mismatch", "No se pudo confirmar el dominio");
            await db.update(schema.mailingSender).set({ providerDomainId: domain.id, status: domain.status, records: domain.records, lastError: null, updatedAt: new Date() }).where(scoped(schema.mailingSender.organizationId, org));
            if (parsed.success) {
                domain = await setMailingTracking(domain.id, parsed.data.trackOpens, parsed.data.trackClicks);
                await db.update(schema.mailingSender).set({ status: domain.status, records: domain.records }).where(scoped(schema.mailingSender.organizationId, org));
            }
            return Response.json({ status: domain.status, records: domain.records });
        }
        catch (error) {
            const message = error instanceof MailingProviderError ? error.safeMessage : "No se pudo configurar el dominio";
            await db.update(schema.mailingSender).set({ lastError: message }).where(scoped(schema.mailingSender.organizationId, org));
            return apiError(502, "provider", message);
        }
    }
    finally {
        await connection `select pg_advisory_unlock(280028)`;
        connection.release();
    }
});
