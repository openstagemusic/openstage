import type { Metadata } from "next";
import { redirect } from "next/navigation";

import EventTeaser from "@/components/events/EventTeaser";
import LocaleLink from "@/components/i18n/LocaleLink";
import { listSavedEvents } from "@/lib/dashboard/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.dashboard.savedTitle, description: dict.dashboard.savedText };
}

/** Preferiti: gli eventi salvati con il cuore, dall'ultimo salvato. */
export default async function SavedEventsPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard;
  const saved = await listSavedEvents();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t.savedTitle}</h1>
      <p className="mt-2 text-sm text-muted">{t.savedText}</p>

      {saved.length === 0 ? (
        <section className="glass mt-8 rounded-3xl border border-white/10 p-6">
          <h2 className="font-display text-xl font-semibold">{t.emptySavedTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.emptySavedText}</p>
          <LocaleLink
            href="/"
            className="mt-4 inline-block rounded-full border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
          >
            {dict.events.backToExplore}
          </LocaleLink>
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </div>
  );
}
