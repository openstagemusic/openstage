"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import LogoutButton from "@/components/auth/LogoutButton";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type NavbarProps = {
  locale: Locale;
  dict: Dictionary["nav"];
  userEmail: string | null;
};

export default function Navbar({ locale, dict, userEmail }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: dict.explore },
    { href: "/artisti", label: dict.artists },
    { href: "/locali", label: dict.venues },
    { href: "/per-gli-artisti", label: dict.forArtists },
    { href: "/per-le-venue", label: dict.forVenues },
    { href: "/about", label: dict.about },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="glass fixed inset-x-0 top-0 z-50 border-b border-white/10">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Open<span className="text-gradient">Stage</span>
        </Link>

        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-2 text-sm transition-colors",
                  isActive(link.href)
                    ? "bg-white/10 text-white"
                    : "text-muted hover:bg-white/5 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <LanguageSwitcher locale={locale} />
          {userEmail ? (
            <>
              <span className="max-w-[12rem] truncate text-sm text-muted">{userEmail}</span>
              <LogoutButton label={dict.logout} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-white"
              >
                {dict.login}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet/20 transition-opacity hover:opacity-90"
              >
                {dict.register}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? dict.closeMenu : dict.openMenu}
          aria-expanded={open}
          className="ml-auto rounded-full border border-white/10 p-2.5 lg:hidden"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
      </nav>

      {open ? (
        <div className="glass border-t border-white/10 lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm",
                    isActive(link.href)
                      ? "bg-white/10 text-white"
                      : "text-muted hover:bg-white/5 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 pb-4">
            <LanguageSwitcher locale={locale} />
            {userEmail ? (
              <LogoutButton label={dict.logout} />
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
                >
                  {dict.login}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 text-sm font-medium text-white"
                >
                  {dict.register}
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
