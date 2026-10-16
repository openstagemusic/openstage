export type UserRole = "fan" | "artist" | "venue" | "admin";

/** Chiave i18n dell'etichetta di ogni ruolo (presente in `nav` e `onboarding`). */
export const ROLE_LABEL_KEY: Record<
  UserRole,
  "roleFan" | "roleArtist" | "roleVenue" | "roleAdmin"
> = {
  fan: "roleFan",
  artist: "roleArtist",
  venue: "roleVenue",
  admin: "roleAdmin",
};

/** Pubblicare eventi: artisti, locali e admin (la RLS applica la stessa regola). */
export function canManageEvents(role: UserRole | null): boolean {
  return role === "artist" || role === "venue" || role === "admin";
}

/** Il profilo artista lo completa solo un artista (o l'admin). */
export function canManageArtistProfile(role: UserRole | null): boolean {
  return role === "artist" || role === "admin";
}

/**
 * Solo un fan può ancora scegliere un ruolo: artist e venue sono definitivi
 * per sempre (vedi `prevent_role_escalation` nella migration 0004).
 */
export function canChooseRole(role: UserRole | null): boolean {
  return role === "fan";
}
