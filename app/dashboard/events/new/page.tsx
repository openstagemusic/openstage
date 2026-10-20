import type { Metadata } from "next";
import { redirect } from "next/navigation";

import EventEditor from "@/components/dashboard/EventEditor";
import { canManageEvents } from "@/lib/auth/roles";
import { isProfileVerified, listCityOptions } from "@/lib/dashboard/queries";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { initialEditorState } from "@/lib/events/editor";
import { listGenres } from "@/lib/events/queries";
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

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{dict.editor.newTitle}</h1>
      <p className="mt-2 text-sm text-muted">{dict.editor.newSubtitle}</p>

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
          mapCenter={{
            latitude: visitor.center.latitude,
            longitude: visitor.center.longitude,
          }}
          verified={verified}
          currentStatus="draft"
          updatedAt={null}
          dict={dict}
        />
      </div>
    </div>
  );
}
