"use client";

import { useState } from "react";

/**
 * Copia il codice del widget.
 *
 * La clipboard richiede un contesto sicuro: se il browser la nega non mostriamo
 * un falso "copiato", il codice resta selezionabile sotto.
 */
export default function CopyCodeButton({
  code,
  label,
  copiedLabel,
}: {
  code: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
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
      className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
    >
      {copied ? copiedLabel : label}
      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}
