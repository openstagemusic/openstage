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
  notificationCount: number;
};

const roleBadgeClass: Record<UserRole, string> = {
  fan: "border-white/15 text-muted",
  artist: "border-violet/40 bg-violet/10 text-white",
  venue: "border-cyan/40 bg-cyan/10 text-white",
  admin: "border-pink/40 bg-pink/10 text-white",
};

export default function Navbar({ locale, dict, userEmail, userRole, notificationCount }: NavbarProps) {
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
    <header className="fixed inset-x-0 top-0 z-50 print:hidden border-b border-line bg-bg/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-poster text-xl uppercase leading-none tracking-[0.02em]"
        >
          Open<span className="text-cyan">/</span>Stage
        </Link>

        <ul className="ml-6 hidden items-center gap-5 xl:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "relative py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                  isActive(link.href)
                    ? "text-white after:absolute after:inset-x-0 after:-bottom-[3px] after:h-px after:bg-cyan"
                    : "text-muted hover:text-white"
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
              <span className="max-w-[9rem] truncate font-mono text-[10px] text-muted">
                {userEmail}
              </span>
              {userRole ? (
                <span
                  className={cn(
                    "rounded-none border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]",
                    roleBadgeClass[userRole]
                  )}
                >
                  {dict[ROLE_LABEL_KEY[userRole]]}
                </span>
              ) : null}
              <Link
                href="/dashboard/notifiche"
                aria-label={`${dict.notifications}${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
                className="relative inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-cyan/60 hover:text-white"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
                {notificationCount > 0 ? (
                  <span className="absolute -right-2 -top-2 min-w-4 border border-bg bg-pink px-1 text-center font-mono text-[9px] leading-4 text-white">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                ) : null}
              </Link>
              {userRole === "admin" ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center whitespace-nowrap border border-cyan bg-cyan px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-bg transition-colors hover:bg-cyan/90"
                >
                  {dict.controlRoom}
                </Link>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    aria-current={isActive("/dashboard") ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center whitespace-nowrap border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                      isActive("/dashboard")
                        ? "border-cyan bg-cyan text-bg"
                        : "border-cyan/50 bg-cyan/10 text-white hover:border-cyan hover:bg-cyan/20"
                    )}
                  >
                    {dict.dashboard}
                  </Link>
                  {canManageEvents(userRole) ? (
                    <Link
                      href="/dashboard/events/new"
                      className="border border-violet/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet/10"
                    >
                      {dict.createEvent}
                    </Link>
                  ) : (
                    <Link
                      href="/onboarding/role"
                      className="border border-cyan/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-cyan/10"
                    >
                      {dict.upgrade}
                    </Link>
                  )}
                </>
              )}
              <LogoutButton label={dict.logout} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white"
              >
                {dict.login}
              </Link>
              <Link
                href="/register"
                className="rounded-none bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet"
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
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-none border border-line text-white transition-colors hover:bg-white/5 xl:hidden"
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
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-bg/95 backdrop-blur-xl xl:hidden"
        >
          <ul className="mx-auto max-w-7xl px-4 py-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "block border-b border-line px-1 py-3 font-mono text-[11px] uppercase tracking-[0.12em]",
                    isActive(link.href) ? "text-cyan" : "text-muted hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
            <LanguageSwitcher locale={locale} />
            {userEmail ? (
              <>
                {userRole ? (
                  <span
                    className={cn(
                      "rounded-none border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]",
                      roleBadgeClass[userRole]
                    )}
                  >
                    {dict[ROLE_LABEL_KEY[userRole]]}
                  </span>
                ) : null}
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
                >
                  {dict.dashboard}
                </Link>
                <Link
                  href={canManageEvents(userRole) ? "/dashboard/events/new" : "/onboarding/role"}
                  onClick={() => setOpen(false)}
                  className="border border-violet/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white"
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
                  className="border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white"
                >
                  {dict.login}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white"
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
