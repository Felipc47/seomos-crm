import { z } from "zod";
export const mailingStepSchema = z.object({
    day: z.number().int().min(0).max(3650),
    subject: z.string().trim().min(1).max(200).refine((s) => !/[\r\n]/.test(s), "El asunto debe ocupar una línea"),
    body: z.string().trim().min(1).max(20000),
});
export type MailingStep = z.infer<typeof mailingStepSchema>;
export const mailingStepsSchema = z.array(mailingStepSchema).min(1).max(20)
    .refine((steps) => steps.every((s, i) => i === 0 || s.day > steps[i - 1]!.day), "Los días deben ser estrictamente crecientes");
export const mailingSubscriberSchema = z.object({
    email: z.string().trim().email().max(254).transform((s) => s.toLowerCase()),
    name: z.string().trim().min(1).max(120),
    consent: z.boolean(),
});
const id = z.string().min(1).max(80);
const program = z.object({ name: z.string().trim().min(1).max(100), listId: id, steps: mailingStepsSchema });
export const mailingActionSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("create_list"), name: z.string().trim().min(1).max(100) }),
    z.object({ action: z.literal("add_subscribers"), listId: id, rows: z.array(mailingSubscriberSchema).min(1).max(5000) }),
    z.object({ action: z.literal("unsubscribe_subscriber"), subscriberId: id }),
    z.object({ action: z.literal("set_consent"), subscriberId: id, consent: z.boolean() }),
    z.object({ action: z.literal("remove_member"), subscriberId: id, listId: id }),
    program.extend({ action: z.literal("create_program"), kind: z.enum(["campaign", "sequence"]) }),
    program.extend({ action: z.literal("update_program"), programId: id }),
    z.object({ action: z.literal("duplicate_program"), programId: id }),
    z.object({ action: z.literal("start_program"), programId: id, scheduledAt: z.string().datetime({ offset: true }).optional(), autoEnroll: z.boolean().optional() }),
    z.object({ action: z.literal("pause_program"), programId: id }),
    z.object({ action: z.literal("resume_program"), programId: id }),
    z.object({ action: z.literal("cancel_program"), programId: id }),
    z.object({ action: z.literal("enroll_program"), programId: id }),
    z.object({ action: z.literal("stop_enrollment"), enrollmentId: id }),
    z.object({ action: z.literal("test_program"), programId: id, stepIndex: z.number().int().min(0).max(19) }),
]);
export type MailingAction = z.infer<typeof mailingActionSchema>;
export const senderSchema = z.object({
    action: z.literal("configure"),
    domain: z.string().trim().toLowerCase().max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Dominio inválido"),
    fromEmail: z.string().trim().email().max(254).transform((s) => s.toLowerCase()),
    fromName: z.string().trim().min(1).max(80).refine((s) => !/[<>\r\n]/.test(s), "Nombre inválido"),
    replyTo: z.string().trim().email().max(254).optional(),
    trackOpens: z.boolean().default(false),
    trackClicks: z.boolean().default(false),
}).refine((s) => s.fromEmail.split("@")[1] === s.domain, "El correo debe pertenecer al dominio configurado");
export type DnsRecord = {
    record: string;
    name: string;
    value: string;
    type: string;
    ttl?: string | number;
    status?: string;
    priority?: number;
};
export type MailingSnapshot = {
    sender: {
        canConfigureTracking: boolean;
        domain: string;
        fromEmail: string;
        fromName: string;
        replyTo: string | null;
        trackOpens: boolean;
        trackClicks: boolean;
        status: string;
        records: DnsRecord[];
        lastError: string | null;
    } | null;
    configured: boolean;
    canConfigure: boolean;
    operatorEmail: string;
    lists: {
        id: string;
        name: string;
        members: number;
        eligible: number;
    }[];
    subscribers: {
        id: string;
        email: string;
        name: string;
        consentAt: string | null;
        unsubscribedAt: string | null;
        suppressedAt: string | null;
        suppressionReason: string | null;
        listIds: string[];
    }[];
    programs: {
        id: string;
        name: string;
        kind: "campaign" | "sequence";
        listId: string;
        steps: MailingStep[];
        status: string;
        autoEnroll: boolean;
        scheduledAt: string | null;
    }[];
    enrollments: {
        id: string;
        programId: string;
        subscriberId: string;
        startedAt: string;
        stoppedAt: string | null;
    }[];
    sends: {
        id: string;
        programId: string;
        subscriberId: string;
        stepIndex: number;
        dueAt: string;
        status: string;
        lastError: string | null;
        nextAttemptAt: string | null;
        acceptedAt: string | null;
        deliveredAt: string | null;
        openedAt: string | null;
        clickedAt: string | null;
        outcome: string | null;
    }[];
};
export function eligibleSubscriber(s: {
    consentAt: Date | string | null;
    unsubscribedAt: Date | string | null;
    suppressedAt: Date | string | null;
}): boolean {
    return Boolean(s.consentAt && !s.unsubscribedAt && !s.suppressedAt);
}
export function stepDueAt(start: Date, day: number): Date {
    return new Date(start.getTime() + day * 86400000);
}
export function escapeMailHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
export function renderMail(step: MailingStep, name: string, unsubscribeUrl: string) {
    const subject = step.subject.replaceAll("{{nombre}}", name.replace(/[\r\n]/g, " "));
    const body = step.body.replaceAll("{{nombre}}", name);
    const paragraphs = escapeMailHtml(body).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`).split(/\n\n+/).map((p) => `<p>${p.replaceAll("\n", "<br>")}</p>`).join("");
    return { subject, text: `${body}\n\nDejar de recibir estos correos: ${unsubscribeUrl}`, html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1b2633;line-height:1.6;max-width:640px;margin:24px auto;padding:24px">${paragraphs}<hr><p style="font-size:12px"><a href="${escapeMailHtml(unsubscribeUrl)}">Dejar de recibir estos correos</a></p></body></html>` };
}
/** CSV con comillas/delimitadores o TSV. Primera columna email, segunda nombre. */
export function parseMailingCsv(input: string, consent: boolean) {
    const delimiter = input.split(/\r?\n/)[0]?.includes("\t") ? "\t" : input.split(/\r?\n/)[0]?.includes(";") ? ";" : ",";
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < input.length; i++) {
        const c = input[i]!;
        if (c === '"') {
            if (quoted && input[i + 1] === '"') {
                field += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if (!quoted && (c === delimiter || c === "\n")) {
            row.push(field.trim());
            field = "";
            if (c === "\n") {
                rows.push(row);
                row = [];
            }
        }
        else if (c !== "\r")
            field += c;
    }
    if (quoted)
        throw new Error("CSV con comillas sin cerrar");
    row.push(field.trim());
    rows.push(row);
    return rows.filter((r) => r.some(Boolean) && !/^(email|correo)$/i.test(r[0] ?? "")).map((r) => mailingSubscriberSchema.parse({ email: r[0], name: r[1] || r[0]?.split("@")[0], consent }));
}
