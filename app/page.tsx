import Link from "@/components/i18n/LocaleLink";
import { Fragment, Suspense } from "react";

import QuickFilters from "@/components/discovery/QuickFilters";
import SearchBar from "@/components/discovery/SearchBar";
import EventRows from "@/components/home/EventRows";
import BentoGrid from "@/components/home/BentoGrid";
import CityStrip from "@/components/home/CityStrip";
import HeroPosters from "@/components/home/HeroPosters";
import HomeIntro from "@/components/home/HomeIntro";
import GlobeMap from "@/components/map/GlobeMap";
import Reveal from "@/components/motion/Reveal";
import Pagination from "@/components/ui/Pagination";
import {
  discoveryQuery,
  hasActiveFilters,
  parseDiscoveryFilters,
  toQueryFilters,
} from "@/lib/events/filters";
import {
  getDiscoveryCounters,
  listEvents,
  listFeaturedEvents,
  listGenres,
  listMapEvents,
  listSavedEventIds,
} from "@/lib/events/queries";
import { listCityDirectory } from "@/lib/cities/queries";
import { getVisitorLocation } from "@/lib/geo/visitor";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { DEFAULT_ZOOM, MAX_MAP_EVENTS, REGION_ZOOM } from "@/lib/map/config";
import { ITEMS_PER_PAGE } from "@/lib/pagination";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () => getPageMetadata((dict) => dict.meta);

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Home / Esplora.
 *
 * Tutto il contenuto è renderizzato dal server sui dati reali del database:
 * il globo riceve i pin già pronti e l'elenco sotto resta leggibile (e
 * indicizzabile) anche senza JavaScript.
 *
 * Ricerca e filtri vivono in `searchParams`: lista e mappa leggono gli stessi
 * parametri, quindi non possono divergere, e una ricerca è condivisibile.
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const params = await searchParams;

  const [visitor, session, savedIds, genres, featured, counters, cityDirectory] = await Promise.all([
    getVisitorLocation(),
    getSessionProfile(),
    listSavedEventIds(),
    listGenres(),
    listFeaturedEvents(4),
    getDiscoveryCounters(),
    listCityDirectory(),
  ]);

  // In Home le città restano poche e in ordine alfabetico: l'elenco completo,
  // con la ricerca, vive su /citta. Così la sezione non diventa un muro.
  const homeCities = cityDirectory
    .filter((city) => city.eventCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label, locale))
    .slice(0, 6);

  const filters = parseDiscoveryFilters(params, visitor.center);
  const queryFilters = toQueryFilters(filters);

  const [firstPage, mapEvents] = await Promise.all([
    listEvents({ filters: queryFilters, page: filters.page, perPage: ITEMS_PER_PAGE }),
    listMapEvents(queryFilters, MAX_MAP_EVENTS),
  ]);

  // Una pagina fuori intervallo (link condiviso mentre la lista si accorcia) non
  // è "nessun evento": si torna all'ultima pagina valida.
  let list = firstPage;
  if (firstPage.events.length === 0 && firstPage.total > 0) {
    filters.page = Math.max(1, Math.ceil(firstPage.total / ITEMS_PER_PAGE));
    list = await listEvents({ filters: queryFilters, page: filters.page, perPage: ITEMS_PER_PAGE });
  }

  const savedEventIds = [...savedIds];
  const isAuthenticated = Boolean(session);
  const filtered = hasActiveFilters(filters);

  // Il muro di locandine dell'hero usa le serate in evidenza (o le prime in
  // programma): sono eventi veri, non immagini di repertorio.
  const heroEvents = (featured.length > 0 ? featured : list.events)
    .filter((event) => event.coverImageUrl)
    .slice(0, 4);

  const query = discoveryQuery(filters);
  // Paginazione: i filtri restano, la pagina no (cambia da sola).
  const pageParams = Object.fromEntries(
    new URLSearchParams(discoveryQuery(filters, { page: 1 }))
  );

  const mapEmpty = filtered
    ? {
        title: dict.filters.noResultsTitle,
        text: dict.filters.noResultsText,
        cta: dict.filters.reset,
        href: "/",
      }
    : {
        title: dict.map.emptyTitle,
        text: dict.map.emptyText,
        cta: dict.map.emptyCta,
        href: "/contatti",
      };

  return (
    <>
      {/* 00 — Copertina: muro di locandine reali e titolo-poster. */}
      <section className="relative mx-auto w-full max-w-[1400px] px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
        <div
          className={`grid gap-10 ${
            heroEvents.length > 0
              ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center"
              : ""
          }`}
        >
          <div className="relative z-10">
            <p className="home-hero-kicker flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              <span className="home-live-dot" aria-hidden="true" />
              {dict.home.badge}
            </p>

            <h1 className="home-hero-title mt-5 font-poster text-[clamp(4.25rem,21vw,6rem)] uppercase leading-none tracking-[-0.035em] lg:text-[clamp(5.5rem,11vw,9rem)]">
              <span className="block">{dict.home.hero.line1}</span>{" "}
              <span className="-mt-[0.08em] block text-[0.46em] leading-none text-pink">
                {dict.home.hero.line2}
              </span>
            </h1>

            <p className="home-hero-copy mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {dict.home.subtitle}
            </p>

            <div className="home-hero-actions mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="#eventi"
                className="inline-flex items-center gap-2 rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
              >
                {dict.home.explore} <span aria-hidden="true">↓</span>
              </Link>
              <Link
                href="/per-gli-artisti"
                className="home-arrow-link inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
              >
                {dict.home.forArtists} <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/per-le-venue"
                className="home-arrow-link inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
              >
                {dict.home.forVenues} <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span>00 / {dict.home.hero.foot}</span>
              <span>{dict.home.hero.scroll} ↓</span>
            </div>
          </div>

          <HeroPosters events={heroEvents} />
        </div>
      </section>

      {/* Manifesto: una fascia che entra una volta, non un marquee infinito. */}
      <div aria-hidden="true" className="overflow-hidden border-y border-line bg-white/[0.02]">
        <div className="home-ticker-track mx-auto flex max-w-[1400px] items-center gap-5 overflow-x-auto px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan [scrollbar-width:none] sm:px-6">
          {dict.home.ticker.map((item, index) => (
            <Fragment key={`${item}-${index}`}>
              {index > 0 ? <span className="text-pink">·</span> : null}
              <span className="whitespace-nowrap transition-colors hover:text-white">{item}</span>
            </Fragment>
          ))}
        </div>
      </div>

      {/* 01 — Agenda: ricerca, filtri e righe evento. */}
      <section id="eventi" className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-5 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              01 / {dict.home.agendaLabel}
            </p>
            <h2 className="mt-2 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-6xl">
              {dict.home.upcomingTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted">{dict.home.upcomingSubtitle}</p>
          </div>

          <Link
            href="/mappa"
            className="home-arrow-link inline-flex w-fit items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {dict.nav.map} <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="mt-1">
          <Suspense fallback={<div className="h-[92px]" />}>
            <SearchBar locale={locale} variant="editorial" />
            <QuickFilters
              locale={locale}
              genres={genres}
              center={visitor.center}
              variant="editorial"
              className="mt-1"
            />
          </Suspense>
        </div>

        {filtered ? (
          <p className="mt-4 text-sm text-muted">
            <strong className="font-medium text-white">{list.total}</strong>{" "}
            {list.total === 1 ? dict.filters.resultOne : dict.filters.resultMany}
            {filters.q ? ` ${dict.filters.resultsFor} “${filters.q}”` : ""}
          </p>
        ) : null}

        {list.events.length === 0 ? (
          <div className="border-b border-line py-14 text-center">
            <h3 className="font-poster text-3xl uppercase leading-none">
              {filtered ? dict.filters.noResultsTitle : dict.events.emptyTitle}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
              {filtered ? dict.filters.noResultsText : dict.events.emptyText}
            </p>
            <Link
              href={filtered ? "/" : "/contatti"}
              className="mt-6 inline-flex items-center gap-2 rounded-none bg-violet-strong px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
            >
              {filtered ? dict.filters.reset : dict.events.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <EventRows events={list.events} locale={locale} dict={dict} />

            <div className="mt-10">
              <Pagination
                currentPage={filters.page}
                totalItems={list.total}
                basePath="/"
                params={pageParams}
                hash="eventi"
                labels={{
                  previous: dict.pagination.previous,
                  next: dict.pagination.next,
                  label: dict.pagination.label,
                }}
              />
            </div>
          </>
        )}
      </section>

      {homeCities.length > 0 ? (
        <Reveal>
          <CityStrip cities={homeCities} locale={locale} dict={dict} />
        </Reveal>
      ) : null}

      {/* 03 - Mappa: fascia a tutta pagina, con intestazione editoriale. */}
      <section id="mappa" className="mt-16 border-y border-line sm:mt-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              03 / {dict.nav.map}
            </p>
            <h2 className="mt-2 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-6xl">
              {dict.home.discoveryTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted">{dict.home.discoverySubtitle}</p>
          </div>

          <Link
            href={query ? `/mappa?${query}` : "/mappa"}
            className="home-arrow-link inline-flex w-fit items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {dict.map.fullscreen} <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <GlobeMap
          events={mapEvents}
          initialCenter={visitor.center}
          initialZoom={visitor.fromIp ? REGION_ZOOM : DEFAULT_ZOOM}
          savedEventIds={savedEventIds}
          isAuthenticated={isAuthenticated}
          locale={locale}
          frame="bleed"
          className="border-t border-line"
          empty={mapEmpty}
          fullscreenHref={query ? `/mappa?${query}` : "/mappa"}
        />
      </section>

      {/* 04 - Cos'è OpenStage. */}
      <Reveal>
        <HomeIntro dict={dict} />
      </Reveal>

      {/* 05 - Come funziona, numeri reali, artisti e locali. */}
      <Reveal>
        <BentoGrid dict={dict} counters={counters} />
      </Reveal>
    </>
  );
}
