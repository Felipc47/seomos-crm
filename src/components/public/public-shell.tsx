import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

const legalLinks = [
  { href: "/privacy", label: "Privacidad" },
  { href: "/terms", label: "Términos" },
] as const;

const productLinks = [
  { href: "/#flujo", label: "Cómo funciona" },
  { href: "/#capacidades", label: "Capacidades" },
  { href: "/#seguridad", label: "Seguridad" },
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#080d13]/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 md:h-[72px] md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Seomos CRM, inicio">
          <Image
            src="/brand/isotipo.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-[10px]"
            priority
          />
          <span className="font-display text-[17px] font-extrabold tracking-tight">SEOMOS AI CRM</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-bold text-mute lg:flex" aria-label="Navegación principal">
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <Link href="/#google-calendar" className="transition-colors hover:text-foreground">
            Google Calendar
          </Link>
          <a
            href="https://www.seomos.com/seomos-ai-crm/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            SEOMOS.com
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </nav>

        <Link
          href="/login"
          className="ml-auto rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-accent transition-all hover:-translate-y-0.5 hover:bg-brand-hover lg:ml-2"
        >
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#080d13] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 text-sm md:grid-cols-[1.3fr_0.7fr_0.7fr] md:px-8 md:py-16">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5 text-white">
            <Image src="/brand/isotipo.png" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-[10px]" />
            <p className="font-display text-base font-extrabold">SEOMOS AI CRM</p>
          </div>
          <p className="mt-4 leading-6 text-white/55">
            Conversaciones, prospectos, equipo e inteligencia artificial en una operación comercial que mantiene el contexto.
          </p>
          <a
            href="https://www.seomos.com/seomos-ai-crm/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 font-extrabold text-[#ff7a55] hover:underline"
          >
            Conocer el servicio de SEOMOS
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <nav className="flex flex-col items-start gap-3 text-white/55" aria-label="Producto">
          <p className="mb-1 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-white">Producto</p>
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-bold transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
          <Link href="/#google-calendar" className="font-bold transition-colors hover:text-white">
            Google Calendar
          </Link>
        </nav>

        <nav className="flex flex-col items-start gap-3 text-white/55" aria-label="Información legal">
          <p className="mb-1 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-white">SEOMOS</p>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-bold transition-colors hover:text-white">
              {link.label === "Privacidad" ? "Política de privacidad" : "Términos del servicio"}
            </Link>
          ))}
          <a href="mailto:info@seomos.com" className="font-bold transition-colors hover:text-white">
            info@seomos.com
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs font-bold text-white/35 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>© 2026 SEOMOS. Todos los derechos reservados.</p>
          <p>SEOMOS S.A.S. · SEOMOS LLC</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-[#080d13]">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

export function LegalPage({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-14 md:px-8 md:py-20">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">
            {eyebrow}
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-[-0.035em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-text-2">{summary}</p>
          <p className="mt-5 text-sm font-bold text-mute">Última actualización: 12 de agosto de 2026</p>
        </div>
      </section>
      <article className="legal-content mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        {children}
      </article>
    </PublicShell>
  );
}
