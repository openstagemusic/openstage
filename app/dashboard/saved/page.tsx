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
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.navSaved}</p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
        {t.savedTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.savedText}</p>

      {saved.length === 0 ? (
        <section className="mt-8 border border-line bg-surface/60 p-6">
          <h2 className="font-display text-xl font-semibold">{t.emptySavedTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.emptySavedText}</p>
          <LocaleLink
            href="/"
            className="mt-4 inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
          >
            {dict.events.backToExplore}
          </LocaleLink>
        </section>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </div>
  );
}
