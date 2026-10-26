import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  AI_MODEL,
  AI_MONTHLY_BUDGET_USD,
  type AiUsage,
} from "@/lib/ai/client";

export default function AdminAiUsagePanel({
  configured,
  usage,
  dict,
}: {
  configured: boolean;
  usage: AiUsage | null;
  dict: Dictionary["admin"];
}) {
  const cost = usage?.costMonth ?? 0;
  const percent = Math.min(100, (cost / AI_MONTHLY_BUDGET_USD) * 100);

  return (
    <section className="mt-8 border border-line bg-surface/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{dict.aiTitle}</h2>
        <span
          className={
            configured
              ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
              : "border border-pink/40 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink"
          }
        >
          {configured ? "AI Gateway" : dict.aiNotConfigured}
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{dict.aiText}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="border border-line bg-bg p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiModel}
          </p>
          <p className="mt-1 text-sm text-white">{AI_MODEL}</p>
        </div>
        <div className="border border-line bg-bg p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiRunsToday}
          </p>
          <p className="mt-1 text-sm text-white">{usage?.runsToday ?? 0}</p>
        </div>
        <div className="border border-line bg-bg p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiRunsMonth}
          </p>
          <p className="mt-1 text-sm text-white">{usage?.runsMonth ?? 0}</p>
        </div>
      </div>

      <div className="mt-3 border border-line bg-bg p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiCostMonth}
          </p>
          <p className="font-mono text-xs text-white">
            ${cost.toFixed(4)} / ${AI_MONTHLY_BUDGET_USD.toFixed(2)}
          </p>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-cyan" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </section>
  );
}
