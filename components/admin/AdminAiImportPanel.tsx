"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { analyzeEventAction, createImportedEventAction } from "@/app/actions/ai";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ParsedEvent } from "@/lib/ai/schemas";
import { withLocale } from "@/lib/i18n/locale-path";

const FIELD =
  "mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-cyan/60";

export default function AdminAiImportPanel({ dict }: { dict: Dictionary["admin"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ParsedEvent | null>(null);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof ParsedEvent>(key: K, value: ParsedEvent[K]) {
    setPreview((current) => (current ? { ...current, [key]: value } : current));
    setNotice(null);
    setError(null);
  }

  async function analyze() {
    setBusy("analyze");
    setNotice(null);
    setError(null);
    setPreview(null);

    const outcome = await analyzeEventAction({ text, url });

    setBusy(null);

    if (!outcome.ok) {
      setError(
        outcome.error === "fetch_failed"
          ? dict.aiImportFetchFailed
          : outcome.error === "budget"
            ? dict.aiImportBudget
            : outcome.error === "not_configured"
              ? dict.aiImportNotConfigured
              : outcome.error === "invalid"
                ? dict.aiImportInvalid
                : dict.aiImportFailed
      );
      return;
    }

    setPreview(outcome.data);
    setNotice(dict.aiImportPreview);
  }

  async function save() {
    if (!preview) return;
    if (!preview.title.trim() || !preview.date || !preview.time) {
      setError(dict.aiImportRequired);
      return;
    }

    setBusy("save");
    setError(null);
    setNotice(null);

    const outcome = await createImportedEventAction(preview);

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.aiImportFailed);
      return;
    }

    setNotice(dict.aiImportSaved);
    router.push(withLocale(locale, `/dashboard/events/${outcome.eventId}`));
    router.refresh();
  }

  return (
    <section className="mt-8">
      <div className="border border-line bg-surface/40 p-5">
        <h2 className="font-display text-lg font-semibold">{dict.aiImportTitle}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{dict.aiImportText}</p>

        <label className="mt-4 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiImportPaste}
          </span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            maxLength={8000}
            placeholder={dict.aiImportPastePlaceholder}
            className={FIELD}
          />
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiImportUrl}
          </span>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className={FIELD}
          />
          <span className="mt-1 block text-[10px] text-muted">{dict.aiImportUrlHint}</span>
        </label>

        <button
          type="button"
          disabled={busy !== null || (text.trim().length < 30 && !url.trim())}
          onClick={() => void analyze()}
          className="mt-4 inline-flex min-h-10 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet disabled:opacity-50"
        >
          {busy === "analyze" ? dict.aiImportAnalyzing : dict.aiImportAnalyze}
        </button>
      </div>

      {error ? (
        <p className="mt-3 border-l-2 border-pink bg-pink/10 px-3 py-2 text-sm text-white">
          {error}
        </p>
      ) : null}
      {notice && !preview ? (
        <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
          {notice}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-4 border border-line bg-surface/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">{dict.aiImportPreview}</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.aiImportSource}: {url || dict.aiImportPaste}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldTitle}
              </span>
              <input
                value={preview.title}
                onChange={(event) => field("title", event.target.value)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldArtist}
              </span>
              <input
                value={preview.artist ?? ""}
                onChange={(event) => field("artist", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldVenue}
              </span>
              <input
                value={preview.venue ?? ""}
                onChange={(event) => field("venue", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldDate}
              </span>
              <input
                type="date"
                value={preview.date ?? ""}
                onChange={(event) => field("date", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldTime}
              </span>
              <input
                type="time"
                value={preview.time ?? ""}
                onChange={(event) => field("time", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldCity}
              </span>
              <input
                value={preview.city ?? ""}
                onChange={(event) => field("city", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldAddress}
              </span>
              <input
                value={preview.address ?? ""}
                onChange={(event) => field("address", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldGenre}
              </span>
              <input
                value={preview.genre ?? ""}
                onChange={(event) => field("genre", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldPrice}
              </span>
              <input
                value={preview.priceText ?? ""}
                onChange={(event) => field("priceText", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldTicketUrl}
              </span>
              <input
                type="url"
                value={preview.ticketUrl ?? ""}
                onChange={(event) => field("ticketUrl", event.target.value || null)}
                className={FIELD}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiImportFieldDescription}
              </span>
              <textarea
                value={preview.description ?? ""}
                onChange={(event) => field("description", event.target.value || null)}
                rows={4}
                className={FIELD}
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-muted">{dict.aiImportDraftNotice}</p>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void save()}
            className="mt-4 inline-flex min-h-10 items-center border border-cyan/50 bg-cyan/10 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-cyan/20 disabled:opacity-50"
          >
            {busy === "save" ? dict.aiImportSaving : dict.aiImportSave}
          </button>
        </div>
      ) : null}
    </section>
  );
}
