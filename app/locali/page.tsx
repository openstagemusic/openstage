import type { Metadata } from "next";
import { Suspense } from "react";

import DirectoryFilters from "@/components/directory/DirectoryFilters";
import Link from "@/components/i18n/LocaleLink";
import VenueCard from "@/components/directory/VenueCard";
import PageHero from "@/components/pages/PageHero";
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
    <div>
      <JsonLd data={itemList} />

      <PageHero
        eyebrow={dict.nav.venues}
        headline={t.venuesHeadline}
        accent={t.venuesAccent}
        lead={t.venuesIntro}
      >
        <Suspense fallback={<div className="h-[76px]" />}>
          <DirectoryFilters
            locale={locale}
            placeholder={t.searchVenue}
            cities={cities}
            className="max-w-3xl"
          />
        </Suspense>
      </PageHero>

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 sm:pb-16">
        <div className="mt-2 flex items-baseline gap-3 border-t border-line pt-4" aria-live="polite">
          <span className="font-poster text-2xl leading-none">{total}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {total === 1 ? t.resultOne : t.resultMany}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((venue, index) => (
              <VenueCard key={venue.id} venue={venue} locale={locale} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-6 border-t border-line pt-8">
            <h2 className="font-poster text-3xl uppercase leading-none">{t.noResultsTitle}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.noResultsText}</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              {t.suggestVenue}{" "}
              <Link
                href="/contatti?argomento=venue"
                className="border-b border-line-strong pb-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-colors hover:border-cyan"
              >
                {t.suggestVenueCta}
              </Link>
            </p>
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
    </div>
  );
}
