/**
 * Canali di outreach: valori ammessi.
 *
 * Stanno qui, e non dentro la pagina, perché li usano tre posti diversi: la
 * pagina admin, il modulo «aggiungi canale» e le azioni server. Se un giorno
 * cambiano, cambiano in un punto solo (e la migrazione va aggiornata).
 */

export const CHANNEL_KINDS = [
  "gruppo-facebook",
  "telegram",
  "instagram",
  "testata",
  "radio",
  "newsletter",
  "comunita",
  "altro",
] as const;

export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const CHANNEL_AREAS = ["Bergamo", "Provincia", "Italia"] as const;

export type ChannelArea = (typeof CHANNEL_AREAS)[number];

export const CHANNEL_STATUSES = ["todo", "contacted", "replied", "discarded"] as const;

export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

export type OutreachChannel = {
  id: string;
  name: string;
  kind: ChannelKind;
  area: ChannelArea;
  url: string;
  rules: string | null;
  note: string | null;
  status: ChannelStatus;
  contacted_at: string | null;
};

export function isChannelKind(value: string): value is ChannelKind {
  return (CHANNEL_KINDS as readonly string[]).includes(value);
}

export function isChannelArea(value: string): value is ChannelArea {
  return (CHANNEL_AREAS as readonly string[]).includes(value);
}

export function isChannelStatus(value: string): value is ChannelStatus {
  return (CHANNEL_STATUSES as readonly string[]).includes(value);
}

/**
 * Un gruppo o una community vuole un post che si possa leggere; una testata o
 * una radio vuole un messaggio diretto. Cambia il tono, non la sostanza.
 */
export function prefersCommunityMessage(kind: ChannelKind): boolean {
  return kind === "gruppo-facebook" || kind === "comunita" || kind === "telegram" || kind === "altro";
}
