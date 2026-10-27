"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { fetchPublicPage } from "@/lib/ai/fetch-public";
import { prepareCoverFromUrl } from "@/lib/ai/cover";
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

export type CreateAdminEventResult =
  | { ok: true; eventId: string; coverImported: boolean; coverRequested: boolean }
  | { ok: false; error: "unauthorized" | "invalid" | "failed" };

function validHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Crea una bozza o pubblica un evento per conto di un artista/locale. */
export async function createAdminEventAction(input: {
  ownerType: "artist" | "venue";
  ownerId: string;
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
  const { data: owner, error: ownerError } = await supabase
    .from(ownerTable)
    .select("id, name, city")
    .eq("id", input.ownerId)
    .maybeSingle();

  if (ownerError || !owner) return { ok: false, error: "invalid" };

  const city = data.city?.trim() || owner.city?.trim() || null;
  if (input.status === "published" && !city) return { ok: false, error: "invalid" };

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
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/eventi");
  revalidatePath("/admin/ai");
  revalidatePath("/dashboard/events");

  return {
    ok: true,
    eventId: event.id,
    coverImported: coverImageUrl !== null,
    coverRequested,
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
