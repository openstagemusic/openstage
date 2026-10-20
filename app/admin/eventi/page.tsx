import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminEventsPanel from "@/components/admin/AdminEventsPanel";
import Link from "@/components/i18n/LocaleLink";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { listModerationEvents } from "@/lib/moderation/queries";

/**
 * Le serate già online, viste dall'admin.
 *
 * È la seconda metà della moderazione: la coda (`/admin`) si occupa di quello
 * che **aspetta** di entrare, questa pagina di quello che è **già** entrato e
 * può essere segnalato. Chi non è admin riceve un 404, come per la coda.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.admin.moderationTitle,
    description: dict.admin.moderationSubtitle,
    robots: { index: false, follow: false },
  };
}

export default async function AdminEventsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const events = await listModerationEvents();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/admin" className="text-sm text-muted transition-colors hover:text-white">
        ← {dict.admin.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
        {dict.admin.moderationTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{dict.admin.moderationSubtitle}</p>

      <AdminEventsPanel events={events} dict={dict.admin} locale={locale} />
    </main>
  );
}
