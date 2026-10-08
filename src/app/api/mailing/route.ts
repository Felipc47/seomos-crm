import { after } from "next/server";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getSql } from "@/lib/db";
import { canManageMailing } from "@/lib/permissions";
import { isMailingEnabled } from "@/server/mailing/access";
import { mailingActionSchema } from "@/lib/mailing";
import { MailingProviderError } from "@/lib/resend/mailing";
import { mailingAction, MailingError, mailingSnapshot } from "@/server/mailing/repository";
import { sweepMailing } from "@/server/mailing/runner";
export const dynamic = "force-dynamic";
export const GET = withAuth(async (session) => {
    if (!canManageMailing(session.role))
        return apiError(403, "forbidden", "Sin acceso a mailing");
    if (!await isMailingEnabled(session.organizationId))
        return apiError(404, "mailing_disabled", "Mailing no está habilitado para esta empresa");
    return Response.json(await mailingSnapshot(session));
});
export const POST = withAuth(async (session, req: Request) => {
    if (!canManageMailing(session.role))
        return apiError(403, "forbidden", "Sin acceso a mailing");
    if (!await isMailingEnabled(session.organizationId))
        return apiError(404, "mailing_disabled", "Mailing no está habilitado para esta empresa");
    const body = await parseBody(req, mailingActionSchema);
    if (!body.ok)
        return body.response;
    // El correo de prueba también se serializa con la retirada de acceso.
    const connection = body.data.action === "test_program" ? await getSql().reserve() : null;
    if (connection) {
        const [lock] = await connection`select pg_try_advisory_lock(280028) as acquired`;
        if (!lock?.acquired) {
            connection.release();
            return apiError(409, "busy", "Hay un envío en curso. Intenta nuevamente.");
        }
    }
    try {
        if (connection && !await isMailingEnabled(session.organizationId))
            return apiError(404, "mailing_disabled", "Mailing no está habilitado para esta empresa");
        const result = await mailingAction(session, body.data);
        const action = body.data;
        const immediate = (action.action === "start_program" && !action.scheduledAt) || action.action === "resume_program" || action.action === "enroll_program" || action.action === "add_subscribers";
        if (immediate) {
            const target = { organizationId: session.organizationId, ...("programId" in action ? { programId: action.programId } : {}) };
            after(async () => {
                try {
                    await sweepMailing(new Date(), target);
                } catch {
                    // Outbox permanece durable y el cron recupera el trabajo.
                    console.error("[mailing] el inicio inmediato se recuperará en el próximo ciclo");
                }
            });
        }
        return Response.json(result);
    }
    catch (error) {
        if (error instanceof MailingError)
            return apiError(error.status, "mailing", error.message);
        if (error instanceof MailingProviderError)
            return apiError(502, "provider", error.safeMessage);
        console.error("[mailing] no se pudo completar la acción");
        return apiError(500, "internal", "No se pudo completar la acción de mailing");
    }
    finally {
        if (connection) {
            await connection`select pg_advisory_unlock(280028)`;
            connection.release();
        }
    }
});
