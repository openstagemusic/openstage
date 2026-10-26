import type { Dictionary } from "@/i18n/dictionaries/en";

export type AdminGroup = "today" | "people" | "content" | "community" | "communication" | "system" | "ai";

export type AdminModule = {
  key: string;
  href: string;
  group: AdminGroup;
  status: "active" | "soon";
  labelKey: keyof Dictionary["admin"]["nav"];
  /** Nota breve mostrata nella sidebar. */
  noteKey?: keyof Dictionary["admin"]["nav"];
};

/**
 * Registro dei moduli della control room.
 *
 * Un modulo nuovo si aggiunge qui e nella rotta, non sparso nella sidebar.
 * `soon` è deliberato: la voce si vede, ma non finge di essere pronta.
 */
export const ADMIN_MODULES: AdminModule[] = [
  { key: "overview", href: "/admin", group: "today", status: "active", labelKey: "overview" },
  { key: "users", href: "/admin/utenti", group: "people", status: "active", labelKey: "users" },
  { key: "artists", href: "/admin/artisti", group: "people", status: "active", labelKey: "artists" },
  { key: "venues", href: "/admin/locali", group: "people", status: "active", labelKey: "venues" },
  { key: "claims", href: "/admin/claim", group: "people", status: "active", labelKey: "claims" },
  { key: "events", href: "/admin/eventi", group: "content", status: "active", labelKey: "events" },
  { key: "drafts", href: "/admin/bozze", group: "content", status: "active", labelKey: "drafts" },
  { key: "reports", href: "/admin/segnalazioni", group: "content", status: "active", labelKey: "reports" },
  { key: "tickets", href: "/admin/messaggi", group: "community", status: "active", labelKey: "tickets" },
  { key: "email", href: "/admin/email", group: "communication", status: "active", labelKey: "email" },
  {
    key: "notifications",
    href: "/admin/notifiche",
    group: "communication",
    status: "active",
    labelKey: "notifications",
  },
  { key: "audit", href: "/admin/audit", group: "system", status: "active", labelKey: "audit" },
  { key: "security", href: "/admin/sicurezza", group: "system", status: "active", labelKey: "security" },
  { key: "settings", href: "/admin/impostazioni", group: "system", status: "active", labelKey: "settings" },
  { key: "jobs", href: "/admin/jobs", group: "system", status: "soon", labelKey: "jobs" },
  { key: "ai", href: "/admin/ai", group: "ai", status: "active", labelKey: "ai" },
];

export const ADMIN_GROUP_ORDER: AdminGroup[] = [
  "today",
  "people",
  "content",
  "community",
  "communication",
  "system",
  "ai",
];

export function adminGroupLabel(group: AdminGroup, dict: Dictionary["admin"]["nav"]): string {
  return group === "ai" ? dict.aiGroup : dict[group];
}
