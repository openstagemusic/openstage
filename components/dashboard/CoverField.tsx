"use client";

import { useRef, useState } from "react";

import EventCover from "@/components/events/EventCover";
import type { CoverErrorCode } from "@/lib/covers/errors";
import { COVER_ACCEPT, uploadCoverBlob, uploadCoverFile } from "@/lib/covers/upload";

export type CoverLabels = {
  empty: string;
  choose: string;
  replace: string;
  remove: string;
  uploading: string;
  generate: string;
  generating: string;
  generateHint: string;
  hint: string;
  errors: Record<CoverErrorCode, string>;
};

type CoverFieldProps = {
  /** Indirizzo della locandina già scelta (vuoto quando non c'è). */
  value: string;
  onChange: (url: string) => void;
  /** La foto scelta, tenuta in memoria: serve a disegnare la locandina. */
  photo: Blob | null;
  onPhoto: (photo: Blob | null) => void;
  /** Disegna la locandina dai dati del modulo. */
  buildFlyer: (photo: Blob | null) => Promise<Blob | null>;
  labels: CoverLabels;
  /** Senza titolo la locandina generata non avrebbe senso. */
  canGenerate: boolean;
};

const buttonClass =
  "rounded-full border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-50";

/**
 * La locandina: si sceglie un file dal proprio dispositivo, oppure si fa
 * disegnare da OpenStage con i dati già scritti.
 *
 * Nessun campo per incollare un indirizzo web: chi organizza una serata ha la
 * locandina sul telefono o sul computer, non un link da copiare. E così la
 * locandina vive da noi: se il sito di partenza un giorno la toglie, la scheda
 * dell'evento continua a mostrarla.
 */
export default function CoverField({
  value,
  onChange,
  photo,
  onPhoto,
  buildFlyer,
  labels,
  canGenerate,
}: CoverFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"upload" | "generate" | null>(null);
  const [error, setError] = useState<CoverErrorCode | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;

    setError(null);
    setBusy("upload");

    const outcome = await uploadCoverFile(file);

    setBusy(null);

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    // La foto resta in memoria: è quella che finisce nella locandina generata.
    onPhoto(file);
    onChange(outcome.url);
  }

  async function generate() {
    setError(null);
    setBusy("generate");

    const drawn = await buildFlyer(photo);

    if (!drawn) {
      setBusy(null);
      setError("generateFailed");
      return;
    }

    const outcome = await uploadCoverBlob(drawn);

    setBusy(null);

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    onChange(outcome.url);
  }

  function remove() {
    setError(null);
    onPhoto(null);
    onChange("");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {value ? (
          <EventCover src={value} className="aspect-[4/3] w-full" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-white/5 px-6 text-center text-xs text-muted">
            {labels.empty}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className={buttonClass}
        >
          {busy === "upload" ? labels.uploading : value ? labels.replace : labels.choose}
        </button>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy !== null || !canGenerate}
          className={buttonClass}
        >
          {busy === "generate" ? labels.generating : labels.generate}
        </button>

        {value ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-white disabled:opacity-50"
          >
            {labels.remove}
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted">{labels.hint}</p>
      <p className="mt-1 text-xs text-muted">{labels.generateHint}</p>

      {error ? (
        <p className="mt-1 text-xs text-pink" role="alert">
          {labels.errors[error]}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={COVER_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Azzerato: riscegliendo lo stesso file deve ripartire l'anteprima.
          event.target.value = "";
          void pick(file);
        }}
      />
    </div>
  );
}
