import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import BookingRequestForm from "@/components/booking/BookingRequestForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getBookingTarget } from "@/lib/booking/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string; venue?: string }>;
}) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (session.role !== "artist" && session.role !== "venue") {
    redirect(withLocale(locale, "/dashboard"));
  }

  const dict = getDictionary(locale);
  const t = dict.booking;
  const params = await searchParams;

  const targetType = session.role === "artist" ? "venue" : "artist";
  const targetId = (session.role === "artist" ? params.venue : params.artist) ?? "";

  if (!targetId) redirect(withLocale(locale, "/dashboard/messaggi"));

  const target = await getBookingTarget(targetType, targetId);
  if (!target || !target.profileId) notFound();
  if (target.profileId === session.id) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <LocaleLink
        href="/dashboard/messaggi"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.threadBack}
      </LocaleLink>

      <header className="mt-8 border-b border-line pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.inboxEyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {targetType === "venue" ? t.ctaVenue : t.ctaArtist}
        </h1>
        <p className="mt-3 font-display text-xl font-semibold">{target.name}</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.newLead}</p>
      </header>

      <BookingRequestForm
        targetType={targetType}
        targetId={target.id}
        targetName={target.name}
        dict={t}
      />
    </div>
  );
}
