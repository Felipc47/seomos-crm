import { getSessionOrNull } from "@/lib/auth/session";
import { isOrgAdmin } from "@/lib/permissions";
import { ServicesClient } from "@/components/settings/services-client";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await getSessionOrNull();
  const canManageAssignments = session ? isOrgAdmin(session.role) : false;
  return (
    <div className="flex h-full flex-col">
      <header className="crm-page-header">
        <p className="crm-eyebrow mb-2">Gestión · Oferta comercial</p>
        <h2 className="crm-heading">Servicios</h2>
        <p className="mt-2 text-[13px] text-mute">Organiza tu oferta y conecta cada oportunidad con tu equipo.</p>
      </header>
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-[34px] md:py-[26px]">
        <div className="mx-auto max-w-[900px]">
          <ServicesClient
            canLinkForms={canManageAssignments}
            canManageAssignments={canManageAssignments}
          />
        </div>
      </div>
    </div>
  );
}
