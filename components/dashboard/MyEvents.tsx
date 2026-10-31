"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteEventAction,
  setEventStatusAction,
  type EventActionError,
  type EventActionResult,
} from "@/app/actions/events";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { DashboardEvent, DashboardStatus } from "@/lib/dashboard/queries";
import { CANCEL_REASON_MAX } from "@/lib/events/editor";
import { formatEventDate, isEventPast } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { placeName } from "@/lib/events/types";
import { cn } from "@/lib/utils";

type MyEventsProps = {
  events: DashboardEvent[];
  /** Serve solo a non mostrare un pulsante che il database riporterebbe in bozza. */
  verified: boolean;
  dict: Dictionary["dashboard"];
};

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 bg-violet-strong px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50";
const ghostButton =
  "inline-flex min-h-11 items-center justify-center gap-2 border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan disabled:opacity-50";
const dangerButton =
  "inline-flex min-h-11 items-center justify-center gap-2 border-b border-pink/40 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:border-pink disabled:opacity-50";

/** "I miei eventi": bozze, pubblicati e annullati, con le azioni di ognuno. */
export default function MyEvents({ events, verified, dict }: MyEventsProps) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** L'evento di cui si sta scrivendo il motivo dell'annullamento. */
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Il database risponde con codici: qui diventano frasi. Nessun messaggio
  // grezzo di Postgres arriva a chi usa il sito.
  const errorText: Record<EventActionError, string> = {
    generic: dict.errorGeneric,
    rateLimited: dict.tooManyEvents,
    suspended: dict.suspendedAccount,
  };

  async function run(key: string, action: () => Promise<EventActionResult>) {
    setBusy(key);
    setError(null);

    const outcome = await action();

    setBusy(null);

    if (!outcome.ok) {
      setError(outcome.error ? errorText[outcome.error] : dict.errorGeneric);
      return;
    }

    router.refresh();
  }

  /**
   * Annullare chiede il motivo (facoltativo) prima di farlo: la pagina pubblica
   * resta viva, e la prima cosa che chi l'aveva salvata legge è **perché**.
   */
  async function confirmCancel(eventId: string) {
    await run(`cancel-${eventId}`, () =>
      setEventStatusAction({ eventId, status: "cancelled", reason })
    );

    setCancellingId(null);
  }

  if (events.length === 0) {
    return (
      <section className="border-t border-line pt-8">
        <h2 className="font-poster text-3xl uppercase leading-none">{dict.emptyEventsTitle}</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{dict.emptyEventsText}</p>
        <LocaleLink
          href="/dashboard/events/new"
          className="mt-6 inline-flex min-h-11 items-center gap-2 bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
        >
          {dict.emptyEventsCta} <span aria-hidden="true">→</span>
        </LocaleLink>
      </section>
    );
  }

  const now = new Date();
  const isPast = (event: DashboardEvent) => isEventPast(event.startsAt, event.timezone, now);

  // "Passate" è una sezione di tempo, non di stato: una serata pubblicata che è
  // già andata non è più "online" per chi la organizza, anche se la pagina
  // resta leggibile. Bozze e annullate restano dove sono: raccontano un'altra
  // cosa (mai pubblicata / non si tiene).
  const sections: Array<{ key: string; label: string; list: DashboardEvent[] }> = [
    {
      key: "upcoming",
      label: dict.sectionUpcoming,
      list: events.filter((event) => event.status === "published" && !isPast(event)),
    },
    {
      key: "drafts",
      label: dict.sectionDrafts,
      list: events.filter((event) => event.status === "draft"),
    },
    {
      key: "cancelled",
      label: dict.sectionCancelled,
      list: events.filter((event) => event.status === "cancelled"),
    },
    {
      key: "past",
      label: dict.sectionPast,
      // La più recente per prima: è quella che si cerca.
      list: events
        .filter((event) => event.status === "published" && isPast(event))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    },
  ];

  const statusLabel: Record<DashboardStatus, string> = {
    draft: dict.statusDraft,
    published: dict.statusPublished,
    cancelled: dict.statusCancelled,
  };

  const statusClass: Record<DashboardStatus, string> = {
    draft: "text-muted",
    published: "text-cyan",
    cancelled: "text-pink",
  };

  return (
    <div className="space-y-8">
      {error ? (
        <p className="os-note os-note-pink">{error}</p>
      ) : null}

      {!verified ? (
        <p className="os-note">
          {dict.unverifiedNote}
        </p>
      ) : null}

      {sections.map((section) => {
        const list = section.list;
        if (list.length === 0) return null;

        return (
          <section key={section.key} id={section.key}>
            <h2 className="font-poster text-xl uppercase leading-none tracking-[-0.01em]">
              {section.label}{" "}
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                ({list.length})
              </span>
            </h2>

            <div className="mt-4 border-t border-line">
              {list.map((event) => {
                const when = formatEventDate(event.startsAt, event.timezone, locale);
                const where = [placeName(event), event.city].filter(Boolean).join(" · ");
                // Pubblicata ma già andata: si mostra "Conclusa", non "Pubblicato".
                const archived = event.status === "published" && isPast(event);

                return (
                  <article key={event.id} className="border-b border-line py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-base font-semibold">{event.title}</h3>
                      <span
                        className={cn(
                          "font-mono text-[9px] uppercase tracking-[0.12em]",
                          archived ? "text-muted" : statusClass[event.status]
                        )}
                      >
                        {archived ? dict.statusPast : statusLabel[event.status]}
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      {[when.full, where].filter(Boolean).join(" · ")}
                    </p>

                    {event.status === "draft" ? (
                      <p className="mt-1 text-xs text-muted">{dict.draftNote}</p>
                    ) : null}
                    {event.status === "cancelled" ? (
                      <>
                        <p className="mt-1 text-xs text-muted">{dict.cancelledNote}</p>
                        {event.cancelReason ? (
                          <p className="mt-1 text-xs text-white/70">{event.cancelReason}</p>
                        ) : null}
                      </>
                    ) : null}
                    {archived ? (
                      <p className="mt-1 text-xs text-muted">{dict.pastNote}</p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <LocaleLink href={`/dashboard/events/${event.id}`} className={ghostButton}>
                        {dict.edit}
                      </LocaleLink>

                      {event.status !== "published" && verified ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            run(`publish-${event.id}`, () =>
                              setEventStatusAction({ eventId: event.id, status: "published" })
                            )
                          }
                          className={primaryButton}
                        >
                          {busy === `publish-${event.id}`
                            ? event.status === "cancelled"
                              ? dict.republishing
                              : dict.publishing
                            : event.status === "cancelled"
                              ? dict.republish
                              : dict.publish}
                        </button>
                      ) : null}

                      {event.status === "published" ? (
                        <>
                          {!archived ? (
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => {
                                setReason("");
                                setCancellingId(event.id);
                              }}
                              className={ghostButton}
                            >
                              {dict.cancelEvent}
                            </button>
                          ) : null}

                          <LocaleLink href={eventPath(event)} className={ghostButton}>
                            {dict.viewPublic}
                          </LocaleLink>
                        </>
                      ) : null}

                      {event.status === "cancelled" ? (
                        <LocaleLink href={eventPath(event)} className={ghostButton}>
                          {dict.viewPublic}
                        </LocaleLink>
                      ) : null}

                      {/*
                        L'eliminazione è per tutti gli stati, ma è l'ultima
                        strada: chi ha una serata che non si tiene dovrebbe
                        annullarla, così chi l'aveva salvata legge il motivo.
                      */}
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          if (!window.confirm(dict.confirmDelete)) return;
                          void run(`delete-${event.id}`, () =>
                            deleteEventAction({ eventId: event.id })
                          );
                        }}
                        className={dangerButton}
                      >
                        {busy === `delete-${event.id}` ? dict.deleting : dict.deleteEvent}
                      </button>
                    </div>

                    {cancellingId === event.id ? (
                      <div className="mt-4 border-l-2 border-line-strong pl-4">
                        <label
                          htmlFor={`cancel-reason-${event.id}`}
                          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                        >
                          {dict.cancelReasonLabel}
                        </label>

                        <textarea
                          id={`cancel-reason-${event.id}`}
                          className="os-field mt-2"
                          rows={2}
                          maxLength={CANCEL_REASON_MAX}
                          value={reason}
                          onChange={(changeEvent) => setReason(changeEvent.target.value)}
                        />

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void confirmCancel(event.id)}
                            className={primaryButton}
                          >
                            {busy === `cancel-${event.id}` ? dict.cancelling : dict.cancelConfirm}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancellingId(null)}
                            className={ghostButton}
                          >
                            {dict.cancelDismiss}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
