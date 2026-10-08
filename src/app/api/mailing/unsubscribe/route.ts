import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { scoped } from "@/lib/db/tenant";
import { escapeMailHtml } from "@/lib/mailing";
import { readUnsubscribeToken } from "@/server/mailing/security";
import { unsubscribe } from "@/server/mailing/repository";
export const dynamic = "force-dynamic";
function html(content: string, status = 200) {
    return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Preferencias de correo</title><body style="font-family:system-ui;max-width:560px;margin:64px auto;padding:24px"><h1>Preferencias de correo</h1>${content}</body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" } });
}
export async function GET(req: Request) {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const parsed = readUnsubscribeToken(token);
    if (!parsed)
        return html("<p>Este enlace no es válido.</p>", 404);
    const [org, id, nonce] = parsed;
    const [sub] = await getDb().select({ id: schema.mailingSubscriber.id }).from(schema.mailingSubscriber).where(scoped(schema.mailingSubscriber.organizationId, org, eq(schema.mailingSubscriber.id, id), eq(schema.mailingSubscriber.unsubscribeToken, nonce)));
    if (!sub)
        return html("<p>Este enlace no es válido.</p>", 404);
    return html(`<p>Confirma si quieres dejar de recibir los correos de marketing de esta empresa.</p><form method="post" action="?token=${escapeMailHtml(token)}"><button type="submit">Confirmar baja</button></form>`);
}
export async function POST(req: Request) {
    const parsed = readUnsubscribeToken(new URL(req.url).searchParams.get("token") ?? "");
    if (!parsed || !await unsubscribe(...parsed))
        return html("<p>Este enlace no es válido.</p>", 404);
    return html("<p>Tu baja quedó registrada. No recibirás más campañas ni automatizaciones de esta empresa.</p>");
}
