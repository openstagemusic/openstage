"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { fetchPublicPage } from "@/lib/ai/fetch-public";
import { prepareCoverFromUrl } from "@/lib/ai/cover";
import { searchPlaces } from "@/lib/geo/geocoder";
import { parseEventFromText } from "@/lib/ai/tasks/parse-event";
import { ParsedEventSchema, type ParsedEvent } from "@/lib/ai/schemas";
import { collectVerificationChecks, type VerificationReport } from "@/lib/ai/verify-page";
import { summarizeVerification } from "@/lib/ai/tasks/verify-page";
import { FILTER_TIMEZONE, zonedInstant } from "@/lib/events/timezone";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

export type AnalyzeEventResult =
  | { ok: true; data: ParsedEvent; imageUrl: string | null }
  | {
      ok: false;
      error: "unauthorized" | "invalid" | "fetch_failed" | "not_configured" | "budget" | "failed";
    };

/** Analizza testo o URL pubblico. Nessuna scrittura sul database. */
export async function analyzeEventAction(input: {
  text: string;
  url?: string;
}): Promise<AnalyzeEventResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const pasted = input.text.trim();
  const url = input.url?.trim() ?? "";
  let fetched = "";
  let imageUrl: string | null = null;

  if (url) {
    try {
      const page = await fetchPublicPage(url);
      fetched = page.text;
      imageUrl = page.imageUrl;
    } catch (error) {
      console.error("[ai] fetch-public:", error instanceof Error ? error.message : error);
      return { ok: false, error: "fetch_failed" };
    }
  }

  const text = [fetched, pasted].filter(Boolean).join("\n\n").slice(0, 8000);

  if (text.length < 30) return { ok: false, error: "invalid" };

  const parsed = await parseEventFromText({
    text,
    sourceUrl: url || null,
  });

  if (!parsed.ok) return { ok: false, error: parsed.error };

  return { ok: true, data: parsed.data, imageUrl };
}

export type PageMatch = { id: string; name: string; city: string | null };

export type NewPageInput = {
  name: string;
  city?: string | null;
  address?: string | null;
  /** L'admin ha visto un possibile doppione e conferma comunque la scheda nuova. */
  allowDuplicate?: boolean;
};

export type CreateAdminEventResult =
  | {
      ok: true;
      eventId: string;
      pageId: string;
      pageCreated: boolean;
      coverImported: boolean;
      coverRequested: boolean;
      locationFound: boolean;
    }
  | {
      ok: false;
      error: "unauthorized" | "invalid" | "failed" | "duplicate";
      matches?: PageMatch[];
    };

function validHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => "\\" + char);
}

type OwnerRow = {
  id: string;
  name: string;
  city: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Coordinates = { latitude: number; longitude: number };

function joinParts(values: Array<string | null | undefined>): string {
  const parts: string[] = [];

  for (const value of values) {
    const text = value?.trim();
    if (!text) continue;
    if (parts.some((part) => part.toLowerCase() === text.toLowerCase())) continue;
    parts.push(text);
  }

  return parts.join(", ");
}

/**
 * Dal nome/indirizzo alla posizione sulla mappa.
 *
 * Senza questo passaggio l'evento nascerebbe con città e indirizzo ma senza pin,
 * e l'editor chiederebbe di rimetterlo a mano. Se Photon non risponde, la
 * creazione non si blocca: l'admin sistema il pin nell'editor.
 */
async function findCoordinates(input: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
}): Promise<Coordinates | null> {
  const candidates = [
    joinParts([input.name, input.address, input.city]),
    joinParts([input.address, input.city]),
    joinParts([input.city]),
  ].filter((query, index, all) => query.length >= 3 && all.indexOf(query) === index);

  const wantedCity = input.city?.trim().toLowerCase() || null;

  for (const query of candidates) {
    try {
      const places = await searchPlaces(query, { locale: "it", timeoutMs: 3500 });
      const place =
        (wantedCity
          ? places.find((item) => item.city?.trim().toLowerCase() === wantedCity)
          : null) ??
        places[0] ??
        null;

      if (place) return { latitude: place.latitude, longitude: place.longitude };
    } catch (error) {
      console.error("[ai] geocode:", error instanceof Error ? error.message : error);
    }
  }

  return null;
}

