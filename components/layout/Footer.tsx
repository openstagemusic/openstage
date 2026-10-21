import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";

const LINK = "text-muted transition-colors hover:text-white";

export default function Footer({ dict }: { dict: Dictionary["footer"] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface/35 md:mt-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] md:py-16">
        <div>
          <p className="font-display text-xl font-bold tracking-tight">
            Open<span className="text-gradient">Stage</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{dict.tagline}</p>
        </div>

        <nav aria-label={dict.linksLabel}>
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            {dict.linksLabel}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-1">
            <li>
              <Link href="/about" className={LINK}>
                {dict.about}
              </Link>
            </li>
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
          </ul>
        </nav>

        <div className="space-y-2 text-sm">
          <p className="text-muted">{dict.playlist}</p>
          <p className="text-muted">{dict.social}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">
          © {year} OpenStage. {dict.rights}
        </p>
      </div>
    </footer>
  );
}
