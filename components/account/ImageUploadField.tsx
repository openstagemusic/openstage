"use client";

import { useRef, useState } from "react";

import { COVER_ACCEPT, uploadCoverFile } from "@/lib/covers/upload";

/**
 * Upload di avatar e banner.
 *
 * Le linee guida sono testo, non un'immagine di esempio: l'utente deve sapere
 * formato e dimensioni prima di scegliere il file.
 */
export default function ImageUploadField({
  value,
  onChange,
  label,
  guidelines,
  preview,
  labels,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  guidelines: string;
  preview: "avatar" | "banner";
  labels: {
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
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{guidelines}</p>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className={
              preview === "avatar"
                ? "h-24 w-24 border border-line object-cover"
                : "h-24 w-48 border border-line object-cover"
            }
          />
        ) : (
          <div
            className={
              preview === "avatar"
                ? "flex h-24 w-24 items-center justify-center border border-line bg-surface/40 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                : "flex h-24 w-48 items-center justify-center border border-line bg-surface/40 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
            }
          >
            {label}
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
            className="inline-flex min-h-10 items-center border-b border-line pb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan hover:text-cyan disabled:opacity-50"
          >
            {busy ? labels.uploading : labels.choose}
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