/** Schede con un nome simile: servono a fermare i doppioni prima di crearne una nuova. */
async function findPageMatches(
  ownerType: "artist" | "venue",
  name: string,
  city: string | null
): Promise<PageMatch[]> {
  const term = name.trim();
  if (!term) return [];

  const supabase = await createClient();
  const table = ownerType === "artist" ? "artists" : "venues";
  const { data, error } = await supabase
    .from(table)
    .select("id, name, city")
    .ilike("name", "%" + escapeLike(term) + "%")
    .limit(8);

  if (error) {
    console.error("[ai] findPageMatches:", error.message);
    return [];
  }

  const wantedCity = city?.trim().toLowerCase() || null;

  return ((data as unknown as PageMatch[] | null) ?? [])
    .sort((a, b) => {
      const aSame = wantedCity && a.city?.trim().toLowerCase() === wantedCity ? 0 : 1;
      const bSame = wantedCity && b.city?.trim().toLowerCase() === wantedCity ? 0 : 1;
      return aSame - bSame || a.name.localeCompare(b.name);
    })
    .slice(0, 5);
}

/** Controllo doppioni richiesto dalla schermata prima della conferma. */
export async function findPageMatchesAction(input: {
  ownerType: "artist" | "venue";
  name: string;
  city?: string | null;
}): Promise<
  { ok: true; matches: PageMatch[] } | { ok: false; error: "unauthorized" | "invalid" }
> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };
  if (!input.name.trim()) return { ok: false, error: "invalid" };

  return {
    ok: true,
    matches: await findPageMatches(input.ownerType, input.name, input.city ?? null),
  };
}

/**
 * Crea una bozza o pubblica un evento per conto di un artista/locale.
 *
 * Se `ownerId` c'è, l'evento si aggancia a quella scheda e basta. Se manca,
 * viene creata una scheda **libera** (`profile_id` nullo): non appartiene a
 * nessuno, quindi l'artista o il locale può reclamarla in seguito.
 */
