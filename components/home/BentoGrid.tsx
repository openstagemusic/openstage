import Link from "next/link";

import Counters from "@/components/home/Counters";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { DiscoveryCounters } from "@/lib/events/queries";
import { cn } from "@/lib/utils";

type BentoGridProps = {
  dict: Dictionary;
  counters: DiscoveryCounters;
};

const TILE = "glass rounded-3xl border border-white/10 p-6";

const CTA =
  "mt-4 inline-flex w-fit rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5";

/**
 * Bento promozionale sotto lo showcase: come funziona, i numeri reali della
 * piattaforma e le due porte d'ingresso (artisti, locali).
 *
 * I tre pannelli dei valori restano in fondo alla griglia: sono il manifesto
 * di OpenStage, e da qui si leggono insieme a ciò che si può fare davvero.
 */
export default function BentoGrid({ dict, counters }: BentoGridProps) {
  const t = dict.bento;
  const values = dict.home.values;

  const items = [
    { label: t.eventsLabel, value: counters.events },
    { label: t.artistsLabel, value: counters.artists },
    { label: t.venuesLabel, value: counters.venues },
    { label: t.citiesLabel, value: counters.cities },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li className={cn(TILE, "sm:col-span-2")}>
        <h2 className="font-display text-lg font-semibold">{t.howTitle}</h2>

        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {t.howSteps.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-violet to-cyan text-xs font-semibold text-white"
              >
                {index + 1}
              </span>
              <h3 className="mt-2 font-display text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </li>

      <li className={TILE}>
        <h2 className="font-display text-lg font-semibold">{t.numbersTitle}</h2>
        <Counters items={items} />
        <p className="mt-4 text-xs leading-relaxed text-muted">{t.numbersNote}</p>
      </li>

      <li className={cn(TILE, "flex flex-col")}>
        <h2 className="font-display text-lg font-semibold">{t.artistsTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.artistsText}</p>
        <Link href="/per-gli-artisti" className={CTA}>
          {t.artistsCta}
        </Link>
      </li>

      <li className={cn(TILE, "flex flex-col")}>
        <h2 className="font-display text-lg font-semibold">{t.venuesTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.venuesText}</p>
        <Link href="/per-le-venue" className={CTA}>
          {t.venuesCta}
        </Link>
      </li>

      <li className={TILE}>
        <h2 className="font-display text-lg font-semibold">{values.ethicsTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{values.ethicsText}</p>
      </li>

      <li className={cn(TILE, "sm:col-span-2 lg:col-span-1")}>
        <h2 className="font-display text-lg font-semibold">{values.undergroundTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{values.undergroundText}</p>
      </li>

      <li className={cn(TILE, "sm:col-span-2")}>
        <h2 className="font-display text-lg font-semibold">{values.authenticTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{values.authenticText}</p>
      </li>
    </ul>
  );
}
