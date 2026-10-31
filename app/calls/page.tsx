import type { Metadata } from "next";

import LocaleLink from "@/components/i18n/LocaleLink";
import PageHero from "@/components/pages/PageHero";
import Pagination from "@/components/ui/Pagination";
import { periodLabel } from "@/lib/calls/format";
import { countOpenCalls, listOpenCalls, type CallRole } from "@/lib/calls/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ITEMS_PER_PAGE } from "@/lib/pagination";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.calls.eyebrow, description: dict.calls.lead };
}

const ROLES: CallRole[] = ["artist", "band", "dj", "performer", "technician", "other"];

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ ruolo?: string; page?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.calls;

  const params = await searchParams;
  const role = ROLES.includes(params.ruolo as CallRole) ? (params.ruolo as CallRole) : null;

  const total = await countOpenCalls({ role });
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const page = Math.min(Math.max(1, Number.parseInt(params.page ?? "", 10) || 1), totalPages);

  const calls = await listOpenCalls({
    role,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  });

  return (
    <div>
      <PageHero eyebrow={t.eyebrow} headline={t.title} accent={t.accent} lead={t.lead}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LocaleLink
            href="/calls"
            aria-current={role === null ? "page" : undefined}
            className={
              role === null
                ? "border-b border-cyan pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan"
                : "border-b border-transparent pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
            }
          >
            {t.filterAll}
          </LocaleLink>
          {ROLES.map((item) => (
            <LocaleLink
              key={item}
              href={`/calls?ruolo=${item}`}
              aria-current={role === item ? "page" : undefined}
              className={
                role === item
                  ? "border-b border-cyan pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan"
                  : "border-b border-transparent pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
              }
            >
              {t.roles[item]}
            </LocaleLink>
          ))}
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 sm:pb-16">
        {calls.length > 0 ? (
          <ul className="border-t border-line">
            {calls.map((call) => {
              const period = periodLabel(call.periodStart, call.periodEnd, locale);
              const fee =
                call.feeText ?? t.compensation[call.compensation];

              return (
                <li key={call.id} className="border-b border-line">
                  <LocaleLink
                    href={`/calls/${call.id}`}
                    className="group grid gap-3 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-8"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                        {t.roles[call.roleWanted]}
                      </p>
                      <h2 className="mt-1 font-poster text-2xl uppercase leading-[0.95] tracking-[-0.01em] transition-colors group-hover:text-cyan sm:text-3xl">
                        {call.title}
                      </h2>
                      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        {[call.owner.name, call.city, period, fee].filter(Boolean).join(" · ")}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="font-mono text-[11px] text-cyan opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      →
                    </span>
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border-t border-line pt-8">
            <h2 className="font-poster text-3xl uppercase leading-none">{t.emptyTitle}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.emptyText}</p>
            <LocaleLink
              href="/artisti"
              className="mt-5 inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
            >
              {t.emptyCta} <span aria-hidden="true">→</span>
            </LocaleLink>
          </div>
        )}

        {total > ITEMS_PER_PAGE ? (
          <div className="mt-10">
            <Pagination
              currentPage={page}
              totalItems={total}
              basePath="/calls"
              params={role ? { ruolo: role } : undefined}
              labels={{
                previous: dict.pagination.previous,
                next: dict.pagination.next,
                label: dict.pagination.label,
              }}
            />
          </div>
        ) : null}

        <p className="mt-8 max-w-2xl font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {t.note}
        </p>
      </div>
    </div>
  );
}
