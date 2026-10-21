"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LogoutButton from "@/components/auth/LogoutButton";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { canManageEvents, ROLE_LABEL_KEY, type UserRole } from "@/lib/auth/roles";
import type { Locale } from "@/lib/i18n/config";
import { stripLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

type NavbarProps = {
  locale: Locale;
  dict: Dictionary["nav"];
  userEmail: string | null;
  userRole: UserRole | null;
};

const roleBadgeClass: Record<UserRole, string> = {
  fan: "border-white/15 text-muted",
  artist: "border-violet/40 bg-violet/10 text-white",
  venue: "border-cyan/40 bg-cyan/10 text-white",
  admin: "border-pink/40 bg-pink/10 text-white",
};

export default function Navbar({ locale, dict, userEmail, userRole }: NavbarProps) {
  const [open, setOpen] = useState(false);
  // Il percorso può mostrare il prefisso di lingua (`/it/locali`): per capire
  // quale voce è attiva serve la parte che viene dopo.
  const pathname = stripLocale(usePathname());

  // Il menu mobile si chiude da solo quando si cambia pagina.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { href: "/", label: dict.explore },
    { href: "/mappa", label: dict.map },
    { href: "/artisti", label: dict.artists },
    { href: "/locali", label: dict.venues },
    { href: "/per-gli-artisti", label: dict.forArtists },
    { href: "/per-le-venue", label: dict.forVenues },
    { href: "/about", label: dict.about },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="glass fixed inset-x-0 top-0 z-50 border-b border-line">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Open<span className="text-gradient">Stage</span>
        </Link>

        <ul className="ml-4 hidden items-center gap-1 xl:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
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

        <div className="ml-auto hidden items-center gap-3 xl:flex">
          <LanguageSwitcher locale={locale} />
          {userEmail ? (
            <>
              <span className="max-w-[10rem] truncate text-sm text-muted">{userEmail}</span>
              {userRole ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    roleBadgeClass[userRole]
                  )}
                >
                  {dict[ROLE_LABEL_KEY[userRole]]}
                </span>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-full border border-white/10 px-3 py-2 text-sm text-muted transition-colors hover:text-white"
              >
                {dict.dashboard}
              </Link>
              {canManageEvents(userRole) ? (
                <Link
                  href="/dashboard/events/new"
                  className="rounded-full border border-violet/40 px-3 py-2 text-sm text-white transition-colors hover:bg-violet/10"
                >
                  {dict.createEvent}
                </Link>
              ) : (
                <Link
                  href="/onboarding/role"
                  className="rounded-full border border-cyan/40 px-3 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
                >
                  {dict.upgrade}
                </Link>
              )}
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
                className="rounded-full bg-violet-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet/20 transition-colors hover:bg-violet-strong/90"
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
          aria-controls="mobile-menu"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-line text-white transition-colors hover:bg-white/5 xl:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            {open ? (
              <>
                <path d="m6 6 12 12" />
                <path d="M18 6 6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {open ? (
        <div
          id="mobile-menu"
          className="glass max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line xl:hidden"
        >
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
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
              <>
                {userRole ? (
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      roleBadgeClass[userRole]
                    )}
                  >
                    {dict[ROLE_LABEL_KEY[userRole]]}
                  </span>
                ) : null}
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted"
                >
                  {dict.dashboard}
                </Link>
                <Link
                  href={canManageEvents(userRole) ? "/dashboard/events/new" : "/onboarding/role"}
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-violet/40 px-4 py-2 text-sm text-white"
                >
                  {canManageEvents(userRole) ? dict.createEvent : dict.upgrade}
                </Link>
                <LogoutButton label={dict.logout} />
              </>
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
                  className="rounded-full bg-violet-strong px-4 py-2 text-sm font-medium text-white"
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
