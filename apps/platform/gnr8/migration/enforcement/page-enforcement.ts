import type { RolloutPolicyNextStep, PageRolloutPolicyResult } from "@/gnr8/migration/policy/page-rollout-policy";
import type { PageMigrationGateResult } from "@/gnr8/migration/quality-gates/page-quality-gate";

export type RolloutEnforcementStage = "SHADOW" | "CANARY" | "PRODUCTION";
export type RolloutEnforcementDecision = "ALLOW" | "REVIEW_ONLY" | "DENY";

export type PageEnforcementInput = {
  pageMigrationGate: PageMigrationGateResult;
  pageRolloutPolicy: PageRolloutPolicyResult;
  pageStructuralConfidence?: number;
  weakSectionIds?: string[];
  structuralAnomalies?: string[];
};

export type PageEnforcementResult = {
  targetStage: RolloutEnforcementStage;
  decision: RolloutEnforcementDecision;
  reasons: string[];
  blockingReasons: string[];
  recommendedNextStep: RolloutPolicyNextStep | "PROCEED_WITH_SHADOW" | "PROCEED_WITH_CANARY" | "PROCEED_WITH_PRODUCTION";
  requiresOperatorReview: boolean;
  enforcementSourceState: {
    pageMigrationGateState: PageMigrationGateResult["state"];
    pageRolloutPolicyState: PageRolloutPolicyResult["state"];
  };
};

export type PageEnforcementByStage = Record<RolloutEnforcementStage, PageEnforcementResult>;

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeDiagnostics(input: { weakSectionIds?: string[]; structuralAnomalies?: string[] }): {
  weakSectionIds: string[];
  structuralAnomalies: string[];
} {
  return {
    weakSectionIds: [...new Set((input.weakSectionIds ?? []).filter((v): v is string => typeof v === "string" && v.trim().length > 0))].sort(),
    structuralAnomalies: [...new Set((input.structuralAnomalies ?? []).filter((v): v is string => typeof v === "string" && v.trim().length > 0))].sort(),
  };
}

function baseReasons(input: PageEnforcementInput, targetStage: RolloutEnforcementStage): string[] {
  const diagnostics = normalizeDiagnostics({
    weakSectionIds: input.weakSectionIds ?? input.pageMigrationGate.weakSectionIds,
    structuralAnomalies: input.structuralAnomalies ?? input.pageMigrationGate.anomalySummary,
  });

  const reasons = [
    `target_stage:${targetStage}`,
    `policy_state:${input.pageRolloutPolicy.state}`,
    `gate_state:${input.pageMigrationGate.state}`,
    ...input.pageRolloutPolicy.reasons.map((reason) => `policy_reason:${reason}`),
  ];

  if (typeof input.pageStructuralConfidence === "number") {
    const score = Math.min(1, Math.max(0, input.pageStructuralConfidence));
    reasons.push(`structural_confidence:${score.toFixed(3)}`);
  }
  if (diagnostics.weakSectionIds.length > 0) reasons.push(`weak_sections:${diagnostics.weakSectionIds.join(",")}`);
  if (diagnostics.structuralAnomalies.length > 0) reasons.push(`structural_anomalies:${diagnostics.structuralAnomalies.join(",")}`);

  return uniqueSortedStrings(reasons);
}

function allowedShadowByPolicy(policy: PageRolloutPolicyResult["state"]): boolean {
  return policy === "SHADOW_ALLOWED" || policy === "SHADOW_RECOMMENDED" || policy === "CANARY_ALLOWED" || policy === "PRODUCTION_DISALLOWED";
}

function recommendedWhenAllowed(targetStage: RolloutEnforcementStage): PageEnforcementResult["recommendedNextStep"] {
  if (targetStage === "SHADOW") return "PROCEED_WITH_SHADOW";
  if (targetStage === "CANARY") return "PROCEED_WITH_CANARY";
  return "PROCEED_WITH_PRODUCTION";
}

