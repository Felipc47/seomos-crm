"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, MessageCircle, Palette, Plug, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Perfil", icon: UserRound, adminOnly: false },
  { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle, adminOnly: true },
  { href: "/settings/calendar", label: "Calendario", icon: CalendarDays, adminOnly: true },
  { href: "/settings/notifications", label: "Notificaciones", icon: Bell, adminOnly: true },
  { href: "/settings/integrations", label: "Integraciones", icon: Plug, adminOnly: true },
  { href: "/settings/branding", label: "Marca", icon: Palette, adminOnly: true },
  { href: "/settings/team", label: "Equipo", icon: Users, adminOnly: true },
] as const;

/** Los roles no-admin solo ven los ajustes de su propia cuenta (Perfil). */
export function SettingsNav({ isAdmin = true }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => isAdmin || !t.adminOnly);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      activeRef.current?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    }
  }, [pathname]);

  return (
    /* Mobile: tabs horizontales con scroll; desktop: columna lateral de 210px. */
    <nav aria-label="Ajustes" className="flex shrink-0 gap-1 overflow-x-auto border-b bg-surface px-3 py-2 lg:w-[210px] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            ref={active ? activeRef : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
              active
                ? "bg-surface-2 text-foreground"
                : "text-mute hover:bg-surface-2 hover:text-foreground"
            )}
          >
            {active && <span aria-hidden className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-brand lg:bottom-3 lg:left-0 lg:right-auto lg:top-3 lg:h-auto lg:w-0.5" />}
            <t.icon aria-hidden className={cn("h-4 w-4 shrink-0", active && "text-brand")} strokeWidth={1.75} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
