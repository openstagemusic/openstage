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
 * Lo stato della lineup si chiede una volta sola per scheda: due componenti
 * (il link nelle azioni e il badge accanto al titolo) leggono dalla stessa
 * cache di modulo. Senza, la stessa pagina farebbe due richieste identiche.
 */
const stateCache = new Map<string, JoinState>();

async function loadState(eventId: string): Promise<JoinState> {
  const cached = stateCache.get(eventId);
  if (cached) return cached;

  try {
    const response = await fetch(`/api/lineup/join?event=${encodeURIComponent(eventId)}`);
    const payload = (await response.json()) as { state?: JoinState };
    const state = payload.state ?? "closed";
    stateCache.set(eventId, state);
    return state;
  } catch {
    return "closed";
  }
}

function useJoinState(eventId: string) {
  const [state, setState] = useState<JoinState | null>(stateCache.get(eventId) ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await loadState(eventId);
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return [state, setState] as const;
}

/**
 * «Sono in questa serata» come voce della barra azioni, non come riquadro:
 * deve stare accanto a «Salva» e «Condividi», con un colore che si nota.
 */
export default function LineupJoinLink({
  eventId,
  dict,
}: {
  eventId: string;
  dict: Dictionary["events"];
}) {
  const [state, setState] = useJoinState(eventId);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (state === null || state === "guest" || state === "not-artist" || state === "owner" || state === "closed" || state === "member") {
    return null;
  }

  if (state === "pending") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {dict.lineupJoinPending}
      </span>
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

      stateCache.set(eventId, "pending");
      setState("pending");
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="basis-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="border-b border-pink/60 pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:border-pink hover:text-white"
      >
        {dict.lineupJoinCta}
      </button>

      {open ? (
        <form onSubmit={submit} className="mt-3 max-w-xl border border-line bg-surface/40 p-4">
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
      ) : null}
    </div>
  );
}

/** Il badge e l'uscita restano accanto al titolo: si vedono subito. */
export function LineupMemberActions({
  eventId,
  dict,
}: {
  eventId: string;
  dict: Dictionary["events"];
}) {
  const [state, setState] = useJoinState(eventId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [left, setLeft] = useState(false);

  if (state !== "member") return null;

  async function leave() {
    if (!window.confirm(dict.lineupLeaveConfirm)) return;
    setBusy(true);
    setError(false);

    try {
      const response = await fetch("/api/lineup/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const payload = (await response.json()) as { ok?: boolean };

      if (!payload.ok) {
        setError(true);
        return;
      }

      stateCache.delete(eventId);
      setState("closed");
      setLeft(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (left) {
    return (
      <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">
        {dict.lineupLeaveDone}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <p className="inline-flex items-center gap-2 border border-cyan/40 bg-cyan/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
        {dict.lineupJoinMember}
      </p>
      <button
        type="button"
        onClick={() => void leave()}
        disabled={busy}
        className="inline-flex min-h-10 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-pink hover:text-pink disabled:opacity-40"
      >
        {busy ? dict.lineupJoinSending : dict.lineupLeaveCta}
      </button>
      {error ? (
        <p role="alert" className="os-note os-note-pink">
          {dict.lineupLeaveError}
        </p>
      ) : null}
    </div>
  );
}
