import { generateText, Output } from "ai";

import {
  AI_DAILY_REQUEST_LIMIT,
  AI_MODEL,
  AI_MONTHLY_BUDGET_USD,
  AI_PROMPT_VERSION,
  canSpendAi,
  estimateAiCost,
  getAiUsage,
  isAiConfigured,
  logAiRun,
} from "@/lib/ai/client";
import { draftReplySystemPrompt, draftReplyUserPrompt } from "@/lib/ai/prompts/draft-reply";
import { DraftReplySchema } from "@/lib/ai/schemas";

export type DraftReplyResult =
  | { ok: true; reply: string }
  | { ok: false; error: "not_configured" | "budget" | "failed" };

/**
 * Genera una bozza di risposta al ticket.
 *
 * L'AI non invia e non scrive: restituisce solo testo che l'admin può
 * modificare. Ogni esecuzione (riuscita, fallita o bloccata) viene registrata
 * in `ai_runs` con token e costo stimato, senza salvare il messaggio.
 */
export async function draftReplyForTicket(input: {
  messageId: string;
  message: string;
  topic: string;
  locale: "it" | "en";
}): Promise<DraftReplyResult> {
  if (!isAiConfigured()) {
    await logAiRun({
      task: "draft-reply",
      model: AI_MODEL,
      promptVersion: AI_PROMPT_VERSION,
      outcome: "blocked",
      errorCode: "not_configured",
      metadata: { messageId: input.messageId, topic: input.topic },
    });
    return { ok: false, error: "not_configured" };
  }

  const usage = await getAiUsage();

  if (!canSpendAi(usage)) {
    await logAiRun({
      task: "draft-reply",
      model: AI_MODEL,
      promptVersion: AI_PROMPT_VERSION,
      outcome: "blocked",
      errorCode: "budget_or_limit",
      metadata: {
        messageId: input.messageId,
        topic: input.topic,
        runsToday: usage?.runsToday ?? null,
        costMonth: usage?.costMonth ?? null,
      },
    });
    return { ok: false, error: "budget" };
  }

  try {
    const result = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: DraftReplySchema }),
      system: draftReplySystemPrompt(input.locale),
      prompt: draftReplyUserPrompt(input),
      maxOutputTokens: 400,
      temperature: 0.3,
    });

    const parsed = DraftReplySchema.safeParse(result.output);

    if (!parsed.success) {
      await logAiRun({
        task: "draft-reply",
        model: AI_MODEL,
        promptVersion: AI_PROMPT_VERSION,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        costUsd: estimateAiCost(
          result.usage?.inputTokens ?? 0,
          result.usage?.outputTokens ?? 0
        ),
        outcome: "failed",
        errorCode: "invalid_output",
        metadata: { messageId: input.messageId, topic: input.topic },
      });
      return { ok: false, error: "failed" };
    }

    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    await logAiRun({
      task: "draft-reply",
      model: AI_MODEL,
      promptVersion: AI_PROMPT_VERSION,
      inputTokens,
      outputTokens,
      costUsd: estimateAiCost(inputTokens, outputTokens),
      outcome: "success",
      metadata: { messageId: input.messageId, topic: input.topic },
    });

    return { ok: true, reply: parsed.data.reply };
  } catch (error) {
    console.error("[ai] draft-reply:", error instanceof Error ? error.message : error);
    await logAiRun({
      task: "draft-reply",
      model: AI_MODEL,
      promptVersion: AI_PROMPT_VERSION,
      outcome: "failed",
      errorCode: "provider_error",
      metadata: { messageId: input.messageId, topic: input.topic },
    });
    return { ok: false, error: "failed" };
  }
}

export const AI_DRAFT_LIMITS = {
  daily: AI_DAILY_REQUEST_LIMIT,
  monthlyBudgetUsd: AI_MONTHLY_BUDGET_USD,
};
