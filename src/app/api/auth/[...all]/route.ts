import { apiError } from "@/lib/api";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { ServiceSuspendedError } from "@/server/company-service";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  // Las rutas del plugin también pueden mutar miembros/organizaciones.
  if (new URL(req.url).pathname.startsWith("/api/auth/organization/")) {
    try { await requireSession(); }
    catch (err) {
      if (err instanceof ServiceSuspendedError) return apiError(403, "service_suspended", err.message);
      if (!(err instanceof UnauthorizedError)) throw err;
    }
  }
  return getAuth().handler(req);
}
export const GET = handle;
export const POST = handle;
