import { cookies } from "next/headers";

import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Server-side locale resolver.
 * The middleware sets NEXT_LOCALE from the visitor's country (or their manual
 * choice); here we simply read it back.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value ?? null;
  return isLocale(value) ? value : defaultLocale;
}
