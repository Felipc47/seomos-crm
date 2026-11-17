import { MessageCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChannelPill({ channel, compact = false }: { channel: "whatsapp" | "sms"; compact?: boolean }) {
  const sms = channel === "sms";
  const Icon = sms ? Smartphone : MessageCircle;
  return <span
    aria-label={`Canal ${sms ? "SMS" : "WhatsApp"}`}
    className={cn(
      "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold leading-4 tracking-[.025em] shadow-[0_2px_8px_rgba(0,0,0,.07)]",
      sms
        ? "border-orange-400/40 bg-gradient-to-r from-orange-500/20 to-amber-400/10 text-orange-800 dark:text-orange-200"
        : "border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-green-400/10 text-emerald-800 dark:text-emerald-200",
      !compact && "px-2.5 py-1 text-[11px]"
    )}
  >
    <Icon aria-hidden className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.2} />
    {sms ? "SMS" : "WhatsApp"}
  </span>;
}
