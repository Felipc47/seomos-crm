"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export type AgentAvailability = {
  enabled: boolean;
  aiConfigured: boolean;
};

export function AiConversationSwitch({
  active,
  ready,
  loading = false,
  busy = false,
  onCheckedChange,
}: {
  active: boolean;
  ready: boolean;
  loading?: boolean;
  busy?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Switch
      size="sm"
      checked={active}
      disabled={loading || busy || !ready}
      aria-label="IA en esta conversación"
      onCheckedChange={onCheckedChange}
    />
  );
}

export function AiConversationHeaderControl({
  active,
  availability,
  busy,
  onCheckedChange,
}: {
  active: boolean;
  availability: AgentAvailability | null;
  busy: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const loading = availability === null;
  const ready = Boolean(
    availability?.enabled && availability.aiConfigured
  );
  const label = loading
    ? "Consultando IA"
    : !ready
      ? "IA no disponible"
      : busy
        ? "Actualizando IA"
        : active
          ? "IA activa"
          : "IA pausada";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-[10px] border px-2 py-1.5 transition-colors",
        active && ready
          ? "border-[rgba(37,211,102,.3)] bg-[rgba(37,211,102,.08)]"
          : "bg-surface-2"
      )}
      title={label}
      data-testid="chat-ai-control"
    >
      <Sparkles
        className={cn(
          "h-4 w-4 shrink-0",
          active && ready ? "text-brand-text" : "text-mute"
        )}
        strokeWidth={2}
      />
      <span
        className={cn(
          "hidden whitespace-nowrap text-xs font-bold xl:inline",
          active && ready ? "text-brand-text" : "text-mute"
        )}
      >
        {label}
      </span>
      <AiConversationSwitch
        active={active}
        ready={ready}
        loading={loading}
        busy={busy}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
