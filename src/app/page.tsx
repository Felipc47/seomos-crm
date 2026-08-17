import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Bot,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  FileInput,
  Inbox,
  Kanban,
  LockKeyhole,
  MessageCircleMore,
  MessagesSquare,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  Workflow,
} from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";

const serviceUrl = "https://www.seomos.com/seomos-ai-crm/";

export const metadata: Metadata = {
  title: {
    absolute: "CRM de WhatsApp con IA | SEOMOS AI CRM",
  },
  description:
    "Centraliza conversaciones de WhatsApp, asigna prospectos, automatiza seguimientos con IA supervisable y gestiona tu pipeline comercial.",
  keywords: [
    "CRM de WhatsApp",
    "WhatsApp Business CRM",
    "CRM con inteligencia artificial",
    "automatización de WhatsApp",
    "bandeja compartida de WhatsApp",
    "pipeline comercial",
    "gestión de prospectos",
    "SEOMOS AI CRM",
  ],
  alternates: {
    canonical: "https://seomos.cloud/",
    languages: {
      "es-CO": "https://seomos.cloud/",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "CRM de WhatsApp con IA | SEOMOS AI CRM",
    description:
      "Centraliza conversaciones, prospectos, equipo, pipeline e IA supervisable en una sola operación comercial.",
    url: "https://seomos.cloud/",
    siteName: "SEOMOS AI CRM",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "https://seomos.cloud/og.png",
        width: 1200,
        height: 630,
        alt: "SEOMOS AI CRM — Convierte conversaciones en oportunidades",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CRM de WhatsApp con IA | SEOMOS AI CRM",
    description: "Bandeja compartida, pipeline e inteligencia artificial supervisable en un solo CRM de WhatsApp.",
    images: ["https://seomos.cloud/og.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.seomos.com/#organization",
      name: "SEOMOS",
      url: "https://www.seomos.com/",
      logo: "https://seomos.cloud/brand/seomos-logo.png",
      email: "info@seomos.com",
    },
    {
      "@type": "WebSite",
      "@id": "https://seomos.cloud/#website",
      url: "https://seomos.cloud/",
      name: "SEOMOS AI CRM",
      inLanguage: "es-CO",
      publisher: { "@id": "https://www.seomos.com/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://seomos.cloud/#software",
      name: "SEOMOS AI CRM",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Customer Relationship Management",
      operatingSystem: "Web",
      url: "https://seomos.cloud/",
      description:
        "CRM de WhatsApp con bandeja compartida, pipeline comercial, gestión de prospectos e inteligencia artificial supervisable.",
      provider: { "@id": "https://www.seomos.com/#organization" },
      featureList: [
        "Bandeja compartida de WhatsApp",
        "Pipeline comercial",
        "Inteligencia artificial supervisable",
        "Asignación de conversaciones y prospectos",
        "Formularios conectados",
        "Integración opcional con Google Calendar",
      ],
    },
  ],
};

const capabilities = [
  {
    icon: MessagesSquare,
    title: "Bandeja compartida",
    body: "Todo el equipo trabaja sobre las conversaciones de WhatsApp con historial, archivos y contexto del prospecto.",
  },
  {
    icon: Bot,
    title: "IA que puedes supervisar",
    body: "Actívala, páusala o transfiere el chat a una persona sin perder el hilo ni la información ya recopilada.",
  },
  {
    icon: Kanban,
    title: "Pipeline comercial",
    body: "Visualiza cada oportunidad por etapa, servicio y responsable para saber qué avanza y qué requiere atención.",
  },
  {
    icon: UsersRound,
    title: "Asignación y equipo",
    body: "Distribuye conversaciones y prospectos, define roles y mantiene clara la responsabilidad de cada seguimiento.",
  },
  {
    icon: FileInput,
    title: "Formularios conectados",
    body: "Convierte solicitudes del sitio web en contactos y conversaciones listas para atender desde el mismo CRM.",
  },
  {
    icon: BellRing,
    title: "Alertas operativas",
    body: "Mantén al equipo informado sobre nuevos leads y recibe resúmenes que ayudan a priorizar la gestión comercial.",
  },
] as const;

const workflowSteps = [
  {
    number: "01",
    icon: Inbox,
    title: "La conversación entra con contexto",
    body: "WhatsApp y formularios alimentan una bandeja central con contacto, servicio de interés e historial.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "La IA atiende y califica",
    body: "El agente usa el conocimiento del negocio, detecta intención y escala cuando la intervención humana agrega valor.",
  },
  {
    number: "03",
    icon: UserRoundCheck,
    title: "El equipo avanza la oportunidad",
    body: "El prospecto queda asignado, visible en el pipeline y preparado para seguimiento o agendamiento.",
  },
] as const;

const conversations = [
  { initials: "P1", name: "Prospecto 001", preview: "Quisiera conocer el servicio...", time: "Ahora", active: true },
  { initials: "P2", name: "Prospecto 002", preview: "¿Podemos agendar una reunión?", time: "8 min", active: false },
  { initials: "P3", name: "Prospecto 003", preview: "Gracias por la información", time: "24 min", active: false },
] as const;

function ProductPreview() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute -inset-8 rounded-full bg-brand-soft blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white text-[#0b0d12] shadow-[0_32px_90px_-36px_rgba(0,0,0,0.9)]">
        <div className="flex h-11 items-center gap-2 border-b border-black/[0.08] bg-[#f4f6f8] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff725e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f2bd45]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#44bd68]" />
          <div className="mx-auto rounded-lg border border-black/[0.08] bg-white px-12 py-1 text-[9px] font-extrabold text-[#7a8390]">
            seomos.cloud/inbox
          </div>
        </div>

        <div className="grid min-h-[430px] grid-cols-[62px_1fr] bg-[#f4f6f8] sm:grid-cols-[132px_1fr]">
          <aside className="border-r border-black/[0.08] bg-white p-2.5 sm:p-3">
            <div className="mb-5 flex items-center gap-2 px-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground text-xs font-black text-background">S</div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black leading-tight">SEOMOS</p>
                <p className="text-[7px] font-bold text-mute">CRM · WhatsApp</p>
              </div>
            </div>
            <div className="space-y-1.5 text-[9px] font-extrabold text-[#69717d]">
              {[
                [Kanban, "Dashboard", false],
                [Inbox, "Bandeja", true],
                [Workflow, "Pipeline", false],
                [CircleUserRound, "Contactos", false],
                [Bot, "Agente", false],
              ].map(([Icon, label, active]) => {
                const MockIcon = Icon as typeof Inbox;
                return (
                  <div
                    key={label as string}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2.5 ${active ? "bg-brand text-white shadow-accent" : ""}`}
                  >
                    <MockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span className="hidden sm:inline">{label as string}</span>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 bg-white">
            <div className="flex h-14 items-center justify-between border-b border-black/[0.08] px-4">
              <div>
                <p className="font-display text-[13px] font-extrabold">Bandeja</p>
                <p className="text-[8px] font-bold text-mute">Conversaciones del equipo</p>
              </div>
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-[8px] font-black text-success">IA activa</span>
            </div>
            <div className="grid h-[376px] sm:grid-cols-[0.76fr_1.24fr]">
              <div className="hidden border-r border-border p-3 sm:block">
                <div className="mb-3 rounded-lg bg-[#f4f6f8] px-3 py-2 text-[8px] font-bold text-[#7a8390]">Buscar conversación...</div>
                <div className="space-y-1.5">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.name}
                      className={`rounded-xl border p-2.5 ${conversation.active ? "border-brand bg-[#fff3ef]" : "border-transparent"}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[8px] font-black text-background">
                          {conversation.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[9px] font-black">{conversation.name}</p>
                            <span className="text-[7px] font-bold text-mute">{conversation.time}</span>
                          </div>
                          <p className="mt-1 truncate text-[7px] font-bold text-mute">{conversation.preview}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-w-0 flex-col bg-[#f4f6f8]">
                <div className="flex items-center justify-between border-b border-black/[0.08] bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-2 text-[8px] font-black text-white">P1</span>
                    <div>
                      <p className="text-[9px] font-black">Prospecto 001</p>
                      <p className="text-[7px] font-bold text-success">En línea</p>
                    </div>
                  </div>
                  <span className="rounded-lg border border-black/[0.09] bg-white px-2 py-1 text-[7px] font-black">Ver detalles</span>
                </div>
                <div className="flex-1 space-y-2.5 p-3.5">
                  <div className="max-w-[84%] rounded-2xl rounded-tl-md bg-white px-3 py-2.5 text-[8px] font-bold leading-4 shadow-sm">
                    Hola, quiero conocer cómo pueden ayudarme a organizar los contactos que llegan por WhatsApp.
                  </div>
                  <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-bubble-out px-3 py-2.5 text-[8px] font-bold leading-4 text-bubble-out-text shadow-sm">
                    Claro. Centralizamos las conversaciones, calificamos cada oportunidad y dejamos el seguimiento visible para tu equipo.
                  </div>
                  <div className="ml-auto flex w-fit items-center gap-1.5 rounded-full border border-brand-soft bg-brand-tint px-2.5 py-1 text-[7px] font-black text-brand-text">
                    <Sparkles className="h-2.5 w-2.5" /> Respuesta asistida por IA
                  </div>
                </div>
                <div className="border-t border-black/[0.08] bg-white p-3">
                  <div className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-[#f4f6f8] px-3 py-2.5 text-[8px] font-bold text-[#7a8390]">
                    Escribe un mensaje...
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-2 flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white px-3.5 py-3 text-[#0b0d12] shadow-pop sm:-left-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-black">Nueva oportunidad</p>
          <p className="text-[8px] font-bold text-mute">Contexto actualizado</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="public-hero-grid relative overflow-hidden bg-[#080d13] text-white">
        <div className="pointer-events-none absolute -left-52 top-1/3 h-[480px] w-[480px] rounded-full bg-[#5b358b]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 -top-56 h-[560px] w-[560px] rounded-full bg-brand/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-5 pb-24 pt-16 md:px-8 md:pb-28 md:pt-24 lg:grid-cols-[0.93fr_1.07fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3.5 py-2 text-xs font-extrabold text-[#ff8b67]">
              <span className="h-2 w-2 rounded-full bg-brand" />
              CRM de WhatsApp · IA supervisable
            </div>
            <h1 className="max-w-3xl font-display text-[43px] font-extrabold leading-[1.03] tracking-[-0.052em] sm:text-5xl md:text-6xl lg:text-[64px]">
              Convierte cada conversación en una oportunidad que avanza.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62 md:text-xl">
              SEOMOS AI CRM reúne la bandeja de WhatsApp, los prospectos, tu equipo y una IA supervisable para responder, organizar y dar seguimiento sin perder el contexto.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={serviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white shadow-accent transition-all hover:-translate-y-0.5 hover:bg-brand-hover"
              >
                Solicitar una demostración
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/[0.055] px-5 py-3.5 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-sm font-bold text-white/52">
              {["IA supervisable", "Pipeline compartido", "Datos protegidos"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" strokeWidth={2.5} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#0d131b]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-black/[0.08] px-5 dark:bg-white/10 md:grid-cols-4 md:px-8">
          {[
            [MessageCircleMore, "Conversaciones", "Una bandeja, todo el contexto"],
            [Bot, "Inteligencia artificial", "Automatización con control humano"],
            [Kanban, "Oportunidades", "Pipeline visible para el equipo"],
            [CalendarCheck2, "Reuniones", "Agenda conectada cuando la necesitas"],
          ].map(([Icon, title, body]) => {
            const ProofIcon = Icon as typeof Inbox;
            return (
              <div key={title as string} className="bg-white px-4 py-7 text-center dark:bg-[#0d131b] md:px-6 md:py-8">
                <ProofIcon className="mx-auto h-5 w-5 text-brand" strokeWidth={2} />
                <p className="mt-3 font-display text-sm font-extrabold">{title as string}</p>
                <p className="mx-auto mt-1 max-w-[210px] text-xs font-bold leading-5 text-[#69717d] dark:text-white/45">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="flujo" className="mx-auto max-w-7xl bg-white px-5 py-20 dark:bg-[#080d13] md:px-8 md:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">Cómo funciona</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-5xl">
              Del primer mensaje al siguiente paso, sin saltos de información.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-text-2 lg:justify-self-end">
            El CRM conecta atención, calificación y seguimiento para que cada conversación deje una oportunidad accionable en manos del equipo correcto.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <article key={step.number} className="group relative overflow-hidden rounded-[24px] border border-black/[0.08] bg-[#f5f7fa] p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-black/15 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-[#111821] dark:hover:bg-[#151d27]">
              <span className="absolute right-5 top-3 font-display text-6xl font-extrabold text-brand-tint transition-colors group-hover:text-brand-soft">
                {step.number}
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <step.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="relative mt-8 font-display text-xl font-extrabold">{step.title}</h3>
              <p className="relative mt-3 text-sm leading-6 text-text-2">{step.body}</p>
              <div className="relative mt-7 h-1.5 overflow-hidden rounded-full bg-[#e5e8ec] dark:bg-white/10">
                <div className="h-full rounded-full bg-brand transition-all duration-500 group-hover:w-full" style={{ width: `${Number(step.number) * 28}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="capacidades" className="border-y border-black/[0.08] bg-[#f2f4f7] dark:border-white/10 dark:bg-[#0d131b]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">Capacidades</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-5xl">
              Todo lo necesario para atender mejor y convertir con método.
            </h2>
            <p className="mt-5 text-lg leading-8 text-text-2">
              Menos herramientas aisladas. Más claridad para que marketing, ventas y atención trabajen sobre la misma historia.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability, index) => (
              <article
                key={capability.title}
                className={`rounded-[24px] border p-7 transition-all hover:-translate-y-1 hover:shadow-md ${index === 1 ? "border-[#111821] bg-[#111821] text-white" : "border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#151d27]"}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 1 ? "bg-brand text-white" : "bg-brand-tint text-brand-text"}`}>
                  <capability.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-6 font-display text-xl font-extrabold">{capability.title}</h3>
                <p className={`mt-3 text-sm leading-6 ${index === 1 ? "text-white/62" : "text-text-2"}`}>{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#0b1017] text-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-extrabold text-[#ff8b67]">
              <Sparkles className="h-3.5 w-3.5" />
              Inteligencia artificial con supervisión
            </div>
            <h2 className="mt-5 max-w-2xl font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-5xl">
              Automatiza la atención sin entregar el control de tu operación.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">
              La IA trabaja con el conocimiento del negocio, recoge contexto y propone el siguiente paso. Tu equipo decide cuándo interviene, cuándo se pausa y quién recibe cada conversación.
            </p>
            <ul className="mt-8 space-y-4 text-sm font-bold text-white/78">
              {[
                "Activación independiente por conversación.",
                "Transferencia a una persona sin perder el historial.",
                "Reglas y conocimiento configurables por empresa.",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff6842]/15 text-[#ff8b67]">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl sm:p-6">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#5b358b]/35 blur-3xl" />
            <div className="relative rounded-[22px] border border-white/10 bg-[#101720] p-5 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5b358b]">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-extrabold">Control de la conversación</p>
                    <p className="mt-1 text-xs font-bold text-white/42">Prospecto 001 · Servicio principal</p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-[#3ebd6b]/12 px-3 py-1.5 text-xs font-extrabold text-[#61d68d]">IA activa</span>
              </div>
              <div className="grid gap-3 py-5 sm:grid-cols-3">
                {[
                  ["Estado", "Calificando", "text-[#ff8b67]"],
                  ["Intención", "Alta", "text-[#61d68d]"],
                  ["Responsable", "Equipo comercial", "text-white"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/35">{label}</p>
                    <p className={`mt-2 text-sm font-extrabold ${tone}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[#5b358b]/30 bg-[#5b358b]/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b692ee]" />
                  <div>
                    <p className="text-xs font-extrabold text-[#d4c2f2]">Siguiente acción sugerida</p>
                    <p className="mt-1.5 text-sm leading-6 text-white/65">Confirmar necesidad, compartir el alcance y proponer una reunión con el responsable comercial.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-extrabold">
                  <UserRoundCheck className="h-4 w-4" /> Transferir al equipo
                </span>
                <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-extrabold">
                  <Bot className="h-4 w-4" /> Mantener IA activa
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="seguridad" className="mx-auto max-w-7xl bg-white px-5 py-20 dark:bg-[#080d13] md:px-8 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">Servicio gestionado y seguro</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-5xl">
              Seguridad operativa sin cargarla sobre tu equipo.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-text-2">
              SEOMOS gestiona la plataforma, sus actualizaciones y la operación técnica. Tu equipo se concentra en atender y vender, con aislamiento por empresa, permisos por rol y credenciales protegidas.
            </p>
            <Link href="/privacy" className="mt-7 inline-flex items-center gap-2 font-extrabold text-brand-text hover:underline">
              Revisar nuestra política de privacidad
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [ServerCog, "Plataforma gestionada", "SEOMOS administra la operación técnica y las actualizaciones del servicio."],
              [LockKeyhole, "Credenciales cifradas", "Los secretos de integraciones se protegen y nunca se muestran completos en el navegador."],
              [UsersRound, "Acceso por roles", "Cada persona ve y administra únicamente lo que necesita para su función."],
              [ShieldCheck, "Espacios aislados", "Los datos de cada empresa se mantienen separados en todas las consultas del dominio."],
            ].map(([Icon, title, body]) => {
              const SecurityIcon = Icon as typeof ShieldCheck;
              return (
                <article key={title as string} className="rounded-[22px] border border-black/[0.08] bg-[#f5f7fa] p-6 shadow-sm dark:border-white/10 dark:bg-[#111821]">
                  <SecurityIcon className="h-6 w-6 text-brand" strokeWidth={1.8} />
                  <h3 className="mt-5 font-display text-lg font-extrabold">{title as string}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-text-2">{body as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="google-calendar" className="border-y border-black/[0.08] bg-[#f2f4f7] dark:border-white/10 dark:bg-[#0d131b]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="relative min-h-[340px] overflow-hidden rounded-[28px] border border-black/[0.08] bg-[#111821] p-8 dark:border-white/10">
            <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-brand/25 blur-3xl" />
            <div className="relative mx-auto flex max-w-[360px] flex-col rounded-[24px] border border-white/10 bg-white p-5 text-[#0b0d12] shadow-pop">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
                    <CalendarCheck2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-extrabold">Agenda comercial</p>
                    <p className="text-xs font-bold text-mute">Disponibilidad conectada</p>
                  </div>
                </div>
                <LockKeyhole className="h-4 w-4 text-success" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["09:00", "10:30", "15:00"].map((time, index) => (
                  <span key={time} className={`rounded-xl px-2 py-3 text-center text-xs font-extrabold ${index === 1 ? "bg-brand text-white" : "bg-[#f1f3f6] text-[#69717d]"}`}>
                    {time}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-border p-4">
                <p className="text-xs font-extrabold">Reunión de diagnóstico</p>
                <p className="mt-1 text-[11px] font-bold text-mute">Prospecto 001 · Google Meet</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-extrabold text-success">
                  <Check className="h-3 w-3" /> Confirmada
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-text">Integración opcional</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-5xl">
              Del chat a una reunión confirmada, sin cruces de agenda.
            </h2>
            <p className="mt-5 text-lg leading-8 text-text-2">
              Cuando una persona autorizada conecta Google Calendar, el CRM consulta disponibilidad y crea, únicamente cuando se solicita, eventos con invitados y enlace de Google Meet.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-bold text-text-2">
              {[
                "La conexión es voluntaria y puede revocarse en cualquier momento.",
                "Los tokens OAuth se almacenan cifrados y no se exponen al navegador.",
                "Los datos de Google no se usan para publicidad ni para entrenar modelos.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/privacy#google" className="mt-7 inline-flex items-center gap-2 font-extrabold text-brand-text hover:underline">
              Cómo tratamos los datos de Google
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl bg-white px-5 py-20 dark:bg-[#080d13] md:px-8 md:py-28">
        <div className="relative overflow-hidden rounded-[30px] bg-foreground px-6 py-14 text-background sm:px-10 md:px-16 md:py-20">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-accent-2/35 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff8b67]">SEOMOS AI CRM</p>
              <h2 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-5xl">
                Tu operación comercial puede crecer sin perder el hilo.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-background/65">
                Conoce cómo la bandeja, el pipeline y la IA supervisable se adaptan a tu proceso de atención y ventas.
              </p>
            </div>
            <div className="flex min-w-[260px] flex-col gap-3">
              <a
                href={serviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white shadow-accent transition-all hover:-translate-y-0.5 hover:bg-brand-hover"
              >
                Solicitar una demostración
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-background/20 bg-background/5 px-5 py-3.5 text-sm font-extrabold transition-colors hover:bg-background/10"
              >
                Iniciar sesión
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
