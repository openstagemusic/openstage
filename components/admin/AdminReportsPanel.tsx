"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { resolveReportAction } from "@/app/actions/admin";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminReport } from "@/lib/admin/queries";
import { eventPath } from "@/lib/events/paths";

const reasonKey = {
  fake: "reasonFake",
  wrong_info: "reasonWrongInfo",
  spam: "reasonSpam",
  offensive: "reasonOffensive",
  other: "reasonOther",
} as const;

export default function AdminReportsPanel({
  reports,
  dict,
}: {
  reports: AdminReport[];
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  async function update(
    report: AdminReport,
    status: "open" | "resolved" | "dismissed"
  ) {
    setBusy(report.id);
    setError(null);
    setNotice(null);

    const outcome = await resolveReportAction({ reportId: report.id, status });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.reportFailed);
      return;
    }

    setNotice(
      status === "resolved"
        ? dict.reportResolvedNotice
        : status === "dismissed"
          ? dict.reportDismissedNotice
          : dict.reportReopenedNotice
    );
    router.refresh();
  }

  if (reports.length === 0) {
    return <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{dict.reportsEmpty}</p>;
  }

  return (
    <div className="mt-6">
      {notice ? (
        <p className="mb-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}

      <ul className="border-t border-line">
        {reports.map((report) => {
          const label =
            report.status === "open"
              ? dict.reportOpen
              : report.status === "resolved"
                ? dict.reportResolved
                : dict.reportDismissed;

          return (
            <li key={report.id} className="border-b border-line py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        report.status === "open"
                          ? "border border-pink/50 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink"
                          : "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                      }
                    >
                      {label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-cyan">
                      {dict[reasonKey[report.reason as keyof typeof reasonKey] ?? "reasonOther"]}
                    </span>
                  </div>

                  <p className="mt-2">
                    {report.eventSlug ? (
                      <LocaleLink
                        href={eventPath({
                          id: report.eventId,
                          slug: report.eventSlug,
                          city: report.eventCity,
                        })}
                        className="font-display text-lg font-semibold hover:text-cyan"
                      >
                        {report.eventTitle ?? report.eventId}
                      </LocaleLink>
                    ) : (
                      <span className="font-display text-lg font-semibold">
                        {report.eventTitle ?? report.eventId}
                      </span>
                    )}
                  </p>

                  {report.note ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{report.note}</p>
                  ) : null}

                  <p className="mt-2 font-mono text-[10px] tracking-[0.06em] text-muted">
                    {dict.reportReporter}: {report.reporterEmail ?? "—"} ·{" "}
                    {date.format(new Date(report.createdAt))}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.status === "open" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy === report.id}
                        onClick={() => void update(report, "resolved")}
                        className="inline-flex min-h-9 items-center border border-cyan/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                      >
                        {busy === report.id ? dict.working : dict.reportResolve}
                      </button>
                      <button
                        type="button"
                        disabled={busy === report.id}
                        onClick={() => void update(report, "dismissed")}
                        className="inline-flex min-h-9 items-center border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white disabled:opacity-50"
                      >
                        {busy === report.id ? dict.working : dict.reportDismiss}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === report.id}
                      onClick={() => void update(report, "open")}
                      className="inline-flex min-h-9 items-center border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white disabled:opacity-50"
                    >
                      {busy === report.id ? dict.working : dict.reportReopen}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
