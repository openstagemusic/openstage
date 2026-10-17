"use client";

import NextLink from "next/link";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { withLocale } from "@/lib/i18n/locale-path";

type LinkProps = React.ComponentProps<typeof NextLink>;

/**
 * Sostituto di `next/link` che antepone la lingua corrente.
 *
 * Serve perché la lingua è un prefisso di percorso (`/it/...`, `/en/...`):
 * scrivere `href="/locali"` porterebbe il visitatore fuori dalla lingua in cui
 * sta navigando. Gli URL già localizzati, quelli esterni e le àncore restano
 * intatti, quindi è sicuro anche sui collegamenti calcolati.
 */
export default function Link({ href, ...props }: LinkProps) {
  const locale = useLocale();

  const localized = typeof href === "string" ? withLocale(locale, href) : href;

  return <NextLink href={localized} {...props} />;
}
