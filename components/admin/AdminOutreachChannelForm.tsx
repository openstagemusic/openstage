"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createOutreachChannelAction } from "@/app/actions/outreach";
import { CHANNEL_AREAS, CHANNEL_KINDS } from "@/lib/outreach/channels";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Aggiunge un canale trovato a mano.
 *
 * I gruppi locali cambiano di continuo: meglio poterli aggiungere dalla pagina
 * che aspettare una migrazione. La regola del canale è un campo libero perché
 * non è standardizzabile — ogni gruppo scrive la sua.
 */
export default function AdminOutreachChannelForm({
  dict,
}: {
  dict: Dictionary["admin"]["outreachChannels"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<string>("gruppo-facebook");
  const [area, setArea] = useState<string>("Bergamo");
  const [rules, setRules] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await createOutreachChannelAction({ name, url, kind, area, rules });
    setBusy(false);

    if (!result.ok) {
      setError(result.error === "invalid" ? dict.invalidChannel : dict.saveFailed);
      return;
    }

    setName("");
    setUrl("");
    setRules("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
      >
        {dict.addChannel}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-line bg-surface/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="channel-name" className="os-field-label">
            {dict.nameLabel}
          </label>
          <input
            id="channel-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="os-field text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="channel-url" className="os-field-label">
            {dict.urlLabel}
          </label>
          <input
            id="channel-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            className="os-field text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="channel-kind" className="os-field-label">
            {dict.kindLabel}
          </label>
          <select
            id="channel-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="os-field text-sm"
          >
            {CHANNEL_KINDS.map((item) => (
              <option key={item} value={item}>
                {dict.kinds[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="channel-area" className="os-field-label">
            {dict.areaLabel}
          </label>
          <select
            id="channel-area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="os-field text-sm"
          >
            {CHANNEL_AREAS.map((item) => (
              <option key={item} value={item}>
                {dict.areas[item]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="channel-rules" className="os-field-label">
          {dict.rulesField}
        </label>
        <input
          id="channel-rules"
          value={rules}
          onChange={(event) => setRules(event.target.value)}
          placeholder={dict.rulesPlaceholder}
          className="os-field text-sm"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-40"
        >
          {busy ? dict.saving : dict.saveChannel}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
        >
          {dict.cancel}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 os-note os-note-pink">
          {error}
        </p>
      ) : null}
    </form>
  );
}
