import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import { canManageEvents } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.events.newTitle, description: dict.events.newSubtitle };
}

/**
 * Creazione di un evento. L'editor vero e proprio arriva nel blocco successivo
 * della fase (3.3.2): qui la pagina esiste già, con il percorso definitivo, così
 * i collegamenti non cambiano più.
 */
export default async function NewEventPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  if (!canManageEvents(session.role)) redirect(withLocale(locale, "/onboarding/role"));

  const dict = getDictionary(locale);

  return (
    <section className="glass rounded-3xl border border-white/10 p-6">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {dict.events.newTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.events.newSubtitle}</p>

      <LocaleLink
        href="/dashboard/events"
        className="mt-6 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
      >
        {dict.dashboard.navEvents}
      </LocaleLink>
    </section>
  );
}
