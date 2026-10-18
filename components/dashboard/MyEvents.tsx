"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteDraftAction,
  setEventStatusAction,
  type EventActionResult,
} from "@/app/actions/events";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { DashboardEvent, DashboardStatus } from "@/lib/dashboard/queries";
import { formatEventDate } from "@/lib/events/format";
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
  "rounded-full bg-violet px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const ghostButton =
  "rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-50";

/** "I miei eventi": bozze, pubblicati e annullati, con le azioni di ognuno. */
export default function MyEvents({ events, verified, dict }: MyEventsProps) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<EventActionResult>) {
    setBusy(key);
    setError(null);

    const outcome = await action();

    setBusy(null);

    if (!outcome.ok) {
      setError(outcome.error ?? dict.errorGeneric);
      return;
    }

    router.refresh();
  }

  if (events.length === 0) {
    return (
      <section className="glass rounded-3xl border border-white/10 p-6">
        <h2 className="font-display text-xl font-semibold">{dict.emptyEventsTitle}</h2>
        <p className="mt-2 text-sm text-muted">{dict.emptyEventsText}</p>
        <LocaleLink
          href="/dashboard/events/new"
          className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {dict.emptyEventsCta}
        </LocaleLink>
      </section>
    );
  }

  const sections: Array<{ status: DashboardStatus; label: string }> = [
    { status: "draft", label: dict.sectionDrafts },
    { status: "published", label: dict.sectionPublished },
    { status: "cancelled", label: dict.sectionCancelled },
  ];

  const statusLabel: Record<DashboardStatus, string> = {
    draft: dict.statusDraft,
    published: dict.statusPublished,
    cancelled: dict.statusCancelled,
  };

  const statusClass: Record<DashboardStatus, string> = {
    draft: "border-white/15 text-muted",
    published: "border-cyan/40 bg-cyan/10 text-white",
    cancelled: "border-pink/40 bg-pink/10 text-white",
  };

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-2xl border border-pink/40 bg-pink/10 p-4 text-sm text-white">{error}</p>
      ) : null}

      {!verified ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
          {dict.unverifiedNote}
        </p>
      ) : null}

      {sections.map((section) => {
        const list = events.filter((event) => event.status === section.status);
        if (list.length === 0) return null;

        return (
          <section key={section.status}>
            <h2 className="font-display text-xl font-semibold">
              {section.label} <span className="text-muted">({list.length})</span>
            </h2>

            <div className="mt-4 space-y-3">
              {list.map((event) => {
                const when = formatEventDate(event.startsAt, event.timezone, locale);
                const where = [placeName(event), event.city].filter(Boolean).join(" · ");

                return (
                  <article key={event.id} className="glass rounded-2xl border border-white/10 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-base font-semibold">{event.title}</h3>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs",
                          statusClass[event.status]
                        )}
                      >
                        {statusLabel[event.status]}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-muted">
                      {[when.full, where].filter(Boolean).join(" · ")}
                    </p>

                    {event.status === "draft" ? (
                      <p className="mt-1 text-xs text-muted">{dict.draftNote}</p>
                    ) : null}
                    {event.status === "cancelled" ? (
                      <p className="mt-1 text-xs text-muted">{dict.cancelledNote}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
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
                          {busy === `publish-${event.id}` ? dict.publishing : dict.publish}
                        </button>
                      ) : null}

                      {event.status === "published" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() =>
                              run(`cancel-${event.id}`, () =>
                                setEventStatusAction({ eventId: event.id, status: "cancelled" })
                              )
                            }
                            className={ghostButton}
                          >
                            {busy === `cancel-${event.id}` ? dict.cancelling : dict.cancelEvent}
                          </button>

                          <LocaleLink href={eventPath(event)} className={ghostButton}>
                            {dict.viewPublic}
                          </LocaleLink>
                        </>
                      ) : null}

                      {event.status === "draft" ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => {
                            if (!window.confirm(dict.confirmDelete)) return;
                            void run(`delete-${event.id}`, () =>
                              deleteDraftAction({ eventId: event.id })
                            );
                          }}
                          className={ghostButton}
                        >
                          {busy === `delete-${event.id}` ? dict.deleting : dict.deleteDraft}
                        </button>
                      ) : null}
                    </div>
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
