"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
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

const NEUTRAL_CONFIRMATION =
  "Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!response?.ok) {
      setError(
        response?.status === 429
          ? "Demasiadas solicitudes. Espera unos minutos antes de intentarlo otra vez."
          : "No pudimos procesar la solicitud. Revisa tu conexión e inténtalo otra vez."
      );
      return;
    }
    setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restablecer contraseña</CardTitle>
        <CardDescription>
          Te enviaremos un enlace personal que vence en 60 minutos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-5" aria-live="polite">
            <div className="rounded-xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] p-4 text-[color:var(--success-fg)]">
              <MailCheck className="mb-3 h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-bold">Revisa tu correo</p>
              <p className="mt-1 text-sm leading-6">{NEUTRAL_CONFIRMATION}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 text-sm font-bold transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver al acceso
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Correo</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver al acceso
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
