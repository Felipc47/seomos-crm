import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { isOrgAdmin } from "@/lib/permissions";
import { timezoneOptions } from "@/lib/timezone";
import { getCalendarSettings } from "@/server/org-settings";
import { TimezoneClient } from "@/components/settings/timezone-client";

export const dynamic = "force-dynamic";

export default async function TimezonePage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  if (!isOrgAdmin(session.role)) redirect("/settings/profile");
  const { timezone } = await getCalendarSettings(session.organizationId);
  return <TimezoneClient initialTimezone={timezone} options={timezoneOptions(timezone)} />;
}
