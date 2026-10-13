"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isMeetingTemplate } from "@/lib/meeting";
import type { TemplateDto } from "@/lib/types";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

/**
 * Comportamiento del AGENDAMIENTO del agente (004b): horario, franjas y
 * antelación mínima. El sistema aplica estas reglas por encima de las
 * instrucciones de texto del agente.
 */

type State = {
  googleConfigured: boolean;
  connection: { accountEmail: string; status: string } | null;
  settings: {
    meetingReminderTemplateId: string | null;
    workStartMin: number;
    workEndMin: number;
    slotMinutes: number;
    leadTimeBusinessDays: number;
  };
};

const selectCls =
  "flex h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Opciones de hora cada 30 min entre 6:00 y 21:00. */
const HOUR_OPTIONS = Array.from({ length: 31 }, (_, i) => 6 * 60 + i * 30);

export function SchedulingSection() {
  const toast = useToast();
  const [state, setState] = useState<State | null>(null);
  const [workStart, setWorkStart] = useState(9 * 60);
  const [workEnd, setWorkEnd] = useState(17 * 60 + 30);
  const [slot, setSlot] = useState(30);
  const [leadDays, setLeadDays] = useState(2);
  const [reminderTemplateId, setReminderTemplateId] = useState("");
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/settings/calendar").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as State;
    setState(data);
    setReminderTemplateId(data.settings.meetingReminderTemplateId ?? "");
    const templateRes = await fetch("/api/templates").catch(() => null);
    if (templateRes?.ok) setTemplates((await templateRes.json()).templates);
    setWorkStart(data.settings.workStartMin);
    setWorkEnd(data.settings.workEndMin);
    setSlot(data.settings.slotMinutes);
    setLeadDays(data.settings.leadTimeBusinessDays);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (!state) return null;

  async function save() {
    if (workEnd - slot < workStart) {
      toast("El fin de jornada debe dejar al menos una franja completa");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/settings/calendar", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        meetingReminderTemplateId: reminderTemplateId || null,
        workStartMin: workStart,
        workEndMin: workEnd,
        slotMinutes: slot,
        leadTimeBusinessDays: leadDays,
      }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) toast("Agendamiento guardado");
    else { const data = await res?.json().catch(() => null); toast(data?.error?.message ?? "No se pudo guardar el agendamiento"); }
  }

  async function prepareMeetingTemplate() {
    if (templates.some((template) => template.name === "confirmacion_reunion_45min")) {
      toast("La plantilla ya existe. Revisa su aprobación y sincronízala en Plantillas.");
      return;
    }
    setCreatingTemplate(true);
    const res = await fetch("/api/templates", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "confirmacion_reunion_45min", language: "es_CO", category: "UTILITY",
        body: "Hola, te recordamos nuestra reunión: {{1}}. ¿Nos confirmas si podrás asistir?" }),
    }).catch(() => null);
    setCreatingTemplate(false);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) { toast(data?.error?.message ?? "No se pudo preparar la plantilla"); return; }
    setTemplates((current) => [...current, data.template]);
    toast("Plantilla enviada a aprobación. Sincronízala en Plantillas y selecciónala aquí cuando esté aprobada.");
  }

  return (
    <Card data-help="agent-scheduling" className="min-w-0 overflow-hidden rounded-2xl">
      <CardHeader className="mb-6 border-b bg-surface-2/60 px-5 py-6 sm:px-6">
        <p className="crm-eyebrow mb-2">04 · Disponibilidad del equipo</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="h-[18px] w-[18px] shrink-0 text-brand" strokeWidth={1.8} />
            <CardTitle className="text-[21px] tracking-[-0.03em]">Agendamiento</CardTitle>
          </div>
          {state.connection ? (
            <Badge variant="success" className="max-w-full whitespace-normal break-all">
              Calendar: {state.connection.accountEmail}
            </Badge>
          ) : (
            <Badge variant="warning">Calendar sin conectar</Badge>
          )}
        </div>
        <CardDescription className="mt-1 max-w-[90ch] text-[13px] leading-6">
          Reglas con las que el agente ofrece y agenda reuniones. El sistema
          las aplica SIEMPRE, por encima de las instrucciones de texto — no
          hace falta repetirlas arriba.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        {!state.connection && (
          <p className="rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] p-3 text-[13px] leading-relaxed text-[color:var(--warning-fg)]">
            Sin una cuenta de Google conectada el agente no ofrece agendar.{" "}
            <Link
              href="/settings/calendar"
              className="font-bold underline underline-offset-2"
            >
              Conectar en Ajustes → Calendario
            </Link>
          </p>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="sch-start">Inicio de jornada</Label>
            <select
              id="sch-start"
              value={workStart}
              onChange={(e) => setWorkStart(Number(e.target.value))}
              className={selectCls}
            >
              {HOUR_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {minutesLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sch-end">Fin de jornada</Label>
            <select
              id="sch-end"
              value={workEnd}
              onChange={(e) => setWorkEnd(Number(e.target.value))}
              className={selectCls}
            >
              {HOUR_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {minutesLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sch-slot">Franjas de</Label>
            <select
              id="sch-slot"
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value))}
              className={selectCls}
            >
              {[15, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sch-lead">Antelación mínima</Label>
            <select
              id="sch-lead"
              value={leadDays}
              onChange={(e) => setLeadDays(Number(e.target.value))}
              className={selectCls}
            >
              {[0, 1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "Mismo día" : `${d} día${d > 1 ? "s" : ""} hábil${d > 1 ? "es" : ""}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="border-l-2 border-brand/70 bg-surface-2/60 px-4 py-3 text-xs leading-6 text-muted-foreground">
          Hoy: el agente ofrece reuniones de lunes a viernes de{" "}
          <strong className="text-foreground">{minutesLabel(workStart)}</strong>{" "}
          a <strong className="text-foreground">{minutesLabel(workEnd)}</strong>
          , cada {slot} min, desde{" "}
          <strong className="text-foreground">
            {leadDays === 0 ? "el mismo día" : `${leadDays} días hábiles`}
          </strong>{" "}
          después del contacto (al inicio de la jornada).
        </p>
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="meeting-template">Confirmación de reunión 45 minutos antes</Label>
          <select id="meeting-template" className={selectCls} value={reminderTemplateId} onChange={(e) => setReminderTemplateId(e.target.value)}>
            <option value="">Sin plantilla fuera de la ventana de 24h</option>
            {reminderTemplateId && !templates.some((template) => template.id === reminderTemplateId && isMeetingTemplate(template)) && <option value={reminderTemplateId}>Plantilla no disponible; selecciona otra</option>}
            {templates.filter(isMeetingTemplate).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <p className="text-xs leading-6 text-muted-foreground">Con la ventana abierta se envía texto con la fecha, hora y enlace. Para confirmaciones fuera de ventana, usa una plantilla UTILITY aprobada, sin encabezado ni mapeo de variables, con una sola variable {"{{1}}"} para los datos de la reunión.</p>
          <Button type="button" variant="secondary" size="sm" disabled={creatingTemplate} onClick={() => void prepareMeetingTemplate()}>{creatingTemplate ? "Preparando plantilla…" : "Preparar plantilla de confirmación"}</Button>
          <p className="text-xs leading-6 text-muted-foreground">Ejemplo de cuerpo: Hola, te recordamos nuestra reunión: {"{{1}}"}. ¿Nos confirmas si podrás asistir? <Link href="/templates" className="underline">Gestionar plantillas</Link></p>
        </div>
        <Button className="w-full sm:w-auto" disabled={saving} onClick={() => void save()}>
          {saving ? "Guardando…" : "Guardar agendamiento"}
        </Button>
      </CardContent>
    </Card>
  );
}
