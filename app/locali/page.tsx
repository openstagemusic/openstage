import PagePlaceholder from "@/components/ui/PagePlaceholder";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () => getPageMetadata((dict) => dict.pages.venues);

export default async function VenuesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <PagePlaceholder
      title={dict.pages.venues.title}
      description={dict.pages.venues.description}
      note={dict.pages.placeholderNote}
    />
  );
}
