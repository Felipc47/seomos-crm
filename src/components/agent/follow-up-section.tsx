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
  "flex h-11 w-full max-w-sm rounded-xl border border-border bg-surface-2 px-3.5 text-sm font-medium focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft";

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-brand" />
              Seguimiento automático
            </CardTitle>
            <CardDescription>
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
      <CardContent>
        <label className="mb-1.5 block text-sm font-medium">
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
          <p className="mt-2 text-xs text-warning">
            Sin plantilla, los seguimientos fuera de la ventana de 24h de
            WhatsApp (incluidos los contactos que no respondieron) se omiten:
            WhatsApp solo permite plantillas aprobadas en ese caso. Elige una
            (con {"{{1}}"} = primer nombre, opcional) para que la rutina pueda
            escribirle al cliente.
          </p>
        )}
        {approved.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Necesitas al menos una plantilla aprobada por Meta (sección
            Plantillas).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
