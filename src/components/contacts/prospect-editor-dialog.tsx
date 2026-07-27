"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import {
  isNegativeStage,
  isReasonForStage,
  reasonsForStage,
  type LeadClosureReason,
} from "@/lib/lead-closure";
import type { ContactDto, StageDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type ContactDetail = {
  contact: ContactDto;
  stage: StageDto | null;
  lead: {
    id: string;
    closureReason: string | null;
  } | null;
};

export type ProspectEditorResult = ContactDetail;

export function normalizeProspectPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function ProspectEditorDialog({
  contactId,
  onClose,
  onSaved,
}: {
  contactId: string;
  onClose: () => void;
  onSaved: (result: ProspectEditorResult) => void | Promise<void>;
}) {
  const toast = useToast();
  const [stages, setStages] = useState<StageDto[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [stageId, setStageId] = useState("");
  const [closureReason, setClosureReason] = useState<
    LeadClosureReason | ""
  >("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetch(`/api/contacts/${contactId}`).then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el prospecto");
        return (await response.json()) as ContactDetail;
      }),
      fetch("/api/pipeline/stages").then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron cargar las etapas");
        return (await response.json()) as { stages: StageDto[] };
      }),
    ])
      .then(([detail, stageData]) => {
        if (cancelled) return;
        setName(detail.contact.name);
        setPhone(detail.contact.phone);
        setEmail(detail.contact.email ?? "");
        setNotes(detail.contact.notes ?? "");
        setLeadId(detail.lead?.id ?? null);
        setStageId(detail.stage?.id ?? "");
        setClosureReason(
          (detail.lead?.closureReason as LeadClosureReason | null) ?? ""
        );
        setStages(stageData.stages);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el prospecto"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contactId, reloadKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const cleanPhone = normalizeProspectPhone(phone);
  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === stageId) ?? null,
    [stageId, stages]
  );
  const negativeStage =
    selectedStage && isNegativeStage(selectedStage.kind)
      ? selectedStage
      : null;
  const cleanEmail = email.trim();
  const emailValid =
    !cleanEmail ||
    (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) &&
      cleanEmail.length <= 254);
  const reasonValid =
    !negativeStage ||
    isReasonForStage(negativeStage.kind, closureReason || null);
  const valid =
    name.trim().length > 0 &&
    name.trim().length <= 120 &&
    /^\d{7,15}$/.test(cleanPhone) &&
    emailValid &&
    notes.length <= 4000 &&
    (!leadId || Boolean(selectedStage)) &&
    reasonValid;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail || null,
        notes: notes || null,
        ...(leadId
          ? {
              stageId,
              closureReason: negativeStage ? closureReason : null,
            }
          : {}),
      }),
    }).catch(() => null);
    setSaving(false);

    if (!response) {
      setError("Sin conexión con el servidor. Tus cambios siguen aquí.");
      return;
    }
    const data = (await response.json().catch(() => null)) as
      | ProspectEditorResult
      | { error?: { message?: string } }
      | null;
    if (!response.ok || !data || !("contact" in data)) {
      setError(
        data && "error" in data
          ? (data.error?.message ?? "No se pudieron guardar los cambios")
          : "No se pudieron guardar los cambios"
      );
      return;
    }

    await onSaved(data);
    toast("Prospecto actualizado");
    onClose();
  }

  function chooseStage(nextId: string) {
    setStageId(nextId);
    const next = stages.find((stage) => stage.id === nextId);
    if (!next || !isNegativeStage(next.kind)) {
      setClosureReason("");
      return;
    }
    if (!isReasonForStage(next.kind, closureReason || null)) {
      setClosureReason("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-[fade-in_.16s_ease] items-center justify-center bg-black/55 p-3 sm:p-5"
      onClick={() => !saving && onClose()}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-editor-title"
        aria-describedby={error ? "prospect-editor-error" : undefined}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-[660px] animate-[pop-in_.2s_ease] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:max-h-[calc(100dvh-40px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-4 border-b px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0 flex-1">
            <h3
              id="prospect-editor-title"
              className="font-display text-xl font-bold"
            >
              Editar prospecto
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-mute">
              Los cambios se reflejan en Bandeja, Etapas y Contactos.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar editor"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border bg-surface-2 text-mute transition-colors hover:text-foreground disabled:opacity-50"
          >
            <X className="h-[17px] w-[17px]" strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {loading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm font-semibold text-mute">
              <LoaderCircle className="h-6 w-6 animate-spin text-brand" />
              Cargando datos actuales…
            </div>
          ) : error && !name ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-brand" />
              <p className="text-sm font-semibold">{error}</p>
              <Button
                variant="secondary"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    className="text-[12.5px] font-bold"
                    htmlFor="prospect-edit-name"
                  >
                    Nombre
                  </label>
                  <Input
                    id="prospect-edit-name"
                    autoFocus
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-[12.5px] font-bold"
                    htmlFor="prospect-edit-phone"
                  >
                    WhatsApp (con código de país)
                  </label>
                  <Input
                    id="prospect-edit-phone"
                    inputMode="tel"
                    placeholder="573001234567"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                  {phone && !/^\d{7,15}$/.test(cleanPhone) && (
                    <p className="text-[11.5px] font-semibold text-destructive">
                      Ingresa entre 7 y 15 dígitos.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-[12.5px] font-bold"
                    htmlFor="prospect-edit-email"
                  >
                    Correo (opcional)
                  </label>
                  <Input
                    id="prospect-edit-email"
                    type="email"
                    maxLength={254}
                    placeholder="cliente@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {!emailValid && (
                    <p className="text-[11.5px] font-semibold text-destructive">
                      Ingresa un correo válido.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-[12.5px] font-bold"
                    htmlFor="prospect-edit-stage"
                  >
                    Etapa del prospecto
                  </label>
                  {leadId ? (
                    <select
                      id="prospect-edit-stage"
                      value={stageId}
                      onChange={(event) => chooseStage(event.target.value)}
                      className="h-10 w-full rounded-[10px] border bg-surface-2 px-3 text-sm font-semibold outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft"
                    >
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex h-10 items-center rounded-[10px] border bg-surface-2 px-3 text-sm text-faint">
                      Sin prospecto asociado
                    </div>
                  )}
                </div>
              </div>

              {negativeStage && (
                <div className="space-y-1.5 rounded-xl border bg-surface-2 p-3.5">
                  <label
                    className="text-[12.5px] font-bold"
                    htmlFor="prospect-edit-reason"
                  >
                    Motivo de {negativeStage.name}
                  </label>
                  <select
                    id="prospect-edit-reason"
                    value={closureReason}
                    onChange={(event) =>
                      setClosureReason(
                        event.target.value as LeadClosureReason | ""
                      )
                    }
                    className="h-10 w-full rounded-[10px] border bg-surface px-3 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">Selecciona un motivo…</option>
                    {reasonsForStage(negativeStage.kind).map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label
                    className="text-[12.5px] font-bold"
                    htmlFor="prospect-edit-notes"
                  >
                    Notas
                  </label>
                  <span className="text-[11px] font-semibold text-faint">
                    {notes.length}/4000
                  </span>
                </div>
                <Textarea
                  id="prospect-edit-notes"
                  rows={5}
                  maxLength={4000}
                  placeholder="Información interna para el equipo…"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <p className="rounded-[10px] bg-surface-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-mute">
                Si cambias el WhatsApp, se conserva todo el historial. Los
                próximos mensajes se enviarán al número nuevo.
              </p>

              {error && (
                <div
                  id="prospect-editor-error"
                  role="alert"
                  className="flex items-start gap-2 rounded-[10px] border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] p-3 text-[13px] font-semibold text-[color:var(--danger-fg)]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && name && (
          <footer className="flex flex-col-reverse gap-2.5 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button variant="ghost" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!valid || saving} onClick={() => void save()}>
              {saving ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </footer>
        )}
      </section>
    </div>
  );
}
