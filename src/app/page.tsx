import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  Bot,
  CalendarCheck2,
  Check,
  Kanban,
  LockKeyhole,
  MessageCircleMore,
  UsersRound,
} from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";

export const metadata: Metadata = {
  title: "Seomos CRM — Conversaciones, prospectos y reuniones en un solo lugar",
  description:
    "CRM de WhatsApp con agente de IA, pipeline comercial y agendamiento opcional mediante Google Calendar.",
};

const features = [
  {
    icon: MessageCircleMore,
    title: "Bandeja de WhatsApp",
    body: "Centraliza conversaciones, mensajes, archivos y contexto del prospecto para que el equipo atienda desde un solo lugar.",
  },
  {
    icon: Bot,
    title: "Agente de IA supervisable",
    body: "Responde con el conocimiento del negocio, detecta oportunidades y transfiere la conversación cuando se necesita una persona.",
  },
  {
    icon: Kanban,
    title: "Pipeline comercial",
    body: "Organiza prospectos por etapa, servicio y responsable para mantener visible cada oportunidad.",
  },
  {
    icon: UsersRound,
    title: "Trabajo en equipo",
    body: "Asigna conversaciones y prospectos, define roles y conserva el historial operativo de cada empresa.",
  },
  {
    icon: BellRing,
    title: "Notificaciones operativas",
    body: "Avisa sobre nuevos prospectos y resume semanalmente el panorama comercial de cada responsable y administrador.",
  },
  {
    icon: CalendarCheck2,
    title: "Reuniones coordinadas",
    body: "Consulta disponibilidad y crea eventos con invitados y Google Meet cuando el usuario conecta Google Calendar.",
  },
] as const;

export default function Home() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="pointer-events-none absolute -right-40 -top-56 h-[520px] w-[520px] rounded-full bg-brand-soft/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-brand-tint px-3 py-1.5 text-xs font-extrabold text-brand-text">
              <span className="h-2 w-2 rounded-full bg-brand" />
              CRM de WhatsApp para equipos comerciales
            </div>
            <h1 className="max-w-3xl font-display text-[42px] font-extrabold leading-[1.05] tracking-[-0.045em] md:text-6xl">
              Cada conversación, convertida en una oportunidad clara.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-2 md:text-xl">
              Seomos CRM reúne WhatsApp, prospectos, equipo, automatización y reuniones para que tu negocio responda mejor y dé seguimiento sin perder contexto.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-xl bg-brand px-5 py-3.5 text-center text-sm font-extrabold text-white shadow-accent transition-colors hover:bg-brand-hover"
              >
                Entrar a Seomos CRM
              </Link>
              <Link
                href="#google-calendar"
                className="rounded-xl border border-border-strong bg-surface px-5 py-3.5 text-center text-sm font-extrabold transition-colors hover:bg-surface-2"
              >
                Cómo usamos Google Calendar
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-mute">
              {["Self-hosted", "Datos cifrados", "Acceso por roles"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" strokeWidth={2.4} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-background p-3 shadow-pop">
            <div className="rounded-[22px] border border-border bg-surface p-5 md:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-text">Panorama comercial</p>
                  <p className="mt-1 font-display text-xl font-extrabold">Prospectos en movimiento</p>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold text-brand-text">En vivo</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  ["Nuevos", "18"],
                  ["En proceso", "11"],
                  ["Reuniones", "7"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-surface-2 p-3.5">
                    <p className="text-2xl font-extrabold">{value}</p>
                    <p className="mt-1 text-[11px] font-bold text-mute">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  ["Nueva conversación por WhatsApp", "Ahora", "bg-success"],
                  ["Reunión confirmada con Google Meet", "10:30", "bg-brand"],
                  ["Prospecto asignado al equipo comercial", "09:45", "bg-accent-2"],
                ].map(([label, time, color]) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-border px-3.5 py-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                    <p className="min-w-0 flex-1 text-sm font-bold">{label}</p>
                    <span className="text-xs font-bold text-mute">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">Producto</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
            Un sistema operativo para convertir conversaciones en clientes.
          </h2>
          <p className="mt-4 text-lg leading-8 text-text-2">
            La información vive en la instancia del negocio y cada organización mantiene su espacio y su equipo aislados.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[22px] border border-border bg-surface p-6 shadow-sm">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-text">
                <feature.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="font-display text-lg font-extrabold">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-6 text-text-2">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="google-calendar" className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="flex min-h-[300px] items-center justify-center rounded-[28px] bg-brand-tint p-8">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-[36px] border border-brand-soft bg-surface shadow-pop">
              <CalendarCheck2 className="h-20 w-20 text-brand" strokeWidth={1.45} />
              <span className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-md">
                <LockKeyhole className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">Integración opcional</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
              Google Calendar se usa únicamente para coordinar reuniones.
            </h2>
            <p className="mt-5 text-lg leading-8 text-text-2">
              Cuando una persona autorizada conecta su cuenta, Seomos CRM consulta los intervalos ocupados del calendario para evitar cruces y crea, a petición del usuario, eventos en su calendario principal con los invitados y un enlace de Google Meet.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-bold text-text-2">
              {[
                "La conexión es voluntaria y puede revocarse en cualquier momento.",
                "Los tokens OAuth se almacenan cifrados y no se muestran en el navegador.",
                "Los datos de Google no se venden, no se usan para publicidad ni para entrenar modelos de IA.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.4} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/privacy#google" className="mt-7 inline-flex font-extrabold text-brand-text hover:underline">
              Leer cómo tratamos los datos de Google →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 text-center md:px-8 md:py-24">
        <div className="rounded-[28px] bg-foreground px-6 py-12 text-background md:px-12 md:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Tu operación comercial, sin perder el hilo.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-70">
            Accede a la instancia de Seomos CRM de tu empresa para gestionar conversaciones, prospectos y reuniones.
          </p>
          <Link href="/login" className="mt-7 inline-flex rounded-xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white shadow-accent hover:bg-brand-hover">
            Iniciar sesión
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
