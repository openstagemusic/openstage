/** Elementi per pagina nelle liste della control room. */
export const ADMIN_PAGE_SIZE = 20;

export type AdminSearchParams = Record<string, string | string[] | undefined>;

/** Un parametro URL può arrivare una o più volte: per le liste basta il primo. */
export function firstParam(value: string | string[] | null | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parsePage(value: string | string[] | null | undefined): number {
  const page = Number.parseInt(firstParam(value), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Tiene un filtro solo se è tra i valori ammessi; altrimenti torna al default. */
export function pickFilter(
  value: string | string[] | null | undefined,
  allowed: readonly string[],
  fallback = "all"
): string {
  const candidate = firstParam(value);
  return allowed.includes(candidate) ? candidate : fallback;
}

export function paginate<T>(
  items: T[],
  page: number,
  perPage = ADMIN_PAGE_SIZE
): { rows: T[]; total: number; page: number; pageCount: number } {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * perPage;

  return {
    rows: items.slice(start, start + perPage),
    total,
    page: current,
    pageCount,
  };
}

/** Costruisce i parametri da conservare nei link di paginazione. */
export function listParams(values: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => {
      const value = entry[1];
      return typeof value === "string" && value !== "" && value !== "all";
    })
  );
}

export function matchesSearch(
  query: string,
  values: Array<string | null | undefined>
): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;

  return values.some((value) => (value ?? "").toLowerCase().includes(term));
}
