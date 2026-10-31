import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { PublicCall } from "@/lib/calls/queries";
import { periodLabel } from "@/lib/calls/format";
import type { Locale } from "@/lib/i18n/config";

/**
 * La bacheca in Home: una fascia, non una sezione.
 *
 * Compare solo se ci sono chiamate aperte e mostra quelle vere, due al massimo:
 * niente riquadri, niente annunci finti. Se non c'è niente, la fascia non esiste.
 */
export default function CallsBand({
  calls,
  count,
  locale,
  dict,
}: {
  calls: PublicCall[];
  count: number;
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.calls;
  const home = dict.home;

  return (
    <section className="border-y border-line">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              06 / {home.callsEyebrow}
            </p>
            <h2 className="mt-2 flex flex-wrap items-baseline gap-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-5xl">
              {home.callsTitle}
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {count} {count === 1 ? home.callsCountOne : home.callsCountMany}
              </span>
            </h2>
          </div>

          <Link
            href="/calls"
            className="inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
          >
            {home.callsAll} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="mt-5 border-t border-line">
          {calls.map((call) => {
            const fee = call.feeText ?? t.compensation[call.compensation];

            return (
              <li key={call.id} className="border-b border-line">
                <Link
                  href={`/calls/${call.id}`}
                  className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                      {t.roles[call.roleWanted]}
                    </span>
                    <span className="mt-1 block font-display text-lg font-semibold leading-tight transition-colors group-hover:text-cyan">
                      {call.title}
                    </span>
                  </span>

                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {[
                      call.owner.name,
                      call.city,
                      periodLabel(call.periodStart, call.periodEnd, locale),
                      fee,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
