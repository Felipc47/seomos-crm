import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { canManageMailing } from "@/lib/permissions";
import { SmsInbox } from "@/components/sms/sms-inbox";
export const dynamic = "force-dynamic";
export default async function SmsPage() {
  const session = await requireSession();
  if (!canManageMailing(session.role)) redirect("/inbox");
  return <div className="flex h-full flex-col overflow-y-auto"><header className="crm-page-header"><p className="crm-eyebrow mb-2">Mensajes · Brevo</p><h1 className="crm-heading">SMS</h1><p className="mt-2 text-sm text-mute">Envía avisos individuales y atiende las respuestas de tus contactos.</p></header><div className="p-5 md:p-8"><SmsInbox /></div></div>;
}
