import type { Metadata } from "next";
import localFont from "next/font/local";
import { accentCssVariables, DEFAULT_BRANDING } from "@/lib/branding";
import { getBranding } from "@/server/branding";
import "./globals.css";

// Fuente variable local: misma tipografía en toda la interfaz, sin CDN ni
// descarga de fuentes durante el build. Licencia en fonts/OFL-Manrope.txt.
const manrope = localFont({
  src: "./fonts/manrope.ttf",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  return {
    metadataBase: new URL("https://seomos.cloud"),
    applicationName: "SEOMOS AI CRM",
    title: {
      default: `${branding.name} — CRM de WhatsApp con IA`,
      template: `%s | ${branding.name}`,
    },
    description:
      "Centraliza conversaciones de WhatsApp, prospectos, equipo, pipeline e IA supervisable en una sola operación comercial.",
    authors: [{ name: "SEOMOS", url: "https://www.seomos.com/" }],
    creator: "SEOMOS",
    publisher: "SEOMOS",
    category: "business software",
    referrer: "origin-when-cross-origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

// Anti-flash de tema: aplica la clase `dark` antes del primer paint según la
// preferencia explícita guardada. Una sesión nueva siempre comienza en claro.
const themeScript = `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('seomos.theme')==='dark');}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  // Solo inyectamos el acento cuando es personalizado; con el default dejamos
  // que globals.css maneje el matiz de acento en claro y oscuro.
  const customAccent = branding.accent !== DEFAULT_BRANDING.accent;
  return (
    <html lang="es" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {customAccent && (
          <style
            dangerouslySetInnerHTML={{
              __html: accentCssVariables(branding.accent),
            }}
          />
        )}
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
