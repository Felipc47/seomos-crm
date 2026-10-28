import { apiError } from "@/lib/api";
import { BrevoError } from "@/lib/brevo/account";
import { SmsError } from "./service";
import { SmsProviderError } from "@/lib/brevo/client";
export function smsApiError(error: unknown) {
  if (error instanceof SmsError) return apiError(error.status,error.code,error.message);
  if (error instanceof SmsProviderError) return apiError(503, `brevo_${error.code}`,
    error.code === "uncertain" ? "Brevo no confirmó la operación. Revisa el estado antes de reintentar." : "Brevo rechazó la operación. Revisa los permisos SMS y Webhooks de la clave.");
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
