"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  RefreshCw,
  Target,
  Trophy,
  UserMinus,
  UsersRound,
} from "lucide-react";
import type {
  DashboardBreakdownDto,
  DashboardMetricsDto,
  DashboardRangePreset,
  StageKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ id: DashboardRangePreset; label: string }> = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "custom", label: "Personalizado" },
];

const VALID_PRESETS = new Set(PRESETS.map((preset) => preset.id));

const STAGE_COLORS: Record<StageKind, string> = {
  open: "var(--accent)",
  scheduled: "var(--warning)",
  won: "var(--success)",
  unqualified: "var(--text-3)",
  lost: "var(--danger)",
};

function presetFrom(value: string | null): DashboardRangePreset {
  return VALID_PRESETS.has(value as DashboardRangePreset)
    ? (value as DashboardRangePreset)
    : "7d";
}

function isDashboardMetrics(value: unknown): value is DashboardMetricsDto {
  return Boolean(
    value &&
      typeof value === "object" &&
      "summary" in value &&
      "range" in value &&
      "funnel" in value
  );
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${value}T00:00:00Z`));
}

function rangeLabel(data: DashboardMetricsDto): string {
  if (data.range.from === data.range.to) return formatDate(data.range.from);
  return `${formatDate(data.range.from)} – ${formatDate(data.range.to)}`;
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "brand",
  testId,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof UsersRound;
  tone?: "brand" | "success" | "warning" | "neutral";
  testId: string;
}) {
  const toneClass = {
    brand: "bg-brand-tint text-brand",
    success: "bg-[var(--success-bg)] text-success",
    warning: "bg-[var(--warning-bg)] text-warning",
    neutral: "bg-surface-2 text-mute",
  }[tone];
  return (
    <article
      data-testid={testId}
      className="relative overflow-hidden rounded-[18px] border bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-mute">
            {label}
          </p>
          <p className="mt-2 font-display text-[28px] font-bold leading-none sm:text-[32px]">
            {value}
          </p>
        </div>
        <span className={cn("rounded-[12px] p-2.5", toneClass)}>
          <Icon className="h-[20px] w-[20px]" strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-3 text-[12px] font-semibold text-mute">{helper}</p>
    </article>
  );
}

function TrendChart({ data }: { data: DashboardMetricsDto["trend"] }) {
  const width = 760;
  const height = 230;
  const left = 34;
  const right = 16;
  const top = 18;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...data.flatMap((point) => [point.leads, point.meetings]));
  const yTicks = Array.from(
    new Set(
      maxValue <= 4
        ? Array.from({ length: maxValue + 1 }, (_, index) => maxValue - index)
        : [1, 0.75, 0.5, 0.25, 0].map((fraction) =>
            Math.round(maxValue * fraction)
          )
    )
  );
  const point = (value: number, index: number) => ({
    x: left + (data.length <= 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth),
    y: top + chartHeight - (value / maxValue) * chartHeight,
  });
  const pathFor = (key: "leads" | "meetings") =>
    data
      .map((entry, index) => {
        const current = point(entry[key], index);
        return `${index === 0 ? "M" : "L"}${current.x.toFixed(1)},${current.y.toFixed(1)}`;
      })
      .join(" ");
  const labelIndexes = Array.from(
    new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])
  ).filter((index) => index >= 0);
  const hasActivity = data.some((entry) => entry.leads > 0 || entry.meetings > 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-[12px] font-bold text-mute">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Leads nuevos
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success" /> Reuniones
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full overflow-visible"
          role="img"
          aria-label="Tendencia diaria de leads nuevos y reuniones programadas"
          data-testid="dashboard-trend"
        >
          {yTicks.map((value) => {
            const y = top + chartHeight - (value / maxValue) * chartHeight;
            return (
              <g key={value}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-3)"
                  fontSize="10"
                  fontWeight="700"
                >
                  {value}
                </text>
              </g>
            );
          })}
          {data.length > 0 && (
            <>
              <path
                d={pathFor("leads")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={pathFor("meetings")}
                fill="none"
                stroke="var(--success)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {data.length <= 31 &&
                data.map((entry, index) => {
                  const lead = point(entry.leads, index);
                  const meeting = point(entry.meetings, index);
                  return (
                    <g key={entry.date}>
                      <circle cx={lead.x} cy={lead.y} r="3.5" fill="var(--accent)">
                        <title>{`${formatDate(entry.date)}: ${entry.leads} leads`}</title>
                      </circle>
                      <circle cx={meeting.x} cy={meeting.y} r="3.5" fill="var(--success)">
                        <title>{`${formatDate(entry.date)}: ${entry.meetings} reuniones`}</title>
                      </circle>
                    </g>
                  );
                })}
              {labelIndexes.map((index) => {
                const entry = data[index];
                if (!entry) return null;
                const x = point(0, index).x;
                return (
                  <text
                    key={entry.date}
                    x={x}
                    y={height - 10}
                    textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
                    fill="var(--text-3)"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {formatDate(entry.date, { day: "numeric", month: "short" })}
                  </text>
                );
              })}
            </>
          )}
        </svg>
        {!hasActivity && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-2 text-center text-sm font-semibold text-mute">
            Sin actividad en este periodo
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownList({
  rows,
  empty,
}: {
  rows: DashboardBreakdownDto[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[14px] border border-dashed bg-surface-2/40 px-5 text-center text-sm font-semibold text-mute">
        {empty}
      </div>
    );
  }
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.id ?? row.name}>
          <div className="mb-1.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{row.name}</p>
              <p className="text-[11px] font-semibold text-mute">
                {row.wonCount} {row.wonCount === 1 ? "cliente" : "clientes"}
              </p>
            </div>
            <span className="shrink-0 text-[13px] font-extrabold">
              {row.count} <span className="text-[11px] text-mute">({row.percentage}%)</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${Math.max((row.count / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[18px] border bg-surface p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-5">
        <h2 className="font-display text-[17px] font-bold">{title}</h2>
        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-mute">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] animate-pulse space-y-6">
        <div className="h-20 rounded-[18px] bg-surface" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-32 rounded-[18px] bg-surface" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="h-80 rounded-[18px] bg-surface" />
          <div className="h-80 rounded-[18px] bg-surface" />
        </div>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedPreset = presetFrom(searchParams.get("range"));
  const [editingCustom, setEditingCustom] = useState(appliedPreset === "custom");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");
  const [data, setData] = useState<DashboardMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const query = searchParams.toString();

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, {
      signal,
      cache: "no-store",
    }).catch(() => null);
    if (!response) {
      setError("No pudimos conectar con el Dashboard");
      setLoading(false);
      return;
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !isDashboardMetrics(body)) {
      const apiError = body as { error?: { message?: string } } | null;
      setError(
        apiError?.error?.message ?? "No se pudieron cargar las estadísticas"
      );
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reload]);

  function applyPreset(preset: DashboardRangePreset) {
    if (preset === "custom") {
      if (!customFrom && data) setCustomFrom(data.range.from);
      if (!customTo && data) setCustomTo(data.range.to);
      setEditingCustom(true);
      return;
    }
    setEditingCustom(false);
    router.replace(`${pathname}?range=${preset}`, { scroll: false });
  }

  function applyCustom() {
    if (!customFrom || !customTo) {
      setError("Selecciona las dos fechas del rango personalizado");
      return;
    }
    if (customFrom > customTo) {
      setError("La fecha inicial no puede ser posterior a la final");
      return;
    }
    const params = new URLSearchParams({
      range: "custom",
      from: customFrom,
      to: customTo,
    });
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Leads nuevos",
        value: data.summary.newLeads,
        helper: "Creados en el periodo",
        icon: UsersRound,
        tone: "brand" as const,
        testId: "metric-new-leads",
      },
      {
        label: "Leads activos",
        value: data.summary.activeOpportunities,
        helper: "En etapas abiertas o cita",
        icon: Activity,
        tone: "warning" as const,
        testId: "metric-active",
      },
      {
        label: "Reuniones",
        value: data.summary.meetings,
        helper: "Programadas para estas fechas",
        icon: CalendarDays,
        tone: "brand" as const,
        testId: "metric-meetings",
      },
      {
        label: "Clientes logrados",
        value: data.summary.wonLeads,
        helper: "Leads del periodo en Cliente",
        icon: Trophy,
        tone: "success" as const,
        testId: "metric-won",
      },
      {
        label: "Conversión",
        value: `${data.summary.conversionRate}%`,
        helper: "Clientes / leads nuevos",
        icon: Target,
        tone: "success" as const,
        testId: "metric-conversion",
      },
      {
        label: "Sin asignar",
        value: data.summary.unassignedLeads,
        helper: "Requieren responsable",
        icon: UserMinus,
        tone: "neutral" as const,
        testId: "metric-unassigned",
      },
    ];
  }, [data]);

  return (
    <div className="h-full overflow-y-auto bg-background" data-testid="dashboard-page">
      <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
        <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-[11px] bg-brand-tint p-2 text-brand">
                <ChartNoAxesCombined className="h-5 w-5" strokeWidth={2} />
              </span>
              <h1 className="font-display text-[24px] font-bold tracking-tight sm:text-[28px]">
                Dashboard
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-[13px] font-semibold text-mute">
              Una vista clara del embudo, las reuniones y la distribución comercial.
            </p>
            {data && (
              <p className="mt-1 text-[12px] font-bold text-brand" data-testid="dashboard-range-label">
                {rangeLabel(data)} · {data.range.timezone}
              </p>
            )}
          </div>

          <div className="rounded-[16px] border bg-surface p-2 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Rango del Dashboard">
              {PRESETS.map((preset) => {
                const active = preset.id === "custom"
                  ? editingCustom
                  : !editingCustom && appliedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      "rounded-[10px] px-3 py-2 text-[12px] font-extrabold transition-colors",
                      active
                        ? "bg-brand text-white shadow-accent"
                        : "text-mute hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setReload((value) => value + 1)}
                aria-label="Actualizar Dashboard"
                title="Actualizar"
                className="ml-auto rounded-[10px] border p-2 text-mute transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </button>
            </div>
            {editingCustom && (
              <div className="mt-2 grid gap-2 border-t pt-2 sm:grid-cols-[1fr_1fr_auto]">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-mute">
                  Desde
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="mt-1 block h-9 w-full rounded-[9px] border bg-surface-2 px-2.5 text-[12px] font-bold text-foreground outline-none focus:border-brand"
                  />
                </label>
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-mute">
                  Hasta
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="mt-1 block h-9 w-full rounded-[9px] border bg-surface-2 px-2.5 text-[12px] font-bold text-foreground outline-none focus:border-brand"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="self-end rounded-[9px] bg-brand px-4 py-2.5 text-[12px] font-extrabold text-white transition-colors hover:bg-brand-hover"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-[13px] font-bold text-[var(--danger-fg)]">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              className="rounded-lg border border-current/30 px-3 py-1.5"
            >
              Reintentar
            </button>
          </div>
        )}

        {!data && loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-live="polite">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-[18px] border bg-surface" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6", loading && "opacity-60")}>
              {summaryCards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <Panel
                title="Tendencia del periodo"
                description="Leads creados y reuniones programadas por día."
              >
                <TrendChart data={data.trend} />
              </Panel>
              <Panel
                title="Leads por etapa"
                description="Etapa actual de los leads que nacieron dentro del rango."
              >
                <ul className="space-y-3" data-testid="dashboard-funnel">
                  {data.funnel.map((stage) => (
                    <li key={stage.id} data-testid={`dashboard-stage-${stage.id}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
                        <span className="min-w-0 truncate font-bold">{stage.name}</span>
                        <span className="shrink-0 font-extrabold">
                          {stage.count} <span className="text-[10px] text-mute">({stage.percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            width: `${stage.count === 0 ? 0 : Math.max(stage.percentage, 4)}%`,
                            backgroundColor: STAGE_COLORS[stage.kind],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {data.summary.newLeads === 0 && (
                  <p className="mt-5 rounded-[12px] border border-dashed bg-surface-2/40 px-4 py-3 text-center text-[12px] font-semibold text-mute">
                    No se crearon leads en este periodo.
                  </p>
                )}
              </Panel>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Panel
                title="Demanda por servicio"
                description="Cómo se distribuyen los leads nuevos entre la oferta del negocio."
              >
                <BreakdownList rows={data.services} empty="Aún no hay demanda para mostrar en este rango." />
              </Panel>
              <Panel
                title="Distribución del equipo"
                description="Carga actual de los leads nuevos por ejecutivo responsable."
              >
                <BreakdownList rows={data.assignees} empty="Aún no hay asignaciones para mostrar en este rango." />
              </Panel>
            </div>

            <p className="mt-4 text-center text-[11px] font-semibold text-mute">
              Reuniones contabiliza la fecha programada de la cita. El embudo refleja la etapa vigente.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
