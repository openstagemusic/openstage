import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * La presentazione breve in Home: chi siamo e cosa si può fare, prima della
 * mappa e degli eventi. Tre punti, niente muri di testo.
 */
export default function HomeIntro({ dict }: { dict: Dictionary }) {
  const t = dict.home.what;

  return (
    <section className="border-y border-line bg-surface/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_1.05fr] md:items-start md:gap-14 md:py-14">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>

          <h2 className="mt-3 text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t.title}
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {t.text}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/about"
              className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              {t.aboutCta}
            </Link>
            <Link
              href="/per-gli-artisti"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white"
            >
              {t.artistsCta}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <ul className="grid gap-5 sm:grid-cols-3 md:grid-cols-1 md:gap-4">
          {t.points.map((point, index) => (
            <li key={point.title} className="border-t border-line pt-3">
              <span className="font-display text-xs text-violet">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 font-display text-sm font-semibold">{point.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{point.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
