"use client";

import Link from "@/components/i18n/LocaleLink";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

export type PaginationProps = {
  currentPage: number;
  totalItems: number;
  /** Base path, e.g. "/artisti". */
  basePath: string;
  /** Elementi per pagina. Default: ITEMS_PER_PAGE. */
  perPage?: number;
  /** Query string parameter used for the page number. */
  queryParam?: string;
  /** Altri parametri da conservare nei link (filtri, ricerca…). */
  params?: Record<string, string>;
  /** Ancora a cui tornare dopo il cambio pagina, senza "#". */
  hash?: string;
  labels?: { previous?: string; next?: string; label?: string };
};

/**
 * Reusable, server-friendly pagination (12 items per page).
 * It only builds links — the data fetching stays in the page/server component.
 */
export default function Pagination({
  currentPage,
  totalItems,
  basePath,
  perPage = ITEMS_PER_PAGE,
  queryParam = "page",
  params,
  hash,
  labels,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  /**
   * Numeri visibili + i salti.
   *
   * Con molte pagine non si mostrano tutti i numeri: si tiene la prima, l'ultima
   * e quelle intorno alla corrente, separando i salti con i puntini. Senza,
   * "1 4 5 6 20" sembra un errore di stampa.
   */
  const items = useMemo(() => {
    const all = Array.from({ length: totalPages }, (_, index) => index + 1);
    const visible =
      totalPages <= 7
        ? all
        : all.filter((item) => [1, totalPages, page, page - 1, page + 1].includes(item));

    const result: Array<{ type: "page"; page: number } | { type: "gap"; key: string }> = [];

    visible.forEach((item, index) => {
      const previous = visible[index - 1];
      if (previous && item - previous > 1) {
        result.push({ type: "gap", key: `gap-${previous}` });
      }
      result.push({ type: "page", page: item });
    });

    return result;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams(params ?? {});
    if (target <= 1) search.delete(queryParam);
    else search.set(queryParam, String(target));

    const query = search.toString();
    const suffix = hash ? `#${hash}` : "";

    return query ? `${basePath}?${query}${suffix}` : `${basePath}${suffix}`;
  };

  return (
    <nav
      aria-label={labels?.label ?? "Pagination"}
      className="flex flex-wrap items-center justify-center gap-3"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:text-white"
        >
          {labels?.previous ?? "Previous"}
        </Link>
      ) : null}

      <ul className="flex items-center gap-1">
        {items.map((item) =>
          item.type === "gap" ? (
            <li
              key={item.key}
              aria-hidden="true"
              className="inline-flex h-8 w-6 items-center justify-center font-mono text-[11px] text-muted"
            >
              …
            </li>
          ) : (
            <li key={item.page}>
              <Link
                href={href(item.page)}
                aria-current={item.page === page ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center px-2 font-mono text-[11px] transition-colors",
                  item.page === page
                    ? "bg-cyan font-medium text-bg"
                    : "text-muted hover:text-white"
                )}
              >
                {item.page}
              </Link>
            </li>
          )
        )}
      </ul>

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:text-white"
        >
          {labels?.next ?? "Next"}
        </Link>
      ) : null}
    </nav>
  );
}
