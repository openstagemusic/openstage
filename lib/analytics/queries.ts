import { createClient } from "@/lib/supabase/server";

/**
 * Numeri per chi pubblica.
 *
 * Tutto è aggregato: `view_daily` non contiene persone, solo un contatore per
 * giorno. I salvataggi e i follower arrivano da due funzioni che restituiscono
 * soltanto totali (la RLS non deve esporre le righe altrui). Niente metriche
 * inventate: se il contatore parte oggi, il grafico parte da zero.
 */

export type AnalyticsRange = 30 | 90;

export type DayPoint = { day: string; value: number };

export type EventStat = {
  id: string;
  title: string;
  city: string | null;
  slug: string;
  startsAt: string;
  status: string;
  views: number;
  saves: number;
};

export type ProfileAnalytics = {
  range: AnalyticsRange;
  /** Visualizzazioni totali (scheda + eventi) giorno per giorno. */
  series: DayPoint[];
  totalViews: number;
  /** Gli stessi giorni, ma il periodo precedente: serve per la variazione. */
  previousViews: number;
  profileViews: number;
  eventViews: number;
  epkViews: number;
  followers: number;
  newFollowers: number;
  /** Follower cumulati giorno per giorno. */
  followerSeries: DayPoint[];
  bookings: number;
  newBookings: number;
  saves: number;
  events: EventStat[];
  topEvents: EventStat[];
};

const DAY_MS = 86_400_000;

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayBefore(days: number): string {
  return isoDay(new Date(utcToday().getTime() - (days - 1) * DAY_MS));
}

/** Serie continua: i giorni senza visite valgono zero, non mancano dal grafico. */
function fillSeries(from: string, to: string, values: Map<string, number>): DayPoint[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  const points: DayPoint[] = [];

  for (let time = start; time <= end; time += DAY_MS) {
    const day = isoDay(new Date(time));
    points.push({ day, value: values.get(day) ?? 0 });
  }

  return points;
}

function sumSeries(points: DayPoint[]): number {
  return points.reduce((total, point) => total + point.value, 0);
}

type ViewRow = { day: string; kind: string; target_id: string; views: number };

async function fetchViews(
  kinds: string[],
  ids: string[],
  from: string
): Promise<{ profile: ViewRow[]; events: ViewRow[] }> {
  if (ids.length === 0) return { profile: [], events: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("view_daily")
    .select("day, kind, target_id, views")
    .in("kind", kinds)
    .in("target_id", ids)
    .gte("day", from);

  if (error) {
    console.error("[analytics] views:", error.message);
    return { profile: [], events: [] };
  }

  const rows = (data as ViewRow[] | null) ?? [];

  return {
    profile: rows.filter((row) => row.kind !== "event"),
    events: rows.filter((row) => row.kind === "event"),
  };
}

function accumulate(rows: ViewRow[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const row of rows) {
    map.set(row.day, (map.get(row.day) ?? 0) + row.views);
  }

  return map;
}

export async function getProfileAnalytics({
  profileId,
  role,
  pageId,
  days = 30,
}: {
  profileId: string;
  role: "artist" | "venue";
  pageId: string;
  days?: AnalyticsRange;
}): Promise<ProfileAnalytics> {
  const supabase = await createClient();

  const start = dayBefore(days);
  const previousStart = dayBefore(days * 2);
  const today = isoDay(utcToday());

  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, city, slug, starts_at, status")
    .eq("created_by", profileId)
    .order("starts_at", { ascending: false })
    .limit(200);

  const events = (eventRows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    city: (row.city as string | null) ?? null,
    slug: row.slug as string,
    startsAt: row.starts_at as string,
    status: row.status as string,
  }));

  const eventIds = events.map((event) => event.id);
  const profileKinds = role === "artist" ? ["artist", "epk"] : ["venue"];

  const [profileViewsRows, savedRows, followersRpc] = await Promise.all([
    fetchViews([...profileKinds, "event"], [pageId, ...eventIds], previousStart),
    supabase.rpc("owner_event_saves", { p_profile: profileId }),
    supabase.rpc("owner_follow_series", {
      p_kind: role,
      p_id: pageId,
      p_days: days,
    }),
  ]);

  // `fetchViews` filtra già per tipo: la scheda e i suoi eventi sono due secchi.
  const profileRows = profileViewsRows.profile.filter((row) => row.target_id === pageId);
  const eventRowsViews = profileViewsRows.events;

  const profileSeries = fillSeries(start, today, accumulate(profileRows));
  const eventSeries = fillSeries(start, today, accumulate(eventRowsViews));

  const series = profileSeries.map((point, index) => ({
    day: point.day,
    value: point.value + (eventSeries[index]?.value ?? 0),
  }));

  const previousSeries = fillSeries(
    previousStart,
    isoDay(new Date(Date.parse(`${start}T00:00:00Z`) - DAY_MS)),
    accumulate([...profileRows, ...eventRowsViews])
  );
  const epkViews = profileRows
    .filter((row) => row.kind === "epk")
    .reduce((total, row) => total + row.views, 0);

  const perEventViews = new Map<string, number>();
  for (const row of eventRowsViews) {
    if (row.day < start) continue;
    perEventViews.set(row.target_id, (perEventViews.get(row.target_id) ?? 0) + row.views);
  }

  const perEventSaves = new Map<string, number>();
  for (const row of (savedRows.data as { event_id: string; saves: number }[] | null) ?? []) {
    perEventSaves.set(row.event_id, row.saves);
  }

  const eventStats: EventStat[] = events
    .map((event) => ({
      ...event,
      views: perEventViews.get(event.id) ?? 0,
      saves: perEventSaves.get(event.id) ?? 0,
    }))
    .sort((a, b) => b.views - a.views || Date.parse(b.startsAt) - Date.parse(a.startsAt));

  const followerPoints = (followersRpc.data as { day: string; total: number }[] | null) ?? [];
  const followerSeries: DayPoint[] = followerPoints.map((row) => ({
    day: row.day,
    value: row.total,
  }));
  const followers = followerSeries.at(-1)?.value ?? 0;
  const firstFollower = followerSeries[0]?.value ?? followers;

  const { data: threadRows } = await supabase
    .from("booking_threads")
    .select("id, created_at")
    .eq(role === "artist" ? "artist_id" : "venue_id", pageId);

  const threads = (threadRows ?? []) as { id: string; created_at: string }[];
  const newBookings = threads.filter((thread) => thread.created_at.slice(0, 10) >= start).length;

  return {
    range: days,
    series,
    totalViews: sumSeries(series),
    previousViews: sumSeries(previousSeries),
    profileViews: sumSeries(profileSeries),
    eventViews: sumSeries(eventSeries),
    epkViews,
    followers,
    newFollowers: Math.max(0, followers - firstFollower),
    followerSeries,
    bookings: threads.length,
    newBookings,
    saves: [...perEventSaves.values()].reduce((total, value) => total + value, 0),
    events: eventStats,
    topEvents: eventStats.filter((event) => event.views > 0).slice(0, 5),
  };
}
