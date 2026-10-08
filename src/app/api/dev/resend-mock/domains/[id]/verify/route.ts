import { mockGuard } from "@/lib/dev-guard";
import { getResendMockState } from "@/server/dev/resend-mock-state";
export async function POST(req: Request, ctx: {
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
    getResendMockState().domainMutations.push({ id, method: "VERIFY" });
    return Response.json({ object: "domain", id });
}
