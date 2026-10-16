"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

/**
 * Selettore Schede / Tabella.
 *
 * Sono due link, non due stati locali: la scelta vive nella URL (`?vista=`),
 * quindi sopravvive alla paginazione, ai filtri e alla condivisione — e
 * funziona anche senza JavaScript.
 */
export default function ViewSwitcher({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("vista") === "table" ? "table" : "cards";

  const hrefFor = (view: "cards" | "table") => {
    const params = new URLSearchParams(searchParams.toString());

    if (view === "table") params.set("vista", "table");
    else params.delete("vista");

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const optionClass = (isActive: boolean) =>
    cn(
      "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
      isActive ? "bg-white/10 text-white" : "text-muted hover:text-white"
    );

  return (
    <div
      className="glass inline-flex items-center gap-1 rounded-full border border-white/10 p-1"
      role="group"
      aria-label={dict.showcase.viewLabel}
    >
      <Link
        href={hrefFor("cards")}
        scroll={false}
        aria-current={current === "cards" ? "true" : undefined}
        className={optionClass(current === "cards")}
      >
        {dict.showcase.viewCards}
      </Link>
      <Link
        href={hrefFor("table")}
        scroll={false}
        aria-current={current === "table" ? "true" : undefined}
        className={optionClass(current === "table")}
      >
        {dict.showcase.viewTable}
      </Link>
    </div>
  );
}
