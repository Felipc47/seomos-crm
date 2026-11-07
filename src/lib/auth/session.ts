import { redirect } from "next/navigation";
import { getCompanyService, ServiceSuspendedError } from "@/server/company-service";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { resolveMembership } from "@/server/auth/on-signup";

export type SessionContext = {
  userId: string;
  organizationId: string;
  role: string;
  isSuperadmin: boolean;
};

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Sesión + organización activa para route handlers y server components.
 * Lanza UnauthorizedError si no hay sesión u organización.
 */
export async function requireSession(options: { allowSuspended?: boolean } = {}): Promise<SessionContext> {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();
  // La sesión puede crearse antes de que la membresía exista (registro
  // inicial) — la membresía en BD es la fuente de verdad de org + rol.
  const membership = await resolveMembership(session.user.id);
  if (!membership) {
    throw new UnauthorizedError("Sesión sin organización activa");
  }
  if (!options.allowSuspended && !membership.isSuperadmin) {
    const service = await getCompanyService(membership.organizationId);
    if (service?.suspendedAt) throw new ServiceSuspendedError(service.message);
  }
  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    isSuperadmin: membership.isSuperadmin,
  };
}

/** Igual que requireSession pero devuelve null en vez de lanzar. */
export async function getSessionOrNull(options: { allowSuspended?: boolean } = {}): Promise<SessionContext | null> {
  try {
    return await requireSession(options);
  } catch (err) {
    if (err instanceof ServiceSuspendedError) redirect("/service-unavailable");
    return null;
  }
}
