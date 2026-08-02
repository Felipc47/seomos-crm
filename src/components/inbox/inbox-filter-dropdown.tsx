"use client";

import { useEffect, useRef } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InboxFilterOption = {
  value: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
  disabled?: boolean;
};

export function InboxFilterDropdown({
  id,
  label,
  ariaLabel,
  value,
  defaultValue,
  options,
  open,
  align,
  onOpenChange,
  onChange,
}: {
  id: string;
  label: string;
  ariaLabel: string;
  value: string;
  defaultValue: string;
  options: InboxFilterOption[];
  open: boolean;
  align: "left" | "right";
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const active = value !== defaultValue;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      triggerRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!selected) return null;

  return (
    <div className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "group flex h-[50px] w-full min-w-0 items-center gap-2 rounded-xl border bg-surface-2 px-2.5 text-left transition-all hover:border-foreground/15 hover:bg-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft",
          open && "border-brand/40 bg-background ring-[3px] ring-brand-soft",
          active && !open && "border-brand/25 bg-brand-tint/55"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border bg-surface text-mute shadow-sm transition-colors",
            active && "border-brand/20 text-brand"
          )}
        >
          {selected.icon ? (
            <selected.icon className="h-4 w-4" strokeWidth={2.1} />
          ) : (
            <span
              className="h-2.5 w-2.5 rounded-full ring-4 ring-black/[.035]"
              style={{ backgroundColor: selected.color ?? "#8B93A1" }}
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] font-extrabold uppercase tracking-[.08em] text-faint">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] font-bold text-foreground">
            {selected.shortLabel ?? selected.label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-faint transition-transform duration-200",
            open && "rotate-180 text-brand"
          )}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            role="presentation"
            onClick={() => onOpenChange(false)}
          />
          <div
            id={`${id}-menu`}
            role="menu"
            aria-label={ariaLabel}
            className={cn(
              "absolute top-full z-30 mt-2 w-[calc(200%+0.5rem)] overflow-hidden rounded-2xl border bg-surface p-1.5 shadow-[0_18px_50px_rgba(24,20,15,.16)] animate-[fade-in_.12s_ease]",
              align === "left" ? "left-0" : "right-0"
            )}
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-[.09em] text-faint">
              Filtrar por {label.toLowerCase()}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {options.map((option) => {
                const OptionIcon = option.icon;
                const checked = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-label={option.label}
                    aria-checked={checked}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      onOpenChange(false);
                      triggerRef.current?.focus();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-40",
                      checked && "bg-brand-tint"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border bg-surface-2 text-mute",
                        checked && "border-brand/20 bg-surface text-brand"
                      )}
                    >
                      {OptionIcon ? (
                        <OptionIcon className="h-4 w-4" strokeWidth={2} />
                      ) : (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: option.color ?? "#8B93A1" }}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="mt-0.5 block truncate text-[10.5px] text-mute">
                          {option.description}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                        checked ? "bg-brand text-white" : "text-transparent"
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={2.8} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
