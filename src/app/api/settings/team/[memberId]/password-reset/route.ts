import { and, eq } from "drizzle-orm";
import { apiError, withAuth } from "@/lib/api";
import {
  getAuth,
  PasswordResetDeliveryError,
  runInternalPasswordReset,
} from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getEnv, isEmailConfigured } from "@/lib/env";
import { isOrgAdmin } from "@/lib/permissions";
import { AUTH_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ memberId: string }> };

export const POST = withAuth(
  async (session, _req: Request, context: Params) => {
    if (!isOrgAdmin(session.role)) {
      return apiError(
        403,
        "forbidden",
        "Solo el admin puede restablecer contraseñas del equipo"
      );
    }
    const { memberId } = await context.params;
    const rate = checkRateLimit(
      `team-password-reset:${session.userId}:${memberId}`,
      AUTH_RATE_LIMIT
    );
    if (!rate.allowed) {
      return apiError(
        429,
        "rate_limited",
        "Demasiadas solicitudes; espera unos minutos"
      );
    }

    const rows = await getDb()
      .select({ email: schema.user.email })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(
        and(
          eq(schema.member.id, memberId),
          eq(schema.member.organizationId, session.organizationId)
        )
      )
      .limit(1);
    const target = rows[0];
    if (!target) {
      return apiError(404, "not_found", "Miembro no encontrado");
    }
    if (!isEmailConfigured()) {
      return apiError(
        503,
        "email_unavailable",
        "El correo no está disponible. Revisa la configuración de Resend e inténtalo otra vez."
      );
    }

    try {
      const appUrl = getEnv().APP_BASE_URL.replace(/\/$/, "");
      await runInternalPasswordReset(() =>
        getAuth().api.requestPasswordReset({
          body: {
            email: target.email,
            redirectTo: `${appUrl}/reset-password`,
          },
        })
      );
    } catch (error) {
      if (error instanceof PasswordResetDeliveryError) {
        return apiError(
          503,
          "email_unavailable",
          "No se pudo enviar el enlace. Inténtalo otra vez en unos minutos."
        );
      }
      throw error;
    }
    return Response.json({ ok: true });
  }
);
