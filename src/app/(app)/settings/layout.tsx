import { getSessionOrNull } from "@/lib/auth/session";
import { isOrgAdmin } from "@/lib/permissions";
import { SettingsNav } from "@/components/settings/settings-nav";
import Link from "next/link";

export default async function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionOrNull();
  const isAdmin = session ? isOrgAdmin(session.role) : false;
  return (
    <div className="flex h-full flex-col">
      <header className="crm-page-header">
        <p className="crm-eyebrow mb-2">Tu espacio de trabajo</p>
        <h2 className="crm-heading">Configuración</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <SettingsNav isAdmin={isAdmin} />
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-[34px] md:py-[26px]">
          <div className="mx-auto max-w-[900px]">
            {children}
            <nav className="mt-10 flex flex-wrap gap-4 border-t border-border pt-5 text-xs font-bold text-mute" aria-label="Información legal">
              <Link href="/privacy" className="hover:text-foreground hover:underline">Política de privacidad</Link>
              <Link href="/terms" className="hover:text-foreground hover:underline">Términos del servicio</Link>
              <a href="mailto:info@seomos.com" className="hover:text-foreground hover:underline">Contacto</a>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
