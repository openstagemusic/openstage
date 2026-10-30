"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "openstage:spotify-collapsed";

/**
 * Player Spotify persistente.
 *
 * Vive nel layout: cambiando pagina l'iframe non viene smontato e la musica
 * continua. Il pulsante a destra lo riduce a icona senza interrompere l'audio
 * (l'iframe resta montato, cambia solo la visibilità). La scelta è ricordata
 * nel browser.
 */
export default function SpotifyPlayerDock({
  embedUrl,
  title,
  collapseLabel,
  expandLabel,
}: {
  embedUrl: string | null;
  title: string;
  collapseLabel: string;
  expandLabel: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) === "1";
    setCollapsed(saved);
    document.documentElement.classList.toggle("spotify-collapsed", saved);

    return () => document.documentElement.classList.remove("spotify-collapsed");
  }, []);

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
          className="spotify-dock-toggle inline-flex h-11 w-11 items-center justify-center border border-line-strong bg-bg/95 text-cyan shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur transition-colors hover:border-cyan/60 hover:text-white"
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
