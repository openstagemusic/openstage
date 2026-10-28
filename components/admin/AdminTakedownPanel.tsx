"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateTakedownNoticeAction } from "@/app/actions/takedown";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type {
  TakedownNotice,
  TakedownNoticeStatus,
  TakedownNoticeType,
} from "@/lib/admin/takedown";

const statusClass: Record<TakedownNoticeStatus, string> = {
  new: "border-pink/50 bg-pink/10 text-pink",
  reviewing: "border-cyan/40 bg-cyan/10 text-cyan",
  actioned: "border-cyan/40 bg-cyan/10 text-white",
  rejected: "border-line bg-surface text-muted",
};

export default function AdminTakedownPanel({
  notices,
  dict,
}: {
  notices: TakedownNotice[];
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

  const statusLabel: Record<TakedownNoticeStatus, string> = {
    new: dict.takedownStatusNew,
    reviewing: dict.takedownStatusReviewing,
    actioned: dict.takedownStatusActioned,
    rejected: dict.takedownStatusRejected,
  };

  const typeLabel: Record<TakedownNoticeType, string> = {
    copyright: dict.takedownTypeCopyright,
    trademark: dict.takedownTypeTrademark,
    privacy: dict.takedownTypePrivacy,
    defamation: dict.takedownTypeDefamation,
    illegal: dict.takedownTypeIllegal,
    other: dict.takedownTypeOther,
  };

  async function update(
    item: TakedownNotice,
    status: TakedownNoticeStatus,
    form: HTMLFormElement | null
  ) {
    if (!form) return;

    const data = new FormData(form);
    const note = String(data.get("note") ?? "").trim();
    const action = String(data.get("action") ?? "").trim();

    if (status === "actioned" && !action) {
      setError(dict.takedownActionRequired);
      return;
    }
    if (status === "rejected" && !note) {
      setError(dict.takedownRejectRequired);
      return;
    }

    setBusy(item.id);
    setError(null);
    setNotice(null);

    const outcome = await updateTakedownNoticeAction({
      id: item.id,
      status,
      note,
      action,
    });

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.takedownFailed);
      return;
    }

    setNotice(dict.takedownSaved);
    router.refresh();
  }

  if (notices.length === 0) {
    return (
      <p className="mt-6 border-l-2 border-line-strong pl-3 text-sm text-muted">
        {dict.takedownEmpty}
      </p>
    );
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

      <p className="mb-4 max-w-2xl text-xs leading-relaxed text-muted">
        {dict.takedownManualHint}
      </p>

      <ul className="border-t border-line">
        {notices.map((item) => {
          const working = busy === item.id;

          return (
            <li key={item.id} className="border-b border-line py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {typeLabel[item.type]}
                    </span>
                    <span
                      className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] ${statusClass[item.status]}`}
                    >
                      {statusLabel[item.status]}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {date.format(new Date(item.createdAt))}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white">
                    {item.reporterName} · {item.reporterEmail}
                    {item.organization ? ` · ${item.organization}` : ""}
                  </p>

                  <p className="mt-1 break-all text-xs text-muted">
                    {dict.takedownTarget}:{" "}
                    <a
                      href={item.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan underline decoration-cyan/40 underline-offset-4 hover:text-white"
                    >
                      {item.targetUrl}
                    </a>
                  </p>

                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                    {item.description}
                  </p>

                  {item.evidenceUrl ? (
                    <p className="mt-2 text-xs text-muted">
                      {dict.takedownEvidence}:{" "}
                      <a
                        href={item.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan underline decoration-cyan/40 underline-offset-4 hover:text-white"
                      >
                        {item.evidenceUrl}
                      </a>
                    </p>
                  ) : null}

                  {item.adminNote ? (
                    <p className="mt-3 border-l border-line pl-3 text-xs text-muted">
                      {dict.takedownNote}: {item.adminNote}
                    </p>
                  ) : null}
                  {item.actionTaken ? (
                    <p className="mt-1 border-l border-line pl-3 text-xs text-muted">
                      {dict.takedownAction}: {item.actionTaken}
                    </p>
                  ) : null}
                </div>

                <a
                  href={item.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 shrink-0 items-center border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-line-strong hover:text-white"
                >
                  {dict.takedownOpen}
                </a>
              </div>

              <details className="mt-4 border border-line bg-surface/40 p-3">
                <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.1em] text-cyan">
                  {dict.takedownResolution}
                </summary>

                <form
                  onSubmit={(event) => event.preventDefault()}
                  className="mt-3 grid gap-3"
                >
                  <label className="block">
                    <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {dict.takedownNote}
                    </span>
                    <textarea
                      name="note"
                      rows={2}
                      maxLength={2000}
                      defaultValue={item.adminNote ?? ""}
                      className="w-full border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-cyan"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {dict.takedownAction}
                    </span>
                    <textarea
                      name="action"
                      rows={2}
                      maxLength={1000}
                      defaultValue={item.actionTaken ?? ""}
                      className="w-full border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-cyan"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={working}
                      onClick={(event) => void update(item, "reviewing", event.currentTarget.form)}
                      className="inline-flex min-h-9 items-center border border-cyan/40 bg-cyan/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:border-cyan disabled:opacity-50"
                    >
                      {working ? dict.takedownSaving : dict.takedownReview}
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={(event) => void update(item, "actioned", event.currentTarget.form)}
                      className="inline-flex min-h-9 items-center border border-violet-strong bg-violet-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet disabled:opacity-50"
                    >
                      {dict.takedownResolve}
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={(event) => void update(item, "rejected", event.currentTarget.form)}
                      className="inline-flex min-h-9 items-center border border-pink/40 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink transition-colors hover:bg-pink/10 disabled:opacity-50"
                    >
                      {dict.takedownReject}
                    </button>
                  </div>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
