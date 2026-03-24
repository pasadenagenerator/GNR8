import type { PageMigrationGateResult, PageMigrationGateState } from "@/gnr8/migration/quality-gates/page-quality-gate";

export type RolloutPolicyNextStep =
  | "STOP_AND_REVIEW"
  | "SHADOW_ONLY"
  | "SHADOW_VALIDATE"
  | "CANARY_REVIEW"
  | "AI_REMEDIATION_FIRST"
  | "NOT_FOR_PRODUCTION";

export type PageRolloutPolicyState =
  | "BLOCKED"
  | "REVIEW_REQUIRED"
  | "SHADOW_ALLOWED"
  | "SHADOW_RECOMMENDED"
  | "CANARY_ALLOWED"
  | "PRODUCTION_DISALLOWED";

export type PageRolloutPolicyResult = {
  state: PageRolloutPolicyState;
  reasons: string[];
  recommendedNextStep: RolloutPolicyNextStep;
  requiresOperatorReview: boolean;
  allowsShadow: boolean;
  allowsCanary: boolean;
  allowsProductionConsideration: boolean;
  recommendsAiRemediation: boolean;
};

const SEVERE_ANOMALY_CODES = new Set<string>([
  "missing_structural_metadata",
  "nav_merged_into_body",
  "gallery_form_collapse",
]);

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function hasSevereAnomaly(anomalySummary: string[]): boolean {
  return anomalySummary.some((code) => SEVERE_ANOMALY_CODES.has(code));
}

function mapGateStateToReason(state: PageMigrationGateState): string {
  if (state === "BROKEN") return "gate_state_broken";
  if (state === "LOW_CONFIDENCE") return "gate_state_low_confidence";
  if (state === "SHADOW_READY") return "gate_state_shadow_ready";
  if (state === "CANARY_CANDIDATE") return "gate_state_canary_candidate";
  return "gate_state_production_candidate";
}

export function evaluatePageRolloutPolicy(pageGateResult: PageMigrationGateResult): PageRolloutPolicyResult {
  const baseReasons = [
    mapGateStateToReason(pageGateResult.state),
    ...pageGateResult.reasons.map((reason) => `gate_reason:${reason}`),
  ];
  const severeAnomaly = hasSevereAnomaly(pageGateResult.anomalySummary);

  if (pageGateResult.state === "BROKEN") {
    return {
      state: "BLOCKED",
      reasons: uniqueSortedStrings([...baseReasons, "page_blocked_by_migration_gate"]),
      recommendedNextStep: "AI_REMEDIATION_FIRST",
      requiresOperatorReview: true,
      allowsShadow: false,
      allowsCanary: false,
      allowsProductionConsideration: false,
      recommendsAiRemediation: true,
    };
  }

  if (pageGateResult.state === "LOW_CONFIDENCE") {
    const recommendAi = severeAnomaly || pageGateResult.score < 0.5;
    return {
      state: "REVIEW_REQUIRED",
      reasons: uniqueSortedStrings([...baseReasons, "operator_review_required_before_rollout"]),
      recommendedNextStep: recommendAi ? "AI_REMEDIATION_FIRST" : "STOP_AND_REVIEW",
      requiresOperatorReview: true,
      allowsShadow: false,
      allowsCanary: false,
      allowsProductionConsideration: false,
      recommendsAiRemediation: recommendAi,
    };
  }

  if (pageGateResult.state === "SHADOW_READY") {
    const cleanShadowCandidate = pageGateResult.score >= 0.72 && pageGateResult.anomalySummary.length === 0 && pageGateResult.weakSectionIds.length === 0;
    const productionDisallowed = pageGateResult.anomalySummary.length > 0 || pageGateResult.weakSectionIds.length > 0 || pageGateResult.score < 0.7;

    if (productionDisallowed) {
      return {
        state: "PRODUCTION_DISALLOWED",
        reasons: uniqueSortedStrings([...baseReasons, "production_consideration_disallowed"]),
        recommendedNextStep: "NOT_FOR_PRODUCTION",
        requiresOperatorReview: false,
        allowsShadow: true,
        allowsCanary: false,
        allowsProductionConsideration: false,
        recommendsAiRemediation: false,
      };
    }

    return {
      state: cleanShadowCandidate ? "SHADOW_RECOMMENDED" : "SHADOW_ALLOWED",
      reasons: uniqueSortedStrings([...baseReasons, cleanShadowCandidate ? "strong_shadow_validation_candidate" : "shadow_rollout_allowed"]),
      recommendedNextStep: cleanShadowCandidate ? "SHADOW_VALIDATE" : "SHADOW_ONLY",
      requiresOperatorReview: false,
      allowsShadow: true,
      allowsCanary: false,
      allowsProductionConsideration: false,
      recommendsAiRemediation: false,
    };
  }

  if (pageGateResult.state === "CANARY_CANDIDATE") {
    return {
      state: "CANARY_ALLOWED",
      reasons: uniqueSortedStrings([...baseReasons, "canary_rollout_allowed"]),
      recommendedNextStep: "CANARY_REVIEW",
      requiresOperatorReview: false,
      allowsShadow: true,
      allowsCanary: true,
      allowsProductionConsideration: false,
      recommendsAiRemediation: false,
    };
  }

  return {
    state: "CANARY_ALLOWED",
    reasons: uniqueSortedStrings([...baseReasons, "production_consideration_allowed"]),
    recommendedNextStep: "CANARY_REVIEW",
    requiresOperatorReview: false,
    allowsShadow: true,
    allowsCanary: true,
    allowsProductionConsideration: true,
    recommendsAiRemediation: false,
  };
}
