"use client";

import { createContext, useContext } from "react";

import { defaultLocale, type Locale } from "@/lib/i18n/config";

/**
 * La lingua della richiesta corrente, letta dal percorso (`/it/...`, `/en/...`)
 * e passata dal layout radice.
 *
 * Serve ai componenti client: le Server Component la leggono dagli header
 * (`getLocale`), i componenti client non possono. Il valore arriva dal server,
 * quindi è autorevole anche quando l'URL mostra un prefisso che l'app non
 * vede direttamente.
 */
const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Lingua corrente in un componente client. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}
