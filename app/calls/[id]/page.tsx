import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ApplyToCallForm from "@/components/calls/ApplyToCallForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { periodLabel, shortDay } from "@/lib/calls/format";
import { getCall, listAppliedCallIds } from "@/lib/calls/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

type CallPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CallPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const call = await getCall(id);

  if (!call) return { title: dict.calls.eyebrow };

  return {
    title: call.title,
    description: call.body.slice(0, 160),
    robots: { index: false, follow: true },
  };
}

export default async function CallDetailPage({ params }: CallPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.calls;

  const session = await getSessionProfile();
  const call = await getCall(id);

  if (!call) notFound();

  const applied = session ? (await listAppliedCallIds(session.id)).has(call.id) : false;
  const ownCall = session ? await belongsToViewer(call.id, session.id) : false;

  const expired = new Date(call.expiresAt) <= new Date();
  const closed = call.status === "closed" || expired;

  const isApplicant =
    session !== null &&
    ((call.owner.type === "venue" && session.role === "artist") ||
      (call.owner.type === "artist" && session.role === "venue"));

  const period = periodLabel(call.periodStart, call.periodEnd, locale);
  const ownerHref =
    call.owner.type === "venue" ? venuePath({ slug: call.owner.slug }) : artistPath({ slug: call.owner.slug });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <LocaleLink
        href="/calls"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.detailBack}
      </LocaleLink>

      <header className="mt-8 border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          {t.roles[call.roleWanted]}
        </p>
        <h1 className="mt-3 text-balance font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
          {call.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          <LocaleLink href={ownerHref} className="text-cyan hover:text-white">
            {call.owner.name} →
          </LocaleLink>
          {call.city ? <span>{call.city}</span> : null}
          {period ? <span>{period}</span> : null}
          <span>{call.feeText ?? t.compensation[call.compensation]}</span>
          <span className={closed ? "text-pink" : "text-cyan"}>
            {call.status === "closed" ? t.closed : expired ? t.expired : `${t.expires} ${shortDay(call.expiresAt, locale)}`}
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
        <div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{call.body}</p>

          <section className="mt-10 border-t border-line pt-6">
            <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
              {t.applications}
            </h2>

            {ownCall ? (
              <p className="mt-3 text-sm text-muted">
                {call.applications} / {call.maxApplications} {t.slots}
              </p>
            ) : null}

            {closed ? (
              <p className="mt-3 os-note">{t.errorClosed}</p>
            ) : !session ? (
              <LocaleLink
                href={`/login?next=${encodeURIComponent(`/calls/${call.id}`)}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
              >
                {t.loginToApply} →
              </LocaleLink>
            ) : ownCall ? (
              <p className="mt-3 os-note">{t.ownCall}</p>
            ) : !isApplicant ? (
              <p className="mt-3 os-note">{t.wrongRole}</p>
            ) : applied ? (
              <p className="mt-3 os-note os-note-cyan">
                {t.appliedNote}{" "}
                <LocaleLink href="/dashboard/messaggi" className="underline underline-offset-4">
                  {t.appliedCta}
                </LocaleLink>
              </p>
            ) : (
              <ApplyToCallForm callId={call.id} dict={t} applied={applied} />
            )}
          </section>
        </div>

        <aside className="border-t border-line pt-4 lg:border-t-0 lg:pt-0">
          <dl className="space-y-3 font-mono text-[10px] uppercase tracking-[0.1em]">
            <div>
              <dt className="text-muted">{t.city}</dt>
              <dd className="mt-1 text-white">{call.city ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{t.period}</dt>
              <dd className="mt-1 text-white">{period ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{t.fee}</dt>
              <dd className="mt-1 text-white">
                {call.feeText ?? t.compensation[call.compensation]}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

/** La chiamata è del profilo che sta leggendo? */
async function belongsToViewer(callId: string, profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calls")
    .select("created_by")
    .eq("id", callId)
    .maybeSingle();

  return data?.created_by === profileId;
}
