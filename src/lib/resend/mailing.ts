import { z } from "zod";
import { getEnv, isMockEnabled } from "@/lib/env";
export class MailingProviderError extends Error {
    constructor(public safeMessage: string, public retryable = false, public uncertain = false, public retryAfterSeconds = 60) { super(safeMessage); }
}
export function isMailingConfigured() {
    const key = process.env.RESEND_API_KEY?.trim();
    return Boolean(key && !key.startsWith("REEMPLAZA_"));
}
const recordSchema = z.object({ record: z.string(), name: z.string(), value: z.string(), type: z.string(), ttl: z.union([z.string(), z.number()]).optional(), status: z.string().optional(), priority: z.number().optional() });
const domainSchema = z.object({ id: z.string().min(1), name: z.string(), status: z.string(), records: z.array(recordSchema), open_tracking: z.boolean().optional(), click_tracking: z.boolean().optional() });
const pace = globalThis as unknown as {
    __mailingProviderPace?: Promise<void>;
    __mailingProviderStartedAt?: number;
};
async function paceProvider() {
    if (isMockEnabled())
        return;
    const previous = pace.__mailingProviderPace ?? Promise.resolve();
    const next = previous.catch(() => { }).then(async () => {
        const wait = Math.max(0, (pace.__mailingProviderStartedAt ?? 0) + 650 - Date.now());
        if (wait)
            await new Promise((resolve) => setTimeout(resolve, wait));
        pace.__mailingProviderStartedAt = Date.now();
    });
    pace.__mailingProviderPace = next;
    await next;
}
async function provider(path: string, method = "GET", body?: unknown, key?: string): Promise<unknown> {
    if (!isMailingConfigured())
        throw new MailingProviderError("Configura RESEND_API_KEY en el servidor para habilitar mailing");
    await paceProvider();
    const env = getEnv();
    let response: Response;
    try {
        response = await fetch(`${env.RESEND_BASE_URL.replace(/\/$/, "")}${path}`, {
            method, headers: { authorization: `Bearer ${env.RESEND_API_KEY!}`, "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000),
        });
    }
    catch {
        throw new MailingProviderError("No se pudo confirmar la respuesta de Resend", true, true);
    }
    if (!response.ok) {
        const status = response.status;
        const wait = Number(response.headers.get("retry-after"));
        throw new MailingProviderError(`Resend respondió HTTP ${status}`, status === 429 || status >= 500, status >= 500, Number.isFinite(wait) && wait > 0 ? Math.min(wait, 86400) : 60);
    }
    const result = await response.json().catch(() => null);
    if (!result)
        throw new MailingProviderError("Respuesta inválida de Resend", true, true);
    return result;
}
export async function createMailingDomain(name: string, allowExisting = false) {
    // Solo el superadmin puede asociar dominios preexistentes de la cuenta compartida.
    if (allowExisting) {
        const listed = z.object({ data: z.array(z.object({ id: z.string().min(1), name: z.string() })) }).safeParse(await provider("/domains"));
        if (!listed.success)
            throw new MailingProviderError("Respuesta inválida al buscar el dominio");
        const existing = listed.data.data.find((d) => d.name === name);
        if (existing)
            return { ...await checkMailingDomain(existing.id), managesDomain: false };
    }
    const result = domainSchema.safeParse(await provider("/domains", "POST", { name }));
    if (!result.success || result.data.name !== name)
        throw new MailingProviderError("Respuesta inválida al registrar dominio", false, true);
    return { ...result.data, managesDomain: true };
}
export async function checkMailingDomain(id: string, verify = false) {
    if (verify)
        await provider(`/domains/${encodeURIComponent(id)}/verify`, "POST");
    const result = domainSchema.safeParse(await provider(`/domains/${encodeURIComponent(id)}`));
    if (!result.success)
        throw new MailingProviderError("Respuesta inválida al verificar dominio");
    return result.data;
}
export async function setMailingTracking(id: string, opens: boolean, clicks: boolean) {
    await provider(`/domains/${encodeURIComponent(id)}`, "PATCH", { open_tracking: opens, click_tracking: clicks });
    return checkMailingDomain(id);
}
export async function sendMailingEmail(payload: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    reply_to?: string;
    headers?: Record<string, string>;
}, id: string, organizationId?: string) {
    const result = z.object({ id: z.string().min(1) }).safeParse(await provider("/emails", "POST", { ...payload, to: [payload.to], ...(organizationId ? { tags: [{ name: "mailing_send", value: id }, { name: "mailing_org", value: organizationId }] } : {}) }, `mailing/${id}`));
    if (!result.success)
        throw new MailingProviderError("Respuesta inválida al enviar correo", true, true);
    return result.data;
}
