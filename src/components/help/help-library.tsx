"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import { getHelpScreen, searchHelpGuides, type HelpGuide } from "@/lib/help-guides";

export function HelpLibrary({ guides, onSelect }: { guides: HelpGuide[]; onSelect: (guide: HelpGuide) => void }) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");
  const sections = useMemo(() => [...new Set(guides.map((guide) => guide.href))].map((href) => ({ href, title: getHelpScreen(href, guides).title })), [guides]);
  const matches = searchHelpGuides(query, guides).filter((guide) => !section || guide.href === section);
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="shrink-0 space-y-3 border-b px-4 py-3">
      <p className="text-xs leading-relaxed text-mute">Encuentra los pasos, requisitos y controles de las funciones que tienes disponibles.</p>
      <label className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5"><Search className="h-4 w-4 shrink-0 text-mute" aria-hidden /><span className="sr-only">Buscar funciones del CRM</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Exportar, notas, plantillas, horarios…" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-mute md:text-sm" /></label>
      <select aria-label="Filtrar guías por sección" value={section} onChange={(event) => setSection(event.target.value)} className="w-full rounded-lg border bg-surface px-2.5 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Todas las secciones · {guides.length} guías</option>{sections.map((item) => <option key={item.href} value={item.href}>{item.title}</option>)}</select>
    </div>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
      {matches.length === 0 && <p role="status" className="rounded-xl bg-surface-2 p-4 text-sm text-mute">No encontré una guía con esas palabras. Prueba una palabra más corta o usa Preguntar para describir lo que necesitas.</p>}
      {sections.filter((item) => matches.some((guide) => guide.href === item.href)).map((item) => <section key={item.href} aria-label={`Guías de ${item.title}`}>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-mute"><BookOpen className="h-3.5 w-3.5 text-brand" aria-hidden />{item.title}</h3>
        <div className="space-y-2">{matches.filter((guide) => guide.href === item.href).map((guide) => <button key={guide.id} type="button" aria-label={`Ver guía: ${guide.title}`} onClick={() => onSelect(guide)} className="flex w-full items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors hover:border-brand/40 hover:bg-brand/5 focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-5">{guide.title}</span><span className="mt-1 block text-xs leading-4 text-mute">{guide.steps.length} pasos{guide.requirements?.length ? " · requisitos incluidos" : ""}</span></span><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /></button>)}</div>
      </section>)}
    </div>
  </div>;
}
