"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, ImageIcon, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  TEMPLATE_VARIABLE_LABELS,
  type TemplateDto,
  type TemplateVariableDto,
  type TemplateVariableSourceDto,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Reglas del encabezado (espejo de validateTemplateHeader del servidor). */
const HEADER_ACCEPT: Record<"image" | "document", string> = {
  image: "image/jpeg,image/png",
  document: "application/pdf",
};
const HEADER_MAX_MB: Record<"image" | "document", number> = {
  image: 5,
  document: 16,
};

function validateHeaderFile(
  kind: "image" | "document",
  file: File
): string | null {
  if (!HEADER_ACCEPT[kind].split(",").includes(file.type)) {
    return kind === "image"
      ? "La imagen debe ser JPG o PNG"
      : "El documento debe ser un PDF";
  }
  if (file.size > HEADER_MAX_MB[kind] * 1024 * 1024) {
    return `El archivo supera el máximo (${HEADER_MAX_MB[kind]} MB)`;
  }
  return null;
}

/** Índices distintos {{n}} del cuerpo (espejo del servidor). */
function distinctVars(body: string): number[] {
  const seen = new Set<number>();
  for (const m of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) seen.add(Number(m[1]));
  return [...seen].sort((a, b) => a - b);
}

const DEFAULT_VARIABLE: TemplateVariableDto = { source: "first_name" };

/** Ajusta el mapeo al número de variables del cuerpo sin perder lo elegido. */
function fitMapping(
  current: TemplateVariableDto[],
  count: number
): TemplateVariableDto[] {
  return Array.from(
    { length: count },
    (_, i) => current[i] ?? { ...DEFAULT_VARIABLE }
  );
}

/**
 * Editor del mapeo (018): una fila por {{n}} con su fuente de datos, el
 * texto si es fija y un respaldo opcional para cuando el dato falte.
 */
function VariableMappingEditor({
  idPrefix,
  mapping,
  onChange,
}: {
  idPrefix: string;
  mapping: TemplateVariableDto[];
  onChange: (next: TemplateVariableDto[]) => void;
}) {
  if (mapping.length === 0) return null;

  function update(i: number, patch: Partial<TemplateVariableDto>) {
    onChange(mapping.map((entry, j) => (j === i ? { ...entry, ...patch } : entry)));
  }

  return (
    <div className="space-y-2 rounded-md border border-input bg-secondary/30 p-3">
      <p className="text-xs font-semibold">
        Personalización: qué dato llena cada variable en CADA envío
      </p>
      {mapping.map((entry, i) => (
        <div key={i} className="grid gap-2 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-src-${i}`}>{`{{${i + 1}}}`}</Label>
            <select
              id={`${idPrefix}-src-${i}`}
              value={entry.source}
              onChange={(e) =>
                update(i, {
                  source: e.target.value as TemplateVariableSourceDto,
                })
              }
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {(
                Object.keys(TEMPLATE_VARIABLE_LABELS) as TemplateVariableSourceDto[]
              ).map((source) => (
                <option key={source} value={source}>
                  {TEMPLATE_VARIABLE_LABELS[source]}
                </option>
              ))}
            </select>
          </div>
          {entry.source === "fixed" ? (
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-val-${i}`}>Texto fijo</Label>
              <Input
                id={`${idPrefix}-val-${i}`}
                value={entry.value ?? ""}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="20% de descuento"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-fb-${i}`}>
                Respaldo si falta el dato
              </Label>
              <Input
                id={`${idPrefix}-fb-${i}`}
                value={entry.fallback ?? ""}
                onChange={(e) => update(i, { fallback: e.target.value })}
                placeholder={
                  entry.source === "first_name" || entry.source === "name"
                    ? "Hola"
                    : "opcional"
                }
              />
            </div>
          )}
        </div>
      ))}
      <p className="text-[11.5px] text-muted-foreground">
        Sin respaldo, el contacto al que le falte el dato no recibirá el
        mensaje (en campañas queda marcado como fallido).
      </p>
    </div>
  );
}

