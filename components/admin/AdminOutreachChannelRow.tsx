"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteOutreachChannelAction,
  updateOutreachChannelAction,
} from "@/app/actions/outreach";
import type { OutreachChannel } from "@/lib/outreach/channels";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Una riga del pannello canali.
 *
 * Mostra il messaggio giusto per quel tipo di canale (post per un gruppo,
 * messaggio diretto per una testata), lo copia, e tiene lo stato del contatto.
 * L'invio resta fuori dal sito: qui si registra solo cosa è stato fatto.
 */
export default function AdminOutreachChannelRow({
  channel,
  message,
  dict,
}: {
  channel: OutreachChannel;
  message: string;
  dict: Dictionary["admin"]["outreachChannels"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(channel.status);
  const [note, setNote] = useState(channel.note ?? "");
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

  async function changeStatus(next: string) {
    setBusy(true);
    setError(null);
    const result = await updateOutreachChannelAction({ id: channel.id, status: next });
    setBusy(false);

    if (!result.ok) {
      setError(dict.saveFailed);
      return;
    }

    setStatus(next as OutreachChannel["status"]);
    router.refresh();
  }

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await updateOutreachChannelAction({ id: channel.id, note });
    setBusy(false);

    if (!result.ok) {
      setError(dict.saveFailed);
      return;
    }

    router.refresh();
  }

  async function remove() {
    if (!window.confirm(dict.confirmDelete)) return;
    setBusy(true);
    const result = await deleteOutreachChannelAction(channel.id);
    setBusy(false);
    if (!result.ok) {
      setError(dict.saveFailed);
      return;
    }
    router.refresh();
  }

  return (
    <li className="border-b border-line py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{channel.name}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.kinds[channel.kind]} · {dict.areas[channel.area]}
            {channel.contacted_at ? ` · ${new Date(channel.contacted_at).toLocaleDateString("it-IT")}` : ""}
          </p>
          <a
            href={channel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block max-w-full truncate border-b border-line pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:border-cyan hover:text-white"
          >
            {dict.openChannel} ↗
          </a>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted" htmlFor={`status-${channel.id}`}>
            {dict.statusLabel}
          </label>
          <select
            id={`status-${channel.id}`}
            value={status}
            disabled={busy}
            onChange={(event) => void changeStatus(event.target.value)}
            className="os-field min-h-10 w-44 py-1 text-sm"
          >
            <option value="todo">{dict.statuses.todo}</option>
            <option value="contacted">{dict.statuses.contacted}</option>
            <option value="replied">{dict.statuses.replied}</option>
            <option value="discarded">{dict.statuses.discarded}</option>
          </select>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex min-h-10 items-center bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {copied ? dict.copied : dict.copyMessage}
          </button>
        </div>
      </div>

      {channel.rules ? (
        <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-muted">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
            {dict.rulesLabel}
          </span>
          <br />
          {channel.rules}
        </p>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-cyan">
          {dict.preview}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap border border-line bg-bg p-3 text-sm leading-relaxed text-white/90">
          {message}
        </pre>
      </details>

      <form onSubmit={saveNote} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`note-${channel.id}`} className="os-field-label">
            {dict.noteLabel}
          </label>
          <input
            id={`note-${channel.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={dict.notePlaceholder}
            className="os-field text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan disabled:opacity-40"
        >
          {busy ? dict.saving : dict.saveNote}
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-pink hover:text-pink disabled:opacity-40"
        >
          {dict.remove}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-2 os-note os-note-pink">
          {error}
        </p>
      ) : null}
    </li>
  );
}
