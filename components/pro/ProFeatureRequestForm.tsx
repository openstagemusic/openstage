"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createProFeatureRequestAction } from "@/app/actions/pro";
import type { Dictionary } from "@/i18n/dictionaries/en";

const inputClass =
  "mt-2 w-full border border-line bg-bg px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-cyan";
const labelClass = "font-mono text-[9px] uppercase tracking-[0.14em] text-muted";

export default function ProFeatureRequestForm({
  dict,
}: {
  dict: Dictionary["pro"];
}) {
  const router = useRouter();
  const [area, setArea] = useState("analytics");
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [useCase, setUseCase] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);

    const outcome = await createProFeatureRequestAction({ area, title, problem, useCase });
    setBusy(false);

    if (!outcome.ok) {
      setError(
        outcome.error === "monthly"
          ? dict.requestMonthly
          : outcome.error === "fields"
            ? dict.requestFields
            : outcome.error === "pro"
              ? dict.requestPro
              : dict.requestFailed
      );
      return;
    }

    setNotice(dict.requestSent);
    setTitle("");
    setProblem("");
    setUseCase("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <div className="grid gap-5 sm:grid-cols-[0.7fr_1.3fr]">
        <div>
          <label htmlFor="pro-area" className={labelClass}>
            {dict.requestArea}
          </label>
          <select
            id="pro-area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className={inputClass}
          >
            {Object.entries(dict.areas).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pro-title" className={labelClass}>
            {dict.requestTitleLabel}
          </label>
          <input
            id="pro-title"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pro-problem" className={labelClass}>
            {dict.requestProblem}
          </label>
          <textarea
            id="pro-problem"
            required
            rows={5}
            maxLength={1200}
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pro-use-case" className={labelClass}>
            {dict.requestUseCase}
          </label>
          <textarea
            id="pro-use-case"
            required
            rows={5}
            maxLength={1200}
            value={useCase}
            onChange={(event) => setUseCase(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-3 py-2 text-xs text-white">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-xs text-white">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex min-h-11 items-center justify-center bg-violet-strong px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {busy ? dict.requestSending : dict.requestSend}
      </button>
    </form>
  );
}
