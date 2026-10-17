import { cache } from "react";

import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Lettura del reclamo delle schede e della coda di moderazione.
 *
 * Regola di fondo: chi comanda è il database. `is_admin()` è la stessa funzione
 * che usano le policy di riga e le funzioni di reclamo, quindi l'interfaccia
 * mostra esattamente ciò che il database permette — nessuna seconda verità da
 * tenere allineata.
 */

export type SubjectType = "artist" | "venue";

export type ClaimRecord = {
  id: string;
  subjectType: SubjectType;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  /** Chi ha chiesto la scheda: serve a verificarne il profilo. */
  profileId: string;
  proofUrl: string;
  createdAt: string;
  /** L'email di chi ha chiesto la scheda: si vede solo dall'admin. */
  email: string | null;
  /** La scheda è già di un profilo che OpenStage ha verificato. */
  verified: boolean;
};

/**
 * `profiles` compare due volte in `claims` (chi chiede e chi decide): il
 * collegamento va indicato per nome, altrimenti PostgREST non sa quale seguire.
 */
const CLAIM_SELECT =
  "id, subject_type, artist_id, venue_id, profile_id, proof_url, created_at, " +
  "artists ( name, slug ), venues ( name, slug ), " +
  "profiles!claims_profile_id_fkey ( email, verified_at )";

type ClaimRow = {
  id: string;
  subject_type: SubjectType;
  artist_id: string | null;
  venue_id: string | null;
  profile_id: string;
  proof_url: string;
  created_at: string;
  artists: { name: string; slug: string } | null;
  venues: { name: string; slug: string } | null;
  profiles: { email: string | null; verified_at: string | null } | null;
};

function toRecord(row: ClaimRow): ClaimRecord {
  const artist = row.artists;
  const venue = row.venues;
  const subject = row.subject_type === "artist" ? artist : venue;

  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: (row.subject_type === "artist" ? row.artist_id : row.venue_id) ?? "",
    subjectName: subject?.name ?? "—",
    subjectSlug: subject?.slug ?? "",
    profileId: row.profile_id,
    proofUrl: row.proof_url,
    createdAt: row.created_at,
    email: row.profiles?.email ?? null,
    verified: row.profiles?.verified_at != null,
  };
}

/**
 * Chi comanda: lo dice il database (`public.is_admin()`), non una variabile
 * d'ambiente. Così la pagina dell'admin esiste per chi può davvero agire e per
 * nessun altro.
 */
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    console.error("[claims] is_admin:", error.message);
    return false;
  }

  return data === true;
});

/** C'è una richiesta di questo utente, ancora in attesa, su questa scheda? */
export async function getMyPendingClaim(
  subjectType: SubjectType,
  subjectId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select("id")
    .eq("subject_type", subjectType)
    .eq(subjectType === "artist" ? "artist_id" : "venue_id", subjectId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    console.error("[claims] getMyPendingClaim:", error.message);
    return false;
  }

  return data !== null;
}

/**
 * La scheda senza eventi che il visitatore amministra già, se c'è: reclamandone
 * un'altra quella viene eliminata (lo fa `free_vacant_page` nel database). Qui
 * la stessa regola serve solo a dirlo prima, con il nome della scheda: se le due
 * letture non coincidessero, comanda il database e l'errore è chiaro.
 *
 * `excludeId` è la scheda che si sta guardando: se è già la sua, non c'è niente
 * da sostituire.
 */
export async function getReplaceablePage(
  subjectType: SubjectType,
  profileId: string,
  excludeId?: string | null
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();

  const own =
    subjectType === "artist"
      ? await getArtistByProfileId(profileId)
      : await getVenueByProfileId(profileId);

  if (!own || own.id === excludeId) return null;

  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq(subjectType === "artist" ? "artist_id" : "venue_id", own.id);

  if (error) {
    console.error("[claims] getReplaceablePage:", error.message);
    return null;
  }

  return (count ?? 0) === 0 ? { id: own.id, name: own.name } : null;
}

/** Richieste in attesa di una decisione (solo dalla coda dell'admin). */
export async function listPendingClaims(): Promise<ClaimRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select(CLAIM_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[claims] listPendingClaims:", error.message);
    return [];
  }

  return (data as unknown as ClaimRow[]).map(toRecord);
}

/**
 * Schede reclamate ma non ancora verificate: l'artista che si è preso la scheda
 * da solo, e i locali approvati ma senza conferma.
 */
export async function listClaimsToVerify(): Promise<ClaimRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select(CLAIM_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[claims] listClaimsToVerify:", error.message);
    return [];
  }

  return (data as unknown as ClaimRow[]).map(toRecord).filter((claim) => !claim.verified);
}

export type DraftEvent = {  id: string;
  slug: string;
  title: string;
  startsAt: string;
  city: string | null;
  authorEmail: string | null;
  artistName: string | null;
  venueName: string | null;
};

const DRAFT_SELECT =
  "id, slug, title, starts_at, city, artists ( name ), venues ( name ), " +
  "profiles!events_created_by_fkey ( email )";

type DraftRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  city: string | null;
  artists: { name: string } | null;
  venues: { name: string } | null;
  profiles: { email: string | null } | null;
};

/**
 * Eventi in bozza: scritti da profili non ancora verificati, in attesa che
 * l'admin li pubblichi (vedi `events_require_review`).
 */
export async function listDraftEvents(): Promise<DraftEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(DRAFT_SELECT)
    .eq("status", "draft")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[claims] listDraftEvents:", error.message);
    return [];
  }

  return (data as unknown as DraftRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.starts_at,
    city: row.city,
    authorEmail: row.profiles?.email ?? null,
    artistName: row.artists?.name ?? null,
    venueName: row.venues?.name ?? null,
  }));
}

export type VerifiedProfile = {
  id: string;
  email: string | null;
};

/**
 * I profili verificati, per poter togliere la verifica quando serve.
 * L'elenco completo lo vede solo l'admin: la RLS fa il resto.
 */
export async function listVerifiedProfiles(): Promise<VerifiedProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .not("verified_at", "is", null)
    .order("email", { ascending: true });

  if (error) {
    console.error("[claims] listVerifiedProfiles:", error.message);
    return [];
  }

  return (data as unknown as VerifiedProfile[]) ?? [];
}
