import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import { listBookingThreads } from "@/lib/booking/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (session.role !== "artist" && session.role !== "venue") {
    redirect(withLocale(locale, "/dashboard"));
  }

  const dict = getDictionary(locale);
  const t = dict.booking;
  const threads = await listBookingThreads(session.id, session.role);
  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.inboxEyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.inboxTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.inboxLead}</p>
      </header>

      {threads.length > 0 ? (
        <ul className="mt-8 border-t border-line">
          {threads.map((thread) => (
            <li key={thread.id} className="border-b border-line">
              <LocaleLink
                href={`/dashboard/messaggi/${thread.id}`}
                className="group flex flex-col gap-2 py-5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-baseline sm:justify-between"
              >
                <div>
                  <p className="font-display text-lg font-semibold group-hover:text-cyan">
                    {thread.counterpartName}
                  </p>
                  <p className="mt-1 text-sm text-muted">{thread.subject}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-baseline gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  {thread.eventDate ? <span>{date.format(new Date(`${thread.eventDate}T12:00:00`))}</span> : null}
                  <span>
                    {t.lastMessage}: {date.format(new Date(thread.lastMessageAt))}
                  </span>
                </div>
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 max-w-2xl border-l-2 border-line-strong pl-4">
          <p className="text-sm leading-relaxed text-muted">{t.inboxEmpty}</p>
          <LocaleLink
            href="/artisti"
            className="mt-4 inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            {t.inboxCta} <span aria-hidden="true">→</span>
          </LocaleLink>
        </div>
      )}
    </div>
  );
}