/** Resumen legible del mapeo para la ficha y otras vistas. */
function mappingSummary(variables: TemplateVariableDto[]): string {
  return variables
    .map(
      (v, i) =>
        `{{${i + 1}}} = ${
          v.source === "fixed"
            ? `«${v.value ?? ""}»`
            : TEMPLATE_VARIABLE_LABELS[v.source].toLowerCase()
        }`
    )
    .join(" · ");
}

const STATUS_BADGE: Record<
  TemplateDto["status"],
  { label: string; variant: "secondary" | "warning" | "success" | "destructive" }
> = {
  draft: { label: "Borrador", variant: "secondary" },
  awaiting_approval: { label: "Por aprobar (admin)", variant: "warning" },
  pending: { label: "Pendiente de Meta", variant: "warning" },
  approved: { label: "Aprobada", variant: "success" },
  rejected: { label: "Rechazada", variant: "destructive" },
};

export function TemplatesClient({
  canApprove = true,
}: {
  /** Admin/superadmin: aprueba plantillas, elige el saludo y elimina. */
  canApprove?: boolean;
}) {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  // 004: plantilla que se envía automáticamente a los leads de Meta Ads.
  const [greetingTemplateId, setGreetingTemplateId] = useState<string | "">("");
  const [savingGreeting, setSavingGreeting] = useState(false);
  const [greetingMsg, setGreetingMsg] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const [res, lg] = await Promise.all([
      fetch("/api/templates").catch(() => null),
      fetch("/api/settings/leadgen").catch(() => null),
    ]);
    if (res?.ok) {
      const data = (await res.json()) as { templates: TemplateDto[] };
      setTemplates(data.templates);
    }
    if (lg?.ok) {
      const data = (await lg.json()) as {
        settings: { greetingTemplateId: string | null };
      };
      setGreetingTemplateId(data.settings.greetingTemplateId ?? "");
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function saveGreeting(value: string) {
    setGreetingTemplateId(value);
    setSavingGreeting(true);
    setGreetingMsg(null);
    const res = await fetch("/api/settings/leadgen", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ greetingTemplateId: value || null }),
    }).catch(() => null);
    setSavingGreeting(false);
    setGreetingMsg(res?.ok ? "Guardado ✓" : "No se pudo guardar");
  }

  async function sync() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/templates/sync", { method: "POST" }).catch(
      () => null
    );
    setSyncing(false);
    if (res?.ok) {
      const data = (await res.json()) as { updated: number };
      setSyncMsg(
        data.updated > 0
          ? `${data.updated} plantilla(s) actualizada(s)`
          : "Todo al día"
      );
      void refetch();
    } else {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setSyncMsg(data?.error?.message ?? "No se pudo sincronizar");
    }
  }

  const approved = templates.filter((t) => t.status === "approved");

  return (
    <div className="max-w-3xl space-y-6">
      {/* 004: saludo automático para leads de Meta Ads (solo admin) */}
      {canApprove && (
      <Card>
        <CardHeader>
          <CardTitle>Saludo automático para leads de Meta</CardTitle>
          <CardDescription>
            Cuando llega un lead nuevo desde tus campañas de Meta, se le envía
            esta plantilla por WhatsApp (con {"{{1}}"} = su primer nombre) y el
            agente IA continúa la conversación cuando responda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <select
              value={greetingTemplateId}
              onChange={(e) => void saveGreeting(e.target.value)}
              disabled={savingGreeting}
              className="flex h-11 w-full max-w-sm rounded-xl border border-border bg-surface-2 px-3.5 text-sm font-medium focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
            >
              <option value="">No enviar saludo automático</option>
              {approved.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.language})
                </option>
              ))}
            </select>
            {greetingMsg && (
              <span className="text-xs font-bold text-mute">{greetingMsg}</span>
            )}
          </div>
          {approved.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Necesitas al menos una plantilla aprobada por Meta.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Las plantillas permiten reabrir conversaciones con la ventana de 24 h
          cerrada. Meta las aprueba en horas o días; el estado se actualiza por
          webhook y con el botón Sincronizar (imprescindible en modo agencia,
          donde los eventos de plantillas no llegan al webhook de la instancia).
        </p>
        <Button variant="outline" size="sm" disabled={syncing} onClick={() => void sync()}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>
      {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}

      <CreateForm onCreated={() => void refetch()} />

      <div className="space-y-2">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            isGreeting={t.id === greetingTemplateId}
            canApprove={canApprove}
            onChanged={() => void refetch()}
          />
        ))}
        {templates.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin plantillas todavía. Crea la primera arriba — por ejemplo un
            «seguimos disponibles, ¿retomamos tu cotización?» para
            conversaciones frías.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Ficha de plantilla: categoría visible (MARKETING queda sujeta al límite por
 * destinatario de Meta, error 131049), edición del cuerpo/categoría y borrado.
 */
function TemplateCard({
  template: t,
  isGreeting,
  canApprove,
  onChanged,
}: {
  template: TemplateDto;
  isGreeting: boolean;
  canApprove: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(t.body);
  const [category, setCategory] = useState(
    t.category === "MARKETING" ? "MARKETING" : "UTILITY"
  );
  // 016: reemplazo opcional del archivo del encabezado (mismo tipo).
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  // 018: mapeo editable; arranca con el guardado.
  const [varMap, setVarMap] = useState<TemplateVariableDto[]>(
    t.variables ?? []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const marketing = t.category?.toUpperCase() === "MARKETING";
  const editVarCount = distinctVars(body).length;
  const editMapping = fitMapping(varMap, editVarCount);

  async function save() {
    if (replaceFile && t.headerKind) {
      const fileError = validateHeaderFile(t.headerKind, replaceFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }
    const emptyFixed = editMapping.findIndex(
      (v) => v.source === "fixed" && !v.value?.trim()
    );
    if (emptyFixed >= 0) {
      setError(`Escribe el valor fijo de {{${emptyFixed + 1}}}`);
      return;
    }
    setBusy(true);
    setError(null);
    let res: Response | null;
    if (replaceFile && t.headerKind) {
      const form = new FormData();
      form.set("body", body);
      form.set("category", category);
      form.set("headerKind", t.headerKind);
      form.set("headerFile", replaceFile);
      form.set("variables", JSON.stringify(editMapping));
      res = await fetch(`/api/templates/${t.id}`, {
        method: "PATCH",
        body: form,
      }).catch(() => null);
    } else {
      res = await fetch(`/api/templates/${t.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, category, variables: editMapping }),
      }).catch(() => null);
    }
    setBusy(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo editar la plantilla");
      return;
    }
    setEditing(false);
    setReplaceFile(null);
    onChanged();
  }

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/templates/${t.id}/approve`, {
      method: "POST",
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo aprobar la plantilla");
      return;
    }
    onChanged();
  }

  async function rejectInternal() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/templates/${t.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError("No se pudo devolver la plantilla");
      return;
    }
    onChanged();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/templates/${t.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo eliminar la plantilla");
      setConfirmDelete(false);
      return;
    }
    onChanged();
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm font-medium">
          {t.name}{" "}
          <span className="text-muted-foreground">({t.language})</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {t.headerKind && (
            <Badge variant="secondary">
              {t.headerKind === "image" ? (
                <ImageIcon className="mr-1 h-3 w-3" />
              ) : (
                <FileText className="mr-1 h-3 w-3" />
              )}
              {t.headerKind === "image" ? "Imagen" : "PDF"}
              {t.headerFilename ? ` · ${t.headerFilename}` : ""}
            </Badge>
          )}
          <Badge variant={marketing ? "warning" : "secondary"}>
            {marketing ? "MARKETING" : "UTILITY"}
          </Badge>
          <Badge variant={STATUS_BADGE[t.status].variant}>
            {STATUS_BADGE[t.status].label}
          </Badge>
        </div>
      </div>

      {marketing && (
        <p className="mt-2 text-xs text-warning">
          Categoría MARKETING: Meta limita cuántos mensajes promocionales recibe
          cada persona (de todos los negocios), así que algunos envíos pueden no
          entregarse. Las UTILITY de seguimiento no tienen ese límite.
        </p>
      )}

      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-body-${t.id}`}>Cuerpo</Label>
            <Textarea
              id={`edit-body-${t.id}`}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <VariableMappingEditor
            idPrefix={`edit-${t.id}`}
            mapping={editMapping}
            onChange={setVarMap}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`edit-cat-${t.id}`}>Categoría</Label>
            <select
              id={`edit-cat-${t.id}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="UTILITY">UTILITY (seguimiento)</option>
              <option value="MARKETING">MARKETING</option>
            </select>
          </div>
          {t.headerKind && (
            <div className="space-y-1.5">
              <Label htmlFor={`edit-header-${t.id}`}>
                Reemplazar {t.headerKind === "image" ? "la imagen" : "el PDF"}{" "}
                del encabezado (opcional)
              </Label>
              <input
                id={`edit-header-${t.id}`}
                type="file"
                accept={HEADER_ACCEPT[t.headerKind]}
                onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              <p className="text-xs text-muted-foreground">
                Actual: {t.headerFilename ?? "archivo"} — si no adjuntas nada,
                se conserva.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Al guardar, Meta vuelve a revisar la plantilla y queda pendiente
            hasta que la apruebe. El nombre y el idioma no se pueden cambiar:
            para eso hay que eliminarla y crearla de nuevo.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !body.trim()} onClick={() => void save()}>
              {busy ? "Enviando a Meta…" : "Guardar y reenviar a revisión"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setBody(t.body);
                setReplaceFile(null);
                setVarMap(t.variables ?? []);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
          {t.variables && t.variables.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold">Se personaliza sola:</span>{" "}
              {mappingSummary(t.variables)}
            </p>
          )}
          {t.status === "rejected" && t.rejectionReason && (
            <p className="mt-2 text-xs text-destructive">
              Razón del rechazo: {t.rejectionReason}
            </p>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {confirmDelete ? (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm">
                ¿Eliminar <span className="font-mono">{t.name}</span>? Se borra
                también en Meta y no se puede deshacer.
                {isGreeting && (
                  <>
                    {" "}
                    Es tu saludo automático de leads: quedará en «No enviar
                    saludo automático» hasta que elijas otra.
                  </>
                )}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  {busy ? "Eliminando…" : "Sí, eliminar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {t.status === "awaiting_approval" && canApprove && (
                <>
                  <Button size="sm" disabled={busy} onClick={() => void approve()}>
                    {busy ? "Enviando a Meta…" : "Aprobar y enviar a Meta"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void rejectInternal()}
                  >
                    Devolver
                  </Button>
                </>
              )}
              {t.status === "awaiting_approval" && !canApprove && (
                <p className="text-xs text-muted-foreground">
                  Esperando la aprobación del admin para enviarse a Meta.
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBody(t.body);
                  setCategory(marketing ? "MARKETING" : "UTILITY");
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              {canApprove && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("es_CO");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [body, setBody] = useState("");
  // 016: encabezado multimedia opcional, fijado al crear.
  const [headerKind, setHeaderKind] = useState<"" | "image" | "document">("");
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  // 018: mapeo de variables, una fila por {{n}} del cuerpo.
  const [varMap, setVarMap] = useState<TemplateVariableDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const varCount = distinctVars(body).length;
  const mapping = fitMapping(varMap, varCount);

  async function create() {
    if (headerKind && !headerFile) {
      setError("Adjunta el archivo del encabezado");
      return;
    }
    if (headerKind && headerFile) {
      const fileError = validateHeaderFile(headerKind, headerFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }
    const emptyFixed = mapping.findIndex(
      (v) => v.source === "fixed" && !v.value?.trim()
    );
    if (emptyFixed >= 0) {
      setError(`Escribe el valor fijo de {{${emptyFixed + 1}}}`);
      return;
    }
    setSaving(true);
    setError(null);
    let res: Response | null;
    if (headerKind && headerFile) {
      const form = new FormData();
      form.set("name", name);
      form.set("language", language);
      form.set("category", category);
      form.set("body", body);
      form.set("headerKind", headerKind);
      form.set("headerFile", headerFile);
      if (mapping.length > 0) form.set("variables", JSON.stringify(mapping));
      res = await fetch("/api/templates", { method: "POST", body: form }).catch(
        () => null
      );
    } else {
      res = await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          language,
          category,
          body,
          ...(mapping.length > 0 ? { variables: mapping } : {}),
        }),
      }).catch(() => null);
    }
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo crear la plantilla");
      return;
    }
    setName("");
    setBody("");
    setHeaderKind("");
    setHeaderFile(null);
    setVarMap([]);
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva plantilla</CardTitle>
        <CardDescription>
          Hasta 5 variables <code>{"{{1}}"}</code>…<code>{"{{5}}"}</code> que se
          personalizan solas con datos del contacto. Se envía a aprobación de
          Meta al crearla.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Nombre</Label>
            <Input
              id="tpl-name"
              placeholder="seguimiento_cotizacion"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-lang">Idioma</Label>
            <select
              id="tpl-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="es_CO">es_CO (Colombia)</option>
              <option value="es">es (español genérico)</option>
              <option value="es_MX">es_MX (México)</option>
              <option value="es_AR">es_AR (Argentina)</option>
              <option value="en_US">en_US</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-cat">Categoría</Label>
            <select
              id="tpl-cat"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "UTILITY" | "MARKETING")
              }
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="UTILITY">UTILITY (seguimiento)</option>
              <option value="MARKETING">MARKETING</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-body">Cuerpo</Label>
          <Textarea
            id="tpl-body"
            rows={3}
            placeholder="Hola {{1}}, vimos tu interés en {{2}}. ¿Retomamos tu cotización?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Usa variables {"{{1}}"}…{"{{5}}"} consecutivas: cada una se llena
            sola con datos del contacto en cada envío.
          </p>
        </div>
        <VariableMappingEditor
          idPrefix="tpl-new"
          mapping={mapping}
          onChange={setVarMap}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-header">Encabezado (opcional)</Label>
            <select
              id="tpl-header"
              value={headerKind}
              onChange={(e) => {
                setHeaderKind(e.target.value as "" | "image" | "document");
                setHeaderFile(null);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">Sin encabezado (solo texto)</option>
              <option value="image">Imagen (JPG/PNG, máx. 5 MB)</option>
              <option value="document">Documento PDF (máx. 16 MB)</option>
            </select>
          </div>
          {headerKind && (
            <div className="space-y-1.5">
              <Label htmlFor="tpl-header-file">
                {headerKind === "image" ? "Imagen" : "PDF"} del encabezado
              </Label>
              <input
                id="tpl-header-file"
                type="file"
                accept={HEADER_ACCEPT[headerKind]}
                onChange={(e) => setHeaderFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              <p className="text-xs text-muted-foreground">
                Se envía a Meta como ejemplo para la aprobación y acompañará
                cada mensaje de esta plantilla. El encabezado no puede
                agregarse ni quitarse después de creada.
              </p>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          disabled={saving || !name.trim() || !body.trim()}
          onClick={() => void create()}
        >
          {saving ? "Enviando a Meta…" : "Crear y enviar a aprobación"}
        </Button>
      </CardContent>
    </Card>
  );
}
