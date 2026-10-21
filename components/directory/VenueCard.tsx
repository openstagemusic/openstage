import Link from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import type { PublicVenue } from "@/lib/directory/queries";
import { venuePath } from "@/lib/events/paths";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Scheda del locale negli elenchi. La capienza compare solo quando il locale
 * l'ha dichiarata: nessun numero inventato.
 */
export default function VenueCard({ venue, locale }: { venue: PublicVenue; locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.directory;
  const where = [venue.address, venue.city].filter(Boolean).join(" · ");

  return (
    <article className="glass h-full overflow-hidden rounded-card border border-line transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-glow focus-within:border-cyan/50 focus-within:ring-2 focus-within:ring-cyan/40 motion-safe:hover:-translate-y-0.5">
      <Link href={venuePath(venue)} className="flex h-full flex-col p-5 focus-visible:outline-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 font-display text-sm font-semibold text-cyan"
          >
            {venue.name.slice(0, 1).toUpperCase()}
          </span>

          {venue.verified ? (
            <VerifiedBadge dict={t} />
          ) : venue.claimed ? null : (
            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
              {t.badgeUnclaimed}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-lg font-semibold leading-tight">{venue.name}</h3>

        {where ? <p className="mt-1 text-sm text-muted">{where}</p> : null}

        {venue.capacity ? (
          <p className="mt-auto pt-3 text-xs text-muted">
            {t.capacity}: {venue.capacity} {t.capacityPeople}
          </p>
        ) : null}
      </Link>
    </article>
  );
}
