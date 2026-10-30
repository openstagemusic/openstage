"use client";

import { useRef, useState } from "react";

import { COVER_ACCEPT, uploadCoverFile } from "@/lib/covers/upload";

/**
 * Foto dell'EPK: usa lo storage pubblico già esistente delle locandine.
 * Il file viene ridimensionato nel browser prima di partire.
 */
export default function EpkPhotoField({
  value,
  onChange,
  labels,
}: {
  value: string;
  onChange: (url: string) => void;
  labels: {
    label: string;
    hint: string;
    choose: string;
    uploading: string;
    remove: string;
    error: string;
  };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);

    const result = await uploadCoverFile(file);
    setBusy(false);

    if (!result.ok) {
      setError(labels.error);
      return;
    }

    onChange(result.url);
  }

  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{labels.label}</p>
      <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{labels.hint}</p>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-28 w-28 border border-line object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center border border-line bg-surface/40 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            EPK
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={COVER_ACCEPT}
            className="sr-only"
            onChange={(event) => void pick(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-10 items-center border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan/50 hover:text-cyan disabled:opacity-50"
          >
            {busy ? labels.uploading : value ? labels.choose : labels.choose}
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-pink"
            >
              {labels.remove}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-pink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
