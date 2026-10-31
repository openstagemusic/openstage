"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Feedback su una guida: utile / non utile. Anonimo, senza dati personali. */
export async function submitHelpFeedbackAction(input: {
  articleId: string;
  helpful: boolean;
}): Promise<{ ok: boolean }> {
  if (!input.articleId) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("help_feedback").insert({
    article_id: input.articleId,
    helpful: input.helpful,
  });

  if (error) {
    console.error("[help] feedback:", error.message);
    return { ok: false };
  }

  revalidatePath("/admin/aiuto");
  return { ok: true };
}

export type HelpArticleActionResult = { ok: boolean; error?: "auth" | "invalid" | "failed"; id?: string };

/** Salva (crea o aggiorna) un articolo della guida. Solo admin, per RLS. */
export async function saveHelpArticleAction(input: {
  id?: string;
  slug: string;
  categoryId: string | null;
  titleIt: string;
  titleEn: string;
  bodyIt: string;
  bodyEn: string;
  status: "draft" | "published";
  position: number;
}): Promise<HelpArticleActionResult> {
  const titleIt = input.titleIt.trim();
  const bodyIt = input.bodyIt.trim();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

  if (!titleIt || !bodyIt || !slug) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const payload = {
    slug,
    category_id: input.categoryId,
    title_it: titleIt,
    title_en: input.titleEn.trim() || null,
    body_it: bodyIt,
    body_en: input.bodyEn.trim() || null,
    status: input.status,
    position: Number.isFinite(input.position) ? input.position : 0,
    published_at: input.status === "published" ? new Date().toISOString() : null,
  };

  const query = input.id
    ? supabase.from("help_articles").update(payload).eq("id", input.id).select("id").maybeSingle()
    : supabase.from("help_articles").insert(payload).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    console.error("[help] save:", error?.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/aiuto");
  revalidatePath("/admin/aiuto");
  revalidatePath(`/aiuto/${slug}`);

  return { ok: true, id: data.id };
}

/** Elimina un articolo (e il suo feedback, per cascata). */
export async function deleteHelpArticleAction(input: { id: string }): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("help_articles").delete().eq("id", input.id);

  if (error) {
    console.error("[help] delete:", error.message);
    return { ok: false };
  }

  revalidatePath("/aiuto");
  revalidatePath("/admin/aiuto");
  return { ok: true };
}
