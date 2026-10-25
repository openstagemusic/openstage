import { cn } from "@/lib/utils";

/**
 * La spunta "Verificato".
 *
 * Un cerchio neon con la spunta, non un'etichetta quadrata: si riconosce a
 * colpo d'occhio anche in una card piccola. Il testo resta per screen reader e
 * tooltip, così il significato non si perde.
 */
export default function VerifiedBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
        "bg-[linear-gradient(135deg,#22D3EE_0%,#8B5CF6_100%)] text-white",
        "shadow-[0_0_14px_rgba(34,211,238,0.45)] ring-1 ring-white/30",
        className
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="m5 12.5 4.2 4.2L19 6.8" />
      </svg>
    </span>
  );
}
