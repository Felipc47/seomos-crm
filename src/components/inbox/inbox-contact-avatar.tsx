import { ContactAvatar } from "@/components/avatar";
import type { PhoneCountry } from "@/lib/phone-country";
import { cn } from "@/lib/utils";

export function InboxContactAvatar({
  name,
  seed,
  country,
  size = "md",
}: {
  name: string;
  seed: string;
  country: PhoneCountry | null;
  size?: "sm" | "md" | "lg";
}) {
  const flagSizes = {
    sm: "h-[11px] min-w-[15px] px-px text-[9px]",
    md: "h-[13px] min-w-[17px] px-px text-[10px]",
    lg: "h-[15px] min-w-[19px] px-[2px] text-[11px]",
  } as const;

  return (
    <span className="relative inline-flex shrink-0">
      <ContactAvatar name={name} seed={seed} size={size} />
      {country && (
        <span
          role="img"
          aria-label={`País: ${country.name}`}
          title={country.name}
          data-country-code={country.code}
          className={cn(
            "absolute bottom-0 left-[-2px] z-[1] inline-flex items-center justify-center rounded-[4px] border-[1.5px] border-surface bg-surface font-sans leading-none shadow-[0_1px_3px_rgba(11,11,13,0.22)]",
            flagSizes[size]
          )}
        >
          {country.flag}
        </span>
      )}
    </span>
  );
}
