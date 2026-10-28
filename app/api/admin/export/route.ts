import { NextResponse } from "next/server";

import {
  filterAdminDirectory,
  filterAdminReports,
  filterAdminUsers,
  filterAuditEntries,
  filterDrafts,
  filterModerationEvents,
  filterTakedownNotices,
  MODERATION_FILTERS,
  REPORT_FILTERS,
  TAKEDOWN_STATUSES,
  TAKEDOWN_TYPES,
  type ModerationFilter,
  type ReportFilter,
} from "@/lib/admin/filters";
import { firstParam, pickFilter } from "@/lib/admin/list";
import {
  listAdminArtists,
  listAdminReports,
  listAdminUsers,
  listAdminVenues,
  listAuditLog,
} from "@/lib/admin/queries";
import { isCurrentUserAdmin, listDraftEvents } from "@/lib/claims/queries";
import { listModerationEvents } from "@/lib/moderation/queries";
import { listTakedownNotices } from "@/lib/admin/takedown";

/**
 * Export CSV/JSON delle liste admin.
 *
 * Rilegge la lista con gli stessi filtri della pagina e restituisce **tutte** le
 * righe, non solo la pagina visibile. La pagina è un dettaglio dell'interfaccia:
 * qui non entra.
 */

const EXPORT_LIMIT = 5000;

type ExportRow = Record<string, string | number | boolean | null>;

type Column = { key: string; label: string };

