"use client";

import { useEffect } from "react";

import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * Errore lato server dentro il sito.
 *
 * Deve dire cosa è successo, senza dettagli tecnici, e offrire una via d'uscita:
 * riprovare o tornare alla Home. L'errore vero finisce nella console, non in
 * faccia a chi legge.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const t =
    locale === "it"
      ? {
          eyebrow: "Errore",
          title: "Qualcosa non ha risposto.",
          text: "Non è colpa tua. Riprova: se continua, scrivici e dicci cosa stavi facendo.",
          retry: "Riprova",
          home: "Torna alla Home",
          contact: "Scrivici",
        }
      : {
          eyebrow: "Error",
          title: "Something did not answer.",
          text: "It is not your fault. Try again: if it keeps happening, write to us and tell us what you were doing.",
          retry: "Try again",
          home: "Back to Home",
          contact: "Write to us",
        };

  useEffect(() => {
    console.error("[error]", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
        {t.title}
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">{t.text}</p>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
        >
          {t.retry}
        </button>
        <LocaleLink
          href="/"
          className="inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          {t.home}
        </LocaleLink>
        <LocaleLink
          href="/contatti"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
        >
          {t.contact}
        </LocaleLink>
      </div>
    </div>
  );
}
