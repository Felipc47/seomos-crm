import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { canApproveTemplates, canWriteTemplates } from "@/lib/permissions";
import { TemplatesClient } from "@/components/settings/templates-client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  if (!canWriteTemplates(session.role)) redirect("/inbox");
  const canApprove = session.isSuperadmin || canApproveTemplates(session.role);
  return (
    <div className="flex h-full flex-col">
      <header className="crm-page-header">
        <p className="crm-eyebrow mb-2">Automatización · Biblioteca</p>
        <h2 className="crm-heading">Plantillas</h2>
        <p className="mt-2 text-[13px] text-mute">Mensajes reutilizables para cada momento de la conversación.</p>
      </header>
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-[34px] md:py-[26px]">
        <div className="mx-auto max-w-[900px]">
          <TemplatesClient canApprove={canApprove} />
        </div>
      </div>
    </div>
  );
}