function csvCell(value: ExportRow[string]): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(columns: Column[], rows: ExportRow[]): string {
  const lines = [
    columns.map((column) => csvCell(column.label)).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

function download(
  format: "csv" | "json",
  list: string,
  columns: Column[],
  rows: ExportRow[]
): NextResponse {
  const filename = `openstage-${list}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const disposition = `attachment; filename="${filename}"`;
  const headers = {
    "cache-control": "no-store",
    "content-disposition": disposition,
  };

  if (format === "json") {
    return NextResponse.json(rows, { headers });
  }

  return new NextResponse(toCsv(columns, rows), {
    headers: {
      ...headers,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}

export async function GET(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list") ?? "";
  const format = searchParams.get("format") === "json" ? "json" : "csv";
  const q = firstParam(searchParams.get("q"));

  if (list === "users") {
    const role = pickFilter(searchParams.get("role"), ["fan", "artist", "venue", "admin"]);
    const status = pickFilter(searchParams.get("status"), ["verified", "unverified", "suspended"]);
    const rows = filterAdminUsers(await listAdminUsers(EXPORT_LIMIT), { q, role, status }).map(
      (user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        city: user.city,
        createdAt: user.createdAt,
        verifiedAt: user.verifiedAt,
        suspendedAt: user.suspendedAt,
        artistName: user.artist?.name ?? null,
        venueName: user.venue?.name ?? null,
      })
    );

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "email", label: "email" },
      { key: "fullName", label: "full_name" },
      { key: "role", label: "role" },
      { key: "city", label: "city" },
      { key: "createdAt", label: "created_at" },
      { key: "verifiedAt", label: "verified_at" },
      { key: "suspendedAt", label: "suspended_at" },
      { key: "artistName", label: "artist" },
      { key: "venueName", label: "venue" },
    ], rows);
  }

  if (list === "artists" || list === "venues") {
    const claimed = pickFilter(searchParams.get("claimed"), ["claimed", "unclaimed"]);
    const verified = pickFilter(searchParams.get("verified"), ["verified", "unverified"]);
    const source =
      list === "artists" ? await listAdminArtists(EXPORT_LIMIT) : await listAdminVenues(EXPORT_LIMIT);
    const rows = filterAdminDirectory(source, { q, claimed, verified }).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      genre: row.genre,
      claimed: row.claimed,
      verified: row.verified,
      suspended: row.suspended,
      ownerEmail: row.ownerEmail,
      eventCount: row.eventCount,
      createdAt: row.createdAt,
    }));

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "name", label: "name" },
      { key: "slug", label: "slug" },
      { key: "city", label: "city" },
      { key: "genre", label: "genre" },
      { key: "claimed", label: "claimed" },
      { key: "verified", label: "verified" },
      { key: "suspended", label: "suspended" },
      { key: "ownerEmail", label: "owner_email" },
      { key: "eventCount", label: "event_count" },
      { key: "createdAt", label: "created_at" },
    ], rows);
  }

  if (list === "events") {
    const status = pickFilter(searchParams.get("status"), MODERATION_FILTERS) as ModerationFilter;
    const rows = filterModerationEvents(await listModerationEvents(EXPORT_LIMIT), {
      q,
      status,
    }).map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      city: event.city,
      status: event.status,
      startsAt: event.startsAt,
      timezone: event.timezone,
      reports: event.reports,
      autoHiddenAt: event.autoHiddenAt,
      ownerName: event.ownerName,
      ownerEmail: event.ownerEmail,
    }));

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "title", label: "title" },
      { key: "slug", label: "slug" },
      { key: "city", label: "city" },
      { key: "status", label: "status" },
      { key: "startsAt", label: "starts_at" },
      { key: "timezone", label: "timezone" },
      { key: "reports", label: "reports" },
      { key: "autoHiddenAt", label: "auto_hidden_at" },
      { key: "ownerName", label: "owner_name" },
      { key: "ownerEmail", label: "owner_email" },
    ], rows);
  }

  if (list === "drafts") {
    const rows = filterDrafts(await listDraftEvents(), q).map((draft) => ({
      id: draft.id,
      title: draft.title,
      slug: draft.slug,
      startsAt: draft.startsAt,
      city: draft.city,
      authorEmail: draft.authorEmail,
      artistName: draft.artistName,
      venueName: draft.venueName,
    }));

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "title", label: "title" },
      { key: "slug", label: "slug" },
      { key: "startsAt", label: "starts_at" },
      { key: "city", label: "city" },
      { key: "authorEmail", label: "author_email" },
      { key: "artistName", label: "artist" },
      { key: "venueName", label: "venue" },
    ], rows);
  }

  if (list === "reports") {
    const status = pickFilter(searchParams.get("status"), REPORT_FILTERS) as ReportFilter;
    const rows = filterAdminReports(await listAdminReports(EXPORT_LIMIT), { q, status }).map(
      (report) => ({
        id: report.id,
        eventId: report.eventId,
        eventTitle: report.eventTitle,
        eventCity: report.eventCity,
        reason: report.reason,
        status: report.status,
        note: report.note,
        reporterEmail: report.reporterEmail,
        createdAt: report.createdAt,
      })
    );

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "eventId", label: "event_id" },
      { key: "eventTitle", label: "event_title" },
      { key: "eventCity", label: "event_city" },
      { key: "reason", label: "reason" },
      { key: "status", label: "status" },
      { key: "note", label: "note" },
      { key: "reporterEmail", label: "reporter_email" },
      { key: "createdAt", label: "created_at" },
    ], rows);
  }

  if (list === "takedown") {
    const status = pickFilter(searchParams.get("status"), TAKEDOWN_STATUSES);
    const type = pickFilter(searchParams.get("type"), TAKEDOWN_TYPES);
    const rows = filterTakedownNotices(await listTakedownNotices(EXPORT_LIMIT), {
      q,
      status,
      type,
    }).map((notice) => ({
      id: notice.id,
      createdAt: notice.createdAt,
      type: notice.type,
      status: notice.status,
      reporterName: notice.reporterName,
      reporterEmail: notice.reporterEmail,
      organization: notice.organization,
      targetUrl: notice.targetUrl,
      description: notice.description,
      evidenceUrl: notice.evidenceUrl,
      goodFaith: notice.goodFaith,
      accuracy: notice.accuracy,
      adminNote: notice.adminNote,
      actionTaken: notice.actionTaken,
      resolvedAt: notice.resolvedAt,
      locale: notice.locale,
    }));

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "createdAt", label: "created_at" },
      { key: "type", label: "type" },
      { key: "status", label: "status" },
      { key: "reporterName", label: "reporter_name" },
      { key: "reporterEmail", label: "reporter_email" },
      { key: "organization", label: "organization" },
      { key: "targetUrl", label: "target_url" },
      { key: "description", label: "description" },
      { key: "evidenceUrl", label: "evidence_url" },
      { key: "goodFaith", label: "good_faith" },
      { key: "accuracy", label: "accuracy" },
      { key: "adminNote", label: "admin_note" },
      { key: "actionTaken", label: "action_taken" },
      { key: "resolvedAt", label: "resolved_at" },
      { key: "locale", label: "locale" },
    ], rows);
  }

  if (list === "audit") {
    const rows = filterAuditEntries(await listAuditLog(EXPORT_LIMIT), q).map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      actorEmail: entry.actorEmail,
      action: entry.action,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      note: typeof entry.metadata.note === "string" ? entry.metadata.note : null,
    }));

    return download(format, list, [
      { key: "id", label: "id" },
      { key: "createdAt", label: "created_at" },
      { key: "actorEmail", label: "actor_email" },
      { key: "action", label: "action" },
      { key: "subjectType", label: "subject_type" },
      { key: "subjectId", label: "subject_id" },
      { key: "note", label: "note" },
    ], rows);
  }

  return NextResponse.json({ error: "unknown_list" }, { status: 400 });
}
