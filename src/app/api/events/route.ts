import { isCompanyServiceActive, ServiceSuspendedError } from "@/server/company-service";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { subscribe } from "@/server/events/bus";

/**
 * Canal SSE de la bandeja (contrato sse.md).
 * Headers exactos + heartbeat ~25s para sobrevivir detrás de Caddy/Traefik.
 * El servidor no garantiza replay: el cliente hace catch-up con `since=`.
 */
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

export async function GET(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof ServiceSuspendedError) return Response.json({ error: { code: "service_suspended", message: err.message } }, { status: 403 });
    if (err instanceof UnauthorizedError) {
      return new Response("No autenticado", { status: 401 });
    }
    throw err;
  }
  const { organizationId } = session;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let pending = Promise.resolve();
      let closed = false;
      const send = (chunk: string) => {
        // Una membresía eliminada no debe conservar acceso por un SSE abierto.
        pending = pending.then(async () => {
          if (closed) return;
          const [member] = await getDb().select({ id: schema.member.id }).from(schema.member)
            .where(scoped(schema.member.organizationId, organizationId, eq(schema.member.userId, session.userId))).limit(1);
          if (!member || !(await isCompanyServiceActive(organizationId))) { cleanup?.(); return; }
          controller.enqueue(encoder.encode(chunk));
        }).catch(() => cleanup?.());
      };

      send(`: conectado\n\n`);

      const unsubscribe = subscribe(organizationId, (event) => {
        send(
          `event: ${event.type}\n` +
            `id: ${Date.now()}\n` +
            `data: ${JSON.stringify(event.data)}\n\n`
        );
      });

      const heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);

      cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      };

      req.signal.addEventListener("abort", () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
