"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteHelpArticleAction,
  saveHelpArticleAction,
} from "@/app/actions/help";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { HelpCategory } from "@/lib/help/queries";

export type AdminHelpArticle = {
  id?: string;
  slug: string;
  categoryId: string | null;
  titleIt: string;
  titleEn: string;
  bodyIt: string;
  bodyEn: string;
  status: "draft" | "published";
  position: number;
};

/**
 * Editor di una guida.
 *
 * Markdown semplice, due lingue, bozza/pubblicato. Salva e ricarica l'elenco;
 * l'eliminazione chiede conferma perché porta via anche il feedback.
 */
export default function AdminHelpForm({
  article,
  categories,
  dict,
}: {
  article: AdminHelpArticle;
  categories: HelpCategory[];
  dict: Dictionary["admin"]["help"];
}) {
  const router = useRouter();
  const [values, setValues] = useState(article);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AdminHelpArticle>(key: K, value: AdminHelpArticle[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveHelpArticleAction({
      id: values.id,
      slug: values.slug,
      categoryId: values.categoryId,
      titleIt: values.titleIt,
      titleEn: values.titleEn,
      bodyIt: values.bodyIt,
      bodyEn: values.bodyEn,
      status: values.status,
      position: values.position,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error === "invalid" ? dict.invalid : dict.error);
      return;
    }

    setMessage(dict.saved);
    if (!values.id && result.id) {
      router.replace(`/admin/aiuto/${result.id}`);
    }
    router.refresh();
  }

  async function remove() {
    if (!values.id) return;
    if (!window.confirm(dict.deleteConfirm)) return;

    setBusy(true);
    const result = await deleteHelpArticleAction({ id: values.id });
    setBusy(false);

    if (!result.ok) {
      setError(dict.error);
      return;
    }

    router.push("/admin/aiuto");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-6 grid gap-5 lg:grid-cols-2">
      <div>
        <label htmlFor="help-title-it" className="os-field-label">
          {dict.titleIt}
        </label>
        <input
          id="help-title-it"
          value={values.titleIt}
          onChange={(event) => set("titleIt", event.target.value)}
          className="os-field text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="help-title-en" className="os-field-label">
          {dict.titleEn}
        </label>
        <input
          id="help-title-en"
          value={values.titleEn}
          onChange={(event) => set("titleEn", event.target.value)}
          className="os-field text-sm"
        />
      </div>

      <div>
        <label htmlFor="help-slug" className="os-field-label">
          {dict.slug}
        </label>
        <input
          id="help-slug"
          value={values.slug}
          onChange={(event) => set("slug", event.target.value)}
          className="os-field text-sm"
          placeholder="come-funziona-openstage"
          required
        />
      </div>

      <div>
        <label htmlFor="help-category" className="os-field-label">
          {dict.category}
        </label>
        <select
          id="help-category"
          value={values.categoryId ?? ""}
          onChange={(event) => set("categoryId", event.target.value || null)}
          className="os-field text-sm"
        >
          <option value="">—</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="lg:col-span-2">
        <label htmlFor="help-body-it" className="os-field-label">
          {dict.bodyIt}
        </label>
        <textarea
          id="help-body-it"
          rows={14}
          value={values.bodyIt}
          onChange={(event) => set("bodyIt", event.target.value)}
          className="os-field text-sm"
          required
        />
        <p className="mt-1 text-xs text-muted">{dict.markdownHint}</p>
      </div>

      <div className="lg:col-span-2">
        <label htmlFor="help-body-en" className="os-field-label">
          {dict.bodyEn}
        </label>
        <textarea
          id="help-body-en"
          rows={8}
          value={values.bodyEn}
          onChange={(event) => set("bodyEn", event.target.value)}
          className="os-field text-sm"
        />
      </div>

      <div>
        <label htmlFor="help-status" className="os-field-label">
          {dict.status}
        </label>
        <select
          id="help-status"
          value={values.status}
          onChange={(event) => set("status", event.target.value as "draft" | "published")}
          className="os-field text-sm"
        >
          <option value="draft">{dict.draft}</option>
          <option value="published">{dict.published}</option>
        </select>
      </div>

      <div>
        <label htmlFor="help-position" className="os-field-label">
          {dict.position}
        </label>
        <input
          id="help-position"
          type="number"
          min={0}
          value={values.position}
          onChange={(event) => set("position", Number(event.target.value))}
          className="os-field text-sm"
        />
      </div>

      {message ? <p className="os-note os-note-cyan lg:col-span-2">{message}</p> : null}
      {error ? (
        <p role="alert" className="os-note os-note-pink lg:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
        >
          {busy ? dict.saving : dict.save}
        </button>

        {values.id ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="border-b border-pink/60 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:border-pink disabled:opacity-50"
          >
            {dict.delete}
          </button>
        ) : null}
      </div>
    </form>
  );
}
