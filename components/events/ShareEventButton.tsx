"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type ShareEventButtonProps = {
  path: string;
  title: string;
  text?: string;
  labels: { share: string; copied: string };
  className?: string;
};

/**
 * Condivisione reale: usa il foglio di sistema (`navigator.share`) sui
 * dispositivi che lo supportano, altrimenti copia il link negli appunti.
 */
export default function ShareEventButton({
  path,
  title,
  text,
  labels,
  className,
}: ShareEventButtonProps) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Condivisione annullata: nessun errore da mostrare.
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-white",
        className
      )}
    >
      {copied ? labels.copied : labels.share}
    </button>
  );
}
