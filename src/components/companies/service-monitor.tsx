"use client";

import { useEffect } from "react";

/** También recupera la misma sesión tras reactivar, sin cerrar/iniciar sesión. */
export function ServiceMonitor({ suspended = false, notice }: { suspended?: boolean; notice?: string }) {
  useEffect(() => {
    let stopped = false;
    let pending = false;
    let controller: AbortController | null = null;
    async function check() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8_000);
      try {
        const res = await fetch("/api/service-status", { cache: "no-store", signal: controller.signal });
        if (stopped) return;
        if (res.status === 401) { window.location.replace("/login"); return; }
        if (!res.ok) return;
        const data = await res.json() as { suspended: boolean; title: string; message: string };
        if (!stopped && data.suspended !== suspended) {
          window.location.replace(data.suspended ? "/service-unavailable" : "/inbox");
        } else if (!stopped && suspended && notice && JSON.stringify([data.title, data.message]) !== notice) {
          window.location.reload();
        }
      } catch {
        // Un corte de red no cierra la sesión ni deja un control ocupado.
      } finally { clearTimeout(timeout); pending = false; }
    }
    void check();
    const interval = setInterval(() => void check(), 15_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stopped = true; controller?.abort(); clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [suspended, notice]);
  return null;
}
