"use client";

import { useEffect, useRef, useState } from "react";

import EventCover from "@/components/events/EventCover";
import type { CoverErrorCode } from "@/lib/covers/errors";
import { COVER_ACCEPT, uploadCoverFile } from "@/lib/covers/upload";

/**
 * Da dove si prende la foto per disegnare la locandina: il file scelto adesso sul
 * dispositivo, oppure l'indirizzo di quello già salvato (l'immagine dell'evento).
 */
export type PosterSource = Blob | string | null;

export type CoverLabels = {
  empty: string;
  choose: string;
  replace: string;
  remove: string;
  uploading: string;
  hint: string;
  errors: Record<CoverErrorCode, string>;
  posterTitle: string;
  posterHint: string;
  posterGenerate: string;
  posterGenerating: string;
  posterAgain: string;
  posterDownload: string;
  posterNeedsTitle: string;
};

type CoverFieldProps = {
  /** Indirizzo dell'immagine della scheda (vuoto quando non c'è). */
  value: string;
  onChange: (url: string) => void;
  /** Il titolo della serata: dà il nome al file scaricato. */
  title: string;
  /** Disegna la locandina dai dati del modulo. */
  buildFlyer: (source: PosterSource) => Promise<Blob | null>;
  labels: CoverLabels;
};

const buttonClass =
  "inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong disabled:opacity-50";
const primaryClass =
  "inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50";

/** Il titolo diventa il nome del file: niente caratteri strani per i sistemi. */
function fileBase(title: string): string {
  const cleaned = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return cleaned || "locandina";
}

/**
 * L'immagine dell'evento e la locandina da condividere: **due cose diverse**.
 *
 * L'immagine si sceglie un file dal proprio dispositivo e va su Supabase Storage:
 * è quella che si vede sulla scheda, sulla mappa e nella pagina dell'evento.
 * Nessun campo per incollare un indirizzo web: chi organizza una serata ha la
 * locandina sul telefono, non un link da copiare.
 *
 * La locandina da condividere invece **si disegna** con i dati già scritti e non
 * si carica da nessuna parte: si scarica e si posta. Tenerle separate è la
 * correzione della 3.3.3b — prima il poster generato diventava anche l'immagine
 * della scheda, e la stessa foto finiva due volte sulla card.
 */
export default function CoverField({ value, onChange, title, buildFlyer, labels }: CoverFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"upload" | "generate" | null>(null);
  const [error, setError] = useState<CoverErrorCode | null>(null);
  const [posterError, setPosterError] = useState<CoverErrorCode | null>(null);
  // La foto scelta adesso resta in memoria: è la sorgente migliore per il disegno.
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [poster, setPoster] = useState<{ url: string } | null>(null);

  const canGenerate = title.trim() !== "";
  const posterName = `openstage-${fileBase(title)}.jpg`;

  // La locandina vale per quello che c'era scritto quando è nata: cambiando il
  // titolo o la foto non si scarica più un poster che parla di un'altra serata.
  useEffect(() => {
    setPoster(null);
  }, [title, value, photo]);

  // L'indirizzo dell'anteprima si libera da solo quando non serve più.
  useEffect(() => {
    return () => {
      if (poster) URL.revokeObjectURL(poster.url);
    };
  }, [poster]);

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
    setPhoto(file);
    onChange(outcome.url);
  }

  async function generate() {
    setPosterError(null);
    setBusy("generate");

    // Il file appena scelto, o — se questa sessione non ne ha uno — l'immagine
    // già salvata, riletta dall'archivio.
    const drawn = await buildFlyer(photo ?? value ?? null);

    setBusy(null);

    if (!drawn) {
      setPosterError("generateFailed");
      return;
    }

    setPoster({ url: URL.createObjectURL(drawn) });
  }

  function download() {
    if (!poster) return;

    const link = document.createElement("a");
    link.href = poster.url;
    link.download = posterName;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
  }

  function remove() {
    setError(null);
    setPhoto(null);
    onChange("");
  }

  return (
    <div>
      <div className="overflow-hidden border border-line">
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

        {value ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="inline-flex min-h-11 items-center px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white disabled:opacity-50"
          >
            {labels.remove}
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted">{labels.hint}</p>

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

      {/* --- Locandina da condividere ---------------------------------------- */}
      <h3 className="mt-8 font-display text-lg font-semibold">{labels.posterTitle}</h3>
      <p className="mt-2 text-xs text-muted">{labels.posterHint}</p>

      {poster ? (
        <div className="mt-3">
          <div className="overflow-hidden border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- anteprima di un file locale */}
            <img src={poster.url} alt="" className="aspect-[4/5] w-full" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={download} className={primaryClass}>
              {labels.posterDownload}
            </button>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={busy !== null}
              className={buttonClass}
            >
              {busy === "generate" ? labels.posterGenerating : labels.posterAgain}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy !== null || !canGenerate}
            className={buttonClass}
          >
            {busy === "generate" ? labels.posterGenerating : labels.posterGenerate}
          </button>

          {!canGenerate ? <p className="mt-2 text-xs text-muted">{labels.posterNeedsTitle}</p> : null}
        </div>
      )}

      {posterError ? (
        <p className="mt-2 text-xs text-pink" role="alert">
          {labels.errors[posterError]}
        </p>
      ) : null}
    </div>
  );
}
