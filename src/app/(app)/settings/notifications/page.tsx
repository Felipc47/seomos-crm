import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { isOrgAdmin } from "@/lib/permissions";
import { NotificationsClient } from "@/components/settings/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  if (!isOrgAdmin(session.role)) redirect("/settings/profile");

  return <NotificationsClient />;
}