export async function createAdminEventAction(input: {
  ownerType: "artist" | "venue";
  ownerId?: string | null;
  newPage?: NewPageInput | null;
  status: "draft" | "published";
  data: ParsedEvent;
  coverSourceUrl?: string | null;
}): Promise<CreateAdminEventResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const parsed = ParsedEventSchema.safeParse(input.data);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const data = parsed.data;

  if (!data.date || !data.time) return { ok: false, error: "invalid" };

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(data.time);

  if (!dateMatch || !timeMatch) return { ok: false, error: "invalid" };

  const instant = zonedInstant(
    {
      year: Number(dateMatch[1]),
      month: Number(dateMatch[2]),
      day: Number(dateMatch[3]),
      hour: Number(timeMatch[1]),
      minute: Number(timeMatch[2]),
    },
    FILTER_TIMEZONE
  );

  if (!Number.isFinite(instant.getTime())) return { ok: false, error: "invalid" };

  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "unauthorized" };

  const supabase = await createClient();
  const ownerTable = input.ownerType === "artist" ? "artists" : "venues";

  let owner: OwnerRow;
  let pageCreated = false;

  if (input.ownerId) {
    const { data: found, error: ownerError } =
      input.ownerType === "venue"
        ? await supabase
            .from("venues")
            .select("id, name, city, address, latitude, longitude")
            .eq("id", input.ownerId)
            .maybeSingle()
        : await supabase
            .from("artists")
            .select("id, name, city")
            .eq("id", input.ownerId)
            .maybeSingle();

    if (ownerError || !found) return { ok: false, error: "invalid" };
    owner = found as OwnerRow;
  } else {
    const pageName = (input.newPage?.name ?? "").trim();
    if (!pageName) return { ok: false, error: "invalid" };

    const pageCity = input.newPage?.city?.trim() || data.city?.trim() || null;
    const pageAddress = input.newPage?.address?.trim() || data.address?.trim() || null;

    // La città serve anche a pubblicare: si controlla prima di creare la scheda,
    // altrimenti un errore lascerebbe una scheda libera senza evento.
    if (input.status === "published" && !data.city?.trim() && !pageCity) {
      return { ok: false, error: "invalid" };
    }

    // Il controllo si ripete qui: tra la conferma nell'interfaccia e il salvataggio
    // può essere nata un'altra scheda con lo stesso nome.
    const matches = await findPageMatches(input.ownerType, pageName, pageCity);

    if (matches.length > 0 && !input.newPage?.allowDuplicate) {
      return { ok: false, error: "duplicate", matches };
    }

    const created =
      input.ownerType === "artist"
        ? await supabase
            .from("artists")
            .insert({ profile_id: null, name: pageName, city: pageCity, genre: data.genre })
            .select("id, name, city")
            .single()
        : await supabase
            .from("venues")
            .insert({ profile_id: null, name: pageName, city: pageCity, address: pageAddress })
            .select("id, name, city")
            .single();

    if (created.error || !created.data) {
      console.error("[ai] createAdminPage:", created.error?.message);
      return { ok: false, error: "failed" };
    }

    owner = {
      ...created.data,
      address: pageAddress,
      latitude: null,
      longitude: null,
    };
    pageCreated = true;
  }

  const city = data.city?.trim() || owner.city?.trim() || null;
  if (input.status === "published" && !city) return { ok: false, error: "invalid" };

  // La mappa deve aprirsi con il pin già sul posto: si usano le coordinate del
  // locale collegato, altrimenti si geocodifica nome/indirizzo/città. Se Photon
  // non risponde, l'admin può sempre posizionare il pin nell'editor.
  const ownerHasCoordinates =
    input.ownerType === "venue" &&
    typeof owner.latitude === "number" &&
    typeof owner.longitude === "number";

  let coordinates: Coordinates | null = ownerHasCoordinates
    ? { latitude: owner.latitude as number, longitude: owner.longitude as number }
    : null;

  if (!coordinates) {
    coordinates = await findCoordinates({
      name: input.ownerType === "venue" ? owner.name : data.venue,
      address: data.address ?? owner.address ?? null,
      city,
    });
  }

  if (pageCreated && input.ownerType === "venue" && coordinates) {
    const { error: locationError } = await supabase
      .from("venues")
      .update({ latitude: coordinates.latitude, longitude: coordinates.longitude })
      .eq("id", owner.id);

    if (locationError) console.error("[ai] page coordinates:", locationError.message);
  }

  const descriptionParts = [
    data.artist ? "Artista: " + data.artist : null,
    data.address ? "Indirizzo: " + data.address : null,
    data.description,
  ].filter(Boolean);

  let coverImageUrl: string | null = null;
  const coverRequested = Boolean(input.coverSourceUrl?.trim());

  if (coverRequested && input.coverSourceUrl) {
    const cover = await prepareCoverFromUrl(input.coverSourceUrl);

    if (cover) {
      const path = session.id + "/" + crypto.randomUUID() + ".jpg";
      const { error: uploadError } = await supabase.storage
        .from("event-covers")
        .upload(path, cover.buffer, {
          contentType: cover.contentType,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        console.error("[ai] cover upload:", uploadError.message);
      } else {
        const { data: publicUrl } = supabase.storage.from("event-covers").getPublicUrl(path);
        coverImageUrl = publicUrl.publicUrl;
      }
    }
  }

  const insert = {
    title: data.title,
    description: descriptionParts.join("\n\n").slice(0, 4000),
    genre: data.genre,
    starts_at: instant.toISOString(),
    timezone: FILTER_TIMEZONE,
    city,
    venue_name: data.venue ?? (input.ownerType === "venue" ? owner.name : null),
    directions_text: data.address,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    price_text: data.priceText,
    ticket_url: validHttpUrl(data.ticketUrl ?? null),
    cover_image_url: coverImageUrl,
    status: input.status,
    artist_id: input.ownerType === "artist" ? owner.id : null,
    venue_id: input.ownerType === "venue" ? owner.id : null,
    created_by: session.id,
  };

  const { data: event, error } = await supabase
    .from("events")
    .insert(insert)
    .select("id")
    .single();

  if (error || !event) {
    console.error("[ai] createAdminEvent:", error?.message);

    // Se la scheda è nata in questa stessa operazione e l'evento non è stato
    // salvato, non la lasciamo orfana sulla piattaforma.
    if (pageCreated && owner) {
      const { error: cleanupError } = await supabase
        .from(ownerTable)
        .delete()
        .eq("id", owner.id);

      if (cleanupError) console.error("[ai] cleanup page:", cleanupError.message);
    }

    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/eventi");
  revalidatePath("/admin/ai");
  revalidatePath("/dashboard/events");

  if (pageCreated) {
    revalidatePath("/admin/artisti");
    revalidatePath("/admin/locali");
  }

  return {
    ok: true,
    eventId: event.id,
    pageId: owner.id,
    pageCreated,
    coverImported: coverImageUrl !== null,
    coverRequested,
    locationFound: coordinates !== null,
  };
}
export type VerificationAnalysisResult =
  | {
      ok: true;
      report: VerificationReport;
      ai:
        | { ok: true; summary: string; concerns: string[] }
        | { ok: false; error: string };
    }
  | { ok: false; error: "unauthorized" | "invalid" | "not_found" | "failed" };

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/** Controlli deterministici + riepilogo AI su una richiesta di claim. */
export async function analyzeClaimVerificationAction(input: {
  claimId: string;
}): Promise<VerificationAnalysisResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(input.claimId)) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: claim, error } = await supabase
    .from("claims")
    .select("id, subject_type, artist_id, venue_id, profile_id, proof_url")
    .eq("id", input.claimId)
    .maybeSingle();

  if (error || !claim) return { ok: false, error: "not_found" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", claim.profile_id)
    .maybeSingle();

  if (claim.subject_type === "artist") {
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, name, city, genre, spotify_url")
      .eq("id", claim.artist_id)
      .maybeSingle();

    if (artistError || !artist) return { ok: false, error: "not_found" };

    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artist.id);

    const report = await collectVerificationChecks({
      subjectType: "artist",
      email: profile?.email ?? null,
      proofUrl: claim.proof_url,
      city: artist.city,
      genre: artist.genre,
      address: null,
      latitude: null,
      longitude: null,
      website: null,
      spotifyUrl: artist.spotify_url,
      eventCount: count ?? 0,
    });

    const ai = await summarizeVerification({
      subjectType: "artist",
      name: artist.name,
      city: artist.city,
      genre: artist.genre,
      address: null,
      emailDomain: profile?.email?.split("@")[1] ?? null,
      proofHost: hostOf(claim.proof_url),
      websiteHost: null,
      spotifyHost: hostOf(artist.spotify_url),
      eventCount: count ?? 0,
      score: report.score,
      checks: report.checks,
    });

    return { ok: true, report, ai };
  }

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, name, city, address, latitude, longitude, website")
    .eq("id", claim.venue_id)
    .maybeSingle();

  if (venueError || !venue) return { ok: false, error: "not_found" };

  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venue.id);

  const report = await collectVerificationChecks({
    subjectType: "venue",
    email: profile?.email ?? null,
    proofUrl: claim.proof_url,
    city: venue.city,
    genre: null,
    address: venue.address,
    latitude: venue.latitude,
    longitude: venue.longitude,
    website: venue.website,
    spotifyUrl: null,
    eventCount: count ?? 0,
  });

  const ai = await summarizeVerification({
    subjectType: "venue",
    name: venue.name,
    city: venue.city,
    genre: null,
    address: venue.address,
    emailDomain: profile?.email?.split("@")[1] ?? null,
    proofHost: hostOf(claim.proof_url),
    websiteHost: hostOf(venue.website),
    spotifyHost: null,
    eventCount: count ?? 0,
    score: report.score,
    checks: report.checks,
  });

  return { ok: true, report, ai };
}
