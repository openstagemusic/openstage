import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { closeCallAction, updateCallCapacityAction } from "@/app/actions/calls";
import CallForm from "@/components/calls/CallForm";
import NeedsPageNotice from "@/components/dashboard/NeedsPageNotice";
import LocaleLink from "@/components/i18n/LocaleLink";
import { ACTION_ARROW, ACTION_LINE } from "@/components/ui/actions";
import { listCallApplications, listMyCalls, type PublicCall } from "@/lib/calls/queries";
import { periodLabel } from "@/lib/calls/format";
import { canPostCalls } from "@/lib/auth/roles";
import { listCityOptions } from "@/lib/dashboard/queries";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function isExpired(call: PublicCall): boolean {
  return new Date(call.expiresAt) <= new Date();
}

export default async function MyCallsPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (!canPostCalls(session.role)) redirect(withLocale(locale, "/dashboard"));

  const dict = getDictionary(locale);
  const t = dict.calls;
  const d = t.dashboard;

  const [artistPage, venuePage, cities] = await Promise.all([
    session.role === "artist" ? getArtistByProfileId(session.id) : Promise.resolve(null),
    session.role === "venue" ? getVenueByProfileId(session.id) : Promise.resolve(null),
    listCityOptions(),
  ]);

  const page = artistPage ?? venuePage;

  if (!page) {
    return (
      <div>
        <h1 className="font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {d.title}
        </h1>
        <div className="mt-8">
          <NeedsPageNotice role={session.role === "artist" ? "artist" : "venue"} dict={dict.dashboard} />
        </div>
      </div>
    );
  }

  const calls = await listMyCalls(session.id);
  const openCall = calls.find((call) => call.status === "open" && !isExpired(call));

  const applicationsByCall = new Map(
    await Promise.all(
      calls
        .filter((call) => call.applications > 0)
        .map(async (call) => [call.id, await listCallApplications(call.id)] as const)
    )
  );

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{d.eyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {d.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{d.text}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <LocaleLink href="/calls" className={ACTION_LINE}>
            {t.eyebrow}
            <span aria-hidden="true" className={ACTION_ARROW}>
              ↗
            </span>
          </LocaleLink>
          <LocaleLink href="/dashboard/messaggi" className={ACTION_LINE}>
            {dict.dashboard.navMessages}
          </LocaleLink>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
          {d.newTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{d.newText}</p>

        {!session.verified ? (
          <p className="mt-4 os-note">{d.verifiedOnly}</p>
        ) : openCall ? (
          <p className="mt-4 os-note">
            {d.oneOpen}{" "}
            <LocaleLink href={`/calls/${openCall.id}`} className="underline underline-offset-4">
              {openCall.title}
            </LocaleLink>
          </p>
        ) : (
          <CallForm dict={d} cities={cities} />
        )}
      </section>

      <section className="mt-12 border-t border-line pt-6">
        <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
          {t.applications}
        </h2>

        {calls.length === 0 ? (
          <p className="mt-4 os-note">{d.none}</p>
        ) : (
          <ul className="mt-4 border-t border-line">
            {calls.map((call) => {
              const expired = isExpired(call);
              const statusLabel = call.status === "closed" ? d.callClosed : expired ? d.callExpired : d.callOpen;
              const applications = applicationsByCall.get(call.id) ?? [];

              return (
                <li key={call.id} className="border-b border-line py-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                        {t.roles[call.roleWanted]} ·{" "}
                        <span
                          className={
                            call.status === "open" && !expired ? "text-cyan" : "text-muted"
                          }
                        >
                          {statusLabel}
                        </span>
                      </p>
                      <LocaleLink
                        href={`/calls/${call.id}`}
                        className="mt-1 block font-poster text-2xl uppercase leading-[0.95] tracking-[-0.01em] transition-colors hover:text-cyan"
                      >
                        {call.title}
                      </LocaleLink>
                      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        {[
                          call.city,
                          periodLabel(call.periodStart, call.periodEnd, locale),
                          call.feeText ?? t.compensation[call.compensation],
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                      {call.applications} / {call.maxApplications} {t.slots}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                    <form action={updateCallCapacityAction} className="flex items-end gap-3">
                      <input type="hidden" name="callId" value={call.id} />
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                          {d.capacity}
                        </span>
                        <input
                          type="number"
                          name="maxApplications"
                          min={1}
                          max={50}
                          defaultValue={call.maxApplications}
                          className="os-field w-24 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
                      >
                        {d.save}
                      </button>
                    </form>

                    {call.status === "open" ? (
                      <form action={closeCallAction} className="flex items-end">
                        <input type="hidden" name="callId" value={call.id} />
                        <button
                          type="submit"
                          className="border-b border-pink/50 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:border-pink"
                        >
                          {d.close}
                        </button>
                      </form>
                    ) : null}
                  </div>

                  {call.status === "open" ? (
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {d.closeHint}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    {applications.length > 0 ? (
                      <ul className="border-t border-line">
                        {applications.map((application) => (
                          <li
                            key={application.id}
                            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-2.5"
                          >
                            <LocaleLink
                              href={`/dashboard/messaggi/${application.id}`}
                              className="text-sm text-white transition-colors hover:text-cyan"
                            >
                              {application.counterpartName}
                            </LocaleLink>
                            <LocaleLink
                              href={`/dashboard/messaggi/${application.id}`}
                              className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan"
                            >
                              {d.openThread} →
                            </LocaleLink>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">{d.applicationsEmpty}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
