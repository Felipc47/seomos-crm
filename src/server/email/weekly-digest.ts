import { and, eq, isNull } from "drizzle-orm";
import { getDb, getSql, schema } from "@/lib/db";
import { getEnv, isEmailConfigured } from "@/lib/env";
import {
  addCalendarDays,
  dateInTimezone,
  validDashboardTimezone,
} from "@/server/dashboard/range";
import { getCalendarSettings, getNotificationSettings } from "@/server/org-settings";
import { deliverEmail } from "./delivery";
import { escapeEmailHtml } from "./new-lead";

export type DigestLeadRow = {
  leadId: string;
  contactId: string;
  contactName: string;
  stageName: string;
  stageKind: string;
  serviceName: string | null;
  assigneeMemberId: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
};

export type DigestSummary = {
  total: number;
  unassigned: number;
  byStage: { name: string; count: number }[];
  byAssignee: { name: string; count: number }[];
  details: DigestLeadRow[];
};

export type WeeklyEmailResult = {
  attempted: number;
  sent: number;
  failed: number;
  deduplicated: number;
  skippedUnconfigured: boolean;
};

function countsBy(
  values: readonly string[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}

export function summarizeDigestRows(
  rows: readonly DigestLeadRow[]
): DigestSummary {
  return {
    total: rows.length,
    unassigned: rows.filter((row) => !row.assigneeMemberId).length,
    byStage: countsBy(rows.map((row) => row.stageName)),
    byAssignee: countsBy(
      rows.map((row) => row.assigneeName ?? "Sin asignar")
    ),
    details: rows.slice(0, 20),
  };
}

export function previousCompletedWeek(
  now: Date,
  timezone: string
): { from: string; to: string } {
  const today = dateInTimezone(now, validDashboardTimezone(timezone));
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const currentMonday = addCalendarDays(today, -daysSinceMonday);
  return { from: addCalendarDays(currentMonday, -7), to: currentMonday };
}

function renderList(items: readonly { name: string; count: number }[]): string {
  if (items.length === 0) return "<li>Sin actividad</li>";
  return items
    .map(
      (item) =>
        `<li>${escapeEmailHtml(item.name)}: <strong>${item.count}</strong></li>`
    )
    .join("");
}

function buildDigestEmail(input: {
  organizationName: string;
  recipientName: string;
  role: "assignee" | "admin";
  from: string;
  to: string;
  summary: DigestSummary;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const title =
    input.role === "admin"
      ? `Panorama semanal · ${input.organizationName}`
      : `Tu resumen semanal · ${input.organizationName}`;
  const details = input.summary.details
    .map(
      (row) =>
        `<li><strong>${escapeEmailHtml(row.contactName)}</strong> · ${escapeEmailHtml(row.stageName)}${row.serviceName ? ` · ${escapeEmailHtml(row.serviceName)}` : ""}</li>`
    )
    .join("");
  const load =
    input.role === "admin"
      ? `<h3>Carga por responsable</h3><ul>${renderList(input.summary.byAssignee)}</ul><p>Sin asignar: <strong>${input.summary.unassigned}</strong></p>`
      : "";
  const more =
    input.summary.total > input.summary.details.length
      ? `<p>Se muestran 20 de ${input.summary.total} prospectos. Consulta el resto en el CRM.</p>`
      : "";
  const safeUrl = escapeEmailHtml(input.appUrl);
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#17251d"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #dce7df;border-radius:14px;overflow:hidden"><div style="padding:20px 24px;background:#102018;color:#fff"><strong style="color:#25D366">Seomos CRM</strong><h1 style="font-size:22px;margin:8px 0 0">${escapeEmailHtml(title)}</h1><p>${escapeEmailHtml(input.from)} a ${escapeEmailHtml(input.to)}</p></div><div style="padding:24px"><p>Hola ${escapeEmailHtml(input.recipientName)},</p><p>Nuevos prospectos: <strong>${input.summary.total}</strong></p><h3>Estados</h3><ul>${renderList(input.summary.byStage)}</ul>${load}<h3>Prospectos</h3><ul>${details || "<li>Sin prospectos nuevos esta semana.</li>"}</ul>${more}<a href="${safeUrl}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:8px;background:#25D366;color:#082d18;text-decoration:none;font-weight:700">Abrir CRM</a></div></div></body></html>`;
  const text = `${title}\n${input.from} a ${input.to}\n\nHola ${input.recipientName}\nNuevos prospectos: ${input.summary.total}\nSin asignar: ${input.summary.unassigned}\nEstados: ${input.summary.byStage.map((item) => `${item.name}: ${item.count}`).join(", ") || "Sin actividad"}\n\n${input.appUrl}`;
  return { subject: title, html, text };
}

async function listDigestRows(input: {
  organizationId: string;
  timezone: string;
  from: string;
  to: string;
}): Promise<DigestLeadRow[]> {
  const sql = getSql();
  return sql<DigestLeadRow[]>`
    select
      l.id as "leadId",
      c.id as "contactId",
      c.name as "contactName",
      ps.name as "stageName",
      ps.kind as "stageKind",
      s.name as "serviceName",
      m.id as "assigneeMemberId",
      u.id as "assigneeUserId",
      u.name as "assigneeName"
    from lead l
    join contact c
      on c.id = l.contact_id
     and c.organization_id = ${input.organizationId}
    join pipeline_stage ps
      on ps.id = l.stage_id
     and ps.organization_id = ${input.organizationId}
    left join service s
      on s.id = l.service_id
     and s.organization_id = ${input.organizationId}
    left join member m
      on m.id = l.assigned_member_id
     and m.organization_id = ${input.organizationId}
    left join "user" u on u.id = m.user_id
    where l.organization_id = ${input.organizationId}
      and timezone(${input.timezone}, l.created_at at time zone current_setting('TimeZone'))::date >= ${input.from}::date
      and timezone(${input.timezone}, l.created_at at time zone current_setting('TimeZone'))::date < ${input.to}::date
    order by l.created_at desc, l.id
  `;
}

function tally(
  result: Awaited<ReturnType<typeof deliverEmail>>,
  totals: WeeklyEmailResult
): void {
  if (result.status === "sent") totals.sent++;
  if (result.status === "failed") totals.failed++;
  if (result.status === "deduplicated") totals.deduplicated++;
}

export async function sendWeeklyLeadDigests(
  now = new Date()
): Promise<WeeklyEmailResult> {
  const totals: WeeklyEmailResult = {
    attempted: 0,
    sent: 0,
    failed: 0,
    deduplicated: 0,
    skippedUnconfigured: !isEmailConfigured(),
  };
  if (totals.skippedUnconfigured) return totals;

  const db = getDb();
  const organizations = await db
    .select({ id: schema.organization.id, name: schema.organization.name })
    .from(schema.organization)
    .where(isNull(schema.organization.deletedAt));
  const appUrl = `${getEnv().APP_BASE_URL.replace(/\/$/, "")}/pipeline`;

  for (const organization of organizations) {
    try {
      const notifications = await getNotificationSettings(organization.id);
      if (!notifications.enabled || !notifications.weeklyDigestEnabled) {
        continue;
      }

      const settings = await getCalendarSettings(organization.id);
      const period = previousCompletedWeek(now, settings.timezone);
      const periodStart = new Date(`${period.from}T00:00:00.000Z`);
      const rows = await listDigestRows({
        organizationId: organization.id,
        timezone: validDashboardTimezone(settings.timezone),
        ...period,
      });
      const owners = await db
        .select({
          userId: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.member)
        .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
        .where(
          and(
            eq(schema.member.organizationId, organization.id),
            eq(schema.member.role, "owner")
          )
        );
      const ownerIds = new Set(owners.map((owner) => owner.userId));

      for (const owner of owners) {
        totals.attempted++;
        const content = buildDigestEmail({
          organizationName: organization.name,
          recipientName: owner.name,
          role: "admin",
          ...period,
          summary: summarizeDigestRows(rows),
          appUrl,
        });
        tally(
          await deliverEmail({
            organizationId: organization.id,
            recipientUserId: owner.userId,
            kind: "weekly_admin",
            periodStart,
            idempotencyKey: `weekly-admin/${organization.id}/${period.from}/${owner.userId}`,
            to: owner.email,
            ...content,
          }),
          totals
        );
      }

      const assignees = new Map<
        string,
        { memberId: string; userId: string; name: string; email: string }
      >();
      for (const row of rows) {
        if (!row.assigneeMemberId || !row.assigneeUserId) continue;
        if (ownerIds.has(row.assigneeUserId) || assignees.has(row.assigneeUserId)) {
          continue;
        }
        const memberRows = await db
          .select({ email: schema.user.email })
          .from(schema.member)
          .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
          .where(
            and(
              eq(schema.member.organizationId, organization.id),
              eq(schema.member.id, row.assigneeMemberId),
              eq(schema.member.userId, row.assigneeUserId)
            )
          )
          .limit(1);
        if (memberRows[0]) {
          assignees.set(row.assigneeUserId, {
            memberId: row.assigneeMemberId,
            userId: row.assigneeUserId,
            name: row.assigneeName ?? "Responsable",
            email: memberRows[0].email,
          });
        }
      }

      for (const assignee of assignees.values()) {
        totals.attempted++;
        const mine = rows.filter(
          (row) => row.assigneeMemberId === assignee.memberId
        );
        const content = buildDigestEmail({
          organizationName: organization.name,
          recipientName: assignee.name,
          role: "assignee",
          ...period,
          summary: summarizeDigestRows(mine),
          appUrl,
        });
        tally(
          await deliverEmail({
            organizationId: organization.id,
            recipientUserId: assignee.userId,
            kind: "weekly_assignee",
            periodStart,
            idempotencyKey: `weekly-assignee/${organization.id}/${period.from}/${assignee.userId}`,
            to: assignee.email,
            ...content,
          }),
          totals
        );
      }
    } catch {
      totals.failed++;
      console.error(
        `[email] no se pudo preparar resumen semanal en ${organization.id}`
      );
    }
  }
  return totals;
}
