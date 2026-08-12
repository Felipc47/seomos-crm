import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardClient, DashboardSkeleton } from "@/components/dashboard/dashboard-client";
import { requireSession } from "@/lib/auth/session";
import { canViewDashboard } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  if (!canViewDashboard(session.role)) redirect("/inbox");
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}
