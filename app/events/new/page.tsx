import Link from "next/link";
import { redirect } from "next/navigation";

import { canManageEvents } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.events.newTitle,
    description: dict.events.newSubtitle,
  }));

export default async function NewEventPage() {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  // Pubblicano eventi solo artisti e locali: la stessa regola vive nella RLS,
  // qui evitiamo solo di mostrare una pagina che il database rifiuterebbe.
  if (!canManageEvents(session.role)) {
    redirect("/onboarding/role");
  }

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{dict.events.newTitle}</h1>
      <p className="mt-2 text-sm text-muted">{dict.events.newSubtitle}</p>

      <Link
        href="/"
        className="mt-8 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
      >
        {dict.events.backHome}
      </Link>
    </section>
  );
}
