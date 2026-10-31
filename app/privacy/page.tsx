import type { Metadata } from "next";

import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { LEGAL } from "@/lib/legal/content";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => dict.pages.privacy);

export default async function PrivacyPage() {
  const locale = await getLocale();

  return <LegalDocumentView locale={locale} document={LEGAL.privacy[locale]} />;
}
