/**
 * La chiave di confronto delle città.
 *
 * È la copia in TypeScript di `public.city_key(text)` (migration `0024`): le
 * due devono restare identiche, altrimenti un filtro dell'interfaccia non trova
 * le righe che il database ha in casa. Il perché della doppia scrittura è
 * semplice: il filtro della directory parte dalla URL (quindi dal browser e dal
 * server Next), mentre la colonna `city_key` la calcola Postgres. La regola è
 * una sola, scritta due volte, e il test di fine blocco le confronta.
 *
 * Cosa fa: minuscolo, senza accenti, senza la provincia fra parentesi.
 * "Milano (MI)", "milano" e "MILANO" diventano tutte `milano`.
 */
export function cityKey(value: string | null | undefined): string | null {
  if (!value) return null;

  const key = value
    .trim()
    .toLowerCase()
    // Gli accenti italiani, uno per uno: niente dipendenze, stessa resa del
    // `translate()` di Postgres.
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n")
    // L'apostrofo tipografico e quello dritto sono la stessa cosa.
    .replace(/’/g, "'")
    // "Milano (MI)" e "Milano(MI)" -> "Milano".
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  return key === "" ? null : key;
}

/**
 * L'etichetta da mostrare per una città, partendo dai valori realmente scritti.
 *
 * "milano" e "Milano (MI)" hanno la stessa chiave: nel menu dei filtri deve
 * comparire una voce sola. Vince la forma scritta più spesso; a parità, quella
 * senza la provincia fra parentesi e poi quella con le maiuscole. La provincia
 * si toglie anche dall'etichetta: in un menu di città "Milano (MI)" è rumore.
 */
export function preferredCityLabel(values: string[]): string | null {
  if (values.length === 0) return null;

  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  const winner = [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];

      const aProvince = /\([^)]*\)\s*$/.test(a[0]);
      const bProvince = /\([^)]*\)\s*$/.test(b[0]);
      if (aProvince !== bProvince) return aProvince ? 1 : -1;

      const aShouty = a[0] === a[0].toUpperCase();
      const bShouty = b[0] === b[0].toUpperCase();
      if (aShouty !== bShouty) return aShouty ? -1 : 1;

      return a[0].localeCompare(b[0]);
    })
    .map(([value]) => value)[0];

  if (!winner) return null;

  const label = winner.replace(/\s*\([^)]*\)\s*$/, "").trim();

  return label === "" ? null : label;
}
