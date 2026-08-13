"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Globe2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { WebFormIntegrationDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

type ServiceOption = { id: string; name: string };
type ListResponse = {
  integrations: WebFormIntegrationDto[];
  services: ServiceOption[];
};

function errorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }
  return fallback;
}

function statusLabel(integration: WebFormIntegrationDto): {
  text: string;
  className: string;
} {
  if (!integration.enabled) {
    return { text: "Desactivada", className: "border-border text-mute" };
  }
  if (integration.lastStatus === "failed") {
    return {
      text: "Revisar conexión",
      className: "border-warning/40 bg-warning/10 text-warning",
    };
  }
  if (integration.lastStatus === "success") {
    return {
      text: "Recibiendo",
      className: "border-brand/30 bg-brand-tint text-brand",
    };
  }
  return { text: "Lista", className: "border-border text-text-2" };
}

function formatDate(value: string | null): string {
  if (!value) return "Aún no ha recibido envíos";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WebFormsClient() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<WebFormIntegrationDto[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/settings/web-forms").catch(() => null);
    const data = (await response?.json().catch(() => null)) as ListResponse | null;
    if (!response?.ok || !data) {
      setError("No se pudieron cargar las integraciones");
      setLoaded(true);
      return;
    }
    setIntegrations(data.integrations);
    setServices(data.services);
    setError(null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createIntegration() {
    if (!name.trim()) return;
    setBusy("create");
    const response = await fetch("/api/settings/web-forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), serviceId: serviceId || null }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as
      | { integration?: WebFormIntegrationDto; secret?: string; error?: unknown }
      | null;
    setBusy(null);
    if (!response?.ok || !data?.integration || !data.secret) {
      setError(errorMessage(data, "No se pudo crear la integración"));
      return;
    }
    setRevealed((current) => ({
      ...current,
      [data.integration!.id]: data.secret!,
    }));
    setName("");
    setServiceId("");
    toast("Integración creada. Guarda el secreto ahora.");
    await load();
  }

  async function updateIntegration(
    id: string,
    patch: { serviceId?: string | null; enabled?: boolean }
  ) {
    setBusy(id);
    const response = await fetch(`/api/settings/web-forms/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setError(errorMessage(data, "No se pudo guardar el cambio"));
      return;
    }
    toast("Integración actualizada");
    await load();
  }

  async function rotateSecret(integration: WebFormIntegrationDto) {
    if (
      !window.confirm(
        `El secreto actual de “${integration.name}” dejará de funcionar de inmediato. ¿Continuar?`
      )
    ) {
      return;
    }
    setBusy(integration.id);
    const response = await fetch(
      `/api/settings/web-forms/${integration.id}/rotate`,
      { method: "POST" }
    ).catch(() => null);
    const data = (await response?.json().catch(() => null)) as
      | { secret?: string }
      | null;
    setBusy(null);
    if (!response?.ok || !data?.secret) {
      setError("No se pudo rotar el secreto");
      return;
    }
    setRevealed((current) => ({ ...current, [integration.id]: data.secret! }));
    toast("Secreto rotado. Actualízalo en WordPress.");
    await load();
  }

  function copy(text: string, message: string) {
    void navigator.clipboard.writeText(text).then(() => toast(message));
  }

  const totalActive = useMemo(
    () => integrations.filter((item) => item.enabled).length,
    [integrations]
  );

  if (!loaded) return <p className="text-sm text-text-3">Cargando…</p>;

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <Card className="overflow-hidden">
        <div className="border-b bg-gradient-to-br from-brand-tint to-transparent p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface px-3 py-1 text-xs font-bold text-brand">
                <Globe2 className="h-3.5 w-3.5" /> WordPress → Seomos
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Formularios web
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-2">
                Convierte cada formulario del sitio en un prospecto del CRM,
                con servicio, avisos y saludo de WhatsApp cuando exista permiso.
              </p>
            </div>
            <div className="rounded-xl border bg-surface px-4 py-3 text-sm">
              <span className="block text-xs font-semibold text-mute">Activas</span>
              <span className="font-display text-2xl font-bold">{totalActive}</span>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-4 pt-5 xl:grid-cols-[1fr_220px_auto] xl:items-end">
          <div className="space-y-2">
            <Label htmlFor="integration-name">Nombre de la integración</Label>
            <Input
              id="integration-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Formulario SEO del sitio"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="integration-service">Servicio</Label>
            <select
              id="integration-service"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="h-11 w-full rounded-xl border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-brand"
            >
              <option value="">Sin servicio fijo</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => void createIntegration()}
            disabled={!name.trim() || busy === "create"}
          >
            <Plus className="h-4 w-4" />
            {busy === "create" ? "Creando…" : "Crear"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ShieldCheck className="mb-4 h-10 w-10 text-brand" />
            <p className="font-display font-bold">Aún no hay formularios conectados</p>
            <p className="mt-1 max-w-md text-sm text-mute">
              Crea una integración para recibir la URL y el secreto que pegarás
              en WordPress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => {
            const status = statusLabel(integration);
            const secret = revealed[integration.id];
            const curl = `curl -X POST '${integration.endpoint}' \\\n+  -H 'Authorization: Bearer ${secret ?? "TU_SECRETO"}' \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{"externalId":"wp-001","phone":"+573001234567","name":"Ana Web","email":"ana@example.com","message":"Quiero una propuesta","consent":true}'`;
            return (
              <Card key={integration.id} className="overflow-hidden">
                <CardHeader className="border-b bg-surface-2/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{integration.name}</CardTitle>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </div>
                      <CardDescription className="mt-1">
                        {integration.serviceName ?? "Sin servicio fijo"} · Secreto ••••{integration.secretLast4}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-mute">
                        {integration.enabled ? "Aceptando envíos" : "Pausada"}
                      </span>
                      <Switch
                        checked={integration.enabled}
                        disabled={busy === integration.id}
                        onCheckedChange={(enabled) =>
                          void updateIntegration(integration.id, { enabled })
                        }
                        aria-label={`Activar ${integration.name}`}
                        size="sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {secret && (
                    <div className="rounded-xl border border-brand/30 bg-brand-tint p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">Guarda este secreto ahora</p>
                          <p className="mt-1 text-xs text-text-2">
                            Por seguridad no volverá a mostrarse completo.
                          </p>
                          <div className="mt-3 flex gap-2">
                            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-surface px-3 py-2 text-xs">
                              {secret}
                            </code>
                            <Button
                              size="icon"
                              variant="secondary"
                              aria-label="Copiar secreto"
                              onClick={() => copy(secret, "Secreto copiado")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="space-y-2">
                      <Label>Endpoint</Label>
                      <div className="flex gap-2">
                        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border bg-surface-2 px-3 py-2.5 text-xs">
                          {integration.endpoint}
                        </code>
                        <Button
                          size="icon"
                          variant="secondary"
                          aria-label="Copiar endpoint"
                          onClick={() => copy(integration.endpoint, "Endpoint copiado")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Servicio aplicado</Label>
                      <select
                        value={integration.serviceId ?? ""}
                        disabled={busy === integration.id}
                        onChange={(event) =>
                          void updateIntegration(integration.id, {
                            serviceId: event.target.value || null,
                          })
                        }
                        className="h-[42px] w-full rounded-xl border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-brand"
                      >
                        <option value="">Sin servicio fijo</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">Última actividad</p>
                      <p className="mt-1 text-xs text-mute">
                        {formatDate(integration.lastUsedAt)}
                        {integration.lastError ? ` · ${integration.lastError}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy === integration.id}
                      onClick={() => void rotateSecret(integration)}
                    >
                      <RefreshCw className="h-4 w-4" /> Rotar secreto
                    </Button>
                  </div>

                  <details className="rounded-xl border bg-surface-2/40 p-4">
                    <summary className="cursor-pointer text-sm font-bold">
                      Ver prueba y configuración para WordPress
                    </summary>
                    <div className="mt-4 space-y-4 text-sm text-text-2">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-bold text-foreground">Prueba con curl</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copy(curl, "Comando copiado")}
                          >
                            <Copy className="h-3.5 w-3.5" /> Copiar
                          </Button>
                        </div>
                        <pre className="overflow-x-auto rounded-xl border bg-background p-3 text-xs leading-5">
                          {curl}
                        </pre>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Recipe
                          title="Contact Form 7"
                          text="Envía tras wpcf7_mail_sent: submission_id, your-phone, your-name, your-email, your-message y acceptance."
                        />
                        <Recipe
                          title="Elementor Forms"
                          text="En Actions After Submit usa Webhook, mapea externalId y phone, y agrega Authorization Bearer en el conector del servidor."
                        />
                        <Recipe
                          title="WPForms"
                          text="Usa Webhooks: POST JSON, Entry ID como externalId y los campos phone, name, email, message y consent."
                        />
                        <Recipe
                          title="Webhook propio"
                          text="POST JSON o form-urlencoded. externalId y phone son obligatorios; source, campaign y pageUrl son opcionales."
                        />
                      </div>
                      <p className="text-xs text-mute">
                        Cada reintento debe conservar el mismo externalId. El
                        formulario nunca puede elegir etapa, responsable o acción.
                      </p>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Recipe({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-surface p-3">
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-mute">{text}</p>
    </div>
  );
}
