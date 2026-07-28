import { BriefcaseBusiness, UserRound } from "lucide-react";
import type { LeadAssignmentDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeadAssignmentBadges({
  service,
  assignee,
  className,
}: LeadAssignmentDto & { className?: string }) {
  if (!service) return null;

  return (
    <span
      data-testid="lead-assignment"
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
    >
      <span
        title={`Servicio: ${service.name}`}
        className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-tint px-2 py-[3px] text-[10.5px] font-bold text-brand"
      >
        <BriefcaseBusiness className="h-3 w-3 shrink-0" strokeWidth={2.2} />
        <span className="truncate">{service.name}</span>
      </span>
      <span
        title={
          assignee
            ? `Ejecutivo responsable: ${assignee.name}`
            : "Ejecutivo responsable: Sin asignar"
        }
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-bold",
          assignee ? "text-mute" : "border-dashed text-faint"
        )}
      >
        <UserRound className="h-3 w-3 shrink-0" strokeWidth={2.2} />
        <span className="truncate">{assignee?.name ?? "Sin asignar"}</span>
      </span>
    </span>
  );
}
