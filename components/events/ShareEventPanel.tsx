"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { renderShareCard, type ShareFormat } from "@/lib/covers/share";
import { cn } from "@/lib/utils";

type ShareLabels = {
  share: string;
  title: string;
  story: string;
  square: string;
  download: string;
  native: string;
  copy: string;
  copied: string;
  generating: string;
  failed: string;
  hint: string;
  cancelledBadge: string;
  cancelledNote: string;
  close: string;
};

type ShareEventPanelProps = {
  /** Indirizzo canonico **con la lingua**: è quello che finisce nel QR. */
  path: string;
  /** Pezzo finale dell'indirizzo: dà il nome al file scaricato. */
  slug: string;
  title: string;
  /** "sab 8 nov 2026 · 21:30" */
  when: string;
  /** "Locale · Città" */
  where: string;
  kind: string;
  price: string | null;
  photoUrl: string | null;
  cancelled: boolean;
  labels: ShareLabels;
  className?: string;
};

/**
 * Condividere la serata.
 *
 * Un pannello solo, tre modi di uscire: il foglio di sistema con **l'immagine**
 * (Instagram, WhatsApp e le altre app la ricevono come foto), il download del
 * PNG, oppure il link. Le Share Card si disegnano qui, nel browser, quando il
 * pannello si apre — non prima: chi non condivide non paga il costo del disegno.
 *
 * Il QR dentro l'immagine punta all'indirizzo canonico **con la lingua**: chi lo
 * inquadra arriva alla stessa pagina che stava guardando chi l'ha condivisa.
 */
export default function ShareEventPanel({
  path,
  slug,
  title,
  when,
  where,
  kind,
  price,
  photoUrl,
  cancelled,
  labels,
  className,
}: ShareEventPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<string | null>(null);

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ShareFormat>("story");
  const [status, setStatus] = useState<"idle" | "drawing" | "ready" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  // `navigator.canShare` esiste solo su alcuni browser, e va interrogato con un
  // file vero: un telefono senza condivisione di file deve vedere il download,
  // non un pulsante che non fa niente.
  useEffect(() => {
    try {
      setCanShareFiles(
        typeof navigator.canShare === "function" &&
          navigator.canShare({
            files: [new File([new Uint8Array([0])], "card.png", { type: "image/png" })],
          })
      );
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  // Il disegno parte all'apertura e si rifà quando si cambia formato.
  useEffect(() => {
    if (!open) return;

    let alive = true;
    setStatus("drawing");
    setBlob(null);

    const draw = async () => {
      try {
        const result = await renderShareCard({
          format,
          kind,
          title,
          when,
          where,
          price,
          url: `${window.location.origin}${path}`,
          photo: photoUrl,
          cancelled,
          labels: {
            cancelledBadge: labels.cancelledBadge,
            cancelledNote: labels.cancelledNote,
            qrHint: labels.hint,
          },
        });

        if (!alive) return;
        if (!result) {
          setStatus("error");
          return;
        }

        const next = URL.createObjectURL(result);
        const previous = previewRef.current;
        previewRef.current = next;
        setPreview(next);
        setBlob(result);
        setStatus("ready");
        if (previous) URL.revokeObjectURL(previous);
      } catch {
        if (alive) setStatus("error");
      }
    };

    void draw();

    return () => {
      alive = false;
    };
  }, [
    open,
    format,
    kind,
    title,
    when,
    where,
    price,
    photoUrl,
    cancelled,
    path,
    labels.cancelledBadge,
    labels.cancelledNote,
    labels.hint,
  ]);

  // Alla chiusura del pannello l'immagine in memoria non serve più.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const fileName = `openstage-${slug}-${format}.png`;

  const openPanel = () => {
    setOpen(true);
    dialogRef.current?.showModal();
  };

  const closePanel = () => dialogRef.current?.close();

  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    // Un clic sul velo scuro arriva al <dialog>, non ai suoi figli.
    if (event.target === dialogRef.current) closePanel();
  };

  const download = () => {
    if (!blob) return;

    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
  };

  const shareImage = async () => {
    if (!blob) {
      download();
      return;
    }

    try {
      await navigator.share({
        files: [new File([blob], fileName, { type: "image/png" })],
        title,
        text: where,
      });
    } catch {
      // Condivisione annullata o non disponibile: il file si può scaricare.
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_200);
    } catch {
      // Niente appunti (browser ostili): il link resta visibile nella pagina.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className={cn(
          "inline-flex items-center justify-center gap-2 border-b border-line pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan",
          className
        )}
      >
        <span aria-hidden="true">↗</span>
        {labels.share}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={onDialogClick}
        aria-labelledby="share-panel-title"
        className="w-[min(94vw,34rem)] max-h-[92vh] overflow-y-auto border border-line bg-surface p-0 text-white backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id="share-panel-title" className="font-display text-lg font-semibold">
              {labels.title}
            </h2>
            <button
              type="button"
              onClick={closePanel}
              aria-label={labels.close}
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-muted transition-colors hover:border-white/30 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["story", "square"] as ShareFormat[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                aria-pressed={format === value}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  format === value
                    ? "border-cyan/50 bg-cyan/10 text-white"
                    : "border-white/15 text-muted hover:border-white/25 hover:text-white"
                )}
              >
                {value === "story" ? labels.story : labels.square}
              </button>
            ))}
          </div>

          <div className="mt-4 flex min-h-[15rem] items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-3">
            {status === "drawing" ? (
              <p className="text-sm text-muted">{labels.generating}</p>
            ) : status === "error" ? (
              <p className="max-w-xs text-center text-sm text-pink">{labels.failed}</p>
            ) : preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- è un blob appena disegnato
              <img
                src={preview}
                alt=""
                className="max-h-[46vh] w-auto rounded-xl border border-white/10"
              />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canShareFiles ? (
              <button
                type="button"
                onClick={shareImage}
                disabled={status !== "ready"}
                className="rounded-full bg-violet-strong px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {labels.native}
              </button>
            ) : null}

            <button
              type="button"
              onClick={download}
              disabled={status !== "ready"}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30 disabled:opacity-50"
            >
              {labels.download}
            </button>

            <button
              type="button"
              onClick={copyLink}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-white/30 hover:text-white"
            >
              {copied ? labels.copied : labels.copy}
            </button>
          </div>

          {cancelled ? <p className="mt-3 text-xs text-pink">{labels.cancelledNote}</p> : null}
        </div>
      </dialog>
    </>
  );
}
