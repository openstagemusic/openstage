import Image from "next/image";

import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SpotifyPlaylist } from "@/lib/spotify/queries";

/**
 * La playlist della redazione in fondo alla Home.
 *
 * Compare solo se esiste una playlist reale e pubblicata: nessun riquadro
 * vuoto, nessun contenuto inventato. L'embed è caricato in lazy e ha altezza
 * fissa, così non sposta il resto della pagina.
 */
export default function PlaylistSection({
  playlist,
  showAll,
  dict,
}: {
  playlist: SpotifyPlaylist | null;
  showAll: boolean;
  dict: Dictionary;
}) {
  if (!playlist) return null;

  const t = dict.home;

  return (
    <section id="playlist" className="mt-16 border-t border-line sm:mt-24">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              06 / {t.playlistEyebrow}
            </p>
            <h2 className="mt-3 text-balance font-poster text-4xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-6xl">
              {t.playlistTitle}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {t.playlistText}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a
                href={playlist.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
              >
                {t.playlistSave} <span aria-hidden="true">↗</span>
              </a>

              {showAll ? (
                <LocaleLink
                  href="/playlists"
                  className="inline-flex min-h-11 items-center border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-cyan"
                >
                  {t.playlistAll} <span aria-hidden="true">→</span>
                </LocaleLink>
              ) : null}
            </div>

            <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">{t.playlistSaveHint}</p>
          </div>

          <div>
            <div className="border border-line bg-surface/40 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {t.playlistOfficial}
                </span>
                <span aria-hidden="true" className="h-2 w-2 bg-pink" />
              </div>

              <div className="relative aspect-square overflow-hidden border border-line bg-bg">
                <Image
                  src="/brand/openstage-playlist-1000.png"
                  alt={playlist.title}
                  fill
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {playlist.title}
                </p>
                <a
                  href={playlist.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan transition-colors hover:text-white"
                >
                  {t.playlistSavePlaylist} ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
