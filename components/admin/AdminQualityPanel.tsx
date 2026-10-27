import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type {
  DataQualityReport,
  DuplicatePair,
  EventQualityIssue,
  PageQualityIssue,
  QualityPage,
} from "@/lib/admin/quality";
import { artistPath, venuePath } from "@/lib/events/paths";
import { formatEventDate } from "@/lib/events/format";

type Issue = EventQualityIssue | PageQualityIssue;

const SEVERE_ISSUES = new Set<Issue>([
  "noPage",
  "pastPublished",
  "suspiciousDate",
  "duplicate",
]);

function IssueChips({
  issues,
  labels,
}: {
  issues: Issue[];
  labels: Record<Issue, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((issue) => (
        <span
          key={issue}
          className={
            SEVERE_ISSUES.has(issue)
              ? "border border-pink/40 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-pink"
              : "border border-line bg-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted"
          }
        >
          {labels[issue]}
        </span>
      ))}
    </div>
  );
}

function pageHref(page: QualityPage): string | null {
  if (!page.slug) return null;
  return page.kind === "artist"
    ? artistPath({ slug: page.slug })
    : venuePath({ slug: page.slug });
}

function PageRow({
  page,
  labels,
  manageLabel,
}: {
  page: QualityPage;
  labels: Record<Issue, string>;
  manageLabel: string;
}) {
  const href = pageHref(page);
  const manageHref = page.kind === "artist" ? "/admin/artisti" : "/admin/locali";

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <LocaleLink href={href} className="font-display text-base font-semibold hover:text-cyan">
              {page.name}
            </LocaleLink>
          ) : (
            <span className="font-display text-base font-semibold">{page.name}</span>
          )}
          {page.city ? <span className="text-xs text-muted">{page.city}</span> : null}
        </div>
        <LocaleLink
          href={manageHref}
          className="mt-1 inline-block font-mono text-[9px] uppercase tracking-[0.1em] text-muted underline decoration-line underline-offset-4 hover:text-cyan"
        >
          {manageLabel}
        </LocaleLink>
        <div className="mt-2">
          <IssueChips issues={page.issues} labels={labels} />
        </div>
      </div>
    </li>
  );
}

function pairDetailLabel(pair: DuplicatePair, locale: string): string | null {
  if (pair.kind !== "event" || !pair.detail) return pair.detail;
  return formatEventDate(pair.detail, "Europe/Rome", locale).full;
}

