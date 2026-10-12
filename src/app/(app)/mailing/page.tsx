import { isMailingEnabled } from "@/server/mailing/access";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { canManageMailing } from "@/lib/permissions";
import { MailingClient } from "@/components/mailing/mailing-client";
export const dynamic = "force-dynamic";
export default async function MailingPage() {
    const session = await requireSession();
    if (!canManageMailing(session.role) || !await isMailingEnabled(session.organizationId))
        redirect("/inbox");
    return <div className="flex h-full flex-col"><header className="crm-page-header"><p className="crm-eyebrow mb-2">Automatización · Email</p><h1 className="crm-heading">Mailing</h1><p className="mt-2 text-[13px] text-mute">Campañas y secuencias de correo para tu audiencia.</p></header><div className="flex-1 overflow-y-auto p-5 md:p-8"><MailingClient /></div></div>;
}
