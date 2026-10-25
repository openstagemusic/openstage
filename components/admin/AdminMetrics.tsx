import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminMetrics as Metrics } from "@/lib/admin/queries";

/**
 * I numeri della control room. Sono tutti letti adesso dal database: se una
 * metrica non c'è, non si mostra uno zero inventato ma il trattino.
 */
export default function AdminMetrics({
  metrics,
  dict,
}: {
  metrics: Metrics | null;
  dict: Dictionary["admin"];
}) {
  if (!metrics) {
    return (
      <p className="mt-5 border-l-2 border-pink pl-3 text-sm text-muted">
        {dict.errorGeneric}
      </p>
    );
  }

  const fill = (template: string, values: Record<string, number | string>) =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? "—"));

  const cards: Array<{ label: string; value: number; detail?: string }> = [
    {
      label: dict.metricsUsers,
      value: metrics.usersTotal,
      detail: fill(dict.metricsUsersDetail, {
        fan: metrics.usersFan,
        artist: metrics.usersArtist,
        venue: metrics.usersVenue,
      }),
    },
    { label: dict.metricsNewUsers, value: metrics.usersNewMonth },
    { label: dict.metricsSuspended, value: metrics.usersSuspended },
    {
      label: dict.metricsArtists,
      value: metrics.artistsTotal,
      detail: fill(dict.metricsArtistsDetail, { claimed: metrics.artistsClaimed }),
    },
    {
      label: dict.metricsVenues,
      value: metrics.venuesTotal,
      detail: fill(dict.metricsVenuesDetail, { claimed: metrics.venuesClaimed }),
    },
    {
      label: dict.metricsWithoutEventsLabel,
      value: metrics.artistsWithoutEvents + metrics.venuesWithoutEvents,
      detail: fill(dict.metricsWithoutEvents, {
        count: metrics.artistsWithoutEvents + metrics.venuesWithoutEvents,
      }),
    },
    { label: dict.metricsEventsPublished, value: metrics.eventsPublished },
    { label: dict.metricsEventsUpcoming, value: metrics.eventsUpcoming },
    { label: dict.metricsEventsDraft, value: metrics.eventsDraft },
    { label: dict.metricsEventsCancelled, value: metrics.eventsCancelled },
    { label: dict.metricsNewEvents, value: metrics.eventsNewMonth },
    { label: dict.metricsSaved, value: metrics.savedTotal },
    { label: dict.metricsMessagesOpen, value: metrics.messagesOpen },
    { label: dict.metricsReportsOpen, value: metrics.reportsOpen },
    { label: dict.metricsClaimsPending, value: metrics.claimsPending },
    { label: dict.metricsEmailQueued, value: metrics.emailQueued },
    { label: dict.metricsEmailFailed, value: metrics.emailFailed },
  ];

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold">{dict.metricsTitle}</h2>
      <p className="mt-1 text-sm text-muted">{dict.metricsSubtitle}</p>

      <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-bg p-4">
            <p className="font-poster text-3xl leading-none">{card.value}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {card.label}
            </p>
            {card.detail ? <p className="mt-1 text-[11px] text-muted">{card.detail}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
