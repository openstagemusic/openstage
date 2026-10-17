"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { claimArtistAction, requestVenueClaimAction } from "@/app/actions/claims";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

/**
 * Cosa vede chi arriva sulla scheda di un artista o di un locale che non è suo:
 *
 * - `unclaimed` → la scheda è di OpenStage, si può reclamare;
 * - `pending`   → una richiesta è in attesa di una decisione;
 * - `claimed`   → la scheda è già di qualcun altro;
 * - `owned`     → chi guarda amministra già una scheda dello stesso tipo (il
 *                 database ne permette una sola): nessun invito, sarebbe un
 *                 vicolo cieco;
 * - `mine`      → è la scheda di chi guarda: nessun invito, lo stato sta
 *                 nella pagina dell'account.
 */
export type ClaimState = "unclaimed" | "pending" | "claimed" | "owned" | "mine";

type ClaimPanelProps = {
  subjectType: "artist" | "venue";
  subjectId: string;
  state: ClaimState;
  isAuthenticated: boolean;
  dict: Dictionary["claims"];
};

export default function ClaimPanel({
  subjectType,
  subjectId,
  state,
  isAuthenticated,
  dict,
}: ClaimPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (state === "mine") return null;

  if (state === "claimed") {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted">
        {subjectType === "artist" ? dict.claimedArtist : dict.claimedVenue}
      </p>
    );
  }

  if (state === "pending") {
    return (
      <p className="mt-6 rounded-2xl border border-cyan/30 bg-cyan/5 p-4 text-xs text-white">
        {dict.pending}
      </p>
    );
  }

  if (state === "owned") {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted">
        {subjectType === "artist" ? dict.ownedArtist : dict.ownedVenue}
      </p>
    );
  }

  const isArtist = subjectType === "artist";
  const intro = isArtist ? dict.artistIntro : dict.venueIntro;
  const note = isArtist ? dict.artistNote : dict.venueNote;
  const actionLabel = isArtist ? dict.artistAction : dict.venueAction;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const outcome = isArtist
      ? await claimArtistAction({ artistId: subjectId, proofUrl })
      : await requestVenueClaimAction({ venueId: subjectId, proofUrl });

    setLoading(false);

    if (!outcome.ok) {
      setError(outcome.error ?? dict.errorGeneric);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-muted">{intro}</p>

      {isAuthenticated ? (
        open ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="proof-url" className="text-xs text-muted">
                {dict.proofLabel}
              </label>
              <input
                id="proof-url"
                type="url"
                required
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                placeholder={dict.proofPlaceholder}
                className={`${inputClass} mt-1`}
              />
              <p className="mt-1 text-xs text-muted">{dict.proofHint}</p>
            </div>

            <p className="text-xs text-muted">{note}</p>

            {error ? <p className="text-xs text-pink">{error}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-violet px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? dict.submitting : dict.submit}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-muted transition-colors hover:text-white"
              >
                {dict.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-full border border-cyan/40 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
          >
            {actionLabel}
          </button>
        )
      ) : (
        <LocaleLink
          href="/login"
          className="mt-4 inline-block rounded-full border border-cyan/40 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
        >
          {dict.loginCta}
        </LocaleLink>
      )}
    </div>
  );
}
