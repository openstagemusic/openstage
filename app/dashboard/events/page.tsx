import type { Metadata } from "next";
import { redirect } from "next/navigation";

import MyEvents from "@/components/dashboard/MyEvents";
import { canManageEvents } from "@/lib/auth/roles";
import { isProfileVerified, listMyEvents } from "@/lib/dashboard/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.dashboard.eventsTitle, description: dict.dashboard.eventsText };
}

/** "I miei eventi": gli eventi creati da questo profilo, divisi per stato. */
export default async function MyEventsPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  // Pubblicano eventi solo artisti e locali: la stessa regola vive nella RLS,
  // qui evitiamo solo di mostrare un elenco che sarebbe sempre vuoto.
  if (!canManageEvents(session.role)) redirect(withLocale(locale, "/onboarding/role"));

  const t = getDictionary(locale).dashboard;

  const [events, verified] = await Promise.all([
    listMyEvents(session.id),
    isProfileVerified(session.id),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t.eventsTitle}</h1>
      <p className="mt-2 text-sm text-muted">{t.eventsText}</p>

      <div className="mt-8">
        <MyEvents events={events} verified={verified} dict={t} />
      </div>
    </div>
  );
}
