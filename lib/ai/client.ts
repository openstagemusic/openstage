import { createClient } from "@/lib/supabase/server";

/**
 * Configurazione AI.
 *
 * Il modello predefinito è economico e veloce; il budget è un tetto di spesa
 * mensile calcolato sui token registrati in `ai_runs`. Se il budget o il limite
 * giornaliero sono esauriti, il task si blocca e lo scrive nell'audit.
 */

export const AI_MODEL = process.env.AI_GATEWAY_MODEL?.trim() || "amazon/nova-lite";
export const AI_PROMPT_VERSION = "draft-reply-v1";
export const AI_MONTHLY_BUDGET_USD = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "5") || 5;
export const AI_DAILY_REQUEST_LIMIT = Math.max(
  1,
  Number(process.env.AI_DAILY_REQUEST_LIMIT ?? "30") || 30
);
export const AI_INPUT_COST_PER_TOKEN =
  Number(process.env.AI_INPUT_COST_PER_TOKEN ?? "0.00000006") || 0.00000006;
export const AI_OUTPUT_COST_PER_TOKEN =
  Number(process.env.AI_OUTPUT_COST_PER_TOKEN ?? "0.00000024") || 0.00000024;

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

export function estimateAiCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * AI_INPUT_COST_PER_TOKEN + outputTokens * AI_OUTPUT_COST_PER_TOKEN;
}

export type AiUsage = {
  runsToday: number;
  runsMonth: number;
  inputTokensMonth: number;
  outputTokensMonth: number;
  costMonth: number;
  failedMonth: number;
  lastRun: string | null;
};

export async function getAiUsage(): Promise<AiUsage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_usage");

  if (error || !data) {
    console.error("[ai] admin_ai_usage:", error?.message);
    return null;
  }

  return data as unknown as AiUsage;
}

export async function logAiRun(input: {
  task: string;
  model: string;
  promptVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  outcome: "success" | "failed" | "blocked";
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_log_ai_run", {
    p_task: input.task,
    p_model: input.model,
    p_prompt_version: input.promptVersion,
    p_input_tokens: input.inputTokens ?? 0,
    p_output_tokens: input.outputTokens ?? 0,
    p_cost_usd: input.costUsd ?? 0,
    p_outcome: input.outcome,
    p_error_code: input.errorCode ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) console.error("[ai] admin_log_ai_run:", error.message);
}

export function canSpendAi(usage: AiUsage | null): boolean {
  if (!usage) return true;
  return usage.runsToday < AI_DAILY_REQUEST_LIMIT && usage.costMonth < AI_MONTHLY_BUDGET_USD;
}
