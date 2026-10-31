"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "openstage:spotify-collapsed";
const ENABLED_KEY = "openstage:spotify-enabled";

/**
 * Player Spotify persistente.
 *
 * Il player è un contenuto di terze parti: **non si carica da solo**. Finché
 * non premi «Attiva il player» non parte nessuna richiesta verso Spotify,
 * quindi nessun cookie o storage di terze parti al primo caricamento. La scelta
 * resta nel browser; da lì in poi il player vive nel layout e la musica continua
 * cambiando pagina.
 *
 * Il pulsante a destra lo riduce a icona senza interrompere l'audio (l'iframe
 * resta montato, cambia solo la visibilità).
 */
export default function SpotifyPlayerDock({
  embedUrl,
  title,
  collapseLabel,
  expandLabel,
  enableLabel,
  enableHint,
}: {
  embedUrl: string | null;
  title: string;
  collapseLabel: string;
  expandLabel: string;
  enableLabel: string;
  enableHint: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(ENABLED_KEY) === "1");
    const saved = window.localStorage.getItem(STORAGE_KEY) === "1";
    setCollapsed(saved);
    document.documentElement.classList.toggle("spotify-collapsed", saved);

    return () => document.documentElement.classList.remove("spotify-collapsed");
  }, []);

  function activate() {
    try {
      window.localStorage.setItem(ENABLED_KEY, "1");
    } catch {
      // Storage bloccato: il player vale solo per questa pagina.
    }
    setEnabled(true);
  }

  function update(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage bloccato: la scelta vale solo per questa pagina.
    }
    document.documentElement.classList.toggle("spotify-collapsed", next);
  }

  if (!embedUrl) {
    return null;
  }

  // Consenso al contenuto di terze parti: barra sobria, nessun iframe.
  if (!enabled) {
    return (
      <div className="spotify-dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="max-w-xl font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {enableHint}
          </p>
          <button
            type="button"
            onClick={activate}
            className="inline-flex min-h-10 items-center gap-2 border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            {enableLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        aria-hidden={collapsed}
        className={cn(
          "spotify-dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur transition-opacity duration-200 print:hidden",
          collapsed && "pointer-events-none opacity-0"
        )}
      >
        <div className="flex items-stretch">
          <iframe
            title={title}
            src={embedUrl}
            height="80"
            tabIndex={collapsed ? -1 : 0}
            style={{ border: 0 }}
            className="min-w-0 flex-1"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />

          <button
            type="button"
            onClick={() => update(true)}
            tabIndex={collapsed ? -1 : 0}
            aria-label={collapseLabel}
            title={collapseLabel}
            className="flex w-10 shrink-0 items-center justify-center border-l border-line text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => update(false)}
          aria-label={expandLabel}
          title={expandLabel}
          className="spotify-dock-toggle inline-flex h-11 w-11 items-center justify-center border border-line-strong bg-bg/95 text-cyan shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur transition-colors hover:border-cyan/60 hover:text-white print:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 10v4M9 7v10M13 9v6M17 5v14" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
