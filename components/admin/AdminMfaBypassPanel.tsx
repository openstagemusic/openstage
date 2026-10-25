"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { clearMfaBypassAction, setMfaBypassAction } from "@/app/actions/admin";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";

const DURATIONS = [15, 30, 60, 120, 240];

/**
 * Sospensione temporanea della 2FA.
 *
 * Non elimina il fattore TOTP: apre solo una finestra breve in cui la control
 * room accetta un accesso senza codice. Alla scadenza la verifica torna
 * obbligatoria con la stessa chiave di prima.
 */
export default function AdminMfaBypassPanel({
  bypassUntil,
  hasFactor,
  dict,
}: {
  bypassUntil: string | null;
  hasFactor: boolean;
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(30);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const until = bypassUntil ? new Date(bypassUntil) : null;
  const active = until !== null && until.getTime() > Date.now();

  const time = until
    ? new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(until)
    : null;

  function enable() {
    const message = dict.mfaBypassConfirm.replace("{minutes}", String(minutes));
    if (!window.confirm(message)) return;

    setNotice(null);
    setError(null);

    startTransition(async () => {
      const outcome = await setMfaBypassAction({ minutes });

      if (!outcome.ok) {
        setError(dict.mfaBypassFailed);
        return;
      }

      setNotice(dict.mfaBypassEnabled.replace("{minutes}", String(minutes)));
      router.refresh();
    });
  }

  function clear() {
    setNotice(null);
    setError(null);

    startTransition(async () => {
      const outcome = await clearMfaBypassAction();

      if (!outcome.ok) {
        setError(dict.mfaBypassFailed);
        return;
      }

      setNotice(dict.mfaBypassCleared);
      router.refresh();
    });
  }

  return (
    <section className="mt-10 border border-line bg-surface/40 p-4">
      <h2 className="font-display text-lg font-semibold">{dict.mfaBypassTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{dict.mfaBypassText}</p>

      {!hasFactor ? (
        <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">
          {dict.mfaBypassNeedsFactor}
        </p>
      ) : active && time ? (
        <div className="mt-4">
          <p className="border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
            {dict.mfaBypassActive.replace("{time}", time)}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={clear}
            className="mt-4 inline-flex min-h-11 items-center border border-cyan/50 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
          >
            {dict.mfaBypassClear}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label
              htmlFor="mfa-bypass-duration"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
            >
              {dict.mfaBypassDuration}
            </label>
            <select
              id="mfa-bypass-duration"
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="mt-2 block min-h-11 w-full border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-cyan sm:w-48"
            >
              {DURATIONS.map((value) => (
                <option key={value} value={value}>
                  {dict.mfaBypassMinutes.replace("{minutes}", String(value))}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={enable}
            className="inline-flex min-h-11 items-center justify-center border border-pink/60 bg-pink/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-pink/20 disabled:opacity-50"
          >
            {dict.mfaBypassEnable}
          </button>
        </div>
      )}

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
