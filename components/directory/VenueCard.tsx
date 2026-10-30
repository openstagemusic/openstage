import BrandBanner from "@/components/directory/BrandBanner";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import Link from "@/components/i18n/LocaleLink";
import type { PublicVenue } from "@/lib/directory/queries";
import { venuePath } from "@/lib/events/paths";
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
 * Scheda del locale negli elenchi. La capienza compare solo quando il locale
 * l'ha dichiarata: nessun numero inventato.
 */
export default function VenueCard({ venue, locale }: { venue: PublicVenue; locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.directory;
  const where = [venue.address, venue.city].filter(Boolean).join(" · ");

  return (
    <article className="group h-full overflow-hidden border border-line bg-surface/60 transition-colors hover:border-cyan/50 focus-within:border-cyan/60">
      <Link
        href={venuePath(venue)}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
      >
        <div className="relative h-28 w-full overflow-hidden border-b border-line bg-bg">
          {venue.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.bannerUrl}
              alt=""
              className="h-full w-full object-cover opacity-80"
              loading="lazy"
            />
          ) : (
            <BrandBanner compact />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent" />

          <div className="absolute right-3 top-3">
            {venue.verified ? (
              <VerifiedBadge label={t.badgeVerified} />
            ) : venue.claimed ? null : (
              <span className="border border-line bg-bg/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted backdrop-blur">
                {t.badgeUnclaimed}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 flex-col px-5 pb-5">
          <span className="-mt-8 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-cyan/15 font-poster text-2xl leading-none text-cyan">
            {venue.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={venue.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              initials(venue.name)
            )}
          </span>

          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">{venue.name}</h3>

          {where ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {where}
            </p>
          ) : null}

          {venue.capacity ? (
            <p className="mt-auto pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {t.capacity}: {venue.capacity} {t.capacityPeople}
            </p>
          ) : (
            <span className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
              →
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
