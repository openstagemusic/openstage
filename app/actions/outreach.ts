"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type OutreachActionResult = { ok: boolean; error?: "invalid" | "failed" };

/**
 * Salva il profilo Instagram di un artista dal pannello outreach.
 *
 * Serve perché il canale per far arrivare il claim a un artista senza email è
 * il DM: avere l'handle scritto nella stessa pagina in cui si copia il messaggio
 * evita di cercarlo ogni volta (e di sbagliare profilo).
 */
export async function saveArtistInstagramAction(input: {
  artistId: string;
  instagram: string;
}): Promise<OutreachActionResult> {
  const raw = input.instagram.trim();
  if (!raw) return { ok: false, error: "invalid" };

  // Accetta sia `@nome` sia l'indirizzo completo.
  const handle = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .trim();

  if (!/^[a-zA-Z0-9._]{2,30}$/.test(handle)) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("artists")
    .update({ instagram_url: `https://www.instagram.com/${handle}` })
    .eq("id", input.artistId);

  if (error) {
    console.error("[outreach] saveArtistInstagram:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/outreach/artisti");
  return { ok: true };
}
