"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Errore che rompe anche il layout: qui non c'è navbar, provider o dizionario.
 * Deve stare in piedi da solo, con i colori di base del sito.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#07070D",
          color: "#e8e8f2",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#22D3EE",
            }}
          >
            Errore
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "clamp(2rem, 8vw, 3.5rem)",
              lineHeight: 0.95,
              textTransform: "uppercase",
            }}
          >
            Qualcosa non ha risposto.
          </h1>
          <p style={{ marginTop: "1.25rem", fontSize: 14, lineHeight: 1.6, color: "#9aa0b8" }}>
            Non è colpa tua. Riprova: se continua, scrivici a ciao@getopenstage.it e dicci cosa
            stavi facendo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              border: 0,
              background: "#7c3aed",
              color: "#fff",
              padding: "0.75rem 1.25rem",
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Riprova
          </button>
          <p style={{ marginTop: "1.5rem", fontSize: 11, color: "#9aa0b8" }}>
            <Link href="/" style={{ color: "#fff", textDecoration: "underline" }}>
              Torna alla Home
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
