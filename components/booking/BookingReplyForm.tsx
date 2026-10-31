"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { sendBookingMessageAction } from "@/app/actions/booking";
import type { Dictionary } from "@/i18n/dictionaries/en";

export default function BookingReplyForm({
  threadId,
  dict,
}: {
  threadId: string;
  dict: Dictionary["booking"];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const outcome = await sendBookingMessageAction({ threadId, body });
    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.error === "invalid" ? dict.invalid : dict.error);
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 border-t border-line pt-6">
      <label
        htmlFor="booking-reply"
        className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
      >
        {dict.reply}
      </label>
      <textarea
        id="booking-reply"
        required
        rows={5}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="os-field mt-2"
      />

      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-pink bg-pink/10 px-3 py-2 text-xs text-white">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-11 items-center justify-center bg-violet-strong px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {busy ? dict.replying : dict.reply}
      </button>
    </form>
  );
}
