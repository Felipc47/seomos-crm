import { apiError } from "@/lib/api";
import { BrevoError } from "@/lib/brevo/account";
export function smsApiError(error: unknown) {
  if (error instanceof BrevoError) {
    const message = error.code === "auth"
      ? "Revisa la clave y el permiso de lectura de Account en Brevo. La conexión guardada se conserva."
      : error.code === "rate_limit"
        ? "Brevo está limitando las consultas. Intenta más tarde."
        : "No pudimos verificar la cuenta de Brevo. La conexión guardada se conserva.";
    return apiError(error.code === "auth" ? 422 : 503, `brevo_${error.code}`, message);
  }
  // Deliberately do not forward errors to withAuth's generic logger.
  return apiError(500, "sms_internal", "No se pudo completar la operación de SMS.");
}
