"use client";

import { useEffect } from "react";

export type ViewKind = "event" | "artist" | "venue" | "epk";

/**
 * Registra una visualizzazione, una volta per caricamento.
 *
 * `sendBeacon` parte anche se la persona chiude subito la pagina; se il browser
 * non lo supporta si usa `fetch` con `keepalive`. Nessun dato personale: solo
 * tipo e id della scheda.
 */
export default function ViewTracker({ kind, id }: { kind: ViewKind; id: string }) {
  useEffect(() => {
    const body = JSON.stringify({ kind, id });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/track",
        new Blob([body], { type: "application/json" })
      );
      if (sent) return;
    }

    void fetch("/api/track", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => undefined);
  }, [kind, id]);

  return null;
}
