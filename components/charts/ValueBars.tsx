import LocaleLink from "@/components/i18n/LocaleLink";
import { cn } from "@/lib/utils";

export type BarItem = {
  key: string;
  label: string;
  meta?: string | null;
  value: number;
  href?: string;
};

/**
 * Classifica essenziale: etichetta, numero, filo colorato proporzionale.
 * Niente card e niente percentuali: il valore vero è scritto accanto.
 */
export default function ValueBars({
  items,
  accent = "cyan",
  emptyLabel,
  className,
}: {
  items: BarItem[];
  accent?: "cyan" | "violet" | "pink";
  emptyLabel?: string;
  className?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const color =
    accent === "violet" ? "bg-violet" : accent === "pink" ? "bg-pink" : "bg-cyan";

  if (items.length === 0) {
    return emptyLabel ? (
      <p className={cn("border-t border-line pt-4 text-sm text-muted", className)}>{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className={cn("border-t border-line", className)}>
      {items.map((item) => {
        const label = (
          <span className="text-sm text-white transition-colors group-hover:text-cyan">
            {item.label}
          </span>
        );

        return (
          <li key={item.key} className="border-b border-line py-3">
            <div className="flex items-baseline justify-between gap-4">
              {item.href ? (
                <LocaleLink href={item.href} className="group min-w-0">
                  {label}
                </LocaleLink>
              ) : (
                <span className="min-w-0 truncate">{label}</span>
              )}
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                {item.value}
              </span>
            </div>

            {item.meta ? (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {item.meta}
              </p>
            ) : null}

            <div className="mt-2 h-0.5 w-full bg-line" aria-hidden="true">
              <div
                className={cn("h-full", color)}
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
