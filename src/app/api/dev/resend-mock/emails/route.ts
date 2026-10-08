import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mockGuard } from "@/lib/dev-guard";
import { getResendMockState } from "@/server/dev/resend-mock-state";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  from: z.string().min(1),
  to: z.array(z.string().email()).min(1),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  headers: z.record(z.string()).optional(),
  reply_to: z.string().optional(),
  tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});

export async function POST(req: Request) {
  const guard = mockGuard();
  if (guard) return guard;
  const authorization = req.headers.get("authorization") ?? "";
  const idempotencyKey = req.headers.get("idempotency-key") ?? "";
  if (!authorization.startsWith("Bearer ") || !idempotencyKey) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const state = getResendMockState();
  if (state.statusNext) { const status = state.statusNext; state.statusNext = 0; return Response.json({ error: "forced_status" }, { status, headers: { "retry-after": "60" } }); }
  if (state.failNext > 0) {
    state.failNext--;
    return Response.json({ error: "forced_failure" }, { status: 500 });
  }
  const duplicate = state.outbox.find(
    (email) => email.idempotencyKey === idempotencyKey
  );
  if (duplicate) return Response.json({ id: duplicate.id });
  const id = `re_mock_${randomUUID()}`;
  state.outbox.push({ id, idempotencyKey, ...parsed.data });
  if (state.malformedNext > 0) { state.malformedNext--; return Response.json({ unexpected: true }); }
  return Response.json({ id });
}
