import { apiError, withAuth } from "@/lib/api";
import { canViewDashboard } from "@/lib/permissions";
import { getDashboardMetrics } from "@/server/dashboard/metrics";
import {
  DashboardRangeError,
  resolveDashboardRange,
  validDashboardTimezone,
} from "@/server/dashboard/range";
import { getCalendarSettings } from "@/server/org-settings";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session, request: Request) => {
  if (!canViewDashboard(session.role)) {
    return apiError(403, "forbidden", "Tu rol no tiene acceso al Dashboard");
  }
  const url = new URL(request.url);
  const settings = await getCalendarSettings(session.organizationId);
  const timezone = validDashboardTimezone(settings.timezone);
  let range;
  try {
    range = resolveDashboardRange({
      preset: url.searchParams.get("range"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      timezone,
    });
  } catch (error) {
    if (error instanceof DashboardRangeError) {
      return apiError(422, "invalid_range", error.message);
    }
    throw error;
  }

  const metrics = await getDashboardMetrics({
    organizationId: session.organizationId,
    range,
    timezone,
  });
  return Response.json(
    {
      range: { ...range, timezone },
      ...metrics,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
});
