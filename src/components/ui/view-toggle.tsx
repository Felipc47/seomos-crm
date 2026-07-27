"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewOption<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: readonly ViewOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center rounded-[10px] border bg-surface-2 p-1",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`Vista ${option.label}`}
            aria-pressed={active}
            title={`Vista ${option.label}`}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] px-2.5 text-[12px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-mute hover:text-foreground"
            )}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={2.1} aria-hidden />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
