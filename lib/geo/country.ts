/**
 * Paesi.
 *
 * Un evento e un locale hanno un paese ISO (`IT`, `GB`, `ES`…). Qui c'è l'elenco
 * curato per i moduli e il nome localizzato per le pagine. Non è la lista
 * completa del mondo: è quella che serve oggi, e `Altro` resta possibile
 * inserendo il codice a mano dove serve.
 */

export const COUNTRIES = [
  { code: "IT", label: "Italia" },
  { code: "CH", label: "Svizzera" },
  { code: "FR", label: "Francia" },
  { code: "AT", label: "Austria" },
  { code: "SI", label: "Slovenia" },
  { code: "DE", label: "Germania" },
  { code: "ES", label: "Spagna" },
  { code: "PT", label: "Portogallo" },
  { code: "GB", label: "Regno Unito" },
  { code: "IE", label: "Irlanda" },
  { code: "NL", label: "Paesi Bassi" },
  { code: "BE", label: "Belgio" },
  { code: "GR", label: "Grecia" },
  { code: "HR", label: "Croazia" },
  { code: "SE", label: "Svezia" },
  { code: "DK", label: "Danimarca" },
  { code: "NO", label: "Norvegia" },
  { code: "PL", label: "Polonia" },
  { code: "CZ", label: "Repubblica Ceca" },
  { code: "US", label: "Stati Uniti" },
] as const;

export const DEFAULT_COUNTRY = "IT";

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
