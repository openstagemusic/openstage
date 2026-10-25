"use client";

import { useState, useTransition } from "react";

import { sendTelegramTestAction } from "@/app/actions/admin";
import type { Dictionary } from "@/i18n/dictionaries/en";

export default function AdminTelegramPanel({
  configured,
  dict,
}: {
  configured: boolean;
  dict: Dictionary["admin"];
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function test() {
    setNotice(null);
    setError(null);

    startTransition(async () => {
      const outcome = await sendTelegramTestAction();

      if (!outcome.ok) {
        setError(
          outcome.error === "not_configured" ? dict.telegramNotConfiguredHint : dict.telegramTestFailed
        );
        return;
      }

      setNotice(dict.telegramTestSent);
    });
  }

  return (
    <section className="mt-8 border border-line bg-surface/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{dict.telegramTitle}</h2>
        <span
          className={
            configured
              ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
              : "border border-pink/40 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink"
          }
        >
          {configured ? dict.telegramConfigured : dict.telegramNotConfigured}
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{dict.telegramText}</p>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted">{dict.telegramAlertsList}</p>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">{dict.telegramNoPersonal}</p>

      {!configured ? (
        <p className="mt-4 border-l-2 border-pink bg-pink/10 px-3 py-2 text-sm text-white">
          {dict.telegramNotConfiguredHint}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending || !configured}
        onClick={test}
        className="mt-5 inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {pending ? dict.telegramTesting : dict.telegramTest}
      </button>

      {notice ? (
        <p className="mt-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}
    </section>
  );
}
