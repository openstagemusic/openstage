import { cache } from "react";

import type { UserRole } from "@/lib/auth/roles";

import { isSupabaseConfigured } from "./env";
import { createClient } from "./server";

export type SessionProfile = {
  id: string;
  email: string | null;
  role: UserRole | null;
  /**
   * Profilo verificato da OpenStage: è il permesso di pubblicare senza
   * revisione (vedi `events_require_review` nella migration 0011).
   */
  verified: boolean;
  /**
   * Finestra breve in cui l'admin ha sospeso la 2FA senza cancellare il fattore.
   * Alla scadenza la verifica torna obbligatoria (vedi `admin_set_mfa_bypass`).
   */
  mfaBypassUntil: string | null;
};

/**
 * Utente autenticato + ruolo **letto dal database** (fonte di verità: la RLS e i
 * trigger ragionano sul database, non sui metadati).
 *
 * `cache()` di React la esegue una volta sola per richiesta: layout e pagina
 * condividono lo stesso risultato invece di interrogare due volte Supabase.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, verified_at, mfa_bypass_until")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role as UserRole | undefined) ?? null,
    verified: profile?.verified_at != null,
    mfaBypassUntil: profile?.mfa_bypass_until ?? null,
  };
});
