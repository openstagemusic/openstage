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
    <article className="glass h-full overflow-hidden rounded-3xl border border-white/10 transition-colors hover:border-white/25">
      <Link href={artistPath(artist)} className="flex h-full flex-col">
        <div
          className="h-1.5 w-full bg-gradient-to-r from-violet via-cyan to-pink"
          aria-hidden="true"
        />

        <div className="flex flex-1 flex-col p-5">
          {artist.verified ? (
            <VerifiedBadge dict={dict.directory} className="self-start" />
          ) : artist.claimed ? null : (
            <span className="self-start rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted">
              {dict.directory.badgeUnclaimed}
            </span>
          )}

          <h3 className="mt-3 font-display text-lg font-semibold leading-tight">{artist.name}</h3>

          {where ? <p className="mt-1 text-sm text-muted">{where}</p> : null}
        </div>
      </Link>
    </article>
  );
}
