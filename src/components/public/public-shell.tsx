import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const legalLinks = [
  { href: "/privacy", label: "Privacidad" },
  { href: "/terms", label: "Términos" },
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 md:h-[72px] md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Seomos CRM, inicio">
          <Image
            src="/brand/isotipo.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-[10px]"
            priority
          />
          <span className="font-display text-[17px] font-extrabold tracking-tight">
            Seomos CRM
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-bold text-mute md:flex" aria-label="Navegación principal">
          <Link href="/#producto" className="transition-colors hover:text-foreground">
            Producto
          </Link>
          <Link href="/#google-calendar" className="transition-colors hover:text-foreground">
            Google Calendar
          </Link>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="ml-auto rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-accent transition-colors hover:bg-brand-hover md:ml-2"
        >
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-9 text-sm text-mute md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2.5 text-foreground">
          <Image src="/brand/isotipo.png" alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-lg" />
          <div>
            <p className="font-display font-extrabold">Seomos CRM</p>
            <p className="text-xs text-mute">CRM de WhatsApp con agente de IA</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Información legal">
          <Link href="/privacy" className="font-bold transition-colors hover:text-foreground">
            Política de privacidad
          </Link>
          <Link href="/terms" className="font-bold transition-colors hover:text-foreground">
            Términos del servicio
          </Link>
          <a href="mailto:ceo@seomos.com" className="font-bold transition-colors hover:text-foreground">
            ceo@seomos.com
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
