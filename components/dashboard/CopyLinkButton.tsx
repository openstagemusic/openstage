"use client";

import { useState } from "react";

/**
 * Copia il link pubblico della scheda.
 *
 * La clipboard funziona solo in contesto sicuro (https o localhost); se il
 * browser la nega non mostriamo un falso "copiato".
 */
export default function CopyLinkButton({
  url,
  label,
  copiedLabel,
  compact = false,
}: {
  url: string;
  label: string;
  copiedLabel: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={
        compact
          ? "inline-flex min-h-9 items-center justify-center border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-line-strong hover:text-white"
          : "inline-flex min-h-11 items-center justify-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
      }
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
