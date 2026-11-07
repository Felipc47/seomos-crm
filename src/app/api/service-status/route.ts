import { apiError } from "@/lib/api";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getCompanyService } from "@/server/company-service";

export const dynamic = "force-dynamic";

/** Única lectura privada disponible durante la pausa; siempre de la propia empresa. */
export async function GET() {
  try {
    const session = await requireSession({ allowSuspended: true });
    const service = await getCompanyService(session.organizationId);
    if (!service) return apiError(401, "unauthorized", "No autenticado");
    return Response.json({
      suspended: !session.isSuperadmin && Boolean(service.suspendedAt),
      companyName: service.name, title: service.title, message: service.message,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UnauthorizedError) return apiError(401, "unauthorized", "No autenticado");
    throw err;
  }
}
