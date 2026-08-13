"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Perfil", adminOnly: false },
  { href: "/settings/whatsapp", label: "WhatsApp", adminOnly: true },
  { href: "/settings/calendar", label: "Calendario", adminOnly: true },
  { href: "/settings/notifications", label: "Notificaciones", adminOnly: true },
  { href: "/settings/integrations", label: "Integraciones", adminOnly: true },
  { href: "/settings/branding", label: "Marca", adminOnly: true },
  { href: "/settings/team", label: "Equipo", adminOnly: true },
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
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 lg:w-[210px] lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-4 lg:py-[22px]">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            ref={active ? activeRef : undefined}
            className={cn(
              "block whitespace-nowrap rounded-[10px] px-[15px] py-[9px] text-sm transition-colors lg:py-[11px]",
              active
                ? "bg-brand font-bold text-white"
                : "font-semibold text-mute hover:bg-surface-2 hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
