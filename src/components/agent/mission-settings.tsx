"use client";

import Link from "next/link";
import { Target, Timer } from "lucide-react";
import { AGENT_MISSIONS, DEFAULT_WARMUP_MESSAGES, MAX_WARMUP_MESSAGES, type AgentMission } from "@/lib/agent-mission";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type MissionFormValue = {
  mission: AgentMission; missionDetails: string | null; ecommerceUrl: string | null;
  schedulingWarmupEnabled: boolean; schedulingWarmupMessages: number;
};

export function MissionSettings({ value, onChange }: { value: MissionFormValue; onChange: (patch: Partial<MissionFormValue>) => void }) {
  const countValid = Number.isInteger(value.schedulingWarmupMessages) && value.schedulingWarmupMessages >= 1 && value.schedulingWarmupMessages <= MAX_WARMUP_MESSAGES;
  return <section aria-label="Misión y ritmo del agente" data-help="agent-mission" className="space-y-5 rounded-xl border bg-surface-2/40 p-4">
    <div className="space-y-2">
      <Label htmlFor="agent-mission" className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-brand" />Misión principal</Label>
      <select id="agent-mission" className="flex h-11 w-full min-w-0 rounded-lg border bg-surface px-3 text-sm" value={value.mission} onChange={event => onChange({ mission: event.target.value as AgentMission })}>
        {AGENT_MISSIONS.map(mission => <option key={mission.id} value={mission.id}>{mission.label}</option>)}
      </select>
      <p className="text-xs leading-relaxed text-mute">{AGENT_MISSIONS.find(mission => mission.id === value.mission)?.description}</p>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="agent-mission-details">Detalles de la misión (opcional)</Label>
      <Textarea id="agent-mission-details" rows={3} maxLength={4000} value={value.missionDetails ?? ""} onChange={event => onChange({ missionDetails: event.target.value || null })} placeholder="Ej.: entender la necesidad, verificar el encaje y llevar al prospecto a una sesión de diagnóstico." />
    </div>
    {value.mission === "ecommerce" && <div className="space-y-1.5">
      <Label htmlFor="agent-store-url">Enlace de la tienda (opcional)</Label>
      <Input id="agent-store-url" type="url" value={value.ecommerceUrl ?? ""} onChange={event => onChange({ ecommerceUrl: event.target.value || null })} placeholder="https://tutienda.com" maxLength={2000} />
      <p className="text-xs leading-relaxed text-mute">Conecta catálogo, stock y pedidos en <Link href="/settings/ecommerce" className="underline">Ajustes → Ecommerce</Link>. Este enlace también permite orientar la compra cuando todavía no hay tienda conectada.</p>
    </div>}
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="agent-warmup-enabled" className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4 text-brand" />Esperar antes de proponer una cita</Label>
          <p className="text-xs leading-relaxed text-mute">Activa un mínimo de mensajes del bot antes de una propuesta proactiva de agendamiento.</p>
        </div>
        <Switch id="agent-warmup-enabled" checked={value.schedulingWarmupEnabled} onCheckedChange={checked => onChange({ schedulingWarmupEnabled: checked, schedulingWarmupMessages: countValid ? value.schedulingWarmupMessages : DEFAULT_WARMUP_MESSAGES })} aria-label="Esperar antes de proponer una cita" />
      </div>
      {value.schedulingWarmupEnabled && <div className="space-y-1.5">
        <Label htmlFor="agent-warmup-messages">Mensajes del bot antes de proponer una cita</Label>
        <Input id="agent-warmup-messages" type="number" min={1} max={MAX_WARMUP_MESSAGES} step={1} value={value.schedulingWarmupMessages} aria-invalid={!countValid} onChange={event => onChange({ schedulingWarmupMessages: Number(event.target.value) })} />
        {!countValid && <p role="alert" className="text-xs text-destructive">Escribe un número entero entre 1 y {MAX_WARMUP_MESSAGES}.</p>}
        {countValid && <p className="text-xs leading-relaxed text-mute">Después de {value.schedulingWarmupMessages} mensajes enviados por el bot, puede proponer la cita a partir de su respuesta {value.schedulingWarmupMessages + 1}. Una solicitud directa del cliente se atiende sin esperar este mínimo.</p>}
      </div>}
      {!value.schedulingWarmupEnabled && <p className="text-xs text-mute">Sin mínimo de mensajes: propone agendar cuando corresponda a su misión y entrenamiento.</p>}
    </div>
    <p className="text-xs text-mute">Puedes probar estos cambios en el chat demo y guardarlos con Guardar comportamiento.</p>
  </section>;
}
