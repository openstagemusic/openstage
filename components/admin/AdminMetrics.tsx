import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminMetrics as Metrics } from "@/lib/admin/queries";

/**
 * I numeri della control room, letti adesso dal database.
 *
 * Su telefono niente elenco lunghissimo: due colonne di numeri compatti e
 * quattro grafici a barre (CSS puro, nessuna libreria). I numeri restano
 * leggibili anche senza colore, perché ogni barra ha la sua etichetta.
 */

const TONES = ["bg-cyan", "bg-violet-strong", "bg-pink", "bg-line-strong", "bg-white/40"] as const;

type Segment = { label: string; value: number; tone?: (typeof TONES)[number] };

function StackedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return <div className="h-2 rounded-full bg-white/10" aria-hidden="true" />;
  }

  return (
    <>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        {segments.map((segment, index) =>
          segment.value > 0 ? (
            <span
              key={segment.label}
              className={segment.tone ?? TONES[index % TONES.length]}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ) : null
        )}
      </div>
    </>
  );
}

function Legend({ segments }: { segments: Segment[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
      {segments.map((segment, index) => (
        <li key={segment.label} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 ${segment.tone ?? TONES[index % TONES.length]}`}
          />
          <span className="truncate">{segment.label}</span>
          <span className="ml-auto font-mono text-white">{segment.value}</span>
        </li>
      ))}
    </ul>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line bg-surface/40 p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;

  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-muted">{label}</span>
        <span className="font-mono text-white">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-cyan" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

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

  const tiles: Array<{ label: string; value: number }> = [
    { label: dict.metricsUsers, value: metrics.usersTotal },
    { label: dict.metricsArtists, value: metrics.artistsTotal },
    { label: dict.metricsVenues, value: metrics.venuesTotal },
    { label: dict.metricsEventsPublished, value: metrics.eventsPublished },
    { label: dict.metricsEventsUpcoming, value: metrics.eventsUpcoming },
    { label: dict.metricsSaved, value: metrics.savedTotal },
    { label: dict.metricsMessagesOpen, value: metrics.messagesOpen },
    { label: dict.metricsReportsOpen, value: metrics.reportsOpen },
  ];

  const roles: Segment[] = [
    { label: dict.metricsFans, value: metrics.usersFan },
    { label: dict.metricsArtists, value: metrics.usersArtist },
    { label: dict.metricsVenues, value: metrics.usersVenue },
    { label: dict.metricsAdmins, value: metrics.usersAdmin },
  ];

  const events: Segment[] = [
    { label: dict.metricsEventsPublished, value: metrics.eventsPublished },
    { label: dict.metricsEventsDraft, value: metrics.eventsDraft },
    { label: dict.metricsEventsCancelled, value: metrics.eventsCancelled },
  ];

  const pages: Segment[] = [
    { label: `${dict.metricsArtists} · ${dict.directoryClaimed}`, value: metrics.artistsClaimed },
    {
      label: `${dict.metricsArtists} · ${dict.directoryUnclaimed}`,
      value: metrics.artistsTotal - metrics.artistsClaimed,
      tone: "bg-line-strong",
    },
    { label: `${dict.metricsVenues} · ${dict.directoryClaimed}`, value: metrics.venuesClaimed, tone: "bg-violet-strong" },
    {
      label: `${dict.metricsVenues} · ${dict.directoryUnclaimed}`,
      value: metrics.venuesTotal - metrics.venuesClaimed,
      tone: "bg-line-strong",
    },
  ];

  const queues = [
    { label: dict.metricsMessagesOpen, value: metrics.messagesOpen },
    { label: dict.metricsReportsOpen, value: metrics.reportsOpen },
    { label: dict.metricsClaimsPending, value: metrics.claimsPending },
    { label: dict.metricsEmailQueued, value: metrics.emailQueued },
    { label: dict.metricsEmailFailed, value: metrics.emailFailed },
  ];
  const queueMax = Math.max(1, ...queues.map((queue) => queue.value));

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold">{dict.metricsTitle}</h2>
      <p className="mt-1 text-sm text-muted">{dict.metricsSubtitle}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="border border-line bg-surface/50 p-3">
            <p className="font-poster text-2xl leading-none sm:text-3xl">{tile.value}</p>
            <p className="mt-1.5 font-mono text-[9px] uppercase leading-tight tracking-[0.1em] text-muted">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ChartCard title={dict.metricsUsersByRole}>
          <StackedBar segments={roles} />
          <Legend segments={roles} />
        </ChartCard>

        <ChartCard title={dict.metricsEventsByStatus}>
          <StackedBar segments={events} />
          <Legend segments={events} />
        </ChartCard>

        <ChartCard title={dict.metricsPagesCoverage}>
          <StackedBar segments={pages} />
          <Legend segments={pages} />
        </ChartCard>

        <ChartCard title={dict.metricsQueues}>
          {queues.every((queue) => queue.value === 0) ? (
            <p className="text-sm text-muted">{dict.metricsNoQueues}</p>
          ) : (
            <div className="space-y-2">
              {queues.map((queue) => (
                <BarRow key={queue.label} label={queue.label} value={queue.value} max={queueMax} />
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-3 grid gap-2 border border-line bg-surface/40 p-4 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.metricsThisMonth}
          </p>
          <p className="mt-1 text-sm text-white">
            {fill(dict.metricsThisMonthDetail, {
              users: metrics.usersNewMonth,
              events: metrics.eventsNewMonth,
            })}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.metricsSuspended}
          </p>
          <p className="mt-1 text-sm text-white">{metrics.usersSuspended}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.metricsWithoutEventsLabel}
          </p>
          <p className="mt-1 text-sm text-white">
            {metrics.artistsWithoutEvents + metrics.venuesWithoutEvents}
          </p>
        </div>
      </div>
    </section>
  );
}
