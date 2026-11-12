import { mockGuard } from "@/lib/dev-guard";
import { z } from "zod";
export const dynamic = "force-dynamic";
type Mock = { csv: string; status: number; delay: number };
const globalMock = globalThis as unknown as { __sheetsMock?: Record<string, Mock> };
function state() { return globalMock.__sheetsMock ??= {}; }
export async function GET(req: Request) {
  const guard = mockGuard(); if (guard) return guard;
  const entry = state()[new URL(req.url).searchParams.get("gid") ?? "0"];
  if (!entry) return new Response("not configured", { status: 404 });
  if (entry.delay) await new Promise(resolve => setTimeout(resolve, entry.delay));
  return new Response(entry.csv, { status: entry.status, headers: { "content-type": "text/csv" } });
}
export async function POST(req: Request) {
  const guard = mockGuard(); if (guard) return guard;
  const parsed = z.object({ gid: z.string(), csv: z.string().max(6000000), status: z.number().int().min(200).max(599).default(200), delay: z.number().int().min(0).max(25000).default(0) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 422 });
  state()[parsed.data.gid] = parsed.data;
  return Response.json({ ok: true });
}
