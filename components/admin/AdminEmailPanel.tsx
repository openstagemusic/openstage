"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { retryFailedEmailsAction } from "@/app/actions/admin";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type {
  EmailCategory,
  EmailLogRow,
  EmailLogStatus,
  EmailQueueRow,
  EmailQueueStatus,
  EmailStats,
} from "@/lib/admin/email";

type Limits = { daily: number; monthly: number; reservePercent: number };

function formatCategories(categories: Record<string, number>, dict: Dictionary["admin"]) {
  const labels: Record<string, string> = {
    auth: dict.emailCategoryAuth,
    transactional: dict.emailCategoryTransactional,
    digest: dict.emailCategoryDigest,
    optional: dict.emailCategoryOptional,
  };

  return Object.entries(categories)
    .map(([key, value]) => `${labels[key] ?? key} ${value}`)
    .join(" · ");
}

export default function AdminEmailPanel({
  stats,
  queue,
  log,
  limits,
  dict,
}: {
  stats: EmailStats;
  queue: EmailQueueRow[];
  log: EmailLogRow[];
  limits: Limits;
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ count: number; categories: Record<string, number> } | null>(
    null
  );

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const pending = queue.filter((row) => row.status === "pending" || row.status === "sending");
  const failed = queue.filter((row) => row.status === "failed");
  const selectedIds = Array.from(selected).filter((id) => failed.some((row) => row.id === id));
  const allSelected = failed.length > 0 && selectedIds.length === failed.length;

  const reserveDaily = Math.ceil((limits.daily * limits.reservePercent) / 100);
  const reserveMonthly = Math.ceil((limits.monthly * limits.reservePercent) / 100);
  const dailyLeft = Math.max(0, limits.daily - stats.sentToday);
  const monthlyLeft = Math.max(0, limits.monthly - stats.sentMonth);
  const reserveActive = dailyLeft <= reserveDaily || monthlyLeft <= reserveMonthly;

  const statusLabel: Record<EmailQueueStatus, string> = {
    pending: dict.emailStatusPending,
    sending: dict.emailStatusSending,
    sent: dict.emailStatusSent,
    failed: dict.emailStatusFailed,
    cancelled: dict.emailStatusCancelled,
  };

  const logStatusLabel: Record<EmailLogStatus, string> = {
    sent: dict.emailStatusSent,
    failed: dict.emailStatusFailed,
    delivered: dict.emailStatusDelivered,
    bounced: dict.emailStatusBounced,
    complained: dict.emailStatusComplained,
  };

  const categoryLabel: Record<EmailCategory, string> = {
    auth: dict.emailCategoryAuth,
    transactional: dict.emailCategoryTransactional,
    digest: dict.emailCategoryDigest,
    optional: dict.emailCategoryOptional,
  };

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreview(null);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(failed.map((row) => row.id)));
    setPreview(null);
  }

  async function retry(dryRun: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const ids = selectedIds.length > 0 ? selectedIds : undefined;
    const outcome = await retryFailedEmailsAction({ ids, dryRun });

    setBusy(false);

    if (!outcome.ok) {
      setError(dict.emailRetryFailed);
      return;
    }

    if (dryRun) {
      setPreview({ count: outcome.count ?? 0, categories: outcome.categories ?? {} });
      return;
    }

    const count = outcome.count ?? 0;
    if (count === 0) {
      setError(dict.emailRetryNone);
      return;
    }

    setPreview(null);
    setSelected(new Set());
    setNotice(dict.emailRetried);
    router.refresh();
  }

  const categorySummary = preview ? formatCategories(preview.categories, dict) : "";

  return (
    <div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: dict.emailKpiQueued, value: stats.queued },
          { label: dict.emailKpiFailed, value: stats.failed },
          { label: dict.emailKpiSentToday, value: stats.sentToday },
          { label: dict.emailKpiSentMonth, value: stats.sentMonth },
        ].map((item) => (
          <div key={item.label} className="border border-line bg-surface/40 p-3">
            <p className="font-poster text-2xl leading-none">{item.value}</p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="border border-line bg-surface/40 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.emailQuotaDaily}
          </p>
          <p className="mt-1 text-sm text-white">
            {dict.emailQuotaUsage
              .replace("{used}", String(stats.sentToday))
              .replace("{limit}", String(limits.daily))}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10" aria-hidden="true">
            <div
              className="h-full rounded-full bg-cyan"
              style={{ width: `${Math.min(100, (stats.sentToday / limits.daily) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {dict.emailQuotaReserve}: {reserveDaily}
          </p>
        </div>

        <div className="border border-line bg-surface/40 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.emailQuotaMonthly}
          </p>
          <p className="mt-1 text-sm text-white">
            {dict.emailQuotaUsage
              .replace("{used}", String(stats.sentMonth))
              .replace("{limit}", String(limits.monthly))}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10" aria-hidden="true">
            <div
              className="h-full rounded-full bg-violet-strong"
              style={{ width: `${Math.min(100, (stats.sentMonth / limits.monthly) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {dict.emailQuotaReserve}: {reserveMonthly}
          </p>
        </div>
      </div>

      {reserveActive ? (
        <p className="mt-3 border-l-2 border-pink bg-pink/10 px-3 py-2 text-sm text-white">
          {dict.emailReserveActive}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] text-muted">{dict.emailNoBodies}</p>

      {notice ? (
        <p className="mt-4 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-3 py-2 text-sm text-white">
          {error}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">
          {dict.emailQueueTitle} <span className="text-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{dict.emailEmptyQueue}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line">
            {pending.map((row) => (
              <li key={row.id} className="p-3">
                <p className="text-sm text-white">{row.subject}</p>
                <p className="mt-0.5 break-all text-xs text-muted">{row.to}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  {categoryLabel[row.category]} · {statusLabel[row.status]} · {dict.emailAttempts}:{" "}
                  {row.attempts}/{row.maxAttempts} · {dict.emailNextAttempt}:{" "}
                  {date.format(new Date(row.nextAttemptAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            {dict.emailFailedTitle} <span className="text-muted">({failed.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex min-h-9 items-center border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-white"
            >
              {dict.emailSelectAll}
            </button>
            <button
              type="button"
              disabled={busy || failed.length === 0}
              onClick={() => void retry(true)}
              className="inline-flex min-h-9 items-center border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white disabled:opacity-50"
            >
              {dict.emailRetryPreview}
            </button>
            <button
              type="button"
              disabled={busy || failed.length === 0}
              onClick={() => {
                const count = selectedIds.length || failed.length;
                if (!window.confirm(dict.emailRetryConfirm.replace("{count}", String(count)))) return;
                void retry(false);
              }}
              className="inline-flex min-h-9 items-center border border-pink/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink disabled:opacity-50"
            >
              {dict.emailRetryRun}
            </button>
          </div>
        </div>

        {preview ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {dict.emailRetrySummary
              .replace("{count}", String(preview.count))
              .replace("{categories}", categorySummary || "—")}
          </p>
        ) : null}

        {failed.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{dict.emailEmptyQueue}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line">
            {failed.map((row) => (
              <li key={row.id} className="flex items-start gap-3 p-3">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  aria-label={row.subject}
                  className="mt-1 h-4 w-4 accent-cyan"
                />
                <div className="min-w-0">
                  <p className="text-sm text-white">{row.subject}</p>
                  <p className="mt-0.5 break-all text-xs text-muted">{row.to}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                    {categoryLabel[row.category]} · {dict.emailAttempts}: {row.attempts}/
                    {row.maxAttempts}
                    {row.batchId ? ` · batch ${row.batchId.slice(0, 8)}` : ""}
                  </p>
                  {row.lastError ? (
                    <p className="mt-1 break-all text-[11px] text-pink">{row.lastError}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{dict.emailLogTitle}</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/email/export?scope=log&format=csv"
              className="inline-flex min-h-9 items-center border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-white"
            >
              {dict.emailExportCsv}
            </a>
            <a
              href="/api/admin/email/export?scope=log&format=json"
              className="inline-flex min-h-9 items-center border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-white"
            >
              {dict.emailExportJson}
            </a>
          </div>
        </div>

        {log.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{dict.emailEmptyLog}</p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-line">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-3 py-2 font-normal">{dict.emailCreatedAt}</th>
                  <th className="px-3 py-2 font-normal">{dict.emailRecipient}</th>
                  <th className="px-3 py-2 font-normal">{dict.emailSubject}</th>
                  <th className="px-3 py-2 font-normal">{dict.emailCategory}</th>
                  <th className="px-3 py-2 font-normal">{dict.emailStatus}</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 80).map((row) => (
                  <tr key={row.id} className="border-b border-line/60 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                      {date.format(new Date(row.createdAt))}
                    </td>
                    <td className="px-3 py-2 text-xs text-white">
                      <span className="break-all">{row.to}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{row.subject}</td>
                    <td className="px-3 py-2 text-xs text-muted">{row.category}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {logStatusLabel[row.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
