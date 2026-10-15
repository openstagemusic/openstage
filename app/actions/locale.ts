"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * Persists the visitor's manual language choice.
 * The middleware only sets the cookie on the first visit (based on geolocation),
 * so this action is what makes the manual switcher authoritative.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
