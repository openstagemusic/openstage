import Link from "next/link";

import EventTeaser from "@/components/events/EventTeaser";
import GlobeMap from "@/components/map/GlobeMap";
import Pagination, { ITEMS_PER_PAGE } from "@/components/ui/Pagination";
import { listEvents, listMapEvents, listSavedEventIds } from "@/lib/events/queries";
import { getVisitorLocation } from "@/lib/geo/visitor";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { DEFAULT_ZOOM, MAX_MAP_EVENTS, REGION_ZOOM } from "@/lib/map/config";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () => getPageMetadata((dict) => dict.meta);

type HomePageProps = {
  searchParams: Promise<{ page?: string }>;
};

/**
 * Home / Esplora.
 *
 * Tutto il contenuto è renderizzato dal server sui dati reali del database:
 * il globo riceve i pin già pronti e l'elenco sotto resta leggibile (e
 * indicizzabile) anche senza JavaScript.
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [visitor, session, mapEvents, list, savedIds] = await Promise.all([
    getVisitorLocation(),
    getSessionProfile(),
    listMapEvents({}, MAX_MAP_EVENTS),
    listEvents({ page, perPage: ITEMS_PER_PAGE }),
    listSavedEventIds(),
  ]);

  const savedEventIds = [...savedIds];
  const isAuthenticated = Boolean(session);

  const values = [
    { title: dict.home.values.undergroundTitle, text: dict.home.values.undergroundText },
    { title: dict.home.values.ethicsTitle, text: dict.home.values.ethicsText },
    { title: dict.home.values.authenticTitle, text: dict.home.values.authenticText },
  ];

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
            emptyCtaHref="/contatti"
          />
        </div>
      </section>

      <section id="eventi" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {dict.home.upcomingTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{dict.home.upcomingSubtitle}</p>

        {list.events.length === 0 ? (
          <div className="glass mt-6 rounded-3xl border border-white/10 p-8 text-center">
            <h3 className="font-display text-lg font-semibold">{dict.events.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{dict.events.emptyText}</p>
            <Link
              href="/contatti"
              className="mt-5 inline-flex rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-medium text-white"
            >
              {dict.events.emptyCta}
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
                currentPage={page}
                totalItems={list.total}
                basePath="/"
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
