import { en } from "@/i18n/dictionaries/en";
import { it } from "@/i18n/dictionaries/it";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { it, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
