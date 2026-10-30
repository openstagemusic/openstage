import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";

const LINK =
  "text-muted underline-offset-4 transition-colors hover:text-white hover:underline";

export default function Footer({
  dict,
  hasPlaylists,
}: {
  dict: Dictionary["footer"];
  /** La voce compare solo quando esiste una playlist reale e pubblicata. */
  hasPlaylists: boolean;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line md:mt-28 print:hidden">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] md:py-16">
        <div>
          <p className="font-poster text-2xl uppercase leading-none tracking-[0.02em]">
            Open<span className="text-cyan">/</span>Stage
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{dict.tagline}</p>
        </div>

        <nav aria-label={dict.linksLabel}>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {dict.linksLabel}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-1">
            <li>
              <Link href="/about" className={LINK}>
                {dict.about}
              </Link>
            </li>
            <li>
              <Link href="/citta" className={LINK}>
                {dict.cities}
              </Link>
            </li>
            {hasPlaylists ? (
              <li>
                <Link href="/playlists" className={LINK}>
                  {dict.playlist}
                </Link>
              </li>
            ) : null}
            <li>
              <Link href="/contatti" className={LINK}>
                {dict.contact}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={LINK}>
                {dict.privacy}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={LINK}>
                {dict.terms}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className={LINK}>
                {dict.cookies}
              </Link>
            </li>
            <li>
              <Link href="/notice-takedown" className={LINK}>
                {dict.takedown}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={dict.takePart}>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {dict.takePart}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-1">
            <li>
              <Link href="/per-gli-artisti" className={LINK}>
                {dict.forArtists}
              </Link>
            </li>
            <li>
              <Link href="/per-le-venue" className={LINK}>
                {dict.forVenues}
              </Link>
            </li>
            <li>
              <Link href="/faq" className={LINK}>
                {dict.faq}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-[1400px] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted sm:px-6">
          © {year} OpenStage. {dict.rights}
        </p>
      </div>
    </footer>
  );
}
