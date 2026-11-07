"use client";

import { useState } from "react";
import { PauseCircle, RefreshCw } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { ServiceMonitor } from "./service-monitor";

export function ServiceUnavailable({ companyName, title, message }: { companyName: string; title: string; message: string }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function checkAccess() {
    if (busy) return;
    setBusy(true); setNotice(null);
    try {
      const res = await fetch("/api/service-status", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (res.status === 401) { window.location.replace("/login"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json() as { suspended: boolean; message: string };
      if (!data.suspended) { window.location.replace("/inbox"); return; }
      setNotice("El servicio sigue en pausa. El acceso se recuperará automáticamente cuando esté disponible.");
    } catch { setNotice("No pudimos comprobar el acceso. Inténtalo de nuevo en unos momentos."); }
    finally { setBusy(false); }
  }
  return (
    <section aria-labelledby="service-title" className="rounded-2xl border bg-surface p-6 text-center shadow-sm">
      <ServiceMonitor suspended notice={JSON.stringify([title, message])} />
      <PauseCircle aria-hidden className="mx-auto mb-4 h-10 w-10 text-brand" />
      <p className="mb-2 break-words text-xs font-bold text-mute">{companyName}</p>
      <h2 id="service-title" className="text-xl font-bold">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-2">{message}</p>
      <p className="mt-4 text-xs leading-relaxed text-mute">Tus datos se conservan. El acceso volverá a estar disponible cuando se reactive el servicio.</p>
      {notice && <p role="status" className="mt-4 text-xs text-text-2">{notice}</p>}
      <Button className="mt-5 w-full" disabled={busy} onClick={() => void checkAccess()}>
        <RefreshCw aria-hidden className="h-4 w-4" />{busy ? "Comprobando…" : "Comprobar acceso"}
      </Button>
      <button className="mt-4 text-xs font-bold text-mute hover:text-foreground" onClick={() => void signOut().then(() => window.location.replace("/login"))}>Cerrar sesión</button>
    </section>
  );
}
