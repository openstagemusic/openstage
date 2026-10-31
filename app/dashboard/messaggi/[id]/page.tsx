import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  addBookingNoteAction,
  deleteBookingNoteAction,
  setBookingReminderAction,
  setBookingStatusAction,
} from "@/app/actions/booking";
import BookingReplyForm from "@/components/booking/BookingReplyForm";
import { bookingStatusMeta } from "@/components/booking/status";
import TrashIcon from "@/components/notifications/TrashIcon";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getBookingThread, type BookingStatus } from "@/lib/booking/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Le transizioni che hanno senso dallo stato attuale. */
function transitions(status: BookingStatus): { status: BookingStatus; key: "openCta" | "confirmCta" | "declineCta" | "archiveCta" | "reopenCta" }[] {
  if (!status || status === "new" || status === "open") {
    return [
      { status: "open", key: "openCta" },
      { status: "confirmed", key: "confirmCta" },
      { status: "declined", key: "declineCta" },
      { status: "archived", key: "archiveCta" },
    ];
  }

  return [{ status: "open", key: "reopenCta" }];
}

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
  const dayFormat = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "long",
  });
  const profileHref =
    thread.counterpartType === "artist"
      ? artistPath({ slug: thread.counterpartSlug })
      : venuePath({ slug: thread.counterpartSlug });

  const meta = bookingStatusMeta(thread.status, t);
  const today = new Date().toISOString().slice(0, 10);
  const reminderLate = Boolean(thread.reminderAt && thread.reminderAt < today);
  const reminderToday = thread.reminderAt === today;

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

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          <span className={meta.className}>{meta.label}</span>
          {thread.eventDate ? (
            <span>
              {t.date}: {dayFormat.format(new Date(`${thread.eventDate}T12:00:00`))}
            </span>
          ) : null}
          {thread.feeText ? <span>{t.fee}: {thread.feeText}</span> : null}
          <LocaleLink href={profileHref} className="text-cyan hover:text-white">
            {t.threadProfile} →
          </LocaleLink>
        </div>
      </header>

      {/* Pipeline: stato e promemoria, nelle stesse parole della inbox. */}
      <section className="mt-6 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{t.statusLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            {transitions(thread.status).map((transition) => (
              <form key={transition.key} action={setBookingStatusAction}>
                <input type="hidden" name="threadId" value={thread.id} />
                <input type="hidden" name="status" value={transition.status} />
                <button
                  type="submit"
                  className="border-b border-line pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
                >
                  {t[transition.key]}
                </button>
              </form>
            ))}
          </div>
        </div>

        <form action={setBookingReminderAction} className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="threadId" value={thread.id} />
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {t.reminderLabel}
            </span>
            <input
              type="date"
              name="reminder"
              defaultValue={thread.reminderAt ?? ""}
              className="os-field w-auto text-xs"
            />
          </label>
          <button
            type="submit"
            className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
          >
            {t.reminderSave}
          </button>
          {thread.reminderAt ? (
            <span
              className={`pb-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                reminderLate ? "text-pink" : reminderToday ? "text-cyan" : "text-muted"
              }`}
            >
              {reminderToday
                ? t.reminderToday
                : reminderLate
                  ? t.reminderLate
                  : dayFormat.format(new Date(`${thread.reminderAt}T12:00:00`))}
            </span>
          ) : null}
        </form>
      </section>

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

      {/* Note private: un blocco a parte, con il suo linguaggio. */}
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
          {t.notesTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t.notesText}</p>

        {thread.notes.length > 0 ? (
          <ul className="mt-4 border-t border-line">
            {thread.notes.map((note) => (
              <li key={note.id} className="flex items-start justify-between gap-4 border-b border-line py-3">
                <div className="min-w-0">
                  <p className="whitespace-pre-line text-sm text-white/85">{note.body}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {date.format(new Date(note.createdAt))}
                  </p>
                </div>
                <form action={deleteBookingNoteAction} className="shrink-0">
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="threadId" value={thread.id} />
                  <button
                    type="submit"
                    aria-label={t.notesDelete}
                    title={t.notesDelete}
                    className="inline-flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-pink"
                  >
                    <TrashIcon />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.notesEmpty}</p>
        )}

        <form action={addBookingNoteAction} className="mt-5">
          <input type="hidden" name="threadId" value={thread.id} />
          <label htmlFor="booking-note" className="os-field-label">
            {t.notesLabel}
          </label>
          <textarea
            id="booking-note"
            name="body"
            rows={3}
            maxLength={2000}
            required
            placeholder={t.notesPlaceholder}
            className="os-field text-sm"
          />
          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 items-center gap-2 bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {t.notesAdd}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </div>
  );
}
