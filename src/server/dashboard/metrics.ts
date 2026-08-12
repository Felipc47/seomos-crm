import { getSql } from "@/lib/db";
import type {
  DashboardBreakdownDto,
  DashboardMetricsDto,
  StageKind,
} from "@/lib/types";
import type { DashboardRange } from "@/server/dashboard/range";

type SummaryRow = {
  new_leads: number;
  active_opportunities: number;
  won_leads: number;
  unassigned_leads: number;
  meetings: number;
};

type FunnelRow = {
  id: string;
  name: string;
  position: number;
  kind: StageKind;
  count: number;
};

type TrendRow = { date: string; leads: number; meetings: number };
type BreakdownRow = {
  id: string | null;
  name: string;
  count: number;
  won_count: number;
};

function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function serializeBreakdown(
  rows: readonly BreakdownRow[],
  total: number
): DashboardBreakdownDto[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    count: row.count,
    wonCount: row.won_count,
    percentage: percentage(row.count, total),
  }));
}

/**
 * Agregados comerciales de una organización. Todas las consultas tienen
 * `organization_id` explícito y convierten el timestamp guardado en la zona de
 * sesión de PostgreSQL hacia la zona local del negocio antes de extraer fecha.
 */
export async function getDashboardMetrics(input: {
  organizationId: string;
  range: DashboardRange;
  timezone: string;
}): Promise<Omit<DashboardMetricsDto, "range" | "generatedAt">> {
  const sql = getSql();
  const { organizationId, range, timezone } = input;

  const [summaryRows, funnelRows, trendRows, serviceRows, assigneeRows] =
    await Promise.all([
      sql<SummaryRow[]>`
        with cohort as (
          select l.id, l.assigned_member_id, ps.kind
          from lead l
          join pipeline_stage ps
            on ps.id = l.stage_id
           and ps.organization_id = ${organizationId}
          where l.organization_id = ${organizationId}
            and timezone(${timezone}, l.created_at at time zone current_setting('TimeZone'))::date
                between ${range.from}::date and ${range.to}::date
        )
        select
          count(*)::int as new_leads,
          count(*) filter (where kind in ('open', 'scheduled'))::int as active_opportunities,
          count(*) filter (where kind = 'won')::int as won_leads,
          count(*) filter (where assigned_member_id is null)::int as unassigned_leads,
          (
            select count(*)::int
            from conversation c
            where c.organization_id = ${organizationId}
              and c.is_test = false
              and c.meeting_scheduled_for is not null
              and timezone(${timezone}, c.meeting_scheduled_for at time zone current_setting('TimeZone'))::date
                  between ${range.from}::date and ${range.to}::date
          ) as meetings
        from cohort
      `,
      sql<FunnelRow[]>`
        select
          ps.id,
          ps.name,
          ps.position,
          ps.kind,
          count(l.id)::int as count
        from pipeline_stage ps
        left join lead l
          on l.stage_id = ps.id
         and l.organization_id = ${organizationId}
         and timezone(${timezone}, l.created_at at time zone current_setting('TimeZone'))::date
             between ${range.from}::date and ${range.to}::date
        where ps.organization_id = ${organizationId}
        group by ps.id, ps.name, ps.position, ps.kind
        order by ps.position asc
      `,
      sql<TrendRow[]>`
        with days as (
          select generate_series(
            ${range.from}::date,
            ${range.to}::date,
            interval '1 day'
          )::date as day
        ), lead_counts as (
          select
            timezone(${timezone}, l.created_at at time zone current_setting('TimeZone'))::date as day,
            count(*)::int as count
          from lead l
          where l.organization_id = ${organizationId}
            and timezone(${timezone}, l.created_at at time zone current_setting('TimeZone'))::date
                between ${range.from}::date and ${range.to}::date
          group by 1
        ), meeting_counts as (
          select
            timezone(${timezone}, c.meeting_scheduled_for at time zone current_setting('TimeZone'))::date as day,
            count(*)::int as count
          from conversation c
          where c.organization_id = ${organizationId}
            and c.is_test = false
            and c.meeting_scheduled_for is not null
            and timezone(${timezone}, c.meeting_scheduled_for at time zone current_setting('TimeZone'))::date
                between ${range.from}::date and ${range.to}::date
          group by 1
        )
        select
          to_char(days.day, 'YYYY-MM-DD') as date,
          coalesce(lead_counts.count, 0)::int as leads,
          coalesce(meeting_counts.count, 0)::int as meetings
        from days
        left join lead_counts using (day)
        left join meeting_counts using (day)
        order by days.day asc
      `,
      sql<BreakdownRow[]>`
        select
          s.id,
          coalesce(s.name, 'Sin servicio') as name,
          count(l.id)::int as count,
          count(l.id) filter (where ps.kind = 'won')::int as won_count
        from lead l
        join pipeline_stage ps
          on ps.id = l.stage_id
         and ps.organization_id = ${organizationId}
        left join service s
          on s.id = l.service_id
         and s.organization_id = ${organizationId}
        where l.organization_id = ${organizationId}
          and timezone(${timezone}, l.created_at at time zone current_setting('TimeZone'))::date
              between ${range.from}::date and ${range.to}::date
        group by s.id, s.name
        order by count desc, name asc
        limit 6
      `,
      sql<BreakdownRow[]>`
        select
          m.id,
          coalesce(u.name, 'Sin asignar') as name,
          count(l.id)::int as count,
          count(l.id) filter (where ps.kind = 'won')::int as won_count
        from lead l
        join pipeline_stage ps
          on ps.id = l.stage_id
         and ps.organization_id = ${organizationId}
        left join member m
          on m.id = l.assigned_member_id
         and m.organization_id = ${organizationId}
        left join "user" u on u.id = m.user_id
        where l.organization_id = ${organizationId}
          and timezone(${timezone}, l.created_at at time zone current_setting('TimeZone'))::date
              between ${range.from}::date and ${range.to}::date
        group by m.id, u.name
        order by count desc, name asc
        limit 6
      `,
    ]);

  const summary = summaryRows[0] ?? {
    new_leads: 0,
    active_opportunities: 0,
    won_leads: 0,
    unassigned_leads: 0,
    meetings: 0,
  };
  return {
    summary: {
      newLeads: summary.new_leads,
      activeOpportunities: summary.active_opportunities,
      meetings: summary.meetings,
      wonLeads: summary.won_leads,
      conversionRate: percentage(summary.won_leads, summary.new_leads),
      unassignedLeads: summary.unassigned_leads,
    },
    funnel: funnelRows.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      kind: row.kind,
      count: row.count,
      percentage: percentage(row.count, summary.new_leads),
    })),
    trend: trendRows,
    services: serializeBreakdown(serviceRows, summary.new_leads),
    assignees: serializeBreakdown(assigneeRows, summary.new_leads),
  };
}
