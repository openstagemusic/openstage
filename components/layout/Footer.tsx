import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";

export default function Footer({ dict }: { dict: Dictionary["footer"] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="glass mt-24 border-t border-white/10">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold tracking-tight">
            Open<span className="text-gradient">Stage</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">{dict.tagline}</p>
        </div>

        <nav aria-label="Footer">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-muted transition-colors hover:text-white">
                {dict.about}
              </Link>
            </li>
            <li>
              <Link href="/contatti" className="text-muted transition-colors hover:text-white">
                {dict.contact}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-muted transition-colors hover:text-white">
                {dict.privacy}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted transition-colors hover:text-white">
                {dict.terms}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-muted transition-colors hover:text-white">
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

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">
          © {year} OpenStage. {dict.rights}
        </p>
      </div>
    </footer>
  );
}
