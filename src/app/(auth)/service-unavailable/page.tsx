import { redirect } from "next/navigation";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getCompanyService } from "@/server/company-service";
import { ServiceUnavailable } from "@/components/companies/service-unavailable";

export const dynamic = "force-dynamic";
export default async function ServiceUnavailablePage() {
  let session;
  try { session = await requireSession({ allowSuspended: true }); }
  catch (err) { if (err instanceof UnauthorizedError) redirect("/login"); throw err; }
  const service = await getCompanyService(session.organizationId);
  if (session.isSuperadmin || !service?.suspendedAt) redirect("/inbox");
  return <ServiceUnavailable companyName={service.name} title={service.title} message={service.message} />;
}
