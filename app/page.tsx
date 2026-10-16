import Link from "next/link";
import { Suspense } from "react";

import QuickFilters from "@/components/discovery/QuickFilters";
import SearchBar from "@/components/discovery/SearchBar";
import EventTeaser from "@/components/events/EventTeaser";
import GlobeMap from "@/components/map/GlobeMap";
import Pagination from "@/components/ui/Pagination";
import {
  discoveryQuery,
  hasActiveFilters,
  parseDiscoveryFilters,
  toQueryFilters,
} from "@/lib/events/filters";
import { listEvents, listGenres, listMapEvents, listSavedEventIds } from "@/lib/events/queries";
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

  const [visitor, session, savedIds, genres] = await Promise.all([
    getVisitorLocation(),
    getSessionProfile(),
    listSavedEventIds(),
    listGenres(),
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

  const query = discoveryQuery(filters);
  // Paginazione: i filtri restano, la pagina no (cambia da sola).
  const pageParams = Object.fromEntries(
    new URLSearchParams(discoveryQuery(filters, { page: 1 }))
  );

  const values = [
    { title: dict.home.values.undergroundTitle, text: dict.home.values.undergroundText },
    { title: dict.home.values.ethicsTitle, text: dict.home.values.ethicsText },
    { title: dict.home.values.authenticTitle, text: dict.home.values.authenticText },
  ];

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
      <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
          {dict.home.badge}
        </span>

        <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          {dict.home.title}
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted">{dict.home.subtitle}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="#eventi"
            className="rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {dict.home.explore}
          </Link>
          <Link
            href="/per-gli-artisti"
            className="rounded-full border border-white/10 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            {dict.home.forArtists}
          </Link>
          <Link
            href="/per-le-venue"
            className="rounded-full border border-white/10 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            {dict.home.forVenues}
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
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
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition-colors hover:border-white/30"
            >
              {dict.filters.goToResults}
            </Link>
          </p>
        ) : null}
      </section>

      <section id="eventi" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {dict.home.upcomingTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{dict.home.upcomingSubtitle}</p>

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
              className="mt-5 inline-flex rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-medium text-white"
            >
              {filtered ? dict.filters.reset : dict.events.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.events.map((event) => (
                <li key={event.id} className="h-full">
                  <EventTeaser event={event} locale={locale} dict={dict} />
                </li>
              ))}
            </ul>

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
        <ul className="grid gap-4 sm:grid-cols-3">
          {values.map((value) => (
            <li key={value.title} className="glass rounded-3xl border border-white/10 p-6">
              <h2 className="font-display text-lg font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm text-muted">{value.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
