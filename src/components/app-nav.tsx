"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  FileText,
  Inbox,
  Kanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Smartphone,
  Megaphone,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import type { Branding } from "@/lib/branding";
import { normalizeRole, ROLE_LABELS } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { useEvents } from "@/components/use-events";
import { useTheme } from "@/components/use-theme";
import { NotificationsBell } from "@/components/notifications-bell";

/** Cada item declara qué roles lo ven (ver src/lib/permissions.ts). */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "commercial", "marketing"] },
  { href: "/inbox", label: "Bandeja", icon: Inbox, badge: true, roles: ["owner", "agent_editor", "commercial", "marketing"] },
  { href: "/sms", label: "SMS", icon: Smartphone, roles: ["owner", "commercial", "marketing"] },
  { href: "/pipeline", label: "Etapas del prospecto", icon: Kanban, roles: ["owner", "commercial", "marketing"] },
  { href: "/contacts", label: "Contactos", icon: Users, roles: ["owner", "commercial", "marketing"] },
  { href: "/agent", label: "Agente", icon: Sparkles, roles: ["owner", "agent_editor"] },
  { href: "/templates", label: "Plantillas", icon: FileText, roles: ["owner", "commercial", "marketing"] },
  { href: "/campaigns", label: "Envío masivo", icon: Megaphone, roles: ["owner", "commercial", "marketing"] },
  { href: "/mailing", label: "Mailing", icon: Mail, roles: ["owner", "commercial", "marketing"] },
  { href: "/services", label: "Servicios", icon: Briefcase, roles: ["owner", "commercial", "marketing"] },
] as const;

/** Sección exclusiva del superadmin: administrar empresas de la instancia. */
const SUPERADMIN_NAV = [
  { href: "/companies", label: "Empresas", icon: Building2 },
] as const;

const NAV_GROUPS = [
  { label: "Espacio de trabajo", paths: ["/dashboard", "/inbox", "/sms", "/pipeline", "/contacts"] },
  { label: "Automatización", paths: ["/agent", "/templates", "/campaigns", "/mailing"] },
  { label: "Gestión", paths: ["/services", "/companies"] },
] as const;

const focusStyle =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand";
const linkBase =
  `relative flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors ${focusStyle}`;
const linkActive = "bg-surface-2 text-foreground";
const linkIdle = "text-mute hover:bg-surface-2 hover:text-foreground";

