import { z } from "zod";
import { mockGuard } from "@/lib/dev-guard";
import {
  getResendMockState,
  resetResendMockState,
} from "@/server/dev/resend-mock-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = mockGuard();
  if (guard) return guard;
  const state = getResendMockState();
  return Response.json({ outbox: state.outbox, domains: state.domains, domainMutations: state.domainMutations, failNext: state.failNext });
}

export async function DELETE() {
  const guard = mockGuard();
  if (guard) return guard;
  resetResendMockState();
  return Response.json({ cleared: true });
}

const failSchema = z.object({ failNext: z.number().int().min(0).max(20).optional(), statusNext: z.union([z.literal(0), z.literal(429), z.literal(422)]).optional(), malformedNext: z.number().int().min(0).max(20).optional(), domainVerified: z.boolean().optional() });

export async function POST(req: Request) {
  const guard = mockGuard();
  if (guard) return guard;
  const parsed = failSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  Object.assign(getResendMockState(), parsed.data);
  return Response.json({ configured: true });
}
