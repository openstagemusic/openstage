"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ToggleFollowResult = {
  ok: boolean;
  following: boolean;
  requiresAuth?: boolean;
  error?: "own" | "invalid" | "failed";
};

/**
 * Segui o smetti di seguire una scheda.
 *
 * La RLS limita la riga al proprio profilo; qui si aggiunge il divieto di
 * seguire la propria scheda, che il database rifiuta comunque con un trigger.
 */
export async function toggleFollowAction(input: {
  subjectType: "artist" | "venue";
  subjectId: string;
}): Promise<ToggleFollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, following: false, requiresAuth: true };

  const subjectType = input.subjectType === "artist" ? "artist" : "venue";
  const subjectId = input.subjectId.trim();
  if (!subjectId) return { ok: false, following: false, error: "invalid" };

  const table = subjectType === "artist" ? "artists" : "venues";
  const column = subjectType === "artist" ? "artist_id" : "venue_id";

  const { data: subject, error: subjectError } = await supabase
    .from(table)
    .select("id, slug, profile_id")
    .eq("id", subjectId)
    .maybeSingle();

  if (subjectError || !subject) {
    return { ok: false, following: false, error: "invalid" };
  }

  if (subject.profile_id === user.id) {
    return { ok: false, following: false, error: "own" };
  }

  const { data: existing, error: readError } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq(column, subjectId)
    .maybeSingle();

  if (readError) {
    console.error("[follows] read:", readError.message);
    return { ok: false, following: false, error: "failed" };
  }

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("[follows] delete:", error.message);
      return { ok: false, following: true, error: "failed" };
    }

    revalidatePath("/dashboard/per-te");
    revalidatePath(subjectType === "artist" ? `/artisti/${subject.slug}` : `/locali/${subject.slug}`);

    return { ok: true, following: false };
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    [column]: subjectId,
  });

  if (error) {
    console.error("[follows] insert:", error.message);
    return { ok: false, following: false, error: "failed" };
  }

  revalidatePath("/dashboard/per-te");
  revalidatePath(subjectType === "artist" ? `/artisti/${subject.slug}` : `/locali/${subject.slug}`);

  return { ok: true, following: true };
}
