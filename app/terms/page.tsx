import PagePlaceholder from "@/components/ui/PagePlaceholder";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () => getPageMetadata((dict) => dict.pages.terms);

export default async function TermsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <PagePlaceholder
      title={dict.pages.terms.title}
      description={dict.pages.terms.description}
      note={dict.pages.placeholderNote}
    />
  );
}
