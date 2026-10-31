"use client";

import { useEffect, useState } from "react";

import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

const KEY = "openstage:recent-events";
const LIMIT = 4;

type RecentEvent = {
  path: string;
  title: string;
  meta: string;
};

/**
 * "Visti di recente", senza database.
 *
 * Resta nel browser: nessun cookie di profilazione, nessun dato inviato al
 * server. Se la persona svuota i dati del browser, l'elenco sparisce.
 */
export function TrackRecentlyViewed({
  title,
  meta,
}: {
  title: string;
  meta: string;
}) {
  useEffect(() => {
    try {
      const path = window.location.pathname;
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as RecentEvent[]) : [];
      const next = [
        { path, title, meta },
        ...parsed.filter((item) => item.path !== path),
      ].slice(0, LIMIT);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage bloccato: pazienza, non è una funzione essenziale.
    }
  }, [title, meta]);

  return null;
}

export function RecentlyViewedStrip({ dict }: { dict: Dictionary }) {
  const [items, setItems] = useState<RecentEvent[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as RecentEvent[]) : [];
      setItems(Array.isArray(parsed) ? parsed.slice(0, LIMIT) : []);
    } catch {
      setItems([]);
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {dict.home.recentTitle}
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {items.map((item) => (
          <li key={item.path} className="min-w-0">
            <LocaleLink
              href={item.path.replace(/^\/(it|en)/, "")}
              className="group block border-b border-line pb-1 transition-colors hover:border-cyan"
            >
              <span className="block truncate text-sm text-white transition-colors group-hover:text-cyan">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {item.meta}
              </span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
