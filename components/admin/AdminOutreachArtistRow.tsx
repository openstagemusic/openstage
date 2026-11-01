"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveArtistInstagramAction } from "@/app/actions/outreach";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Una riga del pannello outreach: messaggio pronto da copiare e handle
 * Instagram da salvare.
 *
 * Il messaggio si copia con un clic; l'handle si incolla e si salva: dalla
 * volta dopo è già lì, con il link al profilo.
 */
export default function AdminOutreachArtistRow({
  artistId,
  name,
  city,
  profileUrl,
  instagramUrl,
  message,
  dict,
}: {
  artistId: string;
  name: string;
  city: string | null;
  profileUrl: string;
  instagramUrl: string | null;
  message: string;
  dict: Dictionary["admin"]["outreach"];
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(instagramUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(dict.copyFailed);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await saveArtistInstagramAction({ artistId, instagram: handle });
    setBusy(false);

    if (!result.ok) {
      setError(result.error === "invalid" ? dict.invalidHandle : dict.saveFailed);
      return;
    }

    router.refresh();
  }

  return (
    <li className="border-b border-line py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{name}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {city ?? "—"}
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block border-b border-line pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:border-cyan hover:text-white"
          >
            {dict.openProfile} ↗
          </a>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex min-h-10 items-center bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {copied ? dict.copied : dict.copyMessage}
          </button>
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-cyan">
          {dict.preview}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap border border-line bg-bg p-3 text-sm leading-relaxed text-white/90">
          {message}
        </pre>
      </details>

      <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`ig-${artistId}`} className="os-field-label">
            {dict.instagram}
          </label>
          <input
            id={`ig-${artistId}`}
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@nome"
            className="os-field text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !handle.trim()}
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan disabled:opacity-40"
        >
          {busy ? dict.saving : dict.saveHandle}
        </button>

        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:border-cyan hover:text-white"
          >
            {dict.openInstagram} ↗
          </a>
        ) : null}
      </form>

      {error ? (
        <p role="alert" className="mt-2 os-note os-note-pink">
          {error}
        </p>
      ) : null}
    </li>
  );
}
