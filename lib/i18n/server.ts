import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { LOCALE_HEADER, PATHNAME_HEADER, SEARCH_HEADER } from "./locale-path";

/**
 * Server-side locale resolver.
 *
 * La fonte di verità è **l'URL** (`/it/...`, `/en/...`), che il middleware
 * riporta nell'header `x-locale`. Il cookie resta solo come preferenza per la
 * prima visita, quando la lingua si sceglie dall'indirizzo IP.
 */
export async function getLocale(): Promise<Locale> {
  const fromUrl = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fromUrl)) return fromUrl;

  const value = (await cookies()).get(LOCALE_COOKIE)?.value ?? null;
  return isLocale(value) ? value : defaultLocale;
}

/** Percorso corrente **senza** prefisso di lingua e senza query (es. `/locali`). */
export async function getCurrentPath(): Promise<string> {
  return (await headers()).get(PATHNAME_HEADER) ?? "/";
}

/** Query string corrente, con il `?` iniziale (vuota se non c'è). */
export async function getCurrentSearch(): Promise<string> {
  return (await headers()).get(SEARCH_HEADER) ?? "";
}
