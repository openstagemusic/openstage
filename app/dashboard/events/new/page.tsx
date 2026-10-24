import type { Metadata } from "next";
import { redirect } from "next/navigation";

import EventEditor from "@/components/dashboard/EventEditor";
import { canManageEvents } from "@/lib/auth/roles";
import { isProfileVerified, listCityOptions } from "@/lib/dashboard/queries";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { initialEditorState } from "@/lib/events/editor";
import { listGenres } from "@/lib/events/queries";
import { searchPlaces } from "@/lib/geo/geocoder";
import { getVisitorLocation } from "@/lib/geo/visitor";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.editor.newTitle, description: dict.editor.newSubtitle };
}

/** Creazione di un evento: il modulo completo, con anteprima e mini mappa. */
export default async function NewEventPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  // Pubblicano eventi solo artisti e locali: la stessa regola vive nella RLS.
  if (!canManageEvents(session.role)) redirect(withLocale(locale, "/onboarding/role"));

  const dict = getDictionary(locale);

  const [venue, artist, verified, cities, genres, visitor] = await Promise.all([
    getVenueByProfileId(session.id),
    getArtistByProfileId(session.id),
    isProfileVerified(session.id),
    listCityOptions(),
    listGenres(),
    getVisitorLocation(),
  ]);

  const initial = initialEditorState();

  // Un locale crea le sue serate: scheda e posizione sono già le sue.
  if (venue) {
    initial.venueId = venue.id;
    initial.city = venue.city ?? "";
    initial.latitude = venue.latitude;
    initial.longitude = venue.longitude;
  }

  // Un artista crea le sue: la scheda artista è già collegata e non si sceglie.
  if (artist) initial.artistId = artist.id;

  // Dove aprire la mappa.
  //
  // Se il locale collegato ha un pin, si parte da lì. Se non ce l'ha (capita:
  // la scheda è stata creata scrivendo la città e basta), si parte dalla **sua
  // città**, non dalla posizione di chi scrive: chi organizza a Napoli non deve
  // ritrovarsi la mappa su Milano e trascinare il pin per mezza Italia.
  //
  // In quel caso il pin si mette al centro della città con precisione "zona"
  // (3 km): è vero che la serata è lì, non è vero che è a quel civico. Chi sa
  // dov'è lo trascina e diventa esatto.
  let mapCenter = {
    latitude: visitor.center.latitude,
    longitude: visitor.center.longitude,
  };

  if (venue?.latitude != null && venue.longitude != null) {
    mapCenter = { latitude: venue.latitude, longitude: venue.longitude };
  } else if (venue?.city) {
    const [place] = await searchPlaces(venue.city, { locale, timeoutMs: 1800 });

    if (place) {
      mapCenter = { latitude: place.latitude, longitude: place.longitude };
      initial.latitude = place.latitude;
      initial.longitude = place.longitude;
      initial.locationPrecision = "approximate";
      initial.areaRadiusM = 3000;
    }
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
        {dict.dashboard.navNew}
      </p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
        {dict.editor.newTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        {dict.editor.newSubtitle}
      </p>

      <div className="mt-8">
        <EventEditor
          mode="create"
          eventId={null}
          initial={initial}
          linkedVenueName={venue?.name ?? null}
          linkedArtist={artist ? { id: artist.id, name: artist.name } : null}
          artistLocked={Boolean(artist)}
          cities={cities}
          genres={genres}
          mapCenter={mapCenter}
          verified={verified}
          currentStatus="draft"
          updatedAt={null}
          dict={dict}
        />
      </div>
    </div>
  );
}