export function evaluatePageRolloutEnforcement(
  input: PageEnforcementInput,
  targetStage: RolloutEnforcementStage,
): PageEnforcementResult {
  const reasons = baseReasons(input, targetStage);
  const blockingReasons: string[] = [];
  let decision: RolloutEnforcementDecision = "DENY";
  let recommendedNextStep: PageEnforcementResult["recommendedNextStep"] = input.pageRolloutPolicy.recommendedNextStep;

  const broken = input.pageMigrationGate.state === "BROKEN" || input.pageRolloutPolicy.state === "BLOCKED";
  const reviewRequired = input.pageMigrationGate.state === "LOW_CONFIDENCE" || input.pageRolloutPolicy.state === "REVIEW_REQUIRED";

  if (targetStage === "SHADOW") {
    if (broken) {
      decision = "DENY";
      blockingReasons.push("shadow_denied_broken_page");
      recommendedNextStep = "AI_REMEDIATION_FIRST";
    } else if (reviewRequired) {
      decision = "REVIEW_ONLY";
      blockingReasons.push("shadow_requires_operator_review");
      recommendedNextStep = "STOP_AND_REVIEW";
    } else if (allowedShadowByPolicy(input.pageRolloutPolicy.state)) {
      decision = "ALLOW";
      recommendedNextStep = recommendedWhenAllowed(targetStage);
    } else {
      decision = "DENY";
      blockingReasons.push("shadow_not_allowed_by_policy_state");
      recommendedNextStep = "STOP_AND_REVIEW";
    }
  } else if (targetStage === "CANARY") {
    if (broken) {
      decision = "DENY";
      blockingReasons.push("canary_denied_broken_page");
      recommendedNextStep = "AI_REMEDIATION_FIRST";
    } else if (input.pageRolloutPolicy.state === "CANARY_ALLOWED" && input.pageRolloutPolicy.allowsCanary) {
      decision = "ALLOW";
      recommendedNextStep = recommendedWhenAllowed(targetStage);
    } else if (reviewRequired) {
      decision = "REVIEW_ONLY";
      blockingReasons.push("canary_requires_operator_review");
      recommendedNextStep = "STOP_AND_REVIEW";
    } else {
      decision = "DENY";
      blockingReasons.push("canary_not_allowed_by_policy_state");
      recommendedNextStep = input.pageRolloutPolicy.state === "PRODUCTION_DISALLOWED" ? "NOT_FOR_PRODUCTION" : "SHADOW_ONLY";
    }
  } else {
    const productionEligible = input.pageMigrationGate.state === "PRODUCTION_CANDIDATE" && input.pageRolloutPolicy.allowsProductionConsideration;
    if (productionEligible) {
      decision = "ALLOW";
      recommendedNextStep = recommendedWhenAllowed(targetStage);
    } else {
      decision = "DENY";
      blockingReasons.push("production_hard_gate_rejected");
      if (broken) recommendedNextStep = "AI_REMEDIATION_FIRST";
      else if (reviewRequired) recommendedNextStep = "STOP_AND_REVIEW";
      else recommendedNextStep = "NOT_FOR_PRODUCTION";
    }
  }

  return {
    targetStage,
    decision,
    reasons,
    blockingReasons: uniqueSortedStrings(blockingReasons),
    recommendedNextStep,
    requiresOperatorReview: decision === "REVIEW_ONLY" || input.pageRolloutPolicy.requiresOperatorReview,
    enforcementSourceState: {
      pageMigrationGateState: input.pageMigrationGate.state,
      pageRolloutPolicyState: input.pageRolloutPolicy.state,
    },
  };
}

export function evaluatePageRolloutEnforcementByStage(input: PageEnforcementInput): PageEnforcementByStage {
  return {
    SHADOW: evaluatePageRolloutEnforcement(input, "SHADOW"),
    CANARY: evaluatePageRolloutEnforcement(input, "CANARY"),
    PRODUCTION: evaluatePageRolloutEnforcement(input, "PRODUCTION"),
  };
}
