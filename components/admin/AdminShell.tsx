"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import LogoutButton from "@/components/auth/LogoutButton";
import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminGroup } from "@/lib/admin/modules";
import { stripLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

export type AdminNavModule = {
  key: string;
  href: string;
  group: AdminGroup;
  status: "active" | "soon";
  label: string;
};

type AdminShellProps = {
  modules: AdminNavModule[];
  groups: Array<{ key: AdminGroup; label: string }>;
  dict: Dictionary["admin"];
  email: string | null;
  logoutLabel: string;
  closeMenuLabel: string;
  children: React.ReactNode;
};

export default function AdminShell({
  modules,
  groups,
  dict,
  email,
  logoutLabel,
  closeMenuLabel,
  children,
}: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = stripLocale(usePathname());

  const activeHref = modules
    .filter((item) => item.status === "active")
    .filter((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const list = (onNavigate?: () => void) => (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="px-3 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            {group.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {modules
              .filter((item) => item.group === group.key)
              .map((item) => {
                const active = item.href === activeHref;
                const className = cn(
                  "flex items-center justify-between border-l-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em]",
                  active
                    ? "border-cyan bg-white/[0.04] text-white"
                    : "border-transparent text-muted",
                  item.status === "active" && !active && "hover:border-line-strong hover:text-white"
                );

                if (item.status === "soon") {
                  return (
                    <li key={item.key}>
                      <span className={cn(className, "cursor-default opacity-60")}>
                        {item.label}
                        <span className="text-[8px] text-muted">{dict.nav.soon}</span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.key}>
                    <Link href={item.href} onClick={onNavigate} className={className}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="font-poster text-lg uppercase leading-none tracking-[0.02em]">
            Open<span className="text-cyan">/</span>Stage
          </Link>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-cyan sm:inline">
            / {dict.controlRoom}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white sm:inline-flex"
            >
              {dict.backToSite}
            </Link>
            {email ? (
              <span className="hidden max-w-[14rem] truncate font-mono text-[9px] text-muted lg:inline">
                {email}
              </span>
            ) : null}
            <LogoutButton label={logoutLabel} />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className="inline-flex h-9 items-center border border-line px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-white lg:hidden"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1500px] gap-8 px-4 py-6 sm:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav aria-label={dict.controlRoom} className="sticky top-20 border border-line bg-surface/60 p-3">
            {list()}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={closeMenuLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[88vw] overflow-y-auto border-r border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base font-semibold">{dict.controlRoom}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
              >
                {closeMenuLabel}
              </button>
            </div>
            <nav aria-label={dict.controlRoom} className="mt-5">
              {list(() => setOpen(false))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
