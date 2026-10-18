"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Le azioni del reclamo.
 *
 * Non c'è logica di sicurezza qui: ogni controllo (chi sei, che ruolo hai, se
 * la scheda è già presa, se sei l'admin) sta nella funzione del database. Queste
 * azioni si limitano a chiamarla e a riportare l'esito. Se un giorno qualcuno
 * aggiungesse un chiamante diverso dall'interfaccia, le regole resterebbero le
 * stesse.
 */

export type ClaimActionResult = { ok: boolean; error?: string };

/**
 * I messaggi delle funzioni sono già in italiano e pensati per chi legge: si
 * mostrano così come sono. Qui restano anche nei log del server.
 */
function result(error: { message: string } | null): ClaimActionResult {
  if (!error) return { ok: true };

  console.error("[claims]", error.message);
  return { ok: false, error: error.message };
}

/** Reclamo immediato di una scheda artista (con link di prova obbligatorio). */
export async function claimArtistAction(input: {
  artistId: string;
  proofUrl: string;
}): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("claim_artist", {
    p_artist_id: input.artistId,
    p_proof_url: input.proofUrl,
  });

  return result(error);
}

/** Richiesta di reclamo di un locale: la decide un admin. */
export async function requestVenueClaimAction(input: {
  venueId: string;
  proofUrl: string;
}): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("request_venue_claim", {
    p_venue_id: input.venueId,
    p_proof_url: input.proofUrl,
  });

  return result(error);
}

/** Approvazione o rifiuto di una richiesta (solo admin). */
export async function decideClaimAction(input: {
  claimId: string;
  approve: boolean;
  note?: string | null;
}): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("decide_claim", {
    p_claim_id: input.claimId,
    p_approva: input.approve,
    p_nota: input.note ?? null,
  });

  return result(error);
}

/** Ritiro della propria richiesta in attesa: prima poteva farlo solo l'admin. */
export async function withdrawClaimAction(input: {
  claimId: string;
}): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("withdraw_claim", {
    p_claim_id: input.claimId,
  });

  return result(error);
}

/** Revoca di un reclamo: la scheda torna a OpenStage (solo admin). */
export async function revokeClaimAction(input: {
  claimId: string;
  note?: string | null;
}): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("revoke_claim", {
    p_claim_id: input.claimId,
    p_nota: input.note ?? null,
  });

  return result(error);
}

/** Dà o toglie la verifica: è il permesso di pubblicare (solo admin). */
export async function setProfileVerifiedAction(input: {
  profileId: string;
  verified: boolean;
}): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_profile_verified", {
    p_profile_id: input.profileId,
    p_verificato: input.verified,
  });

  return result(error);
}

/**
 * Pubblica un evento in bozza dalla coda (solo admin).
 *
 * La RLS permette all'admin di modificare qualsiasi evento, e
 * `events_require_review` non tocca le sue scritture: qui non serve altro.
 */
export async function publishEventAction(eventId: string): Promise<ClaimActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId);

  return result(error);
}
