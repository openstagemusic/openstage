import type { Metadata } from "next";
import { Suspense } from "react";

import DirectoryFilters from "@/components/directory/DirectoryFilters";
import VenueCard from "@/components/directory/VenueCard";
import JsonLd from "@/components/seo/JsonLd";
import Pagination from "@/components/ui/Pagination";
import { listVenueCities, listVenues } from "@/lib/directory/queries";
import { venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { ITEMS_PER_PAGE, paginationParams } from "@/lib/pagination";
import { absoluteUrl } from "@/lib/seo/site";

type DirectorySearchParams = {
  q?: string;
  city?: string;
  page?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}): Promise<Metadata> {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const dict = getDictionary(locale);
  const filtered = Boolean(params.q?.trim() || params.city || params.page);

  return {
    title: dict.pages.venues.title,
    description: dict.pages.venues.description,
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/** Directory dei locali: stessi filtri degli artisti, meno il genere. */
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const dict = getDictionary(locale);
  const t = dict.directory;

  const query = params.q?.trim() ?? "";
  const city = params.city ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);

  const [{ items, total }, cities] = await Promise.all([
    listVenues({ filters: { query, city }, page, perPage: ITEMS_PER_PAGE }),
    listVenueCities(),
  ]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((venue, index) => ({
      "@type": "ListItem",
      position: (page - 1) * ITEMS_PER_PAGE + index + 1,
      name: venue.name,
      url: absoluteUrl(`/${locale}${venuePath(venue)}`),
    })),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={itemList} />

      <header className="max-w-2xl">
        <h1 className="text-balance font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {dict.pages.venues.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t.venuesIntro}</p>
      </header>

      <Suspense fallback={<div className="mt-6 h-[76px]" />}>
        <DirectoryFilters
          locale={locale}
          placeholder={t.searchVenue}
          cities={cities}
          className="mt-6"
        />
      </Suspense>

      <p className="mt-4 text-xs uppercase tracking-wide text-muted" aria-live="polite">
        {total} {total === 1 ? t.resultOne : t.resultMany}
      </p>

      {items.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((venue) => (
            <VenueCard key={venue.id} venue={venue} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="glass mt-6 rounded-card border border-line p-8">
          <h2 className="font-display text-lg font-semibold">{t.noResultsTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.noResultsText}</p>
        </div>
      )}

      <div className="mt-10">
        <Pagination
          currentPage={page}
          totalItems={total}
          basePath="/locali"
          params={paginationParams({ q: query, city })}
          labels={dict.pagination}
        />
      </div>
    </div>
  );
}
