import PagePlaceholder from "@/components/ui/PagePlaceholder";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () => getPageMetadata((dict) => dict.pages.forVenues);

export default async function ForVenuesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <PagePlaceholder
      title={dict.pages.forVenues.title}
      description={dict.pages.forVenues.description}
      note={dict.pages.placeholderNote}
    />
  );
}
