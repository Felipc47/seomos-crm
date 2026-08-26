"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
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

export function ResetPasswordForm({
  token,
  initiallyInvalid,
}: {
  token: string | null;
  initiallyInvalid: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(initiallyInvalid || !token);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      setInvalid(true);
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    }).catch(() => null);
    setLoading(false);
    if (!response?.ok) {
      if (response?.status === 400) setInvalid(true);
      else {
        setError(
          response?.status === 429
            ? "Demasiados intentos. Espera unos minutos y solicita un enlace nuevo."
            : "No pudimos actualizar la contraseña. Revisa tu conexión e inténtalo otra vez."
        );
      }
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CheckCircle2
            className="mb-2 h-6 w-6 text-[color:var(--success)]"
            aria-hidden="true"
          />
          <CardTitle>Contraseña actualizada</CardTitle>
          <CardDescription>
            Cerramos tus sesiones anteriores. Ya puedes entrar con la nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-accent transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ir al acceso
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (invalid) {
    return (
      <Card>
        <CardHeader>
          <CircleAlert
            className="mb-2 h-6 w-6 text-[color:var(--danger)]"
            aria-hidden="true"
          />
          <CardTitle>El enlace ya no es válido</CardTitle>
          <CardDescription>
            Puede haber vencido, estar incompleto o haberse usado antes. Solicita uno nuevo para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/forgot-password"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-accent transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Solicitar un enlace nuevo
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea una contraseña nueva</CardTitle>
        <CardDescription>
          Usa entre 8 y 128 caracteres. Al guardar, cerraremos tus demás sesiones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          {error && (
            <p
              className="rounded-lg border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] p-3 text-sm leading-5 text-[color:var(--danger-fg)]"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando…" : "Guardar nueva contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
