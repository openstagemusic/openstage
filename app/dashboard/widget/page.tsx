import type { Metadata } from "next";
import { redirect } from "next/navigation";

import CopyCodeButton from "@/components/dashboard/CopyCodeButton";
import LocaleLink from "@/components/i18n/LocaleLink";
import { ACTION_ARROW, ACTION_LINE } from "@/components/ui/actions";
import { canManageEvents } from "@/lib/auth/roles";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.widget.title,
    description: dict.widget.text,
    robots: { index: false, follow: false },
  };
}

/**
 * Widget: quello che si incolla sul sito del locale o dell'artista.
 * Il codice è un `<iframe>` verso una pagina nuda: nessuno script di terze
 * parti, nessun cookie, e la programmazione resta la stessa di OpenStage.
 */
export default async function WidgetPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (!canManageEvents(session.role)) redirect(withLocale(locale, "/dashboard"));

  const dict = getDictionary(locale);
  const t = dict.widget;

  const [artistPage, venuePage] = await Promise.all([
    session.role === "artist" ? getArtistByProfileId(session.id) : Promise.resolve(null),
    session.role === "venue" ? getVenueByProfileId(session.id) : Promise.resolve(null),
  ]);

  const page = artistPage ?? venuePage;

  if (!page) redirect(withLocale(locale, "/dashboard"));

  const kind = artistPage ? "artist" : "venue";
  const widgetPath = `/widget/${kind}/${page.slug}`;
  const widgetUrl = absoluteUrl(widgetPath);
  const snippet = `<iframe src="${widgetUrl}" width="360" height="520" style="border:0" title="${t.title} OpenStage · ${page.name}" loading="lazy"></iframe>`;

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.text}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <LocaleLink href={artistPage ? artistPath(page) : venuePath(page)} className={ACTION_LINE}>
            {t.open}
            <span aria-hidden="true" className={ACTION_ARROW}>
              ↗
            </span>
          </LocaleLink>
          <a href={widgetUrl} target="_blank" rel="noopener noreferrer" className={ACTION_LINE}>
            {widgetUrl}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="mt-8 grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-14">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {t.preview}
          </h2>
          <div className="mt-3 border border-line bg-bg">
            <iframe
              src={widgetPath}
              title={`${t.title} OpenStage · ${page.name}`}
              width="360"
              height="520"
              style={{ border: 0 }}
              loading="lazy"
              className="w-full"
            />
          </div>
        </div>

        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {t.codeLabel}
          </h2>

          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words border-l-2 border-cyan/60 pl-4 font-mono text-[11px] leading-relaxed text-white/85">
            <code>{snippet}</code>
          </pre>

          <div className="mt-4">
            <CopyCodeButton code={snippet} label={t.copy} copiedLabel={t.copied} />
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{t.hint}</p>
        </div>
      </section>
    </div>
  );
}
