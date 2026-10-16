"use client";

import Link from "next/link";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

export type PaginationProps = {
  currentPage: number;
  totalItems: number;
  /** Base path, e.g. "/artisti". */
  basePath: string;
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
  queryParam = "page",
  params,
  hash,
  labels,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  const pages = useMemo(() => {
    const all = Array.from({ length: totalPages }, (_, index) => index + 1);
    if (totalPages <= 7) return all;

    const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    return all.filter((item) => window.has(item));
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
    <nav aria-label={labels?.label ?? "Pagination"} className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted transition-colors hover:text-white"
        >
          {labels?.previous ?? "Previous"}
        </Link>
      ) : null}

      <ul className="flex items-center gap-1">
        {pages.map((item) => (
          <li key={item}>
            <Link
              href={href(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors",
                item === page
                  ? "bg-gradient-to-r from-violet to-cyan font-medium text-white"
                  : "text-muted hover:bg-white/5 hover:text-white"
              )}
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted transition-colors hover:text-white"
        >
          {labels?.next ?? "Next"}
        </Link>
      ) : null}
    </nav>
  );
}
