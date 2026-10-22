import type { Metadata } from "next";

import Link from "@/components/i18n/LocaleLink";
import PageCta from "@/components/pages/PageCta";
import PageHero from "@/components/pages/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import { cityPath } from "@/lib/cities/paths";
import { listCityDirectory } from "@/lib/cities/queries";
import { formatEventDate } from "@/lib/events/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => dict.pages.cities);

/**
 * L'indice delle città.
 *
 * Le righe sono costruite dagli eventi futuri già pubblicati: nessun elenco
 * hardcodato e nessuna città che non abbia una serata da mostrare. Le città
 * sotto la soglia editoriale compaiono lo stesso, ma le loro pagine restano
 * fuori dalla sitemap e ricevono `noindex` (vedi `lib/cities/queries.ts`).
 */
export default async function CitiesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pages.cities;
  // Una città senza serate future resta raggiungibile dall'indirizzo diretto,
  // ma non occupa l'indice "dove andare".
  const cities = (await listCityDirectory()).filter((city) => city.eventCount > 0);
  const url = absoluteUrl(withLocale(locale, "/citta"));

  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.title,
    url,
    inLanguage: locale,
    description: t.description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cities.length,
      itemListElement: cities.map((city, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: city.label,
        url: absoluteUrl(withLocale(locale, cityPath(city.label))),
      })),
    },
  };

  return (
    <div>
      <JsonLd data={data} />

      <PageHero eyebrow={t.eyebrow} headline={t.headline} accent={t.accent} lead={t.lead} />

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <section className="border-t border-line py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-14">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet">
                01 / {t.title}
              </p>
              <h2 className="mt-2 max-w-md font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
                {t.listTitle}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t.listNote}</p>
            </div>

            {cities.length > 0 ? (
              <ul className="border-t border-line">
                {cities.map((city, index) => {
                  const next = city.nextEventAt
                    ? formatEventDate(city.nextEventAt, city.nextEventTimezone, locale)
                    : null;
                  const count = `${city.eventCount} ${
                    city.eventCount === 1 ? t.eventOne : t.eventMany
                  }`;

                  return (
                    <li key={city.key}>
                      <Link
                        href={cityPath(city.label)}
                        className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-4 border-b border-line py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center sm:py-6"
                      >
                        <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="min-w-0">
                          <span className="block break-words font-poster text-3xl uppercase leading-[0.95] transition-colors group-hover:text-cyan sm:text-4xl">
                            {city.label}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                            <span>{count}</span>
                            {next ? (
                              <span>
                                · {t.nextEvent} {next.full}
                              </span>
                            ) : null}
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          className="font-mono text-xl leading-none text-muted transition-colors group-hover:text-cyan"
                        >
                          ↗
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="border-y border-line py-10">
                <p className="font-display text-xl font-semibold">{t.emptyTitle}</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t.emptyText}</p>
                <Link
                  href="/mappa"
                  className="mt-5 inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
                >
                  {t.mapCta}
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <PageCta
        title={t.ctaTitle}
        text={t.ctaText}
        primary={{ label: t.ctaMap, href: "/mappa" }}
        secondary={{ label: t.ctaArtists, href: "/per-gli-artisti" }}
      />
    </div>
  );
}
