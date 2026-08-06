import { withAuth } from "@/lib/api";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/server/notifications";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session, req: Request) => {
  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  const beforeRaw = url.searchParams.get("before");
  const before = beforeRaw ? new Date(beforeRaw) : undefined;
  const data = await listNotifications(session.userId, {
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    before: before && !Number.isNaN(before.getTime()) ? before : undefined,
  });
  return Response.json(data);
});

/** Marca todas como leídas (al abrir la campana). */
export const PATCH = withAuth(async (session) => {
  await markAllNotificationsRead(session.userId);
  return Response.json({ ok: true });
});
