"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Cancellazione dell'account.
 *
 * Ordine delle operazioni, pensato per non portarsi via i dati di altri:
 * 1. le schede artista/locale restano e tornano non reclamate (FK `set null`);
 * 2. thread e messaggi restano per l'altra parte, senza mittente;
 * 3. i dati personali collegati al profilo (follow, preferiti, notifiche,
 *    note private, richieste Pro) spariscono per cascata;
 * 4. l'utente di autenticazione viene eliminato: l'email non esiste più.
 *
 * La conferma è una parola scritta a mano: non è un clic distratto.
 */
export async function deleteAccountAction(input: {
  confirmation: string;
}): Promise<{ ok: boolean; error?: "auth" | "confirmation" | "failed" }> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "auth" };

  if (input.confirmation.trim().toUpperCase() !== "ELIMINA") {
    return { ok: false, error: "confirmation" };
  }

  const admin = createAdminClient();

  try {
    // Se la persona ha scritto dal modulo contatti, anche quei dati vanno via.
    if (session.email) {
      await admin.from("contact_messages").delete().ilike("email", session.email);
    }

    // Le note private sono dati personali che nessun altro vede: la FK
    // `author_id` le elimina in cascata insieme al profilo.

    // L'eliminazione dell'utente fa cascata sul profilo; le FK `set null`
    // proteggono schede, thread e messaggi.
    const { error } = await admin.auth.admin.deleteUser(session.id);

    if (error) {
      console.error("[account] delete:", error.message);
      return { ok: false, error: "failed" };
    }

    // La sessione locale non è più valida: si chiude anche lato browser.
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => undefined);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[account] delete crashed:", error);
    return { ok: false, error: "failed" };
  }
}
