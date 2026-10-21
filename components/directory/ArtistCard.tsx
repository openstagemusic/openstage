import Link from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import type { PublicArtist } from "@/lib/directory/queries";
import { artistPath } from "@/lib/events/paths";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Scheda dell'artista negli elenchi. Renderizzata dal server: titolo, città e
 * genere sono leggibili anche senza JavaScript.
 */
export default function ArtistCard({ artist, locale }: { artist: PublicArtist; locale: Locale }) {
  const dict = getDictionary(locale);
  const where = [artist.city, artist.genre].filter(Boolean).join(" · ");

  return (
    <article className="glass h-full overflow-hidden rounded-card border border-line transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-glow focus-within:border-cyan/50 focus-within:ring-2 focus-within:ring-cyan/40 motion-safe:hover:-translate-y-0.5">
      <Link href={artistPath(artist)} className="flex h-full flex-col p-5 focus-visible:outline-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-violet/30 bg-violet/10 font-display text-sm font-semibold text-violet"
          >
            {artist.name.slice(0, 1).toUpperCase()}
          </span>

          {artist.verified ? (
            <VerifiedBadge dict={dict.directory} />
          ) : artist.claimed ? null : (
            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
              {dict.directory.badgeUnclaimed}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-lg font-semibold leading-tight">{artist.name}</h3>

        {where ? <p className="mt-1 text-sm text-muted">{where}</p> : null}
      </Link>
    </article>
  );
}
