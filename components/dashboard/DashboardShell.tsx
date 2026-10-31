"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { stripLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

export type DashboardNavItem = { href: string; label: string };

type DashboardShellProps = {
  items: DashboardNavItem[];
  dict: Dictionary["dashboard"];
  children: React.ReactNode;
};

/**
 * Guscio dell'area personale.
 *
 * Da desktop il menu è la barra laterale; su mobile è un **pulsante in alto**
 * che apre un pannello laterale — non un elenco in fondo alla pagina (richiesta
 * esplicita dell'utente). La voce attiva si calcola dal percorso.
 */
export default function DashboardShell({ items, dict, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = stripLocale(usePathname());

  // La rotta più specifica vince: /dashboard/events/new non deve attivare
  // anche "I miei eventi".
  const activeHref = items
    .filter((item) =>
      item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const isActive = (href: string) => href === activeHref;

  const current = items.find((item) => isActive(item.href));

  const list = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block border-l-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              isActive(item.href)
                ? "border-cyan bg-white/[0.04] text-white"
                : "border-transparent text-muted hover:border-line-strong hover:text-white"
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav
          aria-label={dict.menu}
          className="sticky top-24 border-t border-line pt-3"
        >
          {list()}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center gap-2 border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
          >
            <span className="mr-2 inline-block align-middle" aria-hidden="true">
              ☰
            </span>
            {dict.menu}
          </button>
          {current ? (
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {current.label}
            </span>
          ) : null}
        </div>

        {children}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={dict.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />

          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base font-semibold">{dict.title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                {dict.closeMenu}
              </button>
            </div>

            <nav aria-label={dict.menu} className="mt-4">
              {list(() => setOpen(false))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
