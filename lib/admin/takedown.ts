import { createClient } from "@/lib/supabase/server";

export type TakedownNoticeType =
  | "copyright"
  | "trademark"
  | "privacy"
  | "defamation"
  | "illegal"
  | "other";

export type TakedownNoticeStatus = "new" | "reviewing" | "actioned" | "rejected";

export type TakedownNotice = {
  id: string;
  type: TakedownNoticeType;
  status: TakedownNoticeStatus;
  reporterName: string;
  reporterEmail: string;
  organization: string | null;
  targetUrl: string;
  description: string;
  evidenceUrl: string | null;
  goodFaith: boolean;
  accuracy: boolean;
  adminNote: string | null;
  actionTaken: string | null;
  locale: "it" | "en";
  createdAt: string;
  resolvedAt: string | null;
};

type NoticeRow = {
  id: string;
  notice_type: TakedownNoticeType;
  status: TakedownNoticeStatus;
  reporter_name: string;
  reporter_email: string;
  organization: string | null;
  target_url: string;
  description: string;
  evidence_url: string | null;
  good_faith: boolean;
  accuracy: boolean;
  admin_note: string | null;
  action_taken: string | null;
  locale: "it" | "en";
  created_at: string;
  resolved_at: string | null;
};

export async function listTakedownNotices(limit = 2000): Promise<TakedownNotice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("takedown_notices")
    .select(
      "id, notice_type, status, reporter_name, reporter_email, organization, target_url, " +
        "description, evidence_url, good_faith, accuracy, admin_note, action_taken, locale, " +
        "created_at, resolved_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] listTakedownNotices:", error.message);
    return [];
  }

  return (data as unknown as NoticeRow[]).map((row) => ({
    id: row.id,
    type: row.notice_type,
    status: row.status,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    organization: row.organization,
    targetUrl: row.target_url,
    description: row.description,
    evidenceUrl: row.evidence_url,
    goodFaith: row.good_faith,
    accuracy: row.accuracy,
    adminNote: row.admin_note,
    actionTaken: row.action_taken,
    locale: row.locale,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

export async function countOpenTakedownNotices(): Promise<number> {
  const notices = await listTakedownNotices(2000);

  return notices.filter(
    (notice) => notice.status === "new" || notice.status === "reviewing"
  ).length;
}
