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
        className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted underline underline-offset-4 transition-colors hover:text-cyan"
      >
        {labels.open}
      </button>
    );
  }

  return (
    <div className="w-full border-l-2 border-line-strong pl-4">
      <p className="font-display text-sm font-semibold text-white">{labels.title}</p>
      <p className="mt-1 text-xs text-muted">{labels.hint}</p>

      <label htmlFor="report-reason" className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {labels.reason}
      </label>
      <select
        id="report-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="os-field mt-1"
      >
        {Object.entries(labels.reasons).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>

      <label htmlFor="report-note" className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {labels.note}
      </label>
      <textarea
        id="report-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder={labels.notePlaceholder}
        className="os-field mt-1"
      />

      {error ? <p className="mt-2 text-xs text-pink">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-60"
        >
          {busy ? labels.sending : labels.send}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
        >
          {labels.close}
        </button>
      </div>
    </div>
  );
}
