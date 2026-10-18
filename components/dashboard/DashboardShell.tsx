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

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const current = items.find((item) => isActive(item.href));

  const list = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block rounded-xl px-3 py-2 text-sm transition-colors",
              isActive(item.href)
                ? "bg-white/10 text-white"
                : "text-muted hover:bg-white/5 hover:text-white"
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
        <nav aria-label={dict.menu} className="glass sticky top-24 rounded-3xl border border-white/10 p-3">
          {list()}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
          >
            <span className="mr-2 inline-block align-middle" aria-hidden="true">
              ☰
            </span>
            {dict.menu}
          </button>
          {current ? <span className="truncate text-sm text-muted">{current.label}</span> : null}
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

          <div className="glass absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-white/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base font-semibold">{dict.title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white"
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
