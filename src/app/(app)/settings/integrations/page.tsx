import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { isOrgAdmin } from "@/lib/permissions";
import { SheetsClient } from "@/components/settings/sheets-client";
import { WebFormsClient } from "@/components/settings/web-forms-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  if (!isOrgAdmin(session.role)) redirect("/settings/profile");
  return <div className="space-y-10"><SheetsClient /><WebFormsClient /></div>;
}
