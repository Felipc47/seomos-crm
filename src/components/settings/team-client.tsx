"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { normalizeRole } from "@/lib/permissions";

type Member = {
  id: string;
  role: string;
  name: string;
  email: string;
  createdAt: string;
  isSelf: boolean;
  isSuperadmin: boolean;
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
  const [editing, setEditing] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  async function saveMember() {
    if (!editing) return;
    setMemberBusy(true);
    setMemberError(null);
    const response = await fetch(`/api/settings/team/${editing.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editing.name, email: editing.email, role: editing.role }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      signInAgain?: boolean; error?: { message?: string };
    } | null;
    setMemberBusy(false);
    if (!response?.ok) {
      setMemberError(data?.error?.message ?? "No se pudo guardar. Revisa tu conexión e inténtalo otra vez.");
      return;
    }
    if (data?.signInAgain) { window.location.assign("/login"); return; }
    const target = members.find((member) => member.id === editing.id);
    if (target?.isSelf && editing.role !== "owner") { window.location.assign("/settings/profile"); return; }
    setEditing(null);
    setFeedback("Miembro actualizado.");
    await refetch();
  }

  async function removeMember() {
    if (!deleting) return;
    setMemberBusy(true);
    setMemberError(null);
    const response = await fetch(`/api/settings/team/${deleting.id}`, { method: "DELETE" }).catch(() => null);
    setMemberBusy(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null) as { error?: { message?: string } } | null;
      setMemberError(data?.error?.message ?? "No se pudo eliminar. Revisa tu conexión e inténtalo otra vez.");
      return;
    }
    setDeleting(null);
    setFeedback("Miembro eliminado del equipo. Sus servicios y prospectos quedaron sin asignar.");
    await refetch();
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
      <Card data-help="team-create">
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

      <div data-help="team-members" className="space-y-2">
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
        {feedback && <p role="status" className="text-sm text-[color:var(--success-fg)]">{feedback}</p>}
        {members.map((m) => (
          <div key={m.id} data-testid={`team-member-${m.id}`} className="rounded-lg border bg-card px-4 py-3">
            {editing?.id === m.id ? (
              <form className="space-y-3" aria-label={`Editar a ${m.name}`} onSubmit={(event) => { event.preventDefault(); void saveMember(); }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-name-${m.id}`}>Nombre del miembro</Label>
                    <Input id={`edit-name-${m.id}`} value={editing.name} maxLength={120} required disabled={memberBusy}
                      onChange={(event) => setEditing({ ...editing, name: event.target.value })} autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-email-${m.id}`}>Correo del miembro</Label>
                    <Input id={`edit-email-${m.id}`} type="email" value={editing.email} maxLength={254} required disabled={memberBusy}
                      onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`edit-role-${m.id}`}>Rol del miembro</Label>
                  <select id={`edit-role-${m.id}`} value={editing.role} disabled={memberBusy || m.isSuperadmin}
                    onChange={(event) => setEditing({ ...editing, role: event.target.value })}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand">
                    {Object.entries(ROLE_LABELS).filter(([value]) => value !== "member").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">Si cambias el correo, el miembro deberá volver a iniciar sesión con el nuevo correo y su contraseña actual.</p>
                {memberError && <p role="alert" className="text-sm text-destructive">{memberError}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={memberBusy || !editing.name.trim() || !editing.email.trim()}>{memberBusy ? "Guardando…" : "Guardar cambios"}</Button>
                  <Button type="button" variant="outline" size="sm" disabled={memberBusy} onClick={() => { setEditing(null); setMemberError(null); }}>Cancelar edición</Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex min-w-0 items-start gap-3">
                  <ContactAvatar name={m.name} seed={m.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{m.name}{m.isSelf ? " (tú)" : ""}</p>
                    <p className="break-all text-xs text-muted-foreground">{m.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABELS[normalizeRole(m.role)]}{m.isSuperadmin ? " · Superadmin" : ""}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.services.length > 0 ? m.services.map((service) => (
                        <span key={service.id} className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand">{service.name}</span>
                      )) : <span className="text-[11px] text-muted-foreground">Sin servicios asignados</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={memberBusy || (m.isSuperadmin && !m.isSelf)}
                    aria-label={`Editar a ${m.name}`} onClick={() => { setEditing({ id: m.id, name: m.name, email: m.email, role: normalizeRole(m.role) }); setMemberError(null); setFeedback(null); }}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />Editar
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={resettingMemberId !== null || memberBusy}
                    onClick={() => void resetPassword(m)} aria-label={`Restablecer contraseña de ${m.name}`}>
                    {resettingMemberId === m.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                    {resettingMemberId === m.id ? "Enviando…" : "Restablecer"}
                  </Button>
                  {!m.isSelf && !m.isSuperadmin && <Button type="button" variant="outline" size="sm" disabled={memberBusy}
                    aria-label={`Eliminar a ${m.name}`} onClick={() => { setDeleting(m); setMemberError(null); setFeedback(null); }}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />Eliminar
                  </Button>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {deleting && <ConfirmDialog title="Eliminar miembro del equipo" busy={memberBusy}
        message={<><strong>{deleting.name}</strong> perderá acceso a esta empresa. Sus servicios y prospectos quedarán sin asignar. Se conservarán contactos, conversaciones e historial.
          {memberError && <span role="alert" className="mt-3 block text-destructive">{memberError}</span>}</>}
        onCancel={() => { if (!memberBusy) { setDeleting(null); setMemberError(null); } }}
        onConfirm={() => void removeMember()} />}
    </div>
  );
}
