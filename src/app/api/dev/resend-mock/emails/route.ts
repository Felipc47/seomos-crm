import { z } from "zod";
import { mockGuard } from "@/lib/dev-guard";
import { getResendMockState } from "@/server/dev/resend-mock-state";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  from: z.string().min(1),
  to: z.array(z.string().email()).min(1),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
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
  if (state.failNext > 0) {
    state.failNext--;
    return Response.json({ error: "forced_failure" }, { status: 500 });
  }
  const duplicate = state.outbox.find(
    (email) => email.idempotencyKey === idempotencyKey
  );
  if (duplicate) return Response.json({ id: duplicate.id });
  const id = `re_mock_${state.outbox.length + 1}`;
  state.outbox.push({ id, idempotencyKey, ...parsed.data });
  return Response.json({ id });
}
