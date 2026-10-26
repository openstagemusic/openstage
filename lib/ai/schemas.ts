import { z } from "zod";

/** Schema chiuso della bozza: una sola risposta, nessun campo nascosto. */
export const DraftReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(20, "La bozza è troppo corta")
    .max(1600, "La bozza è troppo lunga"),
});

export type DraftReply = z.infer<typeof DraftReplySchema>;

/** Estrazione evento da testo/link: nessun campo obbligatorio oltre al titolo. */
export const ParsedEventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  artist: z.string().trim().max(160).nullish(),
  venue: z.string().trim().max(160).nullish(),
  city: z.string().trim().max(120).nullish(),
  address: z.string().trim().max(240).nullish(),
  date: z.string().trim().max(10).nullish(),
  time: z.string().trim().max(5).nullish(),
  genre: z.string().trim().max(80).nullish(),
  description: z.string().trim().max(2000).nullish(),
  priceText: z.string().trim().max(120).nullish(),
  ticketUrl: z.string().trim().max(500).nullish(),
});

export type ParsedEvent = z.infer<typeof ParsedEventSchema>;
