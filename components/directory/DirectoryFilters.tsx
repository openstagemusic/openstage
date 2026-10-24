"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useScrollAnchor } from "@/components/discovery/useScrollAnchor";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

type DirectoryFiltersProps = {
  locale: Locale;
  /** Testo del campo di ricerca: cambia fra artisti e locali. */
  placeholder: string;
  cities: string[];
  /** Se presente, compare anche il filtro per genere. */
  genres?: string[];
  className?: string;
};

/**
 * Filtri delle directory (artisti e locali).
 *
 * Come nel resto del sito ogni filtro vive nella URL: il risultato è
 * condivisibile, sopravvive al ricaricamento e la pagina resta renderizzata dal
 * server.
 */
export default function DirectoryFilters({
  locale,
  placeholder,
  cities,
  genres,
  className,
}: DirectoryFiltersProps) {
  const t = getDictionary(locale).directory;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rememberScroll = useScrollAnchor();

  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const city = searchParams.get("city") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const active = urlQuery.trim() !== "" || city !== "" || genre !== "";

  // Indietro/avanti del browser: il campo resta allineato alla URL.
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const apply = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, val] of Object.entries(patch)) {
      if (val === null || val === "") params.delete(key);
      else params.set(key, val);
    }

    // Cambiando filtro si riparte dalla prima pagina.
    params.delete("page");

    const query = params.toString();
    rememberScroll();
    const base = withLocale(locale, pathname);
    router.push(query ? `${base}?${query}` : base, { scroll: false });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    apply({ q: value.trim() || null });
  };

  const selectClass =
    "min-h-11 border border-line bg-surface px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white outline-none transition-colors hover:border-line-strong focus:border-cyan";

  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn("border border-line bg-surface/60 p-3", className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 border border-line bg-bg px-3 py-2 focus-within:border-cyan">
          <span aria-hidden="true" className="text-muted">
            ⌕
          </span>
          <label htmlFor="directory-q" className="sr-only">
            {t.searchLabel}
          </label>
          <input
            id="directory-q"
            type="search"
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-muted"
          />
        </div>

        <label htmlFor="directory-city" className="sr-only">
          {t.city}
        </label>
        <select
          id="directory-city"
          value={city}
          onChange={(event) => apply({ city: event.target.value || null })}
          className={selectClass}
        >
          <option value="">{t.cityAll}</option>
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {genres ? (
          <>
            <label htmlFor="directory-genre" className="sr-only">
              {t.genre}
            </label>
            <select
              id="directory-genre"
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
          </>
        ) : null}

        <button
          type="submit"
          className="min-h-11 border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
        >
          {t.apply}
        </button>

        {active ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              apply({ q: null, city: null, genre: null });
            }}
            className="min-h-11 border border-line px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
          >
            {t.reset}
          </button>
        ) : null}
      </div>
    </form>
  );
}
