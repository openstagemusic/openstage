"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { analyzeEventAction, createAdminEventAction } from "@/app/actions/ai";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ParsedEvent } from "@/lib/ai/schemas";
import type { AdminOwnerOption } from "@/lib/admin/queries";
import { withLocale } from "@/lib/i18n/locale-path";

const FIELD =
  "mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-cyan/60";

const EMPTY: ParsedEvent = {
  title: "",
  artist: null,
  venue: null,
  city: null,
  address: null,
  date: null,
  time: null,
  genre: null,
  description: null,
  priceText: null,
  ticketUrl: null,
};

export default function AdminEventCreatePanel({
  owners,
  dict,
}: {
  owners: { artists: AdminOwnerOption[]; venues: AdminOwnerOption[] };
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [ownerType, setOwnerType] = useState<"artist" | "venue">("artist");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ParsedEvent | null>(null);
  const [coverSourceUrl, setCoverSourceUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"analyze" | "draft" | "publish" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = ownerType === "artist" ? owners.artists : owners.venues;
  const filtered = useMemo(() => {
    const term = ownerQuery.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (owner) =>
        owner.name.toLowerCase().includes(term) || (owner.city ?? "").toLowerCase().includes(term)
    );
  }, [options, ownerQuery]);

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
    setCoverSourceUrl(null);

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
    setCoverSourceUrl(outcome.imageUrl);
    setNotice(dict.aiImportPreview);
  }

  function manual() {
    setPreview({ ...EMPTY });
    setCoverSourceUrl(null);
    setNotice(dict.aiCreateManual);
    setError(null);
  }

  async function save(status: "draft" | "published") {
    if (!preview) return;
    if (!ownerId) {
      setError(dict.aiCreateOwnerRequired);
      return;
    }
    if (!preview.title.trim() || !preview.date || !preview.time) {
      setError(dict.aiImportRequired);
      return;
    }
    if (status === "published" && !preview.city?.trim()) {
      setError(dict.aiCreatePublishCity);
      return;
    }

    setBusy(status === "published" ? "publish" : "draft");
    setNotice(null);
    setError(null);

    const outcome = await createAdminEventAction({
      ownerType,
      ownerId,
      status,
      data: preview,
      coverSourceUrl,
    });

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.aiImportFailed);
      return;
    }

    if (outcome.coverRequested && !outcome.coverImported) {
      window.alert(dict.aiCreateCoverFailed);
    }

    router.push(withLocale(locale, `/dashboard/events/${outcome.eventId}`));
    router.refresh();
  }

  return (
    <section className="mt-6">
      <div className="border border-line bg-surface/40 p-5">
        <h2 className="font-display text-lg font-semibold">{dict.aiCreateTitle}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{dict.aiCreateText}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.aiCreateOwnerType}
            </span>
            <select
              value={ownerType}
              onChange={(event) => {
                setOwnerType(event.target.value as "artist" | "venue");
                setOwnerId("");
                setOwnerQuery("");
              }}
              className={FIELD}
            >
              <option value="artist">{dict.aiCreateArtist}</option>
              <option value="venue">{dict.aiCreateVenue}</option>
            </select>
          </label>

          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.aiCreateOwner}
            </span>
            <input
              value={ownerQuery}
              onChange={(event) => setOwnerQuery(event.target.value)}
              placeholder={dict.aiCreateOwnerSearch}
              className={FIELD}
            />
            <select
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              className={FIELD}
            >
              <option value="">—</option>
              {filtered.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                  {owner.city ? ` · ${owner.city}` : ""}
                </option>
              ))}
            </select>
            {filtered.length === 0 ? (
              <span className="mt-1 block text-[10px] text-muted">{dict.aiCreateNoOwners}</span>
            ) : null}
          </label>
        </div>

        <label className="mt-3 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiImportPaste}
          </span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null || (text.trim().length < 30 && !url.trim())}
            onClick={() => void analyze()}
            className="inline-flex min-h-10 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet disabled:opacity-50"
          >
            {busy === "analyze" ? dict.aiImportAnalyzing : dict.aiImportAnalyze}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={manual}
            className="inline-flex min-h-10 items-center border border-line-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan/50 disabled:opacity-50"
          >
            {dict.aiCreateManual}
          </button>
        </div>
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
          <h2 className="font-display text-lg font-semibold">{dict.aiImportPreview}</h2>

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

          <div className="mt-4 border-t border-line pt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.aiCreateCover}
            </p>
            <p className="mt-1 text-[10px] text-muted">{dict.aiCreateCoverHint}</p>
            {coverSourceUrl ? (
              <div className="mt-2 flex flex-wrap items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- anteprima remota prima del salvataggio */}
                <img
                  src={coverSourceUrl}
                  alt={dict.aiCreateCover}
                  className="h-32 w-32 border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverSourceUrl(null)}
                  className="inline-flex min-h-9 items-center border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-white"
                >
                  {dict.aiCreateCoverRemove}
                </button>
              </div>
            ) : null}
            <input
              type="url"
              value={coverSourceUrl ?? ""}
              onChange={(event) => setCoverSourceUrl(event.target.value || null)}
              placeholder="https://..."
              className={FIELD}
            />
          </div>

          <p className="mt-3 text-xs text-muted">{dict.aiImportDraftNotice}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void save("draft")}
              className="inline-flex min-h-10 items-center border border-line-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan/50 disabled:opacity-50"
            >
              {busy === "draft" ? dict.aiCreateSaving : dict.aiCreateSaveDraft}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void save("published")}
              className="inline-flex min-h-10 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet disabled:opacity-50"
            >
              {busy === "publish" ? dict.aiCreateSaving : dict.aiCreatePublish}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
