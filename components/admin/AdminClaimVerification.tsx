import type { Dictionary } from "@/i18n/dictionaries/en";
import type { VerificationCheckCode } from "@/lib/ai/verify-page";
import type { VerificationAnalysisResult } from "@/app/actions/ai";

export default function AdminClaimVerification({
  analysis,
  dict,
}: {
  analysis: VerificationAnalysisResult;
  dict: Dictionary["admin"];
}) {
  if (!analysis.ok) return null;

  const checkLabels: Record<VerificationCheckCode, string> = {
    email: dict.checkEmail,
    proof_https: dict.checkProofHttps,
    proof_reachable: dict.checkProofReachable,
    city: dict.checkCity,
    address: dict.checkAddress,
    coordinates: dict.checkCoordinates,
    website_reachable: dict.checkWebsite,
    spotify: dict.checkSpotify,
    events: dict.checkEvents,
  };

  return (
    <div className="mt-4 border border-line bg-surface/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
          {dict.aiVerifyTitle}
        </p>
        <p className="font-mono text-[10px] text-white">
          {dict.aiVerifyScore}: {analysis.report.score}%
        </p>
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {analysis.report.checks.map((check) => (
          <li key={check.code} className="flex items-start gap-2 text-xs">
            <span className={check.ok ? "text-cyan" : "text-pink"}>
              {check.ok ? "✓" : "×"}
            </span>
            <span className="text-muted">
              {checkLabels[check.code]}
              {check.detail ? ` · ${check.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>

      {analysis.ai.ok ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.aiVerifySummary}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/90">{analysis.ai.summary}</p>
          {analysis.ai.concerns.length > 0 ? (
            <div className="mt-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.aiVerifyConcerns}
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs text-muted">
                {analysis.ai.concerns.map((concern) => (
                  <li key={concern}>{concern}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">
          {analysis.ai.error === "budget"
            ? dict.aiVerifyBudget
            : analysis.ai.error === "not_configured"
              ? dict.aiVerifyNotConfigured
              : dict.aiVerifyFailed}
        </p>
      )}

      <p className="mt-3 text-[10px] text-muted">{dict.aiVerifyHuman}</p>
    </div>
  );
}
