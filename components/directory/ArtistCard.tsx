import Link from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import type { PublicArtist } from "@/lib/directory/queries";
import { artistPath } from "@/lib/events/paths";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Scheda dell'artista negli elenchi. Renderizzata dal server: titolo, città e
 * genere sono leggibili anche senza JavaScript.
 */
export default function ArtistCard({ artist, locale }: { artist: PublicArtist; locale: Locale }) {
  const dict = getDictionary(locale);
  const where = [artist.city, artist.genre].filter(Boolean).join(" · ");

  return (
    <article className="group h-full border border-line bg-surface/60 transition-colors hover:border-cyan/50 focus-within:border-cyan/60">
      <Link
        href={artistPath(artist)}
        className="flex h-full flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center border border-violet/30 bg-violet/10 font-poster text-3xl leading-none text-violet"
          >
            {initials(artist.name)}
          </span>

          {artist.verified ? (
            <VerifiedBadge label={dict.directory.badgeVerified} />
          ) : artist.claimed ? null : (
            <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {dict.directory.badgeUnclaimed}
            </span>
          )}
        </div>

        <h3 className="mt-5 font-display text-xl font-semibold leading-tight">{artist.name}</h3>

        {where ? (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{where}</p>
        ) : null}

        <span className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
          →
        </span>
      </Link>
    </article>
  );
}
