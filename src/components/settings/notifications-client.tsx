"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type NotificationSettings = {
  enabled: boolean;
  newLeadEmailsEnabled: boolean;
  weeklyDigestEnabled: boolean;
};

function getDefaultSettings(): NotificationSettings {
  return {
    enabled: true,
    newLeadEmailsEnabled: true,
    weeklyDigestEnabled: true,
  };
}

export function NotificationsClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(
    getDefaultSettings()
  );
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { settings?: NotificationSettings } | null) => {
        if (d?.settings) {
          setSettings(d.settings);
        }
        setLoaded(true);
      })
      .catch(() => {
        setError("No se pudo cargar la configuración");
        setLoaded(true);
      });
  }, []);

  function update(
    patch: Partial<NotificationSettings>
  ) {
    if (!loaded) return;
    setSaved(false);
    setError(null);
    setSettings((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  async function save() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo guardar");
      return;
    }
    setDirty(false);
    setSaved(true);
    router.refresh();
  }

  if (!loaded) return <p className="text-sm text-text-3">Cargando…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones por correo</CardTitle>
          <CardDescription>
            Controlá cuándo se envían avisos automáticos desde el CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label>Notificaciones habilitadas</Label>
              <p className="text-xs text-text-3">
                Maestro de todas las alertas por correo.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => update({ enabled: checked })}
              aria-label="Habilitar notificaciones por correo"
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label>Avisos al entrar un prospecto</Label>
              <p className="text-xs text-text-3">
                Envía correo al admin y al responsable del lead.
              </p>
            </div>
            <Switch
              checked={settings.newLeadEmailsEnabled}
              onCheckedChange={(checked) =>
                update({ newLeadEmailsEnabled: checked })
              }
              disabled={!settings.enabled}
              aria-label="Enviar aviso de nuevo prospecto"
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label>Resumen semanal</Label>
              <p className="text-xs text-text-3">
                Envía panorama semanal al admin y resumen por responsable.
              </p>
            </div>
            <Switch
              checked={settings.weeklyDigestEnabled}
              onCheckedChange={(checked) =>
                update({ weeklyDigestEnabled: checked })
              }
              disabled={!settings.enabled}
              aria-label="Enviar resumen semanal"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm" style={{ color: "var(--success-fg)" }}>Preferencias guardadas ✓</p>}
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
