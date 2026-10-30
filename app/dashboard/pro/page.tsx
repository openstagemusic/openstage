import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * La vendita Pro è congelata: la pagina non è più un prodotto.
 * La rotta resta per i link vecchi e riporta alla dashboard.
 */
export default async function ProPage() {
  const locale = await getLocale();
  redirect(withLocale(locale, "/dashboard"));
}
