import { InboxClient } from "@/components/inbox/inbox-client";
import { requireSession } from "@/lib/auth/session";
import { canManageMailing } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await requireSession();
  return <InboxClient smsEnabled={canManageMailing(session.role)} />;
}
