/**
 * Paesi.
 *
 * Un evento e un locale hanno un paese ISO (`IT`, `GB`, `NG`…). L'elenco è
 * quello ufficiale ISO 3166-1 alpha-2: **tutti** i paesi, non una selezione.
 * Se mancasse il paese giusto, chi pubblica una serata in Africa non potrebbe
 * salvarla — ed è esattamente il problema che questa lista risolve.
 *
 * I nomi non sono scritti a mano: li dà `Intl.DisplayNames`, quindi sono già
 * tradotti nella lingua dell'interfaccia e non invecchiano.
 */

/** Codici ISO 3166-1 alpha-2 assegnati ufficialmente. */
const ISO_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

export const DEFAULT_COUNTRY = "IT";

export type CountryOption = { code: string; label: string };

export function isCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

/** Nome del paese nella lingua corrente; se il codice non è noto, il codice. */
export function countryName(code: string, locale: string): string {
  try {
    const names = new Intl.DisplayNames([locale === "en" ? "en" : "it"], {
      type: "region",
    });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Le voci del menu a tendina: tutti i paesi, in ordine alfabetico nella lingua
 * corrente, con l'Italia in cima perché è la scelta di quasi tutti.
 */
export function countryOptions(locale: string): CountryOption[] {
  const language = locale === "en" ? "en" : "it";

  let names: Intl.DisplayNames;
  try {
    names = new Intl.DisplayNames([language], { type: "region" });
  } catch {
    return [{ code: DEFAULT_COUNTRY, label: DEFAULT_COUNTRY }];
  }

  const options: CountryOption[] = [];

  for (const code of ISO_COUNTRY_CODES) {
    const label = names.of(code);
    // Un codice che `Intl` non conosce torna uguale a sé stesso: lo saltiamo.
    if (!label || label === code) continue;
    options.push({ code, label });
  }

  options.sort((a, b) => a.label.localeCompare(b.label, language));

  const home = options.findIndex((option) => option.code === DEFAULT_COUNTRY);
  if (home > 0) options.unshift(...options.splice(home, 1));

  return options;
}
