"use client";

import { usePathname } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { stripLocale, withLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

/**
 * Cambio lingua.
 *
 * La lingua è un prefisso di indirizzo (`/it/...`, `/en/...`): cambiarla cambia
 * l'indirizzo, e serve una navigazione completa, non una di quelle interne.
 * `<html lang>`, `canonical` e `hreflang` appartengono al documento: con una
 * navigazione interna resterebbero quelli della lingua precedente (provato), e
 * il titolo nella scheda del browser sarebbe sbagliato.
 *
 * Il cookie della preferenza lo riallinea il middleware all'indirizzo nuovo.
 */
export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  function change(next: Locale) {
    if (next === locale) return;

    const search = typeof window === "undefined" ? "" : window.location.search;
    window.location.assign(`${withLocale(next, stripLocale(pathname))}${search}`);
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-white/10 p-0.5 text-xs"
      role="group"
      aria-label="Language"
    >
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => change(item)}
          aria-pressed={item === locale}
          className={cn(
            "rounded-full px-2 py-1 font-medium uppercase transition-colors",
            item === locale ? "bg-white/10 text-white" : "text-muted hover:text-white"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
