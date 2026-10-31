import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { bookingStatusMeta } from "@/components/booking/status";
import LocaleLink from "@/components/i18n/LocaleLink";
import { ACTION_ARROW, ACTION_LINE } from "@/components/ui/actions";
import { listBookingThreads, type BookingStatus } from "@/lib/booking/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Filter = "all" | "tohandle" | "confirmed" | "declined" | "archived";

const FILTERS: Filter[] = ["all", "tohandle", "confirmed", "declined", "archived"];

function matches(status: BookingStatus, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "tohandle") return status === "new" || status === "open";
  if (filter === "confirmed") return status === "confirmed";
  if (filter === "declined") return status === "declined";
  return status === "archived";
}

/** Data in formato breve, senza ora: il promemoria è un giorno. */
function shortDay(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (session.role !== "artist" && session.role !== "venue") {
    redirect(withLocale(locale, "/dashboard"));
  }

  const dict = getDictionary(locale);
  const t = dict.booking;
  const params = await searchParams;
  const filter: Filter = FILTERS.includes(params.stato as Filter)
    ? (params.stato as Filter)
    : "all";

  const threads = await listBookingThreads(session.id, session.role);
  const visible = threads.filter((thread) => matches(thread.status, filter));
  const counts = Object.fromEntries(
    FILTERS.map((key) => [key, threads.filter((thread) => matches(thread.status, key)).length])
  ) as Record<Filter, number>;

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });
  const today = new Date().toISOString().slice(0, 10);

  const filterLabel: Record<Filter, string> = {
    all: t.filterAll,
    tohandle: t.filterToHandle,
    confirmed: t.statusConfirmed,
    declined: t.statusDeclined,
    archived: t.statusArchived,
  };

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.inboxEyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.inboxTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.inboxLead}</p>

        {threads.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/dashboard/messaggi/export" className={ACTION_LINE}>
              {t.exportCta} <span aria-hidden="true">↓</span>
            </a>
            <LocaleLink href="/artisti" className={ACTION_LINE}>
              {t.inboxCta}
              <span aria-hidden="true" className={ACTION_ARROW}>
                →
              </span>
            </LocaleLink>
          </div>
        ) : null}
      </header>

      {threads.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
          {FILTERS.map((key) => (
            <LocaleLink
              key={key}
              href={key === "all" ? "/dashboard/messaggi" : `/dashboard/messaggi?stato=${key}`}
              aria-current={filter === key ? "page" : undefined}
              className={
                filter === key
                  ? "border-b border-cyan pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan"
                  : "border-b border-transparent pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
              }
            >
              {filterLabel[key]}{" "}
              <span className="text-[9px] opacity-70">{counts[key]}</span>
            </LocaleLink>
          ))}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <ul className="mt-4 border-t border-line">
          {visible.map((thread) => {
            const meta = bookingStatusMeta(thread.status, t);
            const due = thread.reminderAt && thread.reminderAt <= today;

            return (
              <li key={thread.id} className="border-b border-line">
                <LocaleLink
                  href={`/dashboard/messaggi/${thread.id}`}
                  className="group flex flex-col gap-2 py-5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold group-hover:text-cyan">
                      {thread.counterpartName}
                    </p>
                    <p className="mt-1 text-sm text-muted">{thread.subject}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em]">
                    <span className={meta.className}>{meta.label}</span>
                    {thread.eventDate ? (
                      <span className="text-muted">{date.format(new Date(`${thread.eventDate}T12:00:00`))}</span>
                    ) : null}
                    {thread.reminderAt ? (
                      <span className={due ? "text-pink" : "text-muted"}>
                        {t.reminderLabel}: {shortDay(thread.reminderAt, locale)}
                      </span>
                    ) : null}
                    <span className="text-muted">
                      {t.lastMessage}: {date.format(new Date(thread.lastMessageAt))}
                    </span>
                  </div>
                </LocaleLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 max-w-2xl border-l-2 border-line-strong pl-4">
          <p className="text-sm leading-relaxed text-muted">
            {threads.length === 0 ? t.inboxEmpty : t.emptyFilter}
          </p>
          {threads.length === 0 ? (
            <LocaleLink
              href="/artisti"
              className="mt-4 inline-flex min-h-11 items-center gap-2 bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
            >
              {t.inboxCta} <span aria-hidden="true">→</span>
            </LocaleLink>
          ) : null}
        </div>
      )}
    </div>
  );
}