export default function AdminQualityPanel({
  report,
  dict,
  locale,
}: {
  report: DataQualityReport;
  dict: Dictionary["admin"];
  locale: string;
}) {
  const labels: Record<Issue, string> = {
    noCity: dict.qualityIssueNoCity,
    noPage: dict.qualityIssueNoPage,
    pastPublished: dict.qualityIssuePastPublished,
    noCover: dict.qualityIssueNoCover,
    noPrice: dict.qualityIssueNoPrice,
    suspiciousDate: dict.qualityIssueSuspiciousDate,
    noGenre: dict.qualityIssueNoGenre,
    noBio: dict.qualityIssueNoBio,
    noSpotify: dict.qualityIssueNoSpotify,
    noAddress: dict.qualityIssueNoAddress,
    noCoords: dict.qualityIssueNoCoords,
    noWebsite: dict.qualityIssueNoWebsite,
    noEvents: dict.qualityIssueNoEvents,
    freePage: dict.qualityIssueFreePage,
    duplicate: dict.qualityIssueDuplicate,
  };

  const intlLocale = locale === "en" ? "en-GB" : "it-IT";

  const summary = [
    { label: dict.qualitySummaryEvents, value: report.events.length },
    { label: dict.qualitySummaryArtists, value: report.artists.length },
    { label: dict.qualitySummaryVenues, value: report.venues.length },
    { label: dict.qualitySummaryDuplicates, value: report.duplicates.length },
  ];

  return (
    <div className="mt-6 space-y-8">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className={
              item.value > 0
                ? "border border-cyan/40 bg-cyan/[0.06] p-3"
                : "border border-line bg-surface/40 p-3"
            }
          >
            <p
              className={
                item.value > 0
                  ? "font-poster text-2xl leading-none text-white sm:text-3xl"
                  : "font-poster text-2xl leading-none text-muted sm:text-3xl"
              }
            >
              {item.value}
            </p>
            <p className="mt-1.5 font-mono text-[9px] uppercase leading-tight tracking-[0.1em] text-muted">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">{dict.qualityHint}</p>

      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.qualityEventsTitle} <span className="text-muted">({report.events.length})</span>
        </h2>
        {report.events.length === 0 ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {dict.qualityEventsEmpty}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {report.events.map((event) => {
              const date = formatEventDate(event.startsAt, event.timezone, intlLocale);
              const place = [event.city, event.venueName].filter(Boolean).join(" · ");
              const people = event.artistName ? ` · ${event.artistName}` : "";

              return (
                <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <LocaleLink
                      href={`/dashboard/events/${event.id}`}
                      className="font-display text-base font-semibold hover:text-cyan"
                    >
                      {event.title}
                    </LocaleLink>
                    <p className="mt-1 text-xs text-muted">
                      {date.full}
                      {place ? ` · ${place}` : ""}
                      {people}
                    </p>
                    <div className="mt-2">
                      <IssueChips issues={event.issues} labels={labels} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.qualityArtistsTitle} <span className="text-muted">({report.artists.length})</span>
        </h2>
        {report.artists.length === 0 ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {dict.qualityArtistsEmpty}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {report.artists.map((artist) => (
              <PageRow
                key={artist.id}
                page={artist}
                labels={labels}
                manageLabel={dict.qualityManage}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.qualityVenuesTitle} <span className="text-muted">({report.venues.length})</span>
        </h2>
        {report.venues.length === 0 ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {dict.qualityVenuesEmpty}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {report.venues.map((venue) => (
              <PageRow
                key={venue.id}
                page={venue}
                labels={labels}
                manageLabel={dict.qualityManage}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.qualityDuplicatesTitle}{" "}
          <span className="text-muted">({report.duplicates.length})</span>
        </h2>
        {report.duplicates.length === 0 ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {dict.qualityDuplicatesEmpty}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {report.duplicates.map((pair) => {
              const kindLabel =
                pair.kind === "artist"
                  ? dict.qualityPairArtist
                  : pair.kind === "venue"
                    ? dict.qualityPairVenue
                    : dict.qualityPairEvent;
              const detail = pairDetailLabel(pair, intlLocale);

              return (
                <li key={`${pair.kind}-${pair.idA}-${pair.idB}`} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-pink/40 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-pink">
                      {kindLabel}
                    </span>
                    {detail ? <span className="text-xs text-muted">{detail}</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-white">
                    {pair.kind === "event" ? (
                      <>
                        <LocaleLink
                          href={`/dashboard/events/${pair.idA}`}
                          className="underline decoration-line underline-offset-4 hover:text-cyan"
                        >
                          {pair.nameA}
                        </LocaleLink>
                        {" / "}
                        <LocaleLink
                          href={`/dashboard/events/${pair.idB}`}
                          className="underline decoration-line underline-offset-4 hover:text-cyan"
                        >
                          {pair.nameB}
                        </LocaleLink>
                      </>
                    ) : (
                      <>
                        <LocaleLink
                          href={pair.kind === "artist" ? "/admin/artisti" : "/admin/locali"}
                          className="underline decoration-line underline-offset-4 hover:text-cyan"
                        >
                          {pair.nameA}
                        </LocaleLink>
                        {" / "}
                        <LocaleLink
                          href={pair.kind === "artist" ? "/admin/artisti" : "/admin/locali"}
                          className="underline decoration-line underline-offset-4 hover:text-cyan"
                        >
                          {pair.nameB}
                        </LocaleLink>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
