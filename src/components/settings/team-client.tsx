"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  role: string;
  name: string;
  email: string;
  createdAt: string;
  services: { id: string; name: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Admin",
  agent_editor: "Editor de agente",
  commercial: "Ejecutivo comercial",
  marketing: "Marketing",
  member: "Ejecutivo comercial",
};

export function TeamClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("commercial");
  const [tempPassword, setTempPassword] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(
    null
  );
  const [resetFeedback, setResetFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/settings/team").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      members: Member[];
      limit: number | null;
    };
    setMembers(data.members);
    setLimit(data.limit);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  function generatePassword() {
    const alphabet =
      "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(14);
    crypto.getRandomValues(bytes);
    setTempPassword(
      Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
    );
  }

  async function changeRole(memberId: string, newRole: string) {
    const res = await fetch(`/api/settings/team/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo cambiar el rol");
    } else {
      setError(null);
    }
    void refetch();
  }

  async function create() {
    setSaving(true);
    setError(null);
    setCreated(null);
    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password: tempPassword, role }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo crear la cuenta");
      return;
    }
    setCreated({ email, password: tempPassword });
    setName("");
    setEmail("");
    setTempPassword("");
    void refetch();
  }

  async function resetPassword(member: Member) {
    setResettingMemberId(member.id);
    setResetFeedback(null);
    const response = await fetch(
      `/api/settings/team/${member.id}/password-reset`,
      { method: "POST" }
    ).catch(() => null);
    setResettingMemberId(null);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setResetFeedback({
        kind: "error",
        message:
          data?.error?.message ??
          "No se pudo enviar el enlace. Revisa tu conexión e inténtalo otra vez.",
      });
      return;
    }
    setResetFeedback({
      kind: "success",
      message: `Enlace de restablecimiento enviado a ${member.name}.`,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear cuenta de equipo</CardTitle>
          <CardDescription>
            Sin correos ni invitaciones: comparte tú mismo la contraseña
            temporal con tu compañero (se muestra UNA sola vez).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Nombre</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-email">Correo</Label>
              <Input
                id="team-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-role">Rol</Label>
            <select
              id="team-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="commercial">Ejecutivo comercial</option>
              <option value="marketing">Marketing</option>
              <option value="agent_editor">Editor de agente</option>
              <option value="owner">Admin</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-password">Contraseña temporal</Label>
            <div className="flex gap-2">
              <Input
                id="team-password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
              />
              <Button variant="outline" onClick={generatePassword}>
                Generar
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {created && (
            <div className="rounded-md border border-[color:var(--success-border)] bg-[color:var(--success-bg)] p-3 text-sm">
              <p className="font-medium text-[color:var(--success-fg)]">Cuenta creada ✓</p>
              <p className="mt-1 text-[color:var(--success-fg)]">
                Comparte estos datos ahora (no se volverán a mostrar):
                <br />
                <code>{created.email}</code> · contraseña{" "}
                <code>{created.password}</code>
              </p>
            </div>
          )}
          <Button
            disabled={
              saving || !name.trim() || !email.trim() || tempPassword.length < 8
            }
            onClick={() => void create()}
          >
            <UserPlus className="h-4 w-4" />
            {saving ? "Creando…" : "Crear cuenta"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Miembros{limit !== null ? ` · ${members.length}/${limit}` : ""}
        </p>
        {resetFeedback && (
          <p
            className={
              resetFeedback.kind === "success"
                ? "rounded-lg border border-[color:var(--success-border)] bg-[color:var(--success-bg)] p-3 text-sm leading-5 text-[color:var(--success-fg)]"
                : "rounded-lg border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] p-3 text-sm leading-5 text-[color:var(--danger-fg)]"
            }
            role={resetFeedback.kind === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {resetFeedback.message}
          </p>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            data-testid={`team-member-${m.id}`}
            className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <ContactAvatar name={m.name} seed={m.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="break-all text-xs text-muted-foreground">
                  {m.email}
                </p>
                {(m.role === "commercial" || m.role === "member") && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.services.length > 0 ? (
                      m.services.map((service) => (
                        <span
                          key={service.id}
                          className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand"
                        >
                          {service.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Sin servicios asignados
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <select
                aria-label={`Rol de ${m.name}`}
                value={m.role === "member" ? "commercial" : m.role}
                onChange={(e) => void changeRole(m.id, e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs font-semibold outline-none focus:border-brand sm:flex-none"
              >
                <option value="owner">{ROLE_LABELS.owner}</option>
                <option value="agent_editor">{ROLE_LABELS.agent_editor}</option>
                <option value="commercial">{ROLE_LABELS.commercial}</option>
                <option value="marketing">{ROLE_LABELS.marketing}</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={resettingMemberId !== null}
                onClick={() => void resetPassword(m)}
                aria-label={`Restablecer contraseña de ${m.name}`}
              >
                {resettingMemberId === m.id ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                )}
                {resettingMemberId === m.id ? "Enviando…" : "Restablecer"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
