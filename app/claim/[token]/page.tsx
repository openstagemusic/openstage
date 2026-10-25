import type { Metadata } from "next";

import LogoutButton from "@/components/auth/LogoutButton";
import ClaimInviteAccept from "@/components/claims/ClaimInviteAccept";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getClaimInviteInfo, maskEmail } from "@/lib/claims/invites";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Il link dell'invito a reclamare una scheda.
 *
 * Il token è l'unica chiave: chi lo apre vede la scheda e l'email a cui è
 * destinato, ma non può accettare con un altro account. La verifica
 * dell'email avviene nel database, non solo nell'interfaccia.
 */
export default async function ClaimInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.claims;

  const [info, session] = await Promise.all([getClaimInviteInfo(token), getSessionProfile()]);
  const claimPath = withLocale(locale, `/claim/${token}`);
  const loginHref = `${withLocale(locale, "/login")}?next=${encodeURIComponent(claimPath)}`;
  const registerHref = `${withLocale(locale, "/register")}?next=${encodeURIComponent(claimPath)}`;

  if (!info.valid) {
    const message =
      info.status === "expired"
        ? t.inviteExpired
        : info.status === "accepted"
          ? t.inviteUsed
          : info.status === "revoked"
            ? t.inviteRevokedInfo
            : t.inviteInvalid;

    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          OpenStage · {t.invitePageTitle}
        </p>
        <h1 className="mt-4 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {t.invitePageTitle}
        </h1>
        <p className="mt-6 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {message}
        </p>
        <LocaleLink
          href="/"
          className="mt-8 inline-flex min-h-11 items-center border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan/50"
        >
          OpenStage
        </LocaleLink>
      </section>
    );
  }

  const emailMatches =
    session?.email && info.email
      ? session.email.toLowerCase() === info.email.toLowerCase()
      : false;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
        OpenStage · {t.invitePageTitle}
      </p>
      <h1 className="mt-4 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
        {info.name ?? t.invitePageTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.invitePageLead}</p>

      <div className="mt-8 border border-line bg-surface/50 p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {t.inviteFor}
        </p>
        <p className="mt-1 text-sm text-white">{info.email ? maskEmail(info.email) : "—"}</p>

        {!session ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <LocaleLink
              href={loginHref}
              className="inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
            >
              {t.inviteLogin}
            </LocaleLink>
            <LocaleLink
              href={registerHref}
              className="inline-flex min-h-11 items-center justify-center border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan/50"
            >
              {t.inviteRegister}
            </LocaleLink>
          </div>
        ) : emailMatches ? (
          <div className="mt-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {t.inviteLoggedAs}: {session.email}
            </p>
            <div className="mt-4">
              <ClaimInviteAccept token={token} dict={t} />
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-white">{t.inviteEmailMismatch}</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.06em] text-muted">
              {t.inviteLoggedAs}: {session.email}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LogoutButton label={t.inviteLogout} />
              <LocaleLink
                href={loginHref}
                className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan/50"
              >
                {t.inviteLogin}
              </LocaleLink>
            </div>
            <p className="mt-3 text-xs text-muted">{t.inviteWrongAccount}</p>
          </div>
        )}
      </div>
    </section>
  );
}
