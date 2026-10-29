"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setPlaylistSubmissionStatusAction } from "@/app/actions/playlist";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminPlaylistSubmission } from "@/lib/admin/playlist";

export default function AdminPlaylistPanel({
  submissions,
  dict,
  locale,
}: {
  submissions: AdminPlaylistSubmission[];
  dict: Dictionary["admin"];
  locale: "it" | "en";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  const pending = submissions.filter((item) => item.status === "pending");
  const archive = submissions.filter((item) => item.status !== "pending");

  async function update(item: AdminPlaylistSubmission, status: "pending" | "added" | "hidden") {
    setBusy(item.artistId);
    setError(null);

    const outcome = await setPlaylistSubmissionStatusAction({
      artistId: item.artistId,
      status,
    });

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.playlistError);
      return;
    }

    router.refresh();
  }

  function card(item: AdminPlaylistSubmission) {
    const statusLabel =
      item.status === "added"
        ? dict.playlistStatusAdded
        : item.status === "hidden"
          ? dict.playlistStatusHidden
          : dict.playlistStatusPending;

    return (
      <li key={item.artistId} className="border border-line bg-surface/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <LocaleLink
              href={`/artisti/${item.slug}`}
              className="font-display text-base font-semibold hover:text-cyan"
            >
              {item.name}
            </LocaleLink>
            {item.city ? <span className="ml-2 text-xs text-muted">{item.city}</span> : null}
          </div>
          <span
            className={
              item.status === "added"
                ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan"
                : item.status === "hidden"
                  ? "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                  : "border border-pink/40 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink"
            }
          >
            {statusLabel}
          </span>
        </div>

        <p className="mt-3 text-sm text-white">{item.trackTitle ?? item.trackUrl}</p>
        <a
          href={item.trackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex break-all font-mono text-[10px] text-muted underline-offset-4 hover:text-cyan hover:underline"
        >
          {item.trackUrl}
        </a>

        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          {dict.playlistSubmitted}
          {item.submittedAt ? ` ${date.format(new Date(item.submittedAt))}` : ""}
          {item.addedAt ? ` · ${dict.playlistAddedOn} ${date.format(new Date(item.addedAt))}` : ""}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={item.trackUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center border border-cyan/40 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10"
          >
            {dict.playlistOpen} ↗
          </a>

          <CopyLinkButton
            url={item.trackUrl}
            label={dict.playlistCopy}
            copiedLabel={dict.playlistCopied}
            compact
          />

          {item.status !== "added" ? (
            <button
              type="button"
              disabled={busy === item.artistId}
              onClick={() => void update(item, "added")}
              className="inline-flex min-h-9 items-center border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan/50 hover:text-cyan disabled:opacity-50"
            >
              {dict.playlistMarkAdded}
            </button>
          ) : null}

          {item.status !== "hidden" ? (
            <button
              type="button"
              disabled={busy === item.artistId}
              onClick={() => void update(item, "hidden")}
              className="inline-flex min-h-9 items-center px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white disabled:opacity-50"
            >
              {dict.playlistHide}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy === item.artistId}
              onClick={() => void update(item, "pending")}
              className="inline-flex min-h-9 items-center px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white disabled:opacity-50"
            >
              {dict.playlistReopen}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="mt-8">
      {error ? (
        <p role="alert" className="mb-4 border-l-2 border-pink bg-pink/10 px-3 py-2 text-xs text-white">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {dict.playlistPending} · {pending.length}
        </h2>

        {pending.length > 0 ? (
          <ul className="mt-3 grid gap-3">{pending.map(card)}</ul>
        ) : (
          <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-muted">
            {dict.playlistEmpty}
          </p>
        )}
      </section>

      {archive.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {dict.playlistArchive} · {archive.length}
          </h2>
          <ul className="mt-3 grid gap-3">{archive.map(card)}</ul>
        </section>
      ) : null}
    </div>
  );
}
