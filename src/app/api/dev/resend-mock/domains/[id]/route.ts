import { mockGuard } from "@/lib/dev-guard";
import { getResendMockState } from "@/server/dev/resend-mock-state";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: {
    params: Promise<{
        id: string;
    }>;
}) {
    const guard = mockGuard();
    if (guard)
        return guard;
    if (!req.headers.get("authorization")?.startsWith("Bearer "))
        return new Response(null, { status: 401 });
    const { id } = await ctx.params;
    const state = getResendMockState();
    const domain = state.domains.find((d) => d.id === id);
    if (!domain)
        return new Response(null, { status: 404 });
    domain.status = state.domainVerified ? "verified" : "pending";
    domain.records = domain.records.map((r) => ({ ...r, status: domain.status }));
    return Response.json(domain);
}
export async function PATCH(req: Request, ctx: {
    params: Promise<{
        id: string;
    }>;
}) {
    const guard = mockGuard();
    if (guard)
        return guard;
    if (!req.headers.get("authorization")?.startsWith("Bearer "))
        return new Response(null, { status: 401 });
    const { id } = await ctx.params;
    if (!getResendMockState().domains.some((d) => d.id === id))
        return new Response(null, { status: 404 });
    return Response.json({ object: "domain", id });
}
