"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { decideJoinRequestAction } from "@/app/actions/lineup";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Una richiesta in coda: chi chiede, per quale serata, con quale nota.
 *
 * Approvare aggiunge l'artista alla lineup e gli manda una notifica; rifiutare
 * chiude la richiesta e basta. Nessuna delle due cancella niente.
 */
export default function AdminJoinRequestRow({
  request,
  dict,
}: {
  request: {
    id: string;
    message: string | null;
    createdAt: string;
    artistName: string;
    artistSlug: string;
    eventTitle: string;
    eventHref: string;
    eventWhen: string;
  };
  dict: Dictionary["admin"]["lineupRequests"];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState(false);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "reject");
    setError(false);

    const result = await decideJoinRequestAction({ id: request.id, approve });
    setBusy(null);

    if (!result.ok) {
      setError(true);
      return;
    }

    router.refresh();
  }

  return (
    <li className="border-b border-line py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{request.artistName}</p>
          <p className="mt-1 text-sm text-white">{request.eventTitle}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {request.eventWhen} · {new Date(request.createdAt).toLocaleDateString("it-IT")}
          </p>
          <a
            href={request.eventHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block border-b border-line pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:border-cyan hover:text-white"
          >
            {dict.openEvent} ↗
          </a>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void decide(true)}
            disabled={busy !== null}
            className="inline-flex min-h-10 items-center bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-40"
          >
            {busy === "approve" ? dict.working : dict.approve}
          </button>
          <button
            type="button"
            onClick={() => void decide(false)}
            disabled={busy !== null}
            className="inline-flex min-h-10 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-pink hover:text-pink disabled:opacity-40"
          >
            {busy === "reject" ? dict.working : dict.reject}
          </button>
        </div>
      </div>

      {request.message ? (
        <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-muted">
          {request.message}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 os-note os-note-pink">
          {dict.failed}
        </p>
      ) : null}
    </li>
  );
}
