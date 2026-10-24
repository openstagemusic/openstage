import type { Metadata } from "next";

import LocaleLink from "@/components/i18n/LocaleLink";
import UnsubscribeForm from "@/components/notifications/UnsubscribeForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.notifications;
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">OpenStage</p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
        {t.unsubscribeTitle}
      </h1>

      <div className="mt-8">
        {UUID.test(token) ? (
          <UnsubscribeForm token={token} dict={t} />
        ) : (
          <div>
            <p className="border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
              {t.unsubscribeMissing}
            </p>
            <LocaleLink
              href="/"
              className="mt-6 inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
            >
              {t.unsubscribeBack}
            </LocaleLink>
          </div>
        )}
      </div>
    </div>
  );
}
