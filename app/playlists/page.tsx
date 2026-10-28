import type { Metadata } from "next";

import LocaleLink from "@/components/i18n/LocaleLink";
import PageHero from "@/components/pages/PageHero";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { listPublishedPlaylists } from "@/lib/spotify/queries";

/**
 * Le playlist della redazione: esistono solo se ci sono righe reali e pubblicate.
 * Con la tabella vuota la pagina lo dice, non inventa contenuti, e resta fuori
 * dai motori di ricerca finché non arriva la prima playlist.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.spotify;
  const playlists = await listPublishedPlaylists();

  return {
    title: `${t.headline} ${t.accent}`,
    description: t.lead,
    robots: playlists.length > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function PlaylistsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.spotify;
  const playlists = await listPublishedPlaylists();

  return (
    <div>
      <PageHero eyebrow={t.eyebrow} headline={t.headline} accent={t.accent} lead={t.lead} />

      <section className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
        {playlists.length > 0 ? (
          <div className="grid gap-10 md:grid-cols-2">
            {playlists.map((playlist) => (
              <article key={playlist.id}>
                <h2 className="font-display text-xl font-semibold">{playlist.title}</h2>
                {playlist.description ? (
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
                    {playlist.description}
                  </p>
                ) : null}

                <div className="mt-4 overflow-hidden border border-line bg-bg">
                  <iframe
                    title={`${playlist.title} — ${t.embedTitle}`}
                    src={playlist.embedUrl}
                    width="100%"
                    height="352"
                    style={{ border: 0 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>

                <a
                  href={playlist.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
                >
                  {t.openInSpotify} <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl border-l-2 border-line-strong pl-4">
            <p className="text-sm leading-relaxed text-muted">{t.empty}</p>
            <LocaleLink
              href="/artisti"
              className="mt-4 inline-flex font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:text-white"
            >
              {t.exploreArtists} <span aria-hidden="true">↗</span>
            </LocaleLink>
          </div>
        )}
      </section>
    </div>
  );
}
