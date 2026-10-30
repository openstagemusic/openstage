import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import BookingReplyForm from "@/components/booking/BookingReplyForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getBookingThread } from "@/lib/booking/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BookingThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (session.role !== "artist" && session.role !== "venue") {
    redirect(withLocale(locale, "/dashboard"));
  }

  const { id } = await params;
  const thread = await getBookingThread(id, session.role);
  if (!thread) notFound();

  const dict = getDictionary(locale);
  const t = dict.booking;
  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const profileHref =
    thread.counterpartType === "artist"
      ? artistPath({ slug: thread.counterpartSlug })
      : venuePath({ slug: thread.counterpartSlug });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <LocaleLink
        href="/dashboard/messaggi"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.threadBack}
      </LocaleLink>

      <header className="mt-8 border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.inboxEyebrow}</p>
        <h1 className="mt-3 text-balance font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {thread.counterpartName}
        </h1>
        <p className="mt-3 text-sm text-muted">{thread.subject}</p>

        <div className="mt-4 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          {thread.eventDate ? (
            <span>{t.date}: {date.format(new Date(`${thread.eventDate}T12:00:00`))}</span>
          ) : null}
          {thread.feeText ? <span>{t.fee}: {thread.feeText}</span> : null}
          <LocaleLink href={profileHref} className="text-cyan hover:text-white">
            {t.threadProfile} →
          </LocaleLink>
        </div>
      </header>

      {thread.messages.length > 0 ? (
        <ul className="mt-6 border-t border-line">
          {thread.messages.map((message) => {
            const mine = message.senderId === session.id;

            return (
              <li
                key={message.id}
                className={mine ? "border-b border-line py-5" : "border-b border-line bg-white/[0.02] py-5"}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
                    {mine ? t.you : thread.counterpartName}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {date.format(new Date(message.createdAt))}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                  {message.body}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.noMessages}</p>
      )}

      <BookingReplyForm threadId={thread.id} dict={t} />
    </div>
  );
}
