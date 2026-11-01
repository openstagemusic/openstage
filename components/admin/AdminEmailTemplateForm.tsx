"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  resetEmailTemplateAction,
  saveEmailTemplateAction,
} from "@/app/actions/email-templates";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { EmailTemplate } from "@/lib/email/templates";

/**
 * Editor di un template email.
 *
 * Testo semplice con segnaposto `{{variabile}}`: niente HTML, così il corpo
 * resta leggibile e non si può rompere il layout dell'email. Le variabili
 * disponibili sono elencate e si inseriscono con un clic.
 */
export default function AdminEmailTemplateForm({
  template,
  dict,
}: {
  template: EmailTemplate;
  dict: Dictionary["admin"]["emailCatalog"];
}) {
  const router = useRouter();
  const [subjectIt, setSubjectIt] = useState(template.subjectIt ?? "");
  const [subjectEn, setSubjectEn] = useState(template.subjectEn ?? "");
  const [bodyIt, setBodyIt] = useState(template.bodyIt ?? "");
  const [bodyEn, setBodyEn] = useState(template.bodyEn ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveEmailTemplateAction({
      slug: template.slug,
      subjectIt,
      subjectEn,
      bodyIt,
      bodyEn,
    });

    setBusy(false);

    if (!result.ok) {
      setError(
        result.error === "invalid"
          ? dict.invalid
          : result.error === "readonly"
            ? dict.readonly
            : dict.saveFailed
      );
      return;
    }

    setMessage(dict.saved);
    router.refresh();
  }

  async function reset() {
    if (!window.confirm(dict.resetConfirm)) return;

    setBusy(true);
    setError(null);
    const result = await resetEmailTemplateAction({ slug: template.slug });
    setBusy(false);

    if (!result.ok) {
      setError(dict.saveFailed);
      return;
    }

    router.refresh();
    setMessage(dict.resetDone);
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-5">
      {template.variables.length > 0 ? (
        <div className="border border-line bg-surface/60 p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {dict.variables}
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
          <p className="mt-2 text-xs leading-relaxed text-muted">{dict.variablesHint}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="subject-it" className="os-field-label">
            {dict.subjectIt}
          </label>
          <input
            id="subject-it"
            value={subjectIt}
            onChange={(event) => setSubjectIt(event.target.value)}
            className="os-field text-sm"
            maxLength={160}
            required
          />
        </div>

        <div>
          <label htmlFor="subject-en" className="os-field-label">
            {dict.subjectEn}
          </label>
          <input
            id="subject-en"
            value={subjectEn}
            onChange={(event) => setSubjectEn(event.target.value)}
            className="os-field text-sm"
            maxLength={160}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="body-it" className="os-field-label">
            {dict.bodyIt}
          </label>
          <textarea
            id="body-it"
            value={bodyIt}
            onChange={(event) => setBodyIt(event.target.value)}
            rows={16}
            className="os-field text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="body-en" className="os-field-label">
            {dict.bodyEn}
          </label>
          <textarea
            id="body-en"
            value={bodyEn}
            onChange={(event) => setBodyEn(event.target.value)}
            rows={16}
            className="os-field text-sm"
          />
        </div>
      </div>

      {message ? <p className="os-note os-note-cyan">{message}</p> : null}
      {error ? (
        <p role="alert" className="os-note os-note-pink">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
        >
          {busy ? dict.saving : dict.save}
        </button>

        <button
          type="button"
          onClick={() => void reset()}
          disabled={busy}
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan disabled:opacity-50"
        >
          {dict.reset}
        </button>
      </div>
    </form>
  );
}
