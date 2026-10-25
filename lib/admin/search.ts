import type { UserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Ricerca globale della control room.
 *
 * Un solo giro su `admin_search()`: la funzione ricontrolla il ruolo, limita i
 * risultati e restituisce solo i campi che servono. L'interfaccia non costruisce
 * query libere e non può leggere tabelle che la RLS le nasconde.
 */

export type AdminSearchResults = {
  query: string;
  users: Array<{
    id: string;
    email: string | null;
    fullName: string | null;
    role: UserRole;
    verified: boolean;
    suspended: boolean;
  }>;
  artists: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    genre: string | null;
    claimed: boolean;
  }>;
  venues: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    address: string | null;
    claimed: boolean;
  }>;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    city: string | null;
    status: string;
    startsAt: string;
  }>;
  messages: Array<{
    id: string;
    name: string;
    email: string;
    topic: string;
    status: string;
    createdAt: string;
    preview: string;
  }>;
  emails: Array<{ id: string; to: string; subject: string; status: string; createdAt: string }>;
  reports: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
    note: string | null;
    eventTitle: string | null;
    eventSlug: string | null;
    eventCity: string | null;
  }>;
};

type RawSearchUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  verified_at: string | null;
  suspended_at: string | null;
};

type RawSearchMessage = {
  id: string;
  name: string;
  email: string;
  topic: string;
  status: string;
  created_at: string;
  preview: string;
};

type RawSearchEmail = {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
};

type RawSearchReport = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  note: string | null;
  event_title: string | null;
  event_slug: string | null;
  event_city: string | null;
};

type RawSearch = {
  query: string;
  users: RawSearchUser[];
  artists: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    genre: string | null;
    profile_id: string | null;
  }>;
  venues: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    address: string | null;
    profile_id: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    city: string | null;
    status: string;
    starts_at: string;
  }>;
  messages: RawSearchMessage[];
  emails: RawSearchEmail[];
  reports: RawSearchReport[];
};

const EMPTY: AdminSearchResults = {
  query: "",
  users: [],
  artists: [],
  venues: [],
  events: [],
  messages: [],
  emails: [],
  reports: [],
};

export async function adminSearch(query: string): Promise<AdminSearchResults> {
  const term = query.trim();
  if (term.length < 2) return { ...EMPTY, query: term };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_search", { p_query: term });

  if (error || !data) {
    console.error("[admin] admin_search:", error?.message);
    return { ...EMPTY, query: term };
  }

  const raw = data as unknown as RawSearch;

  return {
    query: raw.query,
    users: (raw.users ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      verified: row.verified_at != null,
      suspended: row.suspended_at != null,
    })),
    artists: (raw.artists ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      genre: row.genre,
      claimed: row.profile_id !== null,
    })),
    venues: (raw.venues ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      address: row.address,
      claimed: row.profile_id !== null,
    })),
    events: (raw.events ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      city: row.city,
      status: row.status,
      startsAt: row.starts_at,
    })),
    messages: (raw.messages ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      topic: row.topic,
      status: row.status,
      createdAt: row.created_at,
      preview: row.preview,
    })),
    emails: (raw.emails ?? []).map((row) => ({
      id: row.id,
      to: row.to_email,
      subject: row.subject,
      status: row.status,
      createdAt: row.created_at,
    })),
    reports: (raw.reports ?? []).map((row) => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      note: row.note,
      eventTitle: row.event_title,
      eventSlug: row.event_slug,
      eventCity: row.event_city,
    })),
  };
}
