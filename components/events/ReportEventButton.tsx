"use client";

import { useState } from "react";

import { reportEventAction } from "@/app/actions/moderation";

/**
 * «Segnala questa serata».
 *
 * Non è una recensione e non è un voto: è un messaggio all'admin, che decide.
 * Per questo sta in fondo alla pagina, piccolo, e chiede una motivazione: una
 * segnalazione senza motivo non si può verificare.
 *
 * La stessa persona può segnalare la stessa serata **una volta sola** (lo dice
 * il database); le segnalazioni degli altri non si vedono mai.
 */

type ReportLabels = {
  open: string;
  title: string;
  hint: string;
  reason: string;
  reasons: Record<string, string>;
  note: string;
  notePlaceholder: string;
  send: string;
  sending: string;
  done: string;
  close: string;
  already: string;
  own: string;
  failed: string;
};

export default function ReportEventButton({
  eventId,
  labels,
}: {
  eventId: string;
  labels: ReportLabels;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_info");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);

    const outcome = await reportEventAction({ eventId, reason, note });
    setBusy(false);

    if (outcome.ok) {
      setDone(true);
      return;
    }

    setError(
      outcome.error === "already"
        ? labels.already
        : outcome.error === "ownEvent"
          ? labels.own
          : labels.failed
    );
  }

  if (done) {
    return (
      <p className="w-full rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-white">
        {labels.done}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-white"
      >
        {labels.open}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-display text-sm font-semibold text-white">{labels.title}</p>
      <p className="mt-1 text-xs text-muted">{labels.hint}</p>

      <label htmlFor="report-reason" className="mt-3 block text-xs text-muted">
        {labels.reason}
      </label>
      <select
        id="report-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d1a] px-3 py-2 text-sm text-white outline-none focus:border-cyan/60"
      >
        {Object.entries(labels.reasons).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>

      <label htmlFor="report-note" className="mt-3 block text-xs text-muted">
        {labels.note}
      </label>
      <textarea
        id="report-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder={labels.notePlaceholder}
        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d1a] px-3 py-2 text-sm text-white outline-none focus:border-cyan/60"
      />

      {error ? <p className="mt-2 text-xs text-pink">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="rounded-full bg-violet-strong px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? labels.sending : labels.send}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted transition-colors hover:text-white"
        >
          {labels.close}
        </button>
      </div>
    </div>
  );
}
