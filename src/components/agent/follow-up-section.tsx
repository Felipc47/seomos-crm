"use client";

import { useCallback, useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

/**
 * Rutina de seguimiento automático (008): un intento a las 12h (o cuando el
 * cliente pidió) y otro un día hábil después; sin respuesta → «No convertido».
 * La plantilla cubre los intentos con la ventana de 24h de WhatsApp cerrada.
 */

type TemplateOption = { id: string; name: string; language: string; status: string };

const selectCls =
  "flex h-11 w-full min-w-0 max-w-sm rounded-lg border border-border bg-surface px-3 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FollowUpSection() {
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    const [s, t] = await Promise.all([
      fetch("/api/settings/follow-up").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/templates").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null]);
    if (s) {
      setEnabled(s.settings.enabled);
      setTemplateId(s.settings.templateId ?? "");
    }
    if (t) setTemplates(t.templates ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function save(next: { enabled: boolean; templateId: string }) {
    setSaving(true);
    const res = await fetch("/api/settings/follow-up", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        enabled: next.enabled,
        templateId: next.templateId || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      toast("No se pudo guardar la configuración de seguimiento");
      void refetch();
      return;
    }
    setEnabled(next.enabled);
    setTemplateId(next.templateId);
  }

  if (!loaded) return null;
  const approved = templates.filter((t) => t.status === "approved");

  return (
    <Card data-help="agent-followup" className="grid min-w-0 overflow-hidden rounded-2xl xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <CardHeader className="border-b bg-surface-2/60 px-5 py-6 sm:px-6 xl:border-b-0 xl:border-r">
        <p className="crm-eyebrow mb-3">03 · Continuidad de la conversación</p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2.5 text-[19px] leading-snug tracking-[-0.025em]">
              <AlarmClock className="h-[18px] w-[18px] shrink-0 text-brand" strokeWidth={1.8} />
              Seguimiento automático
            </CardTitle>
            <CardDescription className="mt-3 max-w-[65ch] text-[12px] leading-6">
              Si un cliente pide que lo contacten luego, o no responde al primer
              mensaje, queda en «En calificación» con seguimiento programado y
              el sistema hace dos intentos (a las 12 horas y un día hábil
              después, dentro del horario de atención). Sin respuesta, pasa a
              «No convertido».
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            aria-label="Seguimiento automático activado"
            onCheckedChange={(v) => void save({ enabled: v, templateId })}
          />
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col justify-center px-5 py-6 sm:px-6">
        <label className="mb-2 block text-[13px] font-medium">
          Plantilla de seguimiento (ventana de 24h cerrada)
        </label>
        <select
          value={templateId}
          onChange={(e) => void save({ enabled, templateId: e.target.value })}
          disabled={saving}
          className={selectCls}
        >
          <option value="">Sin plantilla — omitir esos intentos</option>
          {approved.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.language})
            </option>
          ))}
        </select>
        {enabled && !templateId && (
          <p className="mt-3 max-w-[75ch] border-l-2 border-warning-border pl-3 text-xs leading-5 text-warning-fg">
            Sin plantilla, los seguimientos fuera de la ventana de 24h de
            WhatsApp (incluidos los contactos que no respondieron) se omiten:
            WhatsApp solo permite plantillas aprobadas en ese caso. Elige una
            (con {"{{1}}"} = primer nombre, opcional) para que la rutina pueda
            escribirle al cliente.
          </p>
        )}
        {approved.length === 0 && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Necesitas al menos una plantilla aprobada por Meta (sección
            Plantillas).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
