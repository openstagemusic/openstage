import Link from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
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
    <article className="group h-full border border-line bg-surface/60 transition-colors hover:border-cyan/50 focus-within:border-cyan/60">
      <Link
        href={venuePath(venue)}
        className="flex h-full flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center border border-cyan/30 bg-cyan/10 font-poster text-3xl leading-none text-cyan"
          >
            {initials(venue.name)}
          </span>

          {venue.verified ? (
            <VerifiedBadge dict={t} />
          ) : venue.claimed ? null : (
            <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {t.badgeUnclaimed}
            </span>
          )}
        </div>

        <h3 className="mt-5 font-display text-xl font-semibold leading-tight">{venue.name}</h3>

        {where ? (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{where}</p>
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
      </Link>
    </article>
  );
}
