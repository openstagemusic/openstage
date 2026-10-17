"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RADIUS_OPTIONS, WHEN_PRESETS, type Center } from "@/lib/events/filters";
import { EVENT_KINDS } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

import { useScrollAnchor } from "./useScrollAnchor";

type QuickFiltersProps = {
  locale: Locale;
  /** Generi realmente presenti negli eventi pubblicati. */
  genres: string[];
  /** Posizione approssimativa del visitatore: centro del filtro per distanza. */
  center: Center | null;
  className?: string;
};

/**
 * Filtri rapidi.
 *
 * Ogni filtro scrive nella URL: la lista e la mappa leggono gli stessi
 * `searchParams`, quindi restano sempre allineate e il risultato è
 * condivisibile.
 */
export default function QuickFilters({
  locale,
  genres,
  center,
  className,
}: QuickFiltersProps) {
  const dict = getDictionary(locale);
  const t = dict.filters;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rememberScroll = useScrollAnchor();

  const when = searchParams.get("when");
  const genre = searchParams.get("genre") ?? "";
  const kind = searchParams.get("kind") ?? "";
  const radius = searchParams.get("radius") ?? "";
  const freeOnly = searchParams.get("free") === "1";
  const active = Boolean(when || genre || kind || radius || freeOnly);

  const apply = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, val] of Object.entries(patch)) {
      if (val === null || val === "") params.delete(key);
      else params.set(key, val);
    }

    params.delete("page");

    const query = params.toString();
    rememberScroll();
    // `scroll: false`: la lista è appena sotto i filtri, la pagina non deve saltare.
    router.push(query ? `${withLocale(locale, pathname)}?${query}` : withLocale(locale, pathname), {
      scroll: false,
    });
  };

  const chipClass = (isActive: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
      isActive
        ? "border-transparent bg-gradient-to-r from-violet to-cyan text-white"
        : "border-white/15 text-muted hover:border-white/30 hover:text-white"
    );

  const selectClass =
    "rounded-full border border-white/15 bg-bg/70 px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:border-white/30";

  return (
    <div className={cn("glass rounded-3xl border border-white/10 p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {WHEN_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={when === preset}
            onClick={() => apply({ when: when === preset ? null : preset })}
            className={chipClass(when === preset)}
          >
            {t.when[preset]}
          </button>
        ))}

        <button
          type="button"
          aria-pressed={freeOnly}
          onClick={() => apply({ free: freeOnly ? null : "1" })}
          className={chipClass(freeOnly)}
        >
          {t.free}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="filtro-genere">
          {t.genre}
        </label>
        <select
          id="filtro-genere"
          value={genre}
          onChange={(event) => apply({ genre: event.target.value || null })}
          className={selectClass}
        >
          <option value="">{t.genreAll}</option>
          {genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filtro-tipo">
          {t.kind}
        </label>
        <select
          id="filtro-tipo"
          value={kind}
          onChange={(event) => apply({ kind: event.target.value || null })}
          className={selectClass}
        >
          <option value="">{t.kindAll}</option>
          {EVENT_KINDS.map((item) => (
            <option key={item} value={item}>
              {dict.events.kinds[item]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filtro-distanza">
          {t.radius}
        </label>
        <select
          id="filtro-distanza"
          value={radius}
          disabled={!center}
          title={center ? undefined : t.radiusNeedsCenter}
          onChange={(event) => {
            const value = event.target.value;

            if (!value || !center) {
              apply({ radius: null, lat: null, lng: null });
              return;
            }

            // Il centro entra nella URL: il filtro resta condivisibile.
            apply({
              radius: value,
              lat: center.latitude.toFixed(4),
              lng: center.longitude.toFixed(4),
            });
          }}
          className={cn(selectClass, !center && "cursor-not-allowed opacity-50")}
        >
          <option value="">{t.radiusAll}</option>
          {RADIUS_OPTIONS.map((option) => (
            <option key={option} value={String(option)}>
              {option} {t.radiusKm}
            </option>
          ))}
        </select>

        {active ? (
          <button
            type="button"
            onClick={() => {
              rememberScroll();
              router.push(withLocale(locale, pathname), { scroll: false });
            }}
            className="ml-auto rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-white/30 hover:text-white"
          >
            {t.reset}
          </button>
        ) : null}
      </div>
    </div>
  );
}
