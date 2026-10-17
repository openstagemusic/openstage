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
    <article className="glass h-full overflow-hidden rounded-3xl border border-white/10 transition-colors hover:border-white/25">
      <Link href={venuePath(venue)} className="flex h-full flex-col">
        <div
          className="h-1.5 w-full bg-gradient-to-r from-violet via-cyan to-pink"
          aria-hidden="true"
        />

        <div className="flex flex-1 flex-col p-5">
          {venue.verified ? (
            <VerifiedBadge dict={t} className="self-start" />
          ) : venue.claimed ? null : (
            <span className="self-start rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted">
              {t.badgeUnclaimed}
            </span>
          )}

          <h3 className="mt-3 font-display text-lg font-semibold leading-tight">{venue.name}</h3>

          {where ? <p className="mt-1 text-sm text-muted">{where}</p> : null}

          {venue.capacity ? (
            <p className="mt-auto pt-3 text-xs text-muted">
              {t.capacity}: {venue.capacity} {t.capacityPeople}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
