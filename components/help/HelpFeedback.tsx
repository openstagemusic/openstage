"use client";

import { useState } from "react";

import { submitHelpFeedbackAction } from "@/app/actions/help";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * "Ti è stato utile?".
 *
 * Due pulsanti, nessun commento pubblico: il feedback serve a capire quale guida
 * riscrivere, non a raccogliere recensioni. La risposta viene ricordata nel
 * browser per non chiederla due volte.
 */
export default function HelpFeedback({
  articleId,
  dict,
}: {
  articleId: string;
  dict: Dictionary["help"];
}) {
  const [sent, setSent] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function send(helpful: boolean) {
    setBusy(true);
    setError(false);

    const result = await submitHelpFeedbackAction({ articleId, helpful });
    setBusy(false);

    if (!result.ok) {
      setError(true);
      return;
    }

    try {
      window.localStorage.setItem(`openstage:help-feedback:${articleId}`, helpful ? "1" : "0");
    } catch {
      // Storage bloccato: nessun problema.
    }

    setSent(helpful);
  }

  if (sent !== null) {
    return (
      <p className="mt-4 border-l-2 border-cyan/60 pl-3 text-sm text-muted">
        {dict.feedbackThanks}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {dict.feedbackTitle}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void send(true)}
          className="inline-flex min-h-10 items-center gap-2 border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan disabled:opacity-50"
        >
          {dict.feedbackYes}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send(false)}
          className="inline-flex min-h-10 items-center gap-2 border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-pink hover:text-pink disabled:opacity-50"
        >
          {dict.feedbackNo}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 os-note os-note-pink">
          {dict.feedbackError}
        </p>
      ) : null}
    </div>
  );
}
