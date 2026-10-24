import type { Metadata } from "next";
import { Suspense } from "react";

import ArtistCard from "@/components/directory/ArtistCard";
import DirectoryFilters from "@/components/directory/DirectoryFilters";
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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={itemList} />

      <header className="max-w-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.nav.artists}
        </p>
        <h1 className="mt-3 text-balance font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {dict.pages.artists.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{t.artistsIntro}</p>
      </header>

      <Suspense fallback={<div className="mt-6 h-[76px]" />}>
        <DirectoryFilters
          locale={locale}
          placeholder={t.searchArtist}
          cities={cities}
          genres={genres}
          className="mt-6"
        />
      </Suspense>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted" aria-live="polite">
        {total} {total === 1 ? t.resultOne : t.resultMany}
      </p>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-line bg-surface/60 p-8">
          <h2 className="font-display text-lg font-semibold">{t.noResultsTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.noResultsText}</p>
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
  );
}
