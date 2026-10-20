"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  adminMergeAction,
  adminSetEventStatusAction,
  adminSuspendProfileAction,
} from "@/app/actions/moderation";
import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatEventDateLong, isEventPast } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import type { ModerationEvent } from "@/lib/moderation/queries";

/**
 * Il pannello delle serate già online (B40).
 *
 * Fino a ieri l'admin poteva verificare e approvare, ma non aveva un posto dove
 * vedere **quello che era già pubblico**: una serata falsa pubblicata da un
 * account verificato non passava da nessuna coda. Qui invece si vede tutto,
 * con le segnalazioni accanto, e si decide: annullare, rimettere online,
 * sospendere l'autore, unire un doppione.
 *
 * Le pause automatiche (tre segnalazioni da persone diverse e verificate) sono
 * **proposte**, non condanne: la serata torna in bozza e aspetta una decisione.
 */

type Filter = "all" | "online" | "past" | "paused" | "reported" | "cancelled";

export default function AdminEventsPanel({
  events,
  dict,
  locale,
}: {
  events: ModerationEvent[];
  dict: Dictionary["admin"];
  locale: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});

  const visible = events.filter((event) => {
    if (filter === "online")
      return event.status === "published" && !isEventPast(event.startsAt, event.timezone);
    if (filter === "past")
      return event.status === "published" && isEventPast(event.startsAt, event.timezone);
    if (filter === "paused") return event.autoHiddenAt !== null;
    if (filter === "reported") return event.reports > 0;
    if (filter === "cancelled") return event.status === "cancelled";
    return true;
  });

  async function run(id: string, work: () => Promise<{ ok: boolean }>) {
    setBusy(id);
    setError(null);

    const outcome = await work();

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.moderationFailed);
      return;
    }

    router.refresh();
  }

  function statusLabel(event: ModerationEvent): string {
    if (event.autoHiddenAt) return dict.moderationPaused;
    if (event.status === "published") {
      // "Online" per una serata già andata sarebbe una bugia: è conclusa.
      return isEventPast(event.startsAt, event.timezone)
        ? dict.moderationStatusPast
        : dict.moderationStatusPublished;
    }
    if (event.status === "cancelled") return dict.moderationStatusCancelled;
    return dict.moderationStatusDraft;
  }

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: dict.moderationFilterAll },
    { key: "online", label: dict.moderationFilterOnline },
    { key: "past", label: dict.moderationFilterPast },
    { key: "paused", label: dict.moderationFilterPaused },
    { key: "reported", label: dict.moderationFilterReported },
    { key: "cancelled", label: dict.moderationFilterCancelled },
  ];

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={
              filter === item.key
                ? "rounded-full border border-cyan/50 bg-cyan/15 px-3 py-1 text-xs text-white"
                : "rounded-full border border-white/10 px-3 py-1 text-xs text-muted transition-colors hover:text-white"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-xs text-pink">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{dict.moderationEmpty}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((event) => {
            const working = busy === event.id;

            return (
              <li key={event.id} className="glass rounded-2xl border border-white/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-white">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {[event.city, formatEventDateLong(event.startsAt, "Europe/Rome", locale)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {event.ownerName ?? event.ownerEmail ?? "—"}
                      {event.ownerSuspendedAt ? (
                        <span className="ml-2 rounded-full border border-pink/40 bg-pink/10 px-2 py-0.5 text-pink">
                          {dict.moderationOwnerSuspended}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-muted">
                      {statusLabel(event)}
                    </span>
                    {event.reports > 0 ? (
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-amber-100">
                        {dict.moderationReports.replace("{n}", String(event.reports))}
                      </span>
                    ) : null}
                    <Link
                      href={eventPath(event)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-cyan transition-colors hover:border-cyan/40"
                    >
                      {dict.moderationOpen}
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {event.status === "published" ? (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() =>
                        void run(event.id, () =>
                          adminSetEventStatusAction({ eventId: event.id, status: "cancelled" })
                        )
                      }
                      className="rounded-full border border-pink/40 px-3 py-1.5 text-xs text-pink transition-colors hover:bg-pink/10 disabled:opacity-50"
                    >
                      {dict.moderationCancel}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() =>
                        void run(event.id, () =>
                          adminSetEventStatusAction({ eventId: event.id, status: "published" })
                        )
                      }
                      className="rounded-full border border-cyan/40 px-3 py-1.5 text-xs text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                    >
                      {dict.moderationRestore}
                    </button>
                  )}

                  {event.status === "published" ? (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() =>
                        void run(event.id, () =>
                          adminSetEventStatusAction({ eventId: event.id, status: "draft" })
                        )
                      }
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-50"
                    >
                      {dict.moderationDraft}
                    </button>
                  ) : null}

                  {event.ownerId ? (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() =>
                        void run(event.id, () =>
                          adminSuspendProfileAction({
                            profileId: event.ownerId as string,
                            suspend: !event.ownerSuspendedAt,
                          })
                        )
                      }
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-50"
                    >
                      {event.ownerSuspendedAt ? dict.moderationActivate : dict.moderationSuspend}
                    </button>
                  ) : null}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted transition-colors hover:text-white">
                    {dict.moderationMergeTitle}
                  </summary>
                  <p className="mt-2 text-xs text-muted">{dict.moderationMergeHint}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={mergeTarget[event.id] ?? ""}
                      onChange={(change) =>
                        setMergeTarget((current) => ({ ...current, [event.id]: change.target.value }))
                      }
                      placeholder={dict.moderationMergePlaceholder}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d0d1a] px-3 py-2 text-xs text-white outline-none focus:border-cyan/60"
                    />
                    <button
                      type="button"
                      disabled={working || !(mergeTarget[event.id] ?? "").trim()}
                      onClick={() =>
                        void run(event.id, () =>
                          adminMergeAction({
                            sourceId: event.id,
                            target: mergeTarget[event.id] ?? "",
                          })
                        )
                      }
                      className="rounded-full border border-violet/40 px-3 py-1.5 text-xs text-white transition-colors hover:bg-violet/10 disabled:opacity-50"
                    >
                      {dict.moderationMerge}
                    </button>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
