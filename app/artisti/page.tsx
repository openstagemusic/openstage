import type { Metadata } from "next";
import { Suspense } from "react";

import ArtistCard from "@/components/directory/ArtistCard";
import DirectoryFilters from "@/components/directory/DirectoryFilters";
import PageHero from "@/components/pages/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import Pagination from "@/components/ui/Pagination";
import { listArtistCities, listArtistGenres, listArtists } from "@/lib/directory/queries";
import { artistPath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { ITEMS_PER_PAGE, paginationParams } from "@/lib/pagination";
import { absoluteUrl } from "@/lib/seo/site";

type DirectorySearchParams = {
  q?: string;
  city?: string;
  genre?: string;
  page?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}): Promise<Metadata> {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const dict = getDictionary(locale);
  const filtered = Boolean(params.q?.trim() || params.city || params.genre || params.page);

  return {
    title: dict.pages.artists.title,
    description: dict.pages.artists.description,
    // Le viste filtrate o paginate non si indicizzano: la pagina pulita sì.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/**
 * Directory degli artisti: dati reali dal database, filtri nella URL,
 * paginazione vera. Nessuna scheda di prova.
 */
export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const dict = getDictionary(locale);
  const t = dict.directory;

  const query = params.q?.trim() ?? "";
  const city = params.city ?? "";
  const genre = params.genre ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);

  const [{ items, total }, cities, genres] = await Promise.all([
    listArtists({ filters: { query, city, genre }, page, perPage: ITEMS_PER_PAGE }),
    listArtistCities(),
    listArtistGenres(),
  ]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((artist, index) => ({
      "@type": "ListItem",
      position: (page - 1) * ITEMS_PER_PAGE + index + 1,
      name: artist.name,
      url: absoluteUrl(`/${locale}${artistPath(artist)}`),
    })),
  };

  return (
    <div>
      <JsonLd data={itemList} />

      <PageHero
        eyebrow={dict.nav.artists}
        headline={t.artistsHeadline}
        accent={t.artistsAccent}
        lead={t.artistsIntro}
      >
        <Suspense fallback={<div className="h-[76px]" />}>
          <DirectoryFilters
            locale={locale}
            placeholder={t.searchArtist}
            cities={cities}
            genres={genres}
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
            {items.map((artist, index) => (
              <ArtistCard key={artist.id} artist={artist} locale={locale} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-6 border-t border-line pt-8">
            <h2 className="font-poster text-3xl uppercase leading-none">{t.noResultsTitle}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.noResultsText}</p>
          </div>
        )}

        <div className="mt-10">
          <Pagination
            currentPage={page}
            totalItems={total}
            basePath="/artisti"
            params={paginationParams({ q: query, city, genre })}
            labels={dict.pagination}
          />
        </div>
      </div>
    </div>
  );
}
