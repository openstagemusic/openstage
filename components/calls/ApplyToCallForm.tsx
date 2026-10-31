"use client";

import { useState } from "react";

import { applyToCallAction, type CallActionResult } from "@/app/actions/calls";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Candidatura a una chiamata.
 *
 * Non è un modulo di contatto qualunque: il risultato è un thread di booking,
 * quindi la conversazione continua nella inbox con gli stati che conosciamo.
 */
export default function ApplyToCallForm({
  callId,
  dict,
  applied,
}: {
  callId: string;
  dict: Dictionary["calls"];
  applied: boolean;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const errorText: Record<NonNullable<CallActionResult["error"]>, string> = {
    auth: dict.errorAuth,
    role: dict.errorRole,
    page: dict.errorPage,
    verified: dict.errorVerified,
    invalid: dict.errorInvalid,
    alreadyOpen: dict.errorAlreadyOpen,
    closed: dict.errorClosed,
    full: dict.errorFull,
    duplicate: dict.errorDuplicate,
    self: dict.errorSelf,
    failed: dict.errorFailed,
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = new FormData();
    payload.set("callId", callId);
    payload.set("body", body);

    const result = await applyToCallAction(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ? errorText[result.error] : dict.errorFailed);
      return;
    }

    setDone(true);
  }

  if (done || applied) {
    return (
      <p className="os-note os-note-cyan">
        {dict.appliedNote}{" "}
        <LocaleLink href="/dashboard/messaggi" className="underline underline-offset-4">
          {dict.appliedCta}
        </LocaleLink>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5">
      <label htmlFor="call-apply" className="os-field-label">
        {dict.applyLabel}
      </label>
      <textarea
        id="call-apply"
        rows={4}
        required
        minLength={10}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={dict.applyPlaceholder}
        className="os-field text-sm"
      />

      {error ? (
        <p role="alert" className="mt-3 os-note os-note-pink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-11 items-center gap-2 bg-violet-strong px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {busy ? dict.applying : dict.apply}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
