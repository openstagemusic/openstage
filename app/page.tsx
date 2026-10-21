import Link from "@/components/i18n/LocaleLink";
import { Suspense } from "react";

import QuickFilters from "@/components/discovery/QuickFilters";
import SearchBar from "@/components/discovery/SearchBar";
import ViewSwitcher from "@/components/discovery/ViewSwitcher";
import EventTable from "@/components/events/EventTable";
import EventTeaser from "@/components/events/EventTeaser";
import BentoGrid from "@/components/home/BentoGrid";
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

  const [visitor, session, savedIds, genres, featured, counters] = await Promise.all([
    getVisitorLocation(),
    getSessionProfile(),
    listSavedEventIds(),
    listGenres(),
    listFeaturedEvents(3),
    getDiscoveryCounters(),
  ]);

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
    .slice(0, 3);

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
      <section className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/[0.06] px-3 py-1 text-xs text-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan" />
              {dict.home.badge}
            </span>

            <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              {dict.home.title}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              {dict.home.subtitle}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="#eventi"
                className="rounded-full bg-violet-strong px-6 py-3 text-center text-sm font-medium text-white shadow-lg shadow-violet/20 transition-colors hover:bg-violet-strong/90"
              >
                {dict.home.explore}
              </Link>
              <Link
                href="/per-gli-artisti"
                className="rounded-full border border-line-strong px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/5"
              >
                {dict.home.forArtists}
              </Link>
              <Link
                href="/per-le-venue"
                className="px-2 py-3 text-center text-sm text-muted transition-colors hover:text-white sm:text-left"
              >
                {dict.home.forVenues} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <HeroPosters events={heroEvents} />
        </div>
      </section>

      <HomeIntro dict={dict} />

      <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {dict.home.discoveryTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{dict.home.discoverySubtitle}</p>

        <div className="mt-6">
          <GlobeMap
            events={mapEvents}
            initialCenter={visitor.center}
            initialZoom={visitor.fromIp ? REGION_ZOOM : DEFAULT_ZOOM}
            savedEventIds={savedEventIds}
            isAuthenticated={isAuthenticated}
            locale={locale}
            empty={mapEmpty}
            fullscreenHref={query ? `/mappa?${query}` : "/mappa"}
          />
        </div>
      </section>

      {/* Ricerca e filtri: sotto il globo, sopra lo showcase. */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6">
        <Suspense fallback={<div className="h-[52px]" />}>
          <SearchBar locale={locale} />
          <QuickFilters
            locale={locale}
            genres={genres}
            center={visitor.center}
            className="mt-3"
          />
        </Suspense>

        {filtered ? (
          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>
              <strong className="font-medium text-white">{list.total}</strong>{" "}
              {list.total === 1 ? dict.filters.resultOne : dict.filters.resultMany}
              {filters.q ? ` ${dict.filters.resultsFor} “${filters.q}”` : ""}
            </span>
            <Link
              href="#eventi"
              className="rounded-full border border-line px-3 py-1 text-xs text-white transition-colors hover:border-line-strong"
            >
              {dict.filters.goToResults}
            </Link>
          </p>
        ) : null}
      </section>

      <section id="eventi" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {dict.home.upcomingTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">{dict.home.upcomingSubtitle}</p>
          </div>

          {list.total > 0 ? (
            <Suspense fallback={<div className="h-9" />}>
              <ViewSwitcher locale={locale} />
            </Suspense>
          ) : null}
        </div>

        {/* In evidenza: scelta editoriale, quindi fuori dai risultati filtrati. */}
        {featured.length > 0 && !filtered ? (
          <div className="mt-8">
            <h3 className="font-display text-lg font-semibold">{dict.featured.title}</h3>
            <p className="mt-1 text-sm text-muted">{dict.featured.subtitle}</p>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((event) => (
                <li key={event.id} className="h-full">
                  <EventTeaser event={event} locale={locale} dict={dict} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {list.events.length === 0 ? (
          <div className="glass mt-6 rounded-3xl border border-white/10 p-8 text-center">
            <h3 className="font-display text-lg font-semibold">
              {filtered ? dict.filters.noResultsTitle : dict.events.emptyTitle}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
              {filtered ? dict.filters.noResultsText : dict.events.emptyText}
            </p>
            <Link
              href={filtered ? "/" : "/contatti"}
              className="mt-5 inline-flex rounded-full bg-violet-strong px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-strong/90"
            >
              {filtered ? dict.filters.reset : dict.events.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            {filters.view === "table" ? (
              <EventTable events={list.events} locale={locale} dict={dict} />
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.events.map((event) => (
                  <li key={event.id} className="h-full">
                    <EventTeaser event={event} locale={locale} dict={dict} />
                  </li>
                ))}
              </ul>
            )}

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

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <BentoGrid dict={dict} counters={counters} />
        </Reveal>
      </section>
    </>
  );
}
