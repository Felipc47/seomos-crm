"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimezone } from "@/components/timezone-provider";

export function TimezoneClient({ initialTimezone, options }: { initialTimezone: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const { setTimezone } = useTimezone();
  const [selection, setSelection] = useState(initialTimezone);
  const [saved, setSaved] = useState(initialTimezone);
  const [now, setNow] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setSuccess(false);
    try {
      const response = await fetch("/api/settings/timezone", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ timezone: selection }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la zona horaria. Intenta de nuevo.");
      setSaved(selection); setTimezone(selection); setSuccess(true); router.refresh();
    } catch { setError("No se pudo guardar la zona horaria. Revisa tu conexión e intenta de nuevo."); }
    finally { setSaving(false); }
  }
  return <Card>
    <CardHeader>
      <CardTitle><Globe2 aria-hidden className="mr-2 inline h-5 w-5" />Zona horaria de la empresa</CardTitle>
      <CardDescription>Elige la hora local que usará tu equipo en el CRM, aunque trabaje desde otro país.</CardDescription>
    </CardHeader>
    <CardContent>
      <form className="max-w-xl space-y-5" onSubmit={save}>
        <div className="space-y-2 text-sm font-semibold">
          <label htmlFor="company-timezone">Zona horaria</label>
          <select id="company-timezone" value={selection} disabled={saving} onChange={e => { setSelection(e.target.value); setSuccess(false); setError(null); }} className="mt-2 flex h-11 w-full min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <p className="rounded-xl bg-surface-2 p-4 text-sm" data-testid="timezone-preview">Hora en esta zona: <strong>{now ? new Intl.DateTimeFormat("es-CO", { timeZone: selection, dateStyle: "full", timeStyle: "short" }).format(now) : "…"}</strong></p>
        <p className="text-sm text-mute">Se aplica a los horarios del CRM, reportes, seguimientos, nuevas reuniones y programación de campañas. El horario de verano se ajusta automáticamente cuando corresponda.</p>
        <p className="text-sm text-mute">Las reuniones y envíos ya programados conservan su fecha y hora.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {success && <p role="status" className="text-sm text-brand">Zona horaria guardada: {saved}</p>}
        <Button type="submit" disabled={saving || selection === saved}>{saving ? "Guardando…" : "Guardar zona horaria"}</Button>
      </form>
    </CardContent>
  </Card>;
}
