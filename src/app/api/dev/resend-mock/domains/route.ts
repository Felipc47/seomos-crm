import { z } from "zod";
import { mockGuard } from "@/lib/dev-guard";
import { getResendMockState } from "@/server/dev/resend-mock-state";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
    const guard = mockGuard();
    if (guard)
        return guard;
    if (!req.headers.get("authorization")?.startsWith("Bearer "))
        return new Response(null, { status: 401 });
    const parsed = z.object({ name: z.string().min(3) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success)
        return new Response(null, { status: 422 });
    const state = getResendMockState();
    if (state.domains.some((d) => d.name === parsed.data.name))
        return Response.json({ error: "domain_exists" }, { status: 409 });
    const domain = { id: `domain_mock_${state.domains.length + 1}`, name: parsed.data.name, status: "not_started", records: [
            { record: "DKIM", type: "TXT", name: `resend._domainkey.${parsed.data.name}`, value: "mock-dkim-not-for-production", ttl: "Auto", status: "not_started" },
            { record: "SPF", type: "TXT", name: `send.${parsed.data.name}`, value: "v=spf1 include:mock.test ~all", ttl: "Auto", status: "not_started" },
            { record: "SPF", type: "MX", name: `send.${parsed.data.name}`, value: "feedback.mock.test", priority: 10, ttl: "Auto", status: "not_started" },
        ] };
    state.domains.push(domain);
    return Response.json(domain);
}

export async function GET(req: Request) {
    const guard = mockGuard();
    if (guard) return guard;
    if (!req.headers.get("authorization")?.startsWith("Bearer ")) return new Response(null, { status: 401 });
    return Response.json({ object: "list", has_more: false, data: getResendMockState().domains });
}
