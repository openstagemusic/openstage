import Link from "@/components/i18n/LocaleLink";

import Counters from "@/components/home/Counters";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { DiscoveryCounters } from "@/lib/events/queries";

type BentoGridProps = {
  dict: Dictionary;
  counters: DiscoveryCounters;
};

const CTA =
  "mt-4 inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan";

/**
 * Come funziona, numeri reali e le due porte d'ingresso (artisti, locali).
 * È una sezione a righe: niente bento, niente pannelli, niente card.
 */
export default function BentoGrid({ dict, counters }: BentoGridProps) {
  const t = dict.bento;

  const items = [
    { label: t.eventsLabel, value: counters.events },
    { label: t.artistsLabel, value: counters.artists },
    { label: t.venuesLabel, value: counters.venues },
    { label: t.citiesLabel, value: counters.cities },
  ];

  return (
    <section id="come-funziona" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="border-t border-line pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          05 / OpenStage
        </p>
        <h2 className="mt-2 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-6xl">
          {t.howTitle}
        </h2>
      </div>

      <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
        {t.howSteps.map((step, index) => (
          <li key={step.title} className="border-t border-line pt-4">
            <span
              aria-hidden="true"
              className="font-poster text-5xl leading-none text-violet/80 sm:text-6xl"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-10 border-y border-line py-8 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <div>
          <h2 className="font-poster text-3xl uppercase leading-none tracking-[-0.01em] sm:text-4xl">
            {t.numbersTitle}
          </h2>
          <Counters items={items} />
          <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted">{t.numbersNote}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1">
          <div className="border-t border-line pt-4">
            <h3 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
              {t.artistsTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.artistsText}</p>
            <ul className="mt-3 space-y-1">
              {t.artistsTools.map((tool) => (
                <li
                  key={tool}
                  className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
                >
                  <span aria-hidden="true" className="text-cyan">
                    +
                  </span>
                  {tool}
                </li>
              ))}
            </ul>
            <Link href="/per-gli-artisti" className="group">
              <span className={CTA}>
                {t.artistsCta} <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
              {t.venuesTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.venuesText}</p>
            <ul className="mt-3 space-y-1">
              {t.venuesTools.map((tool) => (
                <li
                  key={tool}
                  className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
                >
                  <span aria-hidden="true" className="text-cyan">
                    +
                  </span>
                  {tool}
                </li>
              ))}
            </ul>
            <Link href="/per-le-venue" className="group">
              <span className={CTA}>
                {t.venuesCta} <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
