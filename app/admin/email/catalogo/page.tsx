import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import { listEmailTemplates } from "@/lib/email/templates";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const SOURCE_ORDER = ["app", "queue", "supabase"] as const;

/**
 * Catalogo delle email automatiche.
 *
 * Tutte in un posto: oggetto, corpo, quando partono e a chi. Quelle della colonna
 * `app` si modificano da qui e il codice le usa subito; le altre si leggono e
 * basta, con scritto dove si cambiano davvero (Supabase o funzione del database).
 */
export default async function AdminEmailCatalogPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.emailCatalog;
  const templates = await listEmailTemplates();

  const sourceLabel: Record<string, string> = {
    app: t.sourceApp,
    queue: t.sourceQueue,
    supabase: t.sourceSupabase,
  };

  const sourceNote: Record<string, string> = {
    app: t.sourceAppNote,
    queue: t.sourceQueueNote,
    supabase: t.sourceSupabaseNote,
  };

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.communication}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {t.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.lead}</p>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {templates.length} {t.countLabel}
        </p>
      </header>

      <div className="mt-8 space-y-10">
        {SOURCE_ORDER.map((source) => {
          const list = templates.filter((template) => template.source === source);
          if (list.length === 0) return null;

          return (
            <section key={source}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <h2 className="font-poster text-2xl uppercase leading-none">
                  {sourceLabel[source]}
                </h2>
                <p className="max-w-xl text-xs leading-relaxed text-muted sm:max-w-sm sm:text-right">
                  {sourceNote[source]}
                </p>
              </div>

              <ul>
                {list.map((template) => (
                  <li key={template.slug} className="border-b border-line">
                    <div className="flex flex-wrap items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                          {template.trigger}
                        </p>
                        <p className="mt-1 font-display text-base font-semibold">{template.name}</p>
                        <p className="mt-1 text-sm text-muted">
                          {t.audience}: {template.audience}
                        </p>
                        {template.subjectIt ? (
                          <p className="mt-1 truncate font-mono text-[10px] text-white/70">
                            «{template.subjectIt}»
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-5">
                        <span
                          className={
                            template.editable
                              ? "font-mono text-[9px] uppercase tracking-[0.12em] text-cyan"
                              : "font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                          }
                        >
                          {template.editable ? t.editable : t.readonlyBadge}
                        </span>
                        <LocaleLink
                          href={`/admin/email/catalogo/${template.slug}`}
                          className="border-b border-line pb-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
                        >
                          {template.editable ? t.open : t.read}
                        </LocaleLink>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <LocaleLink
          href="/admin/email"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          {t.backToPanel}
        </LocaleLink>
        <LocaleLink
          href="/admin"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.admin.controlRoom}
        </LocaleLink>
      </div>
    </div>
  );
}
