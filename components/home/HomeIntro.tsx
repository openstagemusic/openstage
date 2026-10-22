import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * La presentazione breve in Home: chi siamo e cosa si può fare, prima della
 * mappa e degli eventi. Statement + tre punti a righe, senza card.
 */
export default function HomeIntro({ dict }: { dict: Dictionary }) {
  const t = dict.home.what;

  return (
    <section id="chi-siamo" className="border-y border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
            04 / {t.eyebrow}
          </p>

          <h2 className="mt-3 max-w-3xl text-balance font-poster text-4xl uppercase leading-[0.92] tracking-[-0.01em] sm:text-6xl">
            {t.title}
          </h2>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {t.text}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link
              href="/about"
              className="home-arrow-link inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
            >
              {t.aboutCta} <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/per-gli-artisti"
              className="home-arrow-link inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
            >
              {t.artistsCta} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className="mt-10 max-w-2xl font-poster text-3xl uppercase leading-[0.9] tracking-[-0.01em] text-foreground sm:text-5xl">
            {t.claim.lead} <span className="text-pink">{t.claim.accent}</span>
          </p>
        </div>

        <ul className="self-start border-t border-line">
          {t.points.map((point, index) => (
            <li
              key={point.title}
              className="grid grid-cols-[2.25rem_1fr] gap-4 border-b border-line py-5"
            >
              <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold">{point.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{point.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
