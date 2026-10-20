import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import EventEditor from "@/components/dashboard/EventEditor";
import { canManageEvents } from "@/lib/auth/roles";
import { getMyEvent, isProfileVerified, listCityOptions } from "@/lib/dashboard/queries";
import { getArtistByProfileId } from "@/lib/directory/queries";
import { editorStateFromEvent } from "@/lib/events/editor";
import { listGenres } from "@/lib/events/queries";
import { getVisitorLocation } from "@/lib/geo/visitor";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.editor.editTitle, description: dict.editor.editSubtitle };
}

/**
 * Modifica di un proprio evento.
 *
 * Un evento che non è nostro non esiste, da qui: `getMyEvent` filtra su
 * `created_by`, e la RLS lo conferma. Chi prova un indirizzo scritto a mano
 * riceve un 404, non un "accesso negato".
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  if (!canManageEvents(session.role)) redirect(withLocale(locale, "/onboarding/role"));

  const event = await getMyEvent(id, session.id);

  if (!event) notFound();

  const dict = getDictionary(locale);

  const [ownArtist, verified, cities, genres, visitor] = await Promise.all([
    getArtistByProfileId(session.id),
    isProfileVerified(session.id),
    listCityOptions(),
    listGenres(),
    getVisitorLocation(),
  ]);

  const initial = editorStateFromEvent({
    ...event,
    venueId: event.venue?.id ?? null,
    venueName: event.venueName,
    artistId: event.artist?.id ?? null,
  });

  const statusLabel = {
    draft: dict.dashboard.statusDraft,
    published: dict.dashboard.statusPublished,
    cancelled: dict.dashboard.statusCancelled,
  }[event.status];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{dict.editor.editTitle}</h1>
      <p className="mt-2 text-sm text-muted">{dict.editor.editSubtitle}</p>
      <p className="mt-1 text-xs text-muted">{statusLabel}</p>

      <div className="mt-8">
        <EventEditor
          mode="edit"
          eventId={event.id}
          initial={initial}
          linkedVenueName={event.venue?.name ?? null}
          linkedArtist={event.artist ? { id: event.artist.id, name: event.artist.name } : null}
          artistLocked={Boolean(ownArtist)}
          cities={cities}
          genres={genres}
          mapCenter={{
            latitude: event.latitude ?? visitor.center.latitude,
            longitude: event.longitude ?? visitor.center.longitude,
          }}
          verified={verified}
          currentStatus={event.status}
          updatedAt={event.updatedAt}
          dict={dict}
        />
      </div>
    </div>
  );
}
