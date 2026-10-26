import { generateText, Output } from "ai";
import { z } from "zod";

import {
  AI_MODEL,
  canSpendAi,
  estimateAiCost,
  getAiUsage,
  isAiConfigured,
  logAiRun,
} from "@/lib/ai/client";
import {
  VERIFY_PAGE_PROMPT_VERSION,
  verifyPageSystemPrompt,
  verifyPageUserPrompt,
} from "@/lib/ai/prompts/verify-page";
import type { VerificationCheck } from "@/lib/ai/verify-page";

const VerifyPageSchema = z.object({
  summary: z.string().trim().min(20).max(900),
  concerns: z.array(z.string().trim().min(3).max(160)).max(5),
});

export type VerifyPageSummary =
  | { ok: true; summary: string; concerns: string[] }
  | { ok: false; error: "not_configured" | "budget" | "failed" };

export async function summarizeVerification(input: {
  subjectType: "artist" | "venue";
  name: string;
  city: string | null;
  genre: string | null;
  address: string | null;
  emailDomain: string | null;
  proofHost: string | null;
  websiteHost: string | null;
  spotifyHost: string | null;
  eventCount: number;
  score: number;
  checks: VerificationCheck[];
}): Promise<VerifyPageSummary> {
  if (!isAiConfigured()) {
    await logAiRun({
      task: "verify-page",
      model: AI_MODEL,
      promptVersion: VERIFY_PAGE_PROMPT_VERSION,
      outcome: "blocked",
      errorCode: "not_configured",
      metadata: { subjectType: input.subjectType },
    });
    return { ok: false, error: "not_configured" };
  }

  const usage = await getAiUsage();

  if (!canSpendAi(usage)) {
    await logAiRun({
      task: "verify-page",
      model: AI_MODEL,
      promptVersion: VERIFY_PAGE_PROMPT_VERSION,
      outcome: "blocked",
      errorCode: "budget_or_limit",
      metadata: { subjectType: input.subjectType },
    });
    return { ok: false, error: "budget" };
  }

  try {
    const result = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: VerifyPageSchema }),
      system: verifyPageSystemPrompt(),
      prompt: verifyPageUserPrompt(input),
      maxOutputTokens: 400,
      temperature: 0.2,
    });

    const parsed = VerifyPageSchema.safeParse(result.output);
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    if (!parsed.success) {
      await logAiRun({
        task: "verify-page",
        model: AI_MODEL,
        promptVersion: VERIFY_PAGE_PROMPT_VERSION,
        inputTokens,
        outputTokens,
        costUsd: estimateAiCost(inputTokens, outputTokens),
        outcome: "failed",
        errorCode: "invalid_output",
        metadata: { subjectType: input.subjectType, score: input.score },
      });
      return { ok: false, error: "failed" };
    }

    await logAiRun({
      task: "verify-page",
      model: AI_MODEL,
      promptVersion: VERIFY_PAGE_PROMPT_VERSION,
      inputTokens,
      outputTokens,
      costUsd: estimateAiCost(inputTokens, outputTokens),
      outcome: "success",
      metadata: {
        subjectType: input.subjectType,
        score: input.score,
        passed: input.checks.filter((check) => check.ok).length,
        total: input.checks.length,
      },
    });

    return {
      ok: true,
      summary: parsed.data.summary,
      concerns: parsed.data.concerns,
    };
  } catch (error) {
    console.error("[ai] verify-page:", error instanceof Error ? error.message : error);
    await logAiRun({
      task: "verify-page",
      model: AI_MODEL,
      promptVersion: VERIFY_PAGE_PROMPT_VERSION,
      outcome: "failed",
      errorCode: "provider_error",
      metadata: { subjectType: input.subjectType },
    });
    return { ok: false, error: "failed" };
  }
}
