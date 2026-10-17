export const locales = ["it", "en"] as const;

export type Locale = (typeof locales)[number];

/** Italian is the primary language of the platform. */
export const defaultLocale: Locale = "it";

/** Cookie that stores the visitor's language choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Opzioni del cookie di lingua: preferenza, non dato di sessione. */
export const LOCALE_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "it" || value === "en";
}

/** L'altra lingua rispetto a quella indicata. */
export function otherLocale(locale: Locale): Locale {
  return locale === "it" ? "en" : "it";
}

/**
 * Map a country code (ISO 3166-1 alpha-2) to a supported locale.
 * Visitors in Italy get Italian, everyone else gets English.
 * The country is provided for free by the Vercel edge (`x-vercel-ip-country`).
 */
export function localeFromCountry(country: string | null | undefined): Locale {
  return country?.toUpperCase() === "IT" ? "it" : "en";
}
