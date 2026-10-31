"use client";

import { useState } from "react";

/**
 * Embed Spotify con consenso.
 *
 * Nessuna richiesta a Spotify prima del clic: la pagina si carica senza cookie
 * di terze parti e il player parte solo se lo attivi. La scelta vale per questa
 * visita (il dock, invece, ricorda quella globale).
 */
export default function SpotifyEmbedGate({
  embedUrl,
  title,
  label,
  hint,
  height = 352,
}: {
  embedUrl: string;
  title: string;
  label: string;
  hint: string;
  height?: number;
}) {
  const [enabled, setEnabled] = useState(false);

  if (!enabled) {
    return (
      <div
        className="flex flex-col items-start justify-center gap-3 border-t border-line bg-surface/30 px-5 py-6"
        style={{ minHeight: height }}
      >
        <p className="max-w-md font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {hint}
        </p>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="inline-flex min-h-11 items-center gap-2 border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          {label}
        </button>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={embedUrl}
      width="100%"
      height={height}
      style={{ border: 0 }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
