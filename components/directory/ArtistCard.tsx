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
 * Scheda artista come poster, non come riquadro.
 *
 * Il banner occupa tutto lo spazio, il nome sta sopra l'immagine, l'avatar è un
 * cerchio sul bordo inferiore. Nessun contenitore con il bordo e nessun pulsante
 * dentro: al passaggio del mouse si accende un filo ciano e la freccia compare.
 */
export default function ArtistCard({
  artist,
  locale,
  index,
}: {
  artist: PublicArtist;
  locale: Locale;
  index?: number;
}) {
  const dict = getDictionary(locale);
  const where = [artist.city, artist.genre].filter(Boolean).join(" · ");

  return (
    <article className="group h-full">
      <Link
        href={artistPath(artist)}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg">
          {artist.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.bannerUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <BrandBanner compact />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-transparent" />

          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
              {typeof index === "number" ? String(index + 1).padStart(2, "0") : ""}
            </span>
            {artist.verified ? (
              <VerifiedBadge label={dict.directory.badgeVerified} />
            ) : artist.claimed ? null : (
              <span className="border border-line bg-bg/70 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted backdrop-blur">
                {dict.directory.badgeUnclaimed}
              </span>
            )}
          </div>

          <div className="absolute inset-x-3 bottom-3 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-violet/25 font-poster text-lg leading-none text-violet backdrop-blur">
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

            <h3 className="min-w-0 font-poster text-2xl uppercase leading-[0.9] tracking-[-0.01em] transition-colors group-hover:text-cyan">
              {artist.name}
            </h3>
          </div>

          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-cyan opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>

        <div className="flex items-baseline justify-between gap-3 pt-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {where || "—"}
          </p>
          <span
            aria-hidden="true"
            className="font-mono text-[11px] text-cyan opacity-0 transition-opacity group-hover:opacity-100"
          >
            →
          </span>
        </div>
      </Link>
    </article>
  );
}
