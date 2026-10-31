import { permanentRedirect } from "next/navigation";

import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";

/**
 * Le vecchie domande frequenti vivono ora nel centro assistenza.
 * L'indirizzo resta per i link vecchi e porta a `/aiuto`.
 */
export default async function FaqPage() {
  const locale = await getLocale();
  permanentRedirect(withLocale(locale, "/aiuto"));
}
