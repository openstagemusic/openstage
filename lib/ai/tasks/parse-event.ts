import { generateText, Output } from "ai";

import {
  AI_MODEL,
  canSpendAi,
  estimateAiCost,
  getAiUsage,
  isAiConfigured,
  logAiRun,
} from "@/lib/ai/client";
import { parseEventSystemPrompt, parseEventUserPrompt } from "@/lib/ai/prompts/parse-event";
import { ParsedEventSchema, type ParsedEvent } from "@/lib/ai/schemas";

const PROMPT_VERSION = "parse-event-v1";

export type ParsedEventResult =
  | { ok: true; data: ParsedEvent }
  | { ok: false; error: "not_configured" | "budget" | "failed" };

/**
 * Estrae un evento da testo pubblico.
 *
 * Non scrive nulla: restituisce i campi che l'admin controlla e corregge prima
 * del salvataggio. Il testo sorgente non viene salvato in `ai_runs`.
 */
export async function parseEventFromText(input: {
  text: string;
  sourceUrl?: string | null;
}): Promise<ParsedEventResult> {
  if (!isAiConfigured()) {
    await logAiRun({
      task: "parse-event",
      model: AI_MODEL,
      promptVersion: PROMPT_VERSION,
      outcome: "blocked",
      errorCode: "not_configured",
      metadata: { source: input.sourceUrl ? "url" : "text", chars: input.text.length },
    });
    return { ok: false, error: "not_configured" };
  }

  const usage = await getAiUsage();

  if (!canSpendAi(usage)) {
    await logAiRun({
      task: "parse-event",
      model: AI_MODEL,
      promptVersion: PROMPT_VERSION,
      outcome: "blocked",
      errorCode: "budget_or_limit",
      metadata: {
        source: input.sourceUrl ? "url" : "text",
        chars: input.text.length,
        runsToday: usage?.runsToday ?? null,
        costMonth: usage?.costMonth ?? null,
      },
    });
    return { ok: false, error: "budget" };
  }

  try {
    const result = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: ParsedEventSchema }),
      system: parseEventSystemPrompt(),
      prompt: parseEventUserPrompt(input),
      maxOutputTokens: 800,
      temperature: 0.1,
    });

    const parsed = ParsedEventSchema.safeParse(result.output);
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    if (!parsed.success) {
      await logAiRun({
        task: "parse-event",
        model: AI_MODEL,
        promptVersion: PROMPT_VERSION,
        inputTokens,
        outputTokens,
        costUsd: estimateAiCost(inputTokens, outputTokens),
        outcome: "failed",
        errorCode: "invalid_output",
        metadata: { source: input.sourceUrl ? "url" : "text" },
      });
      return { ok: false, error: "failed" };
    }

    await logAiRun({
      task: "parse-event",
      model: AI_MODEL,
      promptVersion: PROMPT_VERSION,
      inputTokens,
      outputTokens,
      costUsd: estimateAiCost(inputTokens, outputTokens),
      outcome: "success",
      metadata: { source: input.sourceUrl ? "url" : "text" },
    });

    return { ok: true, data: parsed.data };
  } catch (error) {
    console.error("[ai] parse-event:", error instanceof Error ? error.message : error);
    await logAiRun({
      task: "parse-event",
      model: AI_MODEL,
      promptVersion: PROMPT_VERSION,
      outcome: "failed",
      errorCode: "provider_error",
      metadata: { source: input.sourceUrl ? "url" : "text" },
    });
    return { ok: false, error: "failed" };
  }
}
