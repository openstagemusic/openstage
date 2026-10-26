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
