import type { RolloutPolicyNextStep } from "@/gnr8/migration/policy/page-rollout-policy";
import type { SiteRolloutPolicyResult } from "@/gnr8/migration/policy/site-rollout-policy";
import type { SiteMigrationGateResult } from "@/gnr8/migration/quality-gates/site-quality-gate";

import type { RolloutEnforcementDecision, RolloutEnforcementStage } from "./page-enforcement";

export type SiteEnforcementInput = {
  siteMigrationGate: SiteMigrationGateResult;
  siteRolloutPolicy: SiteRolloutPolicyResult;
};

export type SiteEnforcementResult = {
  targetStage: RolloutEnforcementStage;
  decision: RolloutEnforcementDecision;
  reasons: string[];
  blockingPages: string[];
  blockingReasons: string[];
  recommendedNextStep: RolloutPolicyNextStep | "PROCEED_WITH_SHADOW" | "PROCEED_WITH_CANARY" | "PROCEED_WITH_PRODUCTION";
  requiresOperatorReview: boolean;
  enforcementSourceState: {
    siteMigrationGateState: SiteMigrationGateResult["state"];
    siteRolloutPolicyState: SiteRolloutPolicyResult["state"];
  };
};

export type SiteEnforcementByStage = Record<RolloutEnforcementStage, SiteEnforcementResult>;

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function baseReasons(input: SiteEnforcementInput, targetStage: RolloutEnforcementStage): string[] {
  return uniqueSortedStrings([
    `target_stage:${targetStage}`,
    `site_policy_state:${input.siteRolloutPolicy.state}`,
    `site_gate_state:${input.siteMigrationGate.state}`,
    ...input.siteRolloutPolicy.reasons.map((reason) => `site_policy_reason:${reason}`),
    ...input.siteMigrationGate.summaryReasons.map((reason) => `site_gate_reason:${reason}`),
  ]);
}

function recommendedWhenAllowed(targetStage: RolloutEnforcementStage): SiteEnforcementResult["recommendedNextStep"] {
  if (targetStage === "SHADOW") return "PROCEED_WITH_SHADOW";
  if (targetStage === "CANARY") return "PROCEED_WITH_CANARY";
  return "PROCEED_WITH_PRODUCTION";
}

export function evaluateSiteRolloutEnforcement(
  input: SiteEnforcementInput,
  targetStage: RolloutEnforcementStage,
): SiteEnforcementResult {
  const reasons = baseReasons(input, targetStage);
  const blockingReasons: string[] = [];
  let decision: RolloutEnforcementDecision = "DENY";
  let recommendedNextStep: SiteEnforcementResult["recommendedNextStep"] = input.siteRolloutPolicy.recommendedNextStep;

  const siteBlocked = input.siteMigrationGate.state === "SITE_BROKEN" || input.siteRolloutPolicy.state === "SITE_BLOCKED";
  const siteReviewRequired = input.siteRolloutPolicy.state === "SITE_REVIEW_REQUIRED";

  if (targetStage === "SHADOW") {
    if (siteBlocked) {
      decision = "DENY";
      blockingReasons.push("shadow_denied_site_blocked");
      recommendedNextStep = "AI_REMEDIATION_FIRST";
    } else if (siteReviewRequired) {
      decision = "REVIEW_ONLY";
      blockingReasons.push("shadow_requires_operator_review");
      recommendedNextStep = "STOP_AND_REVIEW";
    } else {
      decision = "ALLOW";
      recommendedNextStep = recommendedWhenAllowed(targetStage);
    }
  } else if (targetStage === "CANARY") {
    if (siteBlocked) {
      decision = "DENY";
      blockingReasons.push("canary_denied_site_blocked");
      recommendedNextStep = "AI_REMEDIATION_FIRST";
    } else if (input.siteRolloutPolicy.allowsCanary) {
      decision = "ALLOW";
      recommendedNextStep = recommendedWhenAllowed(targetStage);
    } else if (siteReviewRequired) {
      decision = "REVIEW_ONLY";
      blockingReasons.push("canary_requires_operator_review");
      recommendedNextStep = "STOP_AND_REVIEW";
    } else {
      decision = "DENY";
      blockingReasons.push("canary_not_allowed_by_site_policy_state");
      recommendedNextStep = "SHADOW_ONLY";
    }
  } else {
    const productionEligible = input.siteRolloutPolicy.allowsProductionConsideration && input.siteMigrationGate.state === "SITE_PRODUCTION_READY";
    if (productionEligible) {
      decision = "ALLOW";
      recommendedNextStep = recommendedWhenAllowed(targetStage);
    } else {
      decision = "DENY";
      blockingReasons.push("production_hard_gate_rejected");
      if (siteBlocked) recommendedNextStep = "AI_REMEDIATION_FIRST";
      else if (siteReviewRequired) recommendedNextStep = "STOP_AND_REVIEW";
      else recommendedNextStep = "NOT_FOR_PRODUCTION";
    }
  }

  return {
    targetStage,
    decision,
    reasons,
    blockingPages: uniqueSortedStrings(input.siteRolloutPolicy.blockingPages),
    blockingReasons: uniqueSortedStrings(blockingReasons),
    recommendedNextStep,
    requiresOperatorReview: decision === "REVIEW_ONLY" || input.siteRolloutPolicy.requiresOperatorReview,
    enforcementSourceState: {
      siteMigrationGateState: input.siteMigrationGate.state,
      siteRolloutPolicyState: input.siteRolloutPolicy.state,
    },
  };
}

export function evaluateSiteRolloutEnforcementByStage(input: SiteEnforcementInput): SiteEnforcementByStage {
  return {
    SHADOW: evaluateSiteRolloutEnforcement(input, "SHADOW"),
    CANARY: evaluateSiteRolloutEnforcement(input, "CANARY"),
    PRODUCTION: evaluateSiteRolloutEnforcement(input, "PRODUCTION"),
  };
}