export function AppNav({
  branding,
  userName,
  userImage,
  role,
  isSuperadmin = false,
  mailingEnabled = false,
}: {
  branding: Branding;
  userName: string;
  userImage?: string | null;
  role: string;
  isSuperadmin?: boolean;
  mailingEnabled?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [unread, setUnread] = useState(0);
  const activeMobileRef = useRef<HTMLAnchorElement | null>(null);
  const normalizedRole = normalizeRole(role);
  const nav = [
    ...NAV.filter((i) => (i.roles as readonly string[]).includes(normalizedRole) && (i.href !== "/mailing" || mailingEnabled)),
    ...(isSuperadmin ? SUPERADMIN_NAV : []),
  ];
  /* En mobile la sidebar no cabe: la navegación baja a una tab bar con las
     mismas secciones más Ajustes. */
  const mobileNav = [
    ...nav,
    { href: "/settings", label: "Ajustes", icon: Settings },
  ];

  async function refetchUnread() {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      conversations: { unreadCount: number }[];
    };
    setUnread(data.conversations.reduce((a, c) => a + c.unreadCount, 0));
  }

  useEffect(() => {
    void refetchUnread();
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) {
      activeMobileRef.current?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    }
  }, [pathname]);

  useEvents({
    onMessageNew: () => void refetchUnread(),
    onConversationUpdated: () => void refetchUnread(),
  });

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function logout() {
    await signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile: header superior compacto (marca + tema + salir) */}
      <header className="flex shrink-0 items-center gap-2.5 border-b bg-sidebar px-4 py-2.5 md:hidden">
        <Image
          src="/brand/isotipo.png"
          alt=""
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0 rounded-[8px]"
          aria-hidden
          priority
        />
        <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold tracking-tight">
          {branding.name}
        </span>
        <NotificationsBell variant="header" />
        <button
          onClick={toggle}
          aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          className={cn("rounded-lg border border-border bg-surface p-2 text-mute transition-colors hover:bg-surface-2 hover:text-foreground", focusStyle)}
        >
          {theme === "dark" ? (
            <Sun className="h-[17px] w-[17px]" strokeWidth={1.75} />
          ) : (
            <Moon className="h-[17px] w-[17px]" strokeWidth={1.75} />
          )}
        </button>
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-[11px] font-extrabold text-foreground">
          {userImage ? (
            <Image
              src={userImage}
              alt=""
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-cover"
              unoptimized
            />
          ) : (
            initials(userName)
          )}
        </span>
        <button
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={() => void logout()}
          className={cn("rounded-lg p-2 text-mute transition-colors hover:bg-surface-2 hover:text-foreground", focusStyle)}
        >
          <LogOut className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
      </header>

      {/* Mobile: tab bar inferior. Va en el flujo (order-1 la manda al final
          del layout en columna) para no tapar contenido. */}
      <nav aria-label="Navegación principal móvil" className="order-1 flex shrink-0 items-stretch overflow-x-auto border-t bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {mobileNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={active ? activeMobileRef : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-[84px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
                active ? "text-foreground" : "text-mute hover:bg-surface-2 hover:text-foreground"
              )}
            >
              {active && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand" />}
              <span className="relative">
                <item.icon aria-hidden className={cn("h-5 w-5", active && "text-brand")} strokeWidth={1.75} />
                {"badge" in item && item.badge && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-foreground px-1 text-[9.5px] font-bold text-surface">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop: grupos con scroll independiente para mantener todas las opciones accesibles. */}
      <aside className="crm-sidebar hidden w-[230px] shrink-0 flex-col px-3 pb-3 pt-7 md:flex">
        {/* Marca */}
        <div className="mb-5 flex shrink-0 items-center gap-3 border-b border-border px-3 pb-6">
          <Image
            src="/brand/isotipo.png"
            alt=""
            width={38}
            height={38}
            className="h-[38px] w-[38px] shrink-0 rounded-xl ring-1 ring-white/10"
            aria-hidden
            priority
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[17px] font-semibold tracking-tight">
              {branding.name}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-mute">
              <span aria-hidden className="h-1 w-1 rounded-full bg-brand" /> CRM · WhatsApp + IA
            </span>
          </span>
        </div>

        <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto pb-4">
          {NAV_GROUPS.map((group) => {
            const items = nav.filter((item) => (group.paths as readonly string[]).includes(item.href));
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="mb-5 last:mb-0">
                <p className="mb-2 px-3.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(linkBase, active ? linkActive : linkIdle)}
                      >
                        {active && <span aria-hidden className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-brand" />}
                        <item.icon aria-hidden className={cn("h-[18px] w-[18px] shrink-0", active && "text-brand")} strokeWidth={1.75} />
                        <span className="flex-1 leading-snug">{item.label}</span>
                        {"badge" in item && item.badge && unread > 0 && (
                          <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-md border border-border bg-surface px-1.5 text-[10px] font-bold tabular-nums text-foreground">
                            {unread}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto flex shrink-0 flex-col gap-0.5 border-t border-border pt-2">
          <NotificationsBell variant="sidebar" />
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            className={cn(linkBase, linkIdle)}
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>

          <Link
            href="/settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={cn(
              linkBase,
              pathname.startsWith("/settings") ? linkActive : linkIdle
            )}
          >
            {pathname.startsWith("/settings") && <span aria-hidden className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-brand" />}
            <Settings className={cn("h-[18px] w-[18px]", pathname.startsWith("/settings") && "text-brand")} strokeWidth={1.75} />
            Ajustes
          </Link>

          <div className="mt-1 flex items-center gap-2.5 border-t border-border px-2 py-2.5">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-xs font-semibold text-foreground">
              {userImage ? (
                <Image
                  src={userImage}
                  alt=""
                  width={34}
                  height={34}
                  className="h-[34px] w-[34px] object-cover"
                  unoptimized
                />
              ) : (
                initials(userName)
              )}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-semibold">
                {userName}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-mute">
                <span className="h-[7px] w-[7px] rounded-full bg-success" />
                {ROLE_LABELS[normalizedRole]} · En línea
              </span>
            </span>
            <button
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={() => void logout()}
              className={cn("rounded-lg p-2 text-mute transition-colors hover:bg-surface-2 hover:text-foreground", focusStyle)}
            >
              <LogOut className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
