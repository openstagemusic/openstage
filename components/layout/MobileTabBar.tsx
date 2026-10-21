"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { stripLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

type TabName = "explore" | "map" | "artists" | "venues" | "profile";

type MobileTabBarProps = {
  dict: Dictionary["nav"];
  userEmail: string | null;
};

/** Le aree di lavoro non hanno la barra: lì si scrive, non si scopre. */
const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/auth",
  "/onboarding",
  "/dashboard",
  "/admin",
  "/account",
];

const ICON_PATHS: Record<TabName, ReactNode> = {
  explore: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z" />
    </>
  ),
  map: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  artists: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <path d="M12 19v3" />
    </>
  ),
  venues: (
    <>
      <path d="M3.5 9 5 4h14l1.5 5" />
      <path d="M4.5 9v11h15V9" />
      <path d="M9.5 20v-6h5v6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 21c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8" />
    </>
  ),
};

function TabIcon({ name }: { name: TabName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function MobileTabBar({ dict, userEmail }: MobileTabBarProps) {
  const pathname = stripLocale(usePathname());

  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (hidden) {
    return null;
  }

  const items: Array<{ href: string; label: string; icon: TabName }> = [
    { href: "/", label: dict.explore, icon: "explore" },
    { href: "/mappa", label: dict.map, icon: "map" },
    { href: "/artisti", label: dict.artists, icon: "artists" },
    { href: "/locali", label: dict.venues, icon: "venues" },
    {
      href: userEmail ? "/dashboard" : "/login",
      label: userEmail ? dict.dashboard : dict.login,
      icon: "profile",
    },
  ];

  return (
    <nav
      aria-label={dict.primaryNav}
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex h-14 items-stretch">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/eventi")
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none transition-colors",
                  active ? "text-white" : "text-muted hover:text-white"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 top-0 h-0.5 rounded-full bg-cyan transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                <TabIcon name={item.icon} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
