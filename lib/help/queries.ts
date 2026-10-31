import { createClient } from "@/lib/supabase/server";

/**
 * Help Center.
 *
 * Il pubblico legge solo gli articoli pubblicati (RLS); l'admin vede anche le
 * bozze. La ricerca è una ILIKE su titolo e corpo, con indice trigram: con
 * poche centinaia di articoli è più che sufficiente e non aggiunge un motore
 * di ricerca esterno.
 */

export type HelpCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  articles: number;
};

export type HelpArticleSummary = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string | null;
  categoryName: string | null;
  snippet: string;
};

export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published";
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name_it: string;
  name_en: string | null;
  description_it: string | null;
  description_en: string | null;
};

type ArticleRow = {
  id: string;
  slug: string;
  title_it: string;
  title_en: string | null;
  body_it: string;
  body_en: string | null;
  status: "draft" | "published";
  category_id: string | null;
  help_categories:
    | { slug: string; name_it: string; name_en: string | null }
    | { slug: string; name_it: string; name_en: string | null }[]
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function pick(locale: string, it: string, en: string | null): string {
  return locale === "en" && en && en.trim() !== "" ? en : it;
}

/** Trasforma il Markdown in testo per l'anteprima dei risultati. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.*?)\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function snippet(body: string, query: string): string {
  const text = plainText(body);
  if (!query) return text.slice(0, 160) + (text.length > 160 ? "…" : "");

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text.slice(0, 160) + (text.length > 160 ? "…" : "");

  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + 100);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export async function listHelpCategories(locale: string): Promise<HelpCategory[]> {
  const supabase = await createClient();

  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase
      .from("help_categories")
      .select("id, slug, name_it, name_en, description_it, description_en")
      .order("position", { ascending: true }),
    supabase.from("help_articles").select("category_id").eq("status", "published"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (articles as { category_id: string | null }[] | null) ?? []) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return ((categories as CategoryRow[] | null) ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: pick(locale, row.name_it, row.name_en),
    description: locale === "en" ? row.description_en ?? row.description_it : row.description_it,
    articles: counts.get(row.id) ?? 0,
  }));
}

export async function listHelpArticles({
  locale,
  query = "",
  category = null,
  limit = 20,
}: {
  locale: string;
  query?: string;
  category?: string | null;
  limit?: number;
}): Promise<HelpArticleSummary[]> {
  const supabase = await createClient();
  const term = query.trim();

  let request = supabase
    .from("help_articles")
    .select("id, slug, title_it, title_en, body_it, body_en, status, category_id, help_categories ( slug, name_it, name_en )")
    .eq("status", "published")
    .order("position", { ascending: true })
    .limit(limit);

  if (term) {
    const like = `%${term.replace(/[%_]/g, " ")}%`;
    request = request.or(
      `title_it.ilike.${like},title_en.ilike.${like},body_it.ilike.${like},body_en.ilike.${like}`
    );
  }

  if (category) {
    const { data: cat } = await supabase
      .from("help_categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    if (cat?.id) request = request.eq("category_id", cat.id);
  }

  const { data, error } = await request;

  if (error) {
    console.error("[help] listHelpArticles:", error.message);
    return [];
  }

  return ((data as unknown as ArticleRow[] | null) ?? []).map((row) => {
    const cat = one(row.help_categories);
    const title = pick(locale, row.title_it, row.title_en);
    const body = pick(locale, row.body_it, row.body_en);

    return {
      id: row.id,
      slug: row.slug,
      title,
      categorySlug: cat?.slug ?? null,
      categoryName: cat ? pick(locale, cat.name_it, cat.name_en) : null,
      snippet: snippet(body, term),
    };
  });
}

export async function getHelpArticle(slug: string, locale: string): Promise<HelpArticle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_articles")
    .select("id, slug, title_it, title_en, body_it, body_en, status, category_id, help_categories ( slug, name_it, name_en )")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[help] getHelpArticle:", error.message);
    return null;
  }

  const row = data as unknown as ArticleRow;
  const cat = one(row.help_categories);

  return {
    id: row.id,
    slug: row.slug,
    title: pick(locale, row.title_it, row.title_en),
    body: pick(locale, row.body_it, row.body_en),
    status: row.status,
    categoryId: row.category_id,
    categorySlug: cat?.slug ?? null,
    categoryName: cat ? pick(locale, cat.name_it, cat.name_en) : null,
  };
}

export async function listRelatedArticles(
  article: HelpArticle,
  locale: string,
  limit = 3
): Promise<HelpArticleSummary[]> {
  if (!article.categoryId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("help_articles")
    .select("id, slug, title_it, title_en, body_it, body_en, status, category_id, help_categories ( slug, name_it, name_en )")
    .eq("status", "published")
    .eq("category_id", article.categoryId)
    .neq("id", article.id)
    .order("position", { ascending: true })
    .limit(limit);

  return ((data as unknown as ArticleRow[] | null) ?? []).map((row) => {
    const cat = one(row.help_categories);
    const title = pick(locale, row.title_it, row.title_en);
    const body = pick(locale, row.body_it, row.body_en);

    return {
      id: row.id,
      slug: row.slug,
      title,
      categorySlug: cat?.slug ?? null,
      categoryName: cat ? pick(locale, cat.name_it, cat.name_en) : null,
      snippet: snippet(body, ""),
    };
  });
}

/** Tutti gli articoli per l'admin: anche le bozze. */
export async function listAdminHelpArticles(locale: string): Promise<
  Array<HelpArticleSummary & { status: "draft" | "published" }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_articles")
    .select("id, slug, title_it, title_en, body_it, body_en, status, category_id, help_categories ( slug, name_it, name_en )")
    .order("position", { ascending: true });

  if (error) {
    console.error("[help] listAdminHelpArticles:", error.message);
    return [];
  }

  return ((data as unknown as ArticleRow[] | null) ?? []).map((row) => {
    const cat = one(row.help_categories);
    const title = pick(locale, row.title_it, row.title_en);
    const body = pick(locale, row.body_it, row.body_en);

    return {
      id: row.id,
      slug: row.slug,
      title,
      status: row.status,
      categorySlug: cat?.slug ?? null,
      categoryName: cat ? pick(locale, cat.name_it, cat.name_en) : null,
      snippet: snippet(body, ""),
    };
  });
}


/** Un articolo completo per l'editor admin (anche bozza). */
export async function getAdminHelpArticle(id: string): Promise<{
  id: string;
  slug: string;
  categoryId: string | null;
  titleIt: string;
  titleEn: string;
  bodyIt: string;
  bodyEn: string;
  status: "draft" | "published";
  position: number;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_articles")
    .select("id, slug, category_id, title_it, title_en, body_it, body_en, status, position")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[help] getAdminHelpArticle:", error.message);
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    categoryId: data.category_id,
    titleIt: data.title_it,
    titleEn: data.title_en ?? "",
    bodyIt: data.body_it,
    bodyEn: data.body_en ?? "",
    status: data.status,
    position: data.position,
  };
}

/** Solo slug e data di aggiornamento: serve alla mappa del sito, non alle pagine. */
export async function listPublishedHelpSlugs(): Promise<
  Array<{ slug: string; updatedAt: string | null }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_articles")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("position", { ascending: true });

  if (error) {
    console.error("[help] listPublishedHelpSlugs:", error.message);
    return [];
  }

  return (data as { slug: string; updated_at: string | null }[] | null ?? []).map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at,
  }));
}
