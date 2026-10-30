import BrandBanner from "@/components/directory/BrandBanner";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import Link from "@/components/i18n/LocaleLink";
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
    <article className="group h-full overflow-hidden border border-line bg-surface/60 transition-colors hover:border-cyan/50 focus-within:border-cyan/60">
      <Link
        href={artistPath(artist)}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
      >
        <div className="relative h-28 w-full overflow-hidden border-b border-line bg-bg">
          {artist.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.bannerUrl}
              alt=""
              className="h-full w-full object-cover opacity-80"
              loading="lazy"
            />
          ) : (
            <BrandBanner compact />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent" />

          <div className="absolute right-3 top-3">
            {artist.verified ? (
              <VerifiedBadge label={dict.directory.badgeVerified} />
            ) : artist.claimed ? null : (
              <span className="border border-line bg-bg/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted backdrop-blur">
                {dict.directory.badgeUnclaimed}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 flex-col px-5 pb-5">
          <span className="-mt-8 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-violet/15 font-poster text-2xl leading-none text-violet">
            {artist.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              initials(artist.name)
            )}
          </span>

          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">{artist.name}</h3>

          {where ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {where}
            </p>
          ) : null}

          <span className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
            →
          </span>
        </div>
      </Link>
    </article>
  );
}
