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
 * - `owned`     → chi guarda amministra già una scheda dello stesso tipo **con
 *                 dei eventi** (il database ne permette una sola): nessun
 *                 invito, sarebbe un vicolo cieco;
 * - `wrongRole` → chi guarda non ha il ruolo giusto: gli si spiega come
 *                 ottenerlo, invece di lasciarlo sbattere contro un errore;
 * - `pendingElsewhere` → chi guarda ha già una richiesta in attesa per un'altra
 *                 scheda: il database ne permette una sola, quindi non gli si
 *                 offre un pulsante che fallirebbe;
 * - `mine`      → è la scheda di chi guarda: nessun invito, lo stato sta
 *                 nella pagina dell'account.
 *
 * Quando chi guarda ha già una scheda **senza eventi** lo stato resta
 * `unclaimed`: reclamando, quella scheda viene eliminata (lo decide il
 * database) e lo diciamo prima, con il suo nome.
 */
export type ClaimState =
  | "unclaimed"
  | "pending"
  | "pendingElsewhere"
  | "claimed"
  | "owned"
  | "wrongRole"
  | "mine";

type ClaimPanelProps = {
  subjectType: "artist" | "venue";
  subjectId: string;
  state: ClaimState;
  isAuthenticated: boolean;
  dict: Dictionary["claims"];
  /** Chi è ancora fan può scegliere il ruolo: il pulsante giusto è per lui. */
  canUpgradeRole?: boolean;
  /** La propria scheda senza eventi che il reclamo eliminerebbe. */
  replaceName?: string | null;
};

export default function ClaimPanel({
  subjectType,
  subjectId,
  state,
  isAuthenticated,
  dict,
  canUpgradeRole = false,
  replaceName = null,
}: ClaimPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isArtist = subjectType === "artist";

  if (state === "mine") return null;

  if (state === "claimed") {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted">
        {isArtist ? dict.claimedArtist : dict.claimedVenue}
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

  if (state === "pendingElsewhere") {
    return (
      <div className="mt-6 rounded-2xl border border-cyan/30 bg-cyan/5 p-4">
        <p className="text-xs text-white">{dict.pendingElsewhere}</p>
        <LocaleLink
          href="/account"
          className="mt-4 inline-block rounded-full border border-cyan/40 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
        >
          {dict.pendingElsewhereCta}
        </LocaleLink>
      </div>
    );
  }

  if (state === "owned") {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted">
        {isArtist ? dict.ownedArtist : dict.ownedVenue}
      </p>
    );
  }

  if (state === "wrongRole") {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-muted">
          {isArtist ? dict.wrongRoleArtist : dict.wrongRoleVenue}
        </p>
        {canUpgradeRole ? (
          <LocaleLink
            href="/onboarding/role"
            className="mt-4 inline-block rounded-full border border-cyan/40 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
          >
            {isArtist ? dict.wrongRoleCtaArtist : dict.wrongRoleCtaVenue}
          </LocaleLink>
        ) : (
          <p className="mt-3 text-xs text-muted">
            {isArtist ? dict.wrongRoleLockedArtist : dict.wrongRoleLockedVenue}
          </p>
        )}
      </div>
    );
  }

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

      {replaceName ? (
        <div className="mt-3 rounded-xl border border-pink/40 bg-pink/10 p-3">
          <p className="text-xs text-white">
            {isArtist ? dict.replaceArtist : dict.replaceVenue}
          </p>
          <p className="mt-1 text-xs text-muted">«{replaceName}»</p>
        </div>
      ) : null}

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
                className="rounded-full bg-violet-strong px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
