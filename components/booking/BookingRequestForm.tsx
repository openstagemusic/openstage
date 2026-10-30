"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { startBookingThreadAction } from "@/app/actions/booking";
import type { Dictionary } from "@/i18n/dictionaries/en";

const inputClass =
  "mt-2 w-full border border-line bg-bg px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-cyan";
const labelClass = "font-mono text-[9px] uppercase tracking-[0.14em] text-muted";

export default function BookingRequestForm({
  targetType,
  targetId,
  targetName,
  dict,
}: {
  targetType: "artist" | "venue";
  targetId: string;
  targetName: string;
  dict: Dictionary["booking"];
}) {
  const router = useRouter();
  const [eventDate, setEventDate] = useState("");
  const [feeText, setFeeText] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const outcome = await startBookingThreadAction({
      targetType,
      targetId,
      eventDate,
      feeText,
      body,
    });

    setBusy(false);

    if (!outcome.ok || !outcome.threadId) {
      setError(
        outcome.error === "self"
          ? dict.self
          : outcome.error === "role"
            ? dict.role
            : outcome.error === "unavailable"
              ? dict.unavailable
              : outcome.error === "invalid"
                ? dict.invalid
                : dict.error
      );
      return;
    }

    router.push(`/dashboard/messaggi/${outcome.threadId}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 border-t border-line pt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
        {dict.requestFor} {targetName}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="booking-date" className={labelClass}>
            {dict.date}
          </label>
          <input
            id="booking-date"
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="booking-fee" className={labelClass}>
            {dict.fee}
          </label>
          <input
            id="booking-fee"
            type="text"
            maxLength={80}
            value={feeText}
            onChange={(event) => setFeeText(event.target.value)}
            placeholder={dict.feePlaceholder}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="booking-body" className={labelClass}>
          {dict.message}
        </label>
        <textarea
          id="booking-body"
          required
          rows={7}
          maxLength={2000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={dict.messagePlaceholder}
          className={inputClass}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-3 py-2 text-xs text-white">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex min-h-11 items-center justify-center bg-violet-strong px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {busy ? dict.sending : dict.send}
      </button>

      <p className="mt-4 max-w-lg text-xs leading-relaxed text-muted">{dict.freeNote}</p>
    </form>
  );
}
