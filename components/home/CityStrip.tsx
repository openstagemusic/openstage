import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { cityPath } from "@/lib/cities/paths";
import type { CitySummary } from "@/lib/cities/queries";
import { formatEventDate } from "@/lib/events/format";
import type { Locale } from "@/lib/i18n/config";

type CityStripProps = {
  cities: CitySummary[];
  locale: Locale;
  dict: Dictionary;
};

/**
 * La porta d'ingresso alle pagine città, in Home.
 *
 * Le città arrivano dagli eventi reali (mai da un elenco hardcodato) e ogni
 * riga mostra quante serate future ci sono e qual è la prossima. Il link
 * "Tutte le città" porta all'indice completo, così la pagina non resta
 * nascosta solo nel footer.
 */
export default function CityStrip({ cities, locale, dict }: CityStripProps) {
  const t = dict.home.cities;

  if (cities.length === 0) return null;

  return (
    <section id="citta" className="border-t border-line bg-white/[0.02]">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
              02 / {t.eyebrow}
            </p>
            <h2 className="mt-2 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-6xl">
              {t.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted">{t.subtitle}</p>
          </div>

          <Link
            href="/citta"
            className="home-arrow-link inline-flex w-fit items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {t.all} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="mt-8 grid gap-x-10 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city, index) => {
            const next = city.nextEventAt
              ? formatEventDate(city.nextEventAt, city.nextEventTimezone, locale)
              : null;
            const count = `${city.eventCount} ${
              city.eventCount === 1 ? t.eventOne : t.eventMany
            }`;

            return (
              <li key={city.key} className="border-b border-line">
                <Link
                  href={cityPath(city.label)}
                  className="group flex items-baseline justify-between gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-poster text-2xl uppercase leading-none tracking-[-0.01em] transition-colors group-hover:text-cyan sm:text-3xl">
                      {city.label}
                    </span>
                  </span>

                  <span className="shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    <span className="block">{count}</span>
                    {next ? (
                      <span className="mt-1 block text-white/70">
                        {t.next} {next.date}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
