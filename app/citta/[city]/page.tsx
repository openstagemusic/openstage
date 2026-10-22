import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import ArtistCard from "@/components/directory/ArtistCard";
import VenueCard from "@/components/directory/VenueCard";
import EventRows from "@/components/home/EventRows";
import Link from "@/components/i18n/LocaleLink";
import PageCta from "@/components/pages/PageCta";
import PageHero from "@/components/pages/PageHero";
import PageSection from "@/components/pages/PageSection";
import JsonLd from "@/components/seo/JsonLd";
import { cityPath } from "@/lib/cities/paths";
import { getCityBySlug, listUpcomingEventsForCity } from "@/lib/cities/queries";
import { listArtists, listVenues } from "@/lib/directory/queries";
import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

type CityPageProps = {
  params: Promise<{ city: string }>;
};

function fillCity(template: string, city: string): string {
  return template.replace(/\{city\}/g, city);
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const [{ city }, locale] = await Promise.all([params, getLocale()]);
  const summary = await getCityBySlug(city);

  if (!summary) return {};

  const t = getDictionary(locale).pages.cities;
  const title = fillCity(t.cityMetaTitle, summary.label);
  const description = fillCity(t.cityMetaDescription, summary.label);

  return {
    title,
    description,
    // Una città con meno di tre serate future è utile a chi ha il link, ma non
    // abbastanza solida per un motore di ricerca: resta fuori indice.
    robots: summary.indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, type: "website" },
  };
}

/**
 * La pagina di una città.
 *
 * Tre blocchi, tutti da dati reali: prossime serate, artisti e locali. Se una
 * sezione è vuota lo dice e offre l'elenco filtrato, invece di lasciare un buco.
 */
export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const locale = await getLocale();
  const summary = await getCityBySlug(city);

  if (!summary) notFound();

  // Un solo indirizzo per città: maiuscole, accenti o slug parziali finiscono
  // sull'indirizzo canonico con un 308, come per le schede evento.
  const canonical = cityPath(summary.label);
  if (canonical !== `/citta/${city}`) {
    permanentRedirect(withLocale(locale, canonical));
  }

  const dict = getDictionary(locale);
  const t = dict.pages.cities;

  const [events, artists, venues] = await Promise.all([
    listUpcomingEventsForCity(summary),
    listArtists({ filters: { city: summary.label }, perPage: 6 }),
    listVenues({ filters: { city: summary.label }, perPage: 6 }),
  ]);

  const countLabel = `${summary.eventCount} ${
    summary.eventCount === 1 ? t.eventOne : t.eventMany
  }`;
  const next = summary.nextEventAt
    ? formatEventDate(summary.nextEventAt, summary.nextEventTimezone, locale)
    : null;

  const mapHref = `/mappa?q=${encodeURIComponent(summary.label)}`;
  const artistsHref = `/artisti?city=${encodeURIComponent(summary.label)}`;
  const venuesHref = `/locali?city=${encodeURIComponent(summary.label)}`;
  const pageUrl = absoluteUrl(withLocale(locale, cityPath(summary.label)));

  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: fillCity(t.cityMetaTitle, summary.label),
    url: pageUrl,
    inLanguage: locale,
    description: fillCity(t.cityMetaDescription, summary.label),
    about: {
      "@type": "Place",
      name: summary.label,
      address: {
        "@type": "PostalAddress",
        addressLocality: summary.label,
        addressCountry: "IT",
      },
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: events.length,
      itemListElement: events.map((event, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: event.title,
        url: absoluteUrl(withLocale(locale, eventPath(event))),
      })),
    },
  };

  return (
    <div>
      <JsonLd data={data} />

      <div className="mx-auto w-full max-w-[1400px] px-4 pt-8 sm:px-6">
        <Link href="/citta" className="text-sm text-muted transition-colors hover:text-white">
          ← {t.backToCities}
        </Link>
      </div>

      <PageHero
        eyebrow={t.cityEyebrow}
        headline={summary.label}
        lead={fillCity(t.cityLead, summary.label)}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
            {countLabel}
          </span>
          {next ? (
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">
              {t.nextEvent} · {next.full}
            </span>
          ) : null}
          <Link
            href={mapHref}
            className="rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-cyan transition-colors hover:border-cyan/70 hover:text-white"
          >
            {t.mapCta} ↗
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <PageSection number="01" title={t.upcomingTitle} eyebrow={summary.label}>
          {events.length > 0 ? (
            <EventRows events={events} locale={locale} dict={dict} />
          ) : (
            <div className="border-y border-line py-8">
              <p className="max-w-xl text-sm leading-relaxed text-muted">{t.upcomingEmpty}</p>
              <Link
                href={mapHref}
                className="mt-4 inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
              >
                {t.upcomingCta}
              </Link>
            </div>
          )}
        </PageSection>

        <PageSection number="02" title={fillCity(t.artistsTitle, summary.label)} eyebrow={t.title}>
          {artists.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artists.items.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">{t.artistsEmpty}</p>
          )}

          <Link
            href={artistsHref}
            className="mt-5 inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {fillCity(t.seeArtists, summary.label)} ↗
          </Link>
        </PageSection>

        <PageSection number="03" title={fillCity(t.venuesTitle, summary.label)} eyebrow={t.title}>
          {venues.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {venues.items.map((venue) => (
                <VenueCard key={venue.id} venue={venue} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">{t.venuesEmpty}</p>
          )}

          <Link
            href={venuesHref}
            className="mt-5 inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {fillCity(t.seeVenues, summary.label)} ↗
          </Link>
        </PageSection>
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
