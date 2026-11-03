"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import {
  isChannelArea,
  isChannelKind,
  isChannelStatus,
  type ChannelStatus,
} from "@/lib/outreach/channels";
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

/**
 * Aggiorna stato e nota di un canale di outreach.
 *
 * Lo stato è la parte che conta: «contattato» senza data non dice niente, e
 * senza data non si sa quando è il momento di riscrivere. La data la mette il
 * server, non il browser.
 */
export async function updateOutreachChannelAction(input: {
  id: string;
  status?: string;
  note?: string;
}): Promise<OutreachActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "failed" };
  if (!input.id) return { ok: false, error: "invalid" };

  const patch: {
    status?: ChannelStatus;
    contacted_at?: string | null;
    note?: string | null;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (input.status !== undefined) {
    if (!isChannelStatus(input.status)) return { ok: false, error: "invalid" };
    patch.status = input.status;
    patch.contacted_at = input.status === "todo" ? null : new Date().toISOString();
  }

  if (input.note !== undefined) {
    const note = input.note.trim().slice(0, 2000);
    patch.note = note.length > 0 ? note : null;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("outreach_channels").update(patch).eq("id", input.id);

  if (error) {
    console.error("[outreach] updateChannel:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/outreach/canali");
  return { ok: true };
}

/**
 * Aggiunge un canale trovato a mano.
 *
 * La lista di partenza non è esaustiva: i gruppi locali nascono e muoiono ogni
 * mese. Meglio un modulo che permette di aggiungerne uno quando lo si incontra,
 * che una migrazione ogni volta.
 */
export async function createOutreachChannelAction(input: {
  name: string;
  url: string;
  kind: string;
  area: string;
  rules?: string;
}): Promise<OutreachActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "failed" };

  const name = input.name.trim().slice(0, 120);
  const url = input.url.trim().slice(0, 400);

  if (!name || !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) return { ok: false, error: "invalid" };
  if (!isChannelKind(input.kind)) return { ok: false, error: "invalid" };
  if (!isChannelArea(input.area)) return { ok: false, error: "invalid" };

  const rules = (input.rules ?? "").trim().slice(0, 1000);

  const supabase = await createClient();
  const { error } = await supabase.from("outreach_channels").insert({
    name,
    url,
    kind: input.kind,
    area: input.area,
    rules: rules.length > 0 ? rules : null,
  });

  if (error) {
    // `23505` = url già presente: non è un errore da mostrare come guasto.
    if (error.code === "23505") return { ok: false, error: "invalid" };
    console.error("[outreach] createChannel:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/outreach/canali");
  return { ok: true };
}

/** Toglie un canale dalla lista (solo admin). */
export async function deleteOutreachChannelAction(id: string): Promise<OutreachActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "failed" };
  if (!id) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("outreach_channels").delete().eq("id", id);

  if (error) {
    console.error("[outreach] deleteChannel:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/outreach/canali");
  return { ok: true };
}
