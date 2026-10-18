import { redirect } from "next/navigation";

import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";

/** La creazione degli eventi vive nella dashboard: qui si continua a entrare. */
export default async function LegacyNewEventPage() {
  const locale = await getLocale();

  redirect(withLocale(locale, "/dashboard/events/new"));
}
