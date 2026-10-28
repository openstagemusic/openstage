"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Dictionary } from "@/i18n/dictionaries/en";

export type AdminListSelect = {
  key: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
};

type AdminListToolbarProps = {
  q: string;
  filters?: AdminListSelect[];
  exportList:
    | "users"
    | "artists"
    | "venues"
    | "events"
    | "drafts"
    | "reports"
    | "audit";
  dict: Dictionary["admin"];
};

/**
 * Barra comune delle liste admin.
 *
 * I filtri vivono nell'URL: una vista filtrata si può ricaricare, condividere e
 * conservare cambiando pagina. La ricerca si applica con Invio, i menu appena
 * cambi; l'export riusa gli stessi parametri.
 */
export default function AdminListToolbar({
  q,
  filters = [],
  exportList,
  dict,
}: AdminListToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(q);

  useEffect(() => {
    setTerm(q);
  }, [q]);

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const nextQuery = overrides.q ?? q;

    if (nextQuery.trim()) params.set("q", nextQuery.trim());

    for (const filter of filters) {
      const value = overrides[filter.key] ?? filter.value;
      if (value && value !== "all") params.set(filter.key, value);
    }

    return params;
  }

  function go(overrides: Record<string, string>) {
    const query = buildParams(overrides).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function exportHref(format: "csv" | "json") {
    const params = buildParams({});
    params.set("list", exportList);
    params.set("format", format);
    return `/api/admin/export?${params.toString()}`;
  }

  const hasActiveFilters =
    q.trim() !== "" || filters.some((filter) => filter.value !== "all");

  return (
    <div className="mt-5 flex flex-col gap-3 border border-line bg-surface/40 p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: term });
        }}
        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.listSearch}
          </span>
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={dict.listSearchPlaceholder}
            className="min-h-10 w-full border border-line bg-surface px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-cyan"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center border border-line-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan/50"
        >
          {dict.listSearch}
        </button>
      </form>

      {filters.map((filter) => (
        <label key={filter.key} className="min-w-[9rem]">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {filter.label}
          </span>
          <select
            value={filter.value}
            onChange={(event) => go({ [filter.key]: event.target.value })}
            className="min-h-10 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              router.push(pathname);
            }}
            className="inline-flex min-h-10 items-center border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-line-strong hover:text-white"
          >
            {dict.listReset}
          </button>
        ) : null}

        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          {dict.listExport}
        </span>
        <a
          href={exportHref("csv")}
          className="inline-flex min-h-10 items-center border border-cyan/40 bg-cyan/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan"
        >
          {dict.listExportCsv}
        </a>
        <a
          href={exportHref("json")}
          className="inline-flex min-h-10 items-center border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-line-strong hover:text-white"
        >
          {dict.listExportJson}
        </a>
      </div>
    </div>
  );
}
