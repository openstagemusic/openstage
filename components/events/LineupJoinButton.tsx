"use client";

import { useEffect, useState } from "react";

import type { Dictionary } from "@/i18n/dictionaries/en";

type JoinState =
  | "guest"
  | "not-artist"
  | "member"
  | "pending"
  | "owner"
  | "closed"
  | "can-ask";

/**
 * «Sono in questa serata».
 *
 * Chiede lo stato al server solo al montaggio: la scheda evento resta statica e
 * il pulsante non compare a chi non è un artista con una scheda. L'invio non
 * aggiunge nessuno: mette la richiesta in coda, e l'admin decide.
 */
export default function LineupJoinButton({
  eventId,
  dict,
}: {
  eventId: string;
  dict: Dictionary["events"];
}) {
  const [state, setState] = useState<JoinState | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/lineup/join?event=${encodeURIComponent(eventId)}`);
        const payload = (await response.json()) as { state?: JoinState };
        if (!cancelled) setState(payload.state ?? "closed");
      } catch {
        if (!cancelled) setState("closed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (state === null || state === "guest" || state === "not-artist" || state === "owner" || state === "closed") {
    return null;
  }

  if (state === "member") {
    return (
      <p className="mt-4 inline-flex items-center gap-2 border border-cyan/40 bg-cyan/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
        {dict.lineupJoinMember}
      </p>
    );
  }

  if (state === "pending") {
    return (
      <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">
        {dict.lineupJoinPending}
      </p>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);

    try {
      const response = await fetch("/api/lineup/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, message }),
      });
      const payload = (await response.json()) as { ok?: boolean };

      if (!payload.ok) {
        setError(true);
        return;
      }

      setState("pending");
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      {open ? (
        <form onSubmit={submit} className="max-w-xl">
          <p className="font-display text-sm font-semibold">{dict.lineupJoinTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{dict.lineupJoinHint}</p>

          <label htmlFor="lineup-message" className="os-field-label mt-3">
            {dict.lineupJoinNote}
          </label>
          <textarea
            id="lineup-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={400}
            rows={3}
            placeholder={dict.lineupJoinPlaceholder}
            className="os-field text-sm"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-40"
            >
              {busy ? dict.lineupJoinSending : dict.lineupJoinSend}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
            >
              {dict.lineupJoinCancel}
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-2 os-note os-note-pink">
              {dict.lineupJoinError}
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.lineupJoinCta}
        </button>
      )}
    </div>
  );
}
