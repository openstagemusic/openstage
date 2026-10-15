import type { Metadata } from "next";

import type { Dictionary } from "@/i18n/dictionaries/en";

import { getDictionary } from "./dictionaries";
import { getLocale } from "./server";

/**
 * Small helper so each page can expose its own SEO title/description
 * in one line, using the active locale.
 */
export async function getPageMetadata(
  selector: (dict: Dictionary) => { title: string; description: string }
): Promise<Metadata> {
  const locale = await getLocale();
  return selector(getDictionary(locale));
}
