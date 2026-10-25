"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { publishEventAction } from "@/app/actions/claims";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { DraftEvent } from "@/lib/claims/queries";
import { eventPath } from "@/lib/events/paths";

export default function AdminDraftsPanel({
  drafts,
  dict,
}: {
  drafts: DraftEvent[];
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

  async function publish(draft: DraftEvent) {
    setBusy(draft.id);
    setError(null);
    setNotice(null);

    const outcome = await publishEventAction(draft.id);
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.draftPublishFailed);
      return;
    }

    setNotice(dict.draftPublished);
    router.refresh();
  }

  if (drafts.length === 0) {
    return <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{dict.draftsEmpty}</p>;
  }

  return (
    <div className="mt-6">
      {notice ? (
        <p className="border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">{notice}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 border-t border-line">
        {drafts.map((draft) => (
          <li key={draft.id} className="border-b border-line py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <LocaleLink
                  href={eventPath({ id: draft.id, slug: draft.slug, city: draft.city })}
                  className="font-display text-lg font-semibold hover:text-cyan"
                >
                  {draft.title}
                </LocaleLink>
                <p className="mt-1 text-xs text-muted">
                  {date.format(new Date(draft.startsAt))} · {draft.city ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {draft.artistName ?? draft.venueName ?? "—"} · {draft.authorEmail ?? dict.unknownEmail}
                </p>
              </div>

              <button
                type="button"
                disabled={busy === draft.id}
                onClick={() => void publish(draft)}
                className="inline-flex min-h-9 items-center border border-violet-strong bg-violet-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet disabled:opacity-50"
              >
                {busy === draft.id ? dict.publishing : dict.publish}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
