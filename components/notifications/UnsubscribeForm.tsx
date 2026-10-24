"use client";

import { useState, useTransition } from "react";

import { unsubscribeDigestAction } from "@/app/actions/unsubscribe";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

export default function UnsubscribeForm({
  token,
  dict,
}: {
  token: string;
  dict: Dictionary["notifications"];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (message?.tone === "ok") {
    return (
      <div>
        <p className="border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {message.text}
        </p>
        <LocaleLink
          href="/"
          className="mt-6 inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
        >
          {dict.unsubscribeBack}
        </LocaleLink>
      </div>
    );
  }

  return (
    <div>
      <p className="max-w-xl text-sm leading-relaxed text-muted">{dict.unsubscribeText}</p>
      {message?.tone === "error" ? (
        <p className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {message.text}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const outcome = await unsubscribeDigestAction(token);
            setMessage(
              outcome.ok
                ? { tone: "ok", text: dict.unsubscribeDone }
                : { tone: "error", text: dict.unsubscribeFailed }
            );
          });
        }}
        className="mt-6 inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {dict.unsubscribeButton}
      </button>
    </div>
  );
}
