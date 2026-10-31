"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { withdrawClaimAction } from "@/app/actions/claims";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";

type PendingRequestPanelProps = {
  claimId: string;
  subjectName: string;
  subjectHref: string;
  createdAt: string;
  dict: Dictionary["claims"];
};

/**
 * "Stiamo valutando la tua richiesta."
 *
 * Il database da 0014 ne permette **una sola** in attesa e, finché c'è, non fa
 * creare altre schede: qui si spiega perché e si dà la via d'uscita a chi ha
 * sbagliato — il ritiro, che prima poteva fare solo l'admin.
 */
export default function PendingRequestPanel({
  claimId,
  subjectName,
  subjectHref,
  createdAt,
  dict,
}: PendingRequestPanelProps) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  async function handleWithdraw() {
    setBusy(true);
    setError(null);

    const outcome = await withdrawClaimAction({ claimId });
    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.error ?? dict.errorGeneric);
      return;
    }

    setDone(true);
    // Le pagine del server (account e onboarding) cambiano idea: senza il
    // refresh mostrerebbero ancora la richiesta e nasconderebbero il modulo.
    router.refresh();
  }

  if (done) {
    return (
      <section className="border-t border-line pt-6">
        <h2 className="font-display text-xl font-semibold">{dict.pendingTitle}</h2>
        <p className="mt-2 text-sm text-cyan">{dict.withdrawn}</p>
      </section>
    );
  }

  return (
    <section className="border-l-2 border-cyan bg-cyan/[0.04] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
        {dict.pendingTitle}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{dict.pendingText}</p>

      <p className="mt-4 text-sm">
        <LocaleLink href={subjectHref} className="text-cyan transition-opacity hover:opacity-80">
          {subjectName} →
        </LocaleLink>
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {dict.pendingSince} {data.format(new Date(createdAt))}
      </p>

      <button
        type="button"
        onClick={handleWithdraw}
        disabled={busy}
        className="mt-4 inline-flex min-h-11 items-center justify-center border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan disabled:opacity-50"
      >
        {busy ? dict.withdrawing : dict.withdraw}
      </button>

      {error ? (
        <p role="alert" aria-live="polite" className="mt-3 text-sm text-pink">
          {error}
        </p>
      ) : null}
    </section>
  );
}
