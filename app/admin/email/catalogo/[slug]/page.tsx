import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminEmailTemplateForm from "@/components/admin/AdminEmailTemplateForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getEmailTemplate, renderTemplate } from "@/lib/email/templates";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Dati di esempio per l'anteprima: al posto di `{{variabile}}` si vede qualcosa
 * di plausibile, così l'email si legge come arriverà davvero.
 */
const PREVIEW_VALUES: Record<string, Record<string, string>> = {
  "queue-claim-invite": { name: "Druso", link: "https://getopenstage.it/claim/esempio" },
  "app-contact-reply": {
    name: "Marco",
    body: "Grazie per averci scritto: la scheda del locale è stata corretta. Se serve altro siamo qui.",
    topic: "Generale",
  },
  "app-contact-admin": {
    name: "Marco Rossi",
    email: "marco@example.com",
    topic: "general",
    message: "Ciao, vorrei segnalare un locale della mia zona.",
    locale: "it",
  },
  "app-takedown-admin": {
    noticeId: "a1b2c3",
    type: "copyright",
    reporterName: "Marco Rossi",
    reporterEmail: "marco@example.com",
    organization: "Etichetta\n",
    targetUrl: "https://getopenstage.it/it/eventi/ranica/druso-balera",
    description: "Il contenuto usa una foto senza autorizzazione.",
    locale: "it",
  },
  "app-takedown-received": { name: "Marco", noticeId: "a1b2c3" },
  "app-takedown-outcome": {
    name: "Marco",
    noticeId: "a1b2c3",
    outcome: "La segnalazione è stata accolta e il contenuto è stato rimosso o modificato.",
    action: "Azione: immagine rimossa",
  },
};

function previewValues(slug: string, variables: string[]): Record<string, string> {
  const known = PREVIEW_VALUES[slug] ?? {};
  const values: Record<string, string> = {};
  for (const variable of variables) {
    values[variable] = known[variable] ?? `(${variable})`;
  }
  return values;
}

export default async function AdminEmailTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await isCurrentUserAdmin())) notFound();

  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.emailCatalog;

  const template = await getEmailTemplate(slug);
  if (!template) notFound();

  return (
    <div>
      <LocaleLink
        href="/admin/email/catalogo"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.backToCatalog}
      </LocaleLink>

      <header className="mt-6 border-b border-line pb-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
          {template.trigger}
        </p>
        <h1 className="mt-2 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl">
          {template.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {t.audience}: {template.audience}
        </p>
        {template.note ? (
          <p className="mt-2 max-w-2xl font-mono text-[10px] leading-relaxed text-muted">
            {template.note}
          </p>
        ) : null}
      </header>

      {template.subjectIt && template.bodyIt ? (
        <section className="mt-6 border border-line bg-surface/40 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
            {t.previewTitle}
          </p>
          <p className="mt-1 text-xs text-muted">{t.previewHint}</p>

          <div className="mt-4 border border-line bg-bg p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {t.subjectIt}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {renderTemplate(template.subjectIt, previewValues(template.slug, template.variables))}
            </p>

            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {t.bodyIt}
            </p>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">
              {renderTemplate(template.bodyIt, previewValues(template.slug, template.variables))}
            </pre>
          </div>
        </section>
      ) : null}

      {template.editable ? (
        <AdminEmailTemplateForm template={template} dict={t} />
      ) : (
        <div className="mt-6 space-y-5">
          <div className="border border-line bg-surface/60 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {t.readonlyTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">{t.readonlyText}</p>
          </div>

          {template.subjectIt || template.bodyIt ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {t.subjectIt}
                </p>
                <p className="mt-1 text-sm text-white">{template.subjectIt ?? "—"}</p>
                <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {t.bodyIt}
                </p>
                <pre className="mt-1 whitespace-pre-wrap border border-line bg-bg p-3 text-sm leading-relaxed text-white/90">
                  {template.bodyIt ?? "—"}
                </pre>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {t.subjectEn}
                </p>
                <p className="mt-1 text-sm text-white">{template.subjectEn ?? "—"}</p>
                <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {t.bodyEn}
                </p>
                <pre className="mt-1 whitespace-pre-wrap border border-line bg-bg p-3 text-sm leading-relaxed text-white/90">
                  {template.bodyEn ?? "—"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="border border-line p-4">
              <p className="text-sm leading-relaxed text-muted">
                {template.source === "supabase" ? t.supabaseWhere : t.queueWhere}
              </p>
            </div>
          )}

          {template.variables.length > 0 ? (
            <div className="border border-line bg-surface/60 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {t.variables}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {template.variables.map((variable) => (
                  <code
                    key={variable}
                    className="border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-cyan"
                  >
                    {`{{${variable}}}`}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
