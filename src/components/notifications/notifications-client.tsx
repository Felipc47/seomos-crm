"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEvents } from "@/components/use-events";

type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const PAGE_SIZE = 50;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Historial completo de notificaciones del usuario, paginado por cursor
 * ("Cargar más"). Entrar marca todo como leído; las nuevas llegan en vivo
 * por SSE (se refetchea la primera página, porque el evento es de la
 * organización y el filtro por destinatario vive en el servidor).
 */
export function NotificationsClient() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const markedRead = useRef(false);

  const fetchPage = useCallback(async (before?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (before) params.set("before", before);
    const res = await fetch(`/api/notifications?${params}`).catch(() => null);
    if (!res?.ok) return null;
    return (await res.json()) as {
      notifications: NotificationDto[];
      hasMore: boolean;
    };
  }, []);

  const refetchFirstPage = useCallback(async () => {
    const data = await fetchPage();
    if (!data) return;
    setItems((prev) => {
      const seen = new Set(data.notifications.map((n) => n.id));
      return [...data.notifications, ...prev.filter((n) => !seen.has(n.id))];
    });
    setHasMore((prev) => prev || data.hasMore);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => {
    void (async () => {
      const data = await fetchPage();
      if (data) {
        setItems(data.notifications);
        setHasMore(data.hasMore);
      }
      setLoading(false);
      if (!markedRead.current) {
        markedRead.current = true;
        await fetch("/api/notifications", { method: "PATCH" }).catch(
          () => null
        );
        // Avisa a la campana (misma pestaña) para que apague su contador.
        window.dispatchEvent(new Event("seomos:notifications-read"));
      }
    })();
  }, [fetchPage]);

  useEvents({
    onNotificationNew: () => void refetchFirstPage(),
    onReconnect: () => void refetchFirstPage(),
  });

  async function loadMore() {
    const last = items[items.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPage(last.createdAt);
    if (data) {
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...data.notifications.filter((n) => !seen.has(n.id))];
      });
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>
            Todo lo que ha pasado mientras no mirabas: campañas, plantillas,
            leads y asignaciones. Abrir esta página lo marca como leído.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {loading ? (
            <p className="py-4 text-center text-[13px] text-mute">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-mute">
              <Bell className="h-6 w-6" strokeWidth={1.7} />
              <p className="text-[13px]">Todavía no tienes notificaciones.</p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        if (n.href) router.push(n.href);
                      }}
                      className={cn(
                        "w-full rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-subtle",
                        !n.readAt && "bg-brand-tint"
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] font-bold">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-faint">
                          {formatWhen(n.createdAt)}
                        </span>
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-text-2">
                          {n.body}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="secondary"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Cargando…" : "Cargar más"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
