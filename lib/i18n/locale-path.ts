import { isLocale, type Locale } from "./config";

/**
 * La lingua vive **nell'URL** (`/it/...`, `/en/...`): è l'unico modo perché le
 * pagine italiane e quelle inglesi siano indicizzabili separatamente, con
 * `hreflang` e `canonical` corretti.
 *
 * Il middleware riscrive internamente `/it/locali` → `/locali`, così le pagine
 * restano dove sono, e passa lingua e percorso corrente alle Server Component
 * attraverso questi header.
 */
export const LOCALE_HEADER = "x-locale";
export const PATHNAME_HEADER = "x-pathname";
export const SEARCH_HEADER = "x-search";

function normalize(path: string): string {
  if (!path) return "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

/** `/it/locali` → `{ locale: "it", rest: "/locali" }`; `/locali` → `{ locale: null, … }`. */
export function splitLocalePath(pathname: string): { locale: Locale | null; rest: string } {
  const [first, ...others] = pathname.split("/").filter(Boolean);

  if (isLocale(first)) {
    return { locale: first, rest: normalize(others.join("/")) };
  }

  return { locale: null, rest: normalize(pathname) };
}

/** Percorso senza prefisso di lingua (`/it/locali` → `/locali`). */
export function stripLocale(pathname: string): string {
  return splitLocalePath(pathname).rest;
}

/** Lingua contenuta nel percorso, se presente. */
export function localeFromPathname(pathname: string): Locale | null {
  return splitLocalePath(pathname).locale;
}

/**
 * Aggiunge il prefisso di lingua a un collegamento interno.
 * Collegamenti esterni, àncore e URL già localizzati restano intatti:
 * si può usare la stessa funzione due volte senza danno.
 */
export function withLocale(locale: Locale, href: string): string {
  if (!href) return `/${locale}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) {
    return href;
  }

  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const suffix = cut === -1 ? "" : href.slice(cut);

  if (path === "" || path === "/") return `/${locale}${suffix}`;
  if (localeFromPathname(path)) return href;

  return `/${locale}${path.startsWith("/") ? path : `/${path}`}${suffix}`;
}
