import Link from "@/components/i18n/LocaleLink";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

/**
 * Pagina 404.
 *
 * Gli indirizzi pubblici (`/eventi/<citta>/<slug>`, `/artisti/<slug>`) possono
 * invecchiare: chi arriva da un link vecchio deve trovare una pagina vera, non
 * l'errore grezzo del framework.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <p className="font-display text-5xl font-bold tracking-tight text-white/20">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">{dict.notFound.title}</h1>
      <p className="mt-3 text-sm text-muted">{dict.notFound.text}</p>

      <Link
        href="/"
        className="mt-8 rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {dict.notFound.cta}
      </Link>
    </div>
  );
}
