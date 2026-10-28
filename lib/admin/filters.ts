import type {
  AdminDirectoryRow,
  AdminReport,
  AdminUser,
  AuditEntry,
} from "@/lib/admin/queries";
import type { DraftEvent } from "@/lib/claims/queries";
import { isEventPast } from "@/lib/events/format";
import type { ModerationEvent } from "@/lib/moderation/queries";
import type {
  TakedownNotice,
  TakedownNoticeStatus,
  TakedownNoticeType,
} from "@/lib/admin/takedown";

import { matchesSearch } from "./list";

export type UserFilters = { q: string; role: string; status: string };

export function filterAdminUsers(users: AdminUser[], filters: UserFilters): AdminUser[] {
  return users.filter((user) => {
    if (filters.role !== "all" && user.role !== filters.role) return false;

    if (filters.status === "verified" && !user.verifiedAt) return false;
    if (filters.status === "unverified" && user.verifiedAt) return false;
    if (filters.status === "suspended" && !user.suspendedAt) return false;

    return matchesSearch(filters.q, [
      user.email,
      user.fullName,
      user.city,
      user.artist?.name,
      user.venue?.name,
    ]);
  });
}

export type DirectoryFilters = { q: string; claimed: string; verified: string };

export function filterAdminDirectory(
  rows: AdminDirectoryRow[],
  filters: DirectoryFilters
): AdminDirectoryRow[] {
  return rows.filter((row) => {
    if (filters.claimed === "claimed" && !row.claimed) return false;
    if (filters.claimed === "unclaimed" && row.claimed) return false;
    if (filters.verified === "verified" && !row.verified) return false;
    if (filters.verified === "unverified" && row.verified) return false;

    return matchesSearch(filters.q, [row.name, row.city, row.genre, row.ownerEmail]);
  });
}

export type ModerationFilter =
  | "all"
  | "online"
  | "past"
  | "paused"
  | "reported"
  | "cancelled";

export const MODERATION_FILTERS: readonly ModerationFilter[] = [
  "all",
  "online",
  "past",
  "paused",
  "reported",
  "cancelled",
];

export function filterModerationEvents(
  events: ModerationEvent[],
  filters: { q: string; status: ModerationFilter }
): ModerationEvent[] {
  return events.filter((event) => {
    if (filters.status === "online") {
      if (event.status !== "published" || isEventPast(event.startsAt, event.timezone)) {
        return false;
      }
    }
    if (filters.status === "past") {
      if (event.status !== "published" || !isEventPast(event.startsAt, event.timezone)) {
        return false;
      }
    }
    if (filters.status === "paused" && event.autoHiddenAt === null) return false;
    if (filters.status === "reported" && event.reports === 0) return false;
    if (filters.status === "cancelled" && event.status !== "cancelled") return false;

    return matchesSearch(filters.q, [
      event.title,
      event.slug,
      event.city,
      event.ownerName,
      event.ownerEmail,
    ]);
  });
}

export function filterDrafts(drafts: DraftEvent[], q: string): DraftEvent[] {
  return drafts.filter((draft) =>
    matchesSearch(q, [
      draft.title,
      draft.slug,
      draft.city,
      draft.authorEmail,
      draft.artistName,
      draft.venueName,
    ])
  );
}

export type ReportFilter = "all" | "open" | "resolved" | "dismissed";

export const REPORT_FILTERS: readonly ReportFilter[] = [
  "all",
  "open",
  "resolved",
  "dismissed",
];

export function filterAdminReports(
  reports: AdminReport[],
  filters: { q: string; status: ReportFilter }
): AdminReport[] {
  return reports.filter((report) => {
    if (filters.status !== "all" && report.status !== filters.status) return false;

    return matchesSearch(filters.q, [
      report.eventTitle,
      report.eventCity,
      report.reporterEmail,
      report.reason,
      report.note,
    ]);
  });
}

export function filterAuditEntries(entries: AuditEntry[], q: string): AuditEntry[] {
  return entries.filter((entry) => {
    const note =
      typeof entry.metadata.note === "string" ? entry.metadata.note : null;

    return matchesSearch(q, [
      entry.action,
      entry.actorEmail,
      entry.subjectType,
      entry.subjectId,
      note,
    ]);
  });
}

export const TAKEDOWN_STATUSES: readonly TakedownNoticeStatus[] = [
  "new",
  "reviewing",
  "actioned",
  "rejected",
];

export const TAKEDOWN_TYPES: readonly TakedownNoticeType[] = [
  "copyright",
  "trademark",
  "privacy",
  "defamation",
  "illegal",
  "other",
];

export function filterTakedownNotices(
  notices: TakedownNotice[],
  filters: { q: string; status: string; type: string }
): TakedownNotice[] {
  return notices.filter((notice) => {
    if (filters.status !== "all" && notice.status !== filters.status) return false;
    if (filters.type !== "all" && notice.type !== filters.type) return false;

    return matchesSearch(filters.q, [
      notice.reporterName,
      notice.reporterEmail,
      notice.organization,
      notice.targetUrl,
      notice.description,
      notice.actionTaken,
      notice.adminNote,
    ]);
  });
}
