import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminOutreachChannelForm from "@/components/admin/AdminOutreachChannelForm";
import AdminOutreachChannelRow from "@/components/admin/AdminOutreachChannelRow";
import LocaleLink from "@/components/i18n/LocaleLink";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import {
  CHANNEL_AREAS,
  prefersCommunityMessage,
  type OutreachChannel,
} from "@/lib/outreach/channels";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Canali di outreach.
 *
 * Non manda niente a nessuno: elenca dove si può parlare di OpenStage, con le
 * regole di ogni posto, e tiene il conto di chi è stato contattato. L'invio è
 * manuale di proposito — l'automazione su Instagram, Facebook e TikTok brucia
 * gli account e i gruppi locali hanno tutti la regola «no spam».
 */
export default async function AdminOutreachChannelsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.outreachChannels;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_channels")
    .select("id, name, kind, area, url, rules, note, status, contacted_at")
    .order("area", { ascending: true })
    .order("name", { ascending: true });

  if (error) console.error("[outreach] canali:", error.message);

  const channels = (data as OutreachChannel[] | null) ?? [];

  const counts = {
    todo: channels.filter((item) => item.status === "todo").length,
    contacted: channels.filter((item) => item.status === "contacted").length,
    replied: channels.filter((item) => item.status === "replied").length,
  };

  const messageFor = (channel: OutreachChannel) =>
    (prefersCommunityMessage(channel.kind) ? t.messageCommunity : t.messageDirect).replace(
      /\{name\}/g,
      channel.name
    );

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.community}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {t.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.lead}</p>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {channels.length} {t.countLabel} · {counts.todo} {t.statTodo} · {counts.contacted}{" "}
          {t.statContacted} · {counts.replied} {t.statReplied}
        </p>
      </header>

      <p className="mt-5 os-note">{t.warning}</p>

      <div className="mt-6">
        <AdminOutreachChannelForm dict={t} />
      </div>

      {channels.length === 0 ? (
        <p className="mt-8 os-note">{t.empty}</p>
      ) : (
        CHANNEL_AREAS.map((area) => {
          const items = channels.filter((channel) => channel.area === area);
          if (items.length === 0) return null;

          return (
            <section key={area} className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                {t.areas[area]} · {items.length}
              </h2>
              <ul className="mt-2">
                {items.map((channel) => (
                  <AdminOutreachChannelRow
                    key={channel.id}
                    channel={channel}
                    message={messageFor(channel)}
                    dict={t}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <LocaleLink
          href="/admin"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.admin.controlRoom}
        </LocaleLink>
        <LocaleLink
          href="/admin/outreach/artisti"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.admin.outreach.title}
        </LocaleLink>
      </div>
    </div>
  );
}
