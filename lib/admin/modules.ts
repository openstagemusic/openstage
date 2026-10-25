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
  { key: "users", href: "/admin/utenti", group: "people", status: "soon", labelKey: "users" },
  { key: "artists", href: "/admin/artisti", group: "people", status: "soon", labelKey: "artists" },
  { key: "venues", href: "/admin/locali", group: "people", status: "soon", labelKey: "venues" },
  { key: "claims", href: "/admin/claim", group: "people", status: "soon", labelKey: "claims" },
  { key: "events", href: "/admin/eventi", group: "content", status: "active", labelKey: "events" },
  { key: "drafts", href: "/admin/bozze", group: "content", status: "soon", labelKey: "drafts" },
  { key: "reports", href: "/admin/segnalazioni", group: "content", status: "soon", labelKey: "reports" },
  { key: "messages", href: "/admin/messaggi", group: "community", status: "active", labelKey: "messages" },
  { key: "tickets", href: "/admin/ticket", group: "community", status: "soon", labelKey: "tickets" },
  { key: "email", href: "/admin/email", group: "communication", status: "soon", labelKey: "email" },
  { key: "queue", href: "/admin/email/coda", group: "communication", status: "soon", labelKey: "queue" },
  {
    key: "notifications",
    href: "/admin/notifiche",
    group: "communication",
    status: "soon",
    labelKey: "notifications",
  },
  { key: "audit", href: "/admin/audit", group: "system", status: "soon", labelKey: "audit" },
  { key: "settings", href: "/admin/impostazioni", group: "system", status: "soon", labelKey: "settings" },
  { key: "jobs", href: "/admin/jobs", group: "system", status: "soon", labelKey: "jobs" },
  { key: "ai", href: "/admin/ai", group: "ai", status: "soon", labelKey: "ai" },
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
  return dict[group === "today" ? "overview" : group];
}
