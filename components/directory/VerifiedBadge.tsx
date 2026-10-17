import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

/**
 * Il badge "Verificato": dice che la scheda è di un profilo che OpenStage ha
 * controllato. Compare solo quando il fatto è vero (`profiles.verified_at`),
 * mai come decorazione.
 */
export default function VerifiedBadge({
  dict,
  className,
}: {
  dict: Dictionary["directory"];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-xs text-white",
        className
      )}
    >
      {dict.badgeVerified}
    </span>
  );
}
