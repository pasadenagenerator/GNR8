import type { RolloutPolicyNextStep, PageRolloutPolicyResult } from "@/gnr8/migration/policy/page-rollout-policy";
import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import type { SiteMigrationGateResult } from "@/gnr8/migration/quality-gates/site-quality-gate";

export type SiteRolloutPolicyState =
  | "SITE_BLOCKED"
  | "SITE_REVIEW_REQUIRED"
  | "SITE_SHADOW_ALLOWED"
  | "SITE_SHADOW_RECOMMENDED"
  | "SITE_CANARY_ALLOWED"
  | "SITE_PRODUCTION_DISALLOWED";

export type SiteRolloutPolicyPageResult = {
  pageId: string;
  sourcePath: string;
  isRoot: boolean;
  score: number;
  policy: PageRolloutPolicyResult;
};

export type SiteRolloutPolicyResult = {
  state: SiteRolloutPolicyState;
  reasons: string[];
  blockingPages: string[];
  recommendedNextStep: RolloutPolicyNextStep;
  requiresOperatorReview: boolean;
  allowsShadow: boolean;
  allowsCanary: boolean;
  allowsProductionConsideration: boolean;
  recommendsAiRemediation: boolean;
};

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function round3(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.min(1, Math.max(0, value)).toFixed(3));
}

function resolveRootPage(pages: SiteRolloutPolicyPageResult[]): SiteRolloutPolicyPageResult | null {
  const explicitRoot = pages
    .filter((page) => page.isRoot)
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId))[0];
  if (explicitRoot) return explicitRoot;

  const preferred = pages
    .slice()
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId))
    .find((page) => page.sourcePath === "/" || page.sourcePath === "index.html" || page.sourcePath === "/index.html");
  return preferred ?? pages[0] ?? null;
}

function pageResultsFromSiteGate(siteGateResult: SiteMigrationGateResult): SiteRolloutPolicyPageResult[] {
  return siteGateResult.pageStates.map((page) => {
    const syntheticPolicy =
      page.state === "BROKEN"
        ? {
            state: "BLOCKED" as const,
            reasons: ["derived_from_site_gate:broken"],
            recommendedNextStep: "AI_REMEDIATION_FIRST" as const,
            requiresOperatorReview: true,
            allowsShadow: false,
            allowsCanary: false,
            allowsProductionConsideration: false,
            recommendsAiRemediation: true,
          }
        : page.state === "LOW_CONFIDENCE"
          ? {
              state: "REVIEW_REQUIRED" as const,
              reasons: ["derived_from_site_gate:low_confidence"],
              recommendedNextStep: "STOP_AND_REVIEW" as const,
              requiresOperatorReview: true,
              allowsShadow: false,
              allowsCanary: false,
              allowsProductionConsideration: false,
              recommendsAiRemediation: false,
            }
          : page.state === "SHADOW_READY"
            ? {
                state: "SHADOW_ALLOWED" as const,
                reasons: ["derived_from_site_gate:shadow_ready"],
                recommendedNextStep: "SHADOW_ONLY" as const,
                requiresOperatorReview: false,
                allowsShadow: true,
                allowsCanary: false,
                allowsProductionConsideration: false,
                recommendsAiRemediation: false,
              }
            : page.state === "CANARY_CANDIDATE"
              ? {
                  state: "CANARY_ALLOWED" as const,
                  reasons: ["derived_from_site_gate:canary_candidate"],
                  recommendedNextStep: "CANARY_REVIEW" as const,
                  requiresOperatorReview: false,
                  allowsShadow: true,
                  allowsCanary: true,
                  allowsProductionConsideration: false,
                  recommendsAiRemediation: false,
                }
              : {
                  state: "CANARY_ALLOWED" as const,
                  reasons: ["derived_from_site_gate:production_candidate"],
                  recommendedNextStep: "CANARY_REVIEW" as const,
                  requiresOperatorReview: false,
                  allowsShadow: true,
                  allowsCanary: true,
                  allowsProductionConsideration: true,
                  recommendsAiRemediation: false,
                };

    return {
      pageId: page.pageId,
      sourcePath: page.sourcePath,
      isRoot: page.isRoot,
      score: round3(page.score),
      policy: syntheticPolicy,
    };
  });
}

export function evaluateSiteRolloutPolicy(input: {
  siteGateResult?: SiteMigrationGateResult;
  pagePolicyResults?: SiteRolloutPolicyPageResult[];
}): SiteRolloutPolicyResult {
  const pagePolicyResults =
    input.pagePolicyResults && input.pagePolicyResults.length > 0
      ? input.pagePolicyResults
      : input.siteGateResult
        ? pageResultsFromSiteGate(input.siteGateResult)
        : [];

  const pages = pagePolicyResults
    .slice()
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId));
  if (pages.length === 0) {
    return {
      state: "SITE_BLOCKED",
      reasons: ["site_has_no_pages"],
      blockingPages: [],
      recommendedNextStep: "AI_REMEDIATION_FIRST",
      requiresOperatorReview: true,
      allowsShadow: false,
      allowsCanary: false,
      allowsProductionConsideration: false,
      recommendsAiRemediation: true,
    };
  }

  const rootPage = resolveRootPage(pages);
  if (!rootPage) {
    return {
      state: "SITE_BLOCKED",
      reasons: ["site_root_page_unresolvable"],
      blockingPages: [],
      recommendedNextStep: "STOP_AND_REVIEW",
      requiresOperatorReview: true,
      allowsShadow: false,
      allowsCanary: false,
      allowsProductionConsideration: false,
      recommendsAiRemediation: false,
    };
  }

  const blockedPages = pages.filter((page) => page.policy.state === "BLOCKED");
  const reviewPages = pages.filter((page) => page.policy.state === "REVIEW_REQUIRED");
  const canaryPages = pages.filter((page) => page.policy.allowsCanary);
  const productionAllowedPages = pages.filter((page) => page.policy.allowsProductionConsideration);
  const productionDisallowedPages = pages.filter((page) => page.policy.state === "PRODUCTION_DISALLOWED");
  const averageScore = round3(pages.reduce((sum, page) => sum + page.score, 0) / pages.length);
  const canaryRatio = round3(canaryPages.length / pages.length);
  const productionRatio = round3(productionAllowedPages.length / pages.length);

  const blockingPages = uniqueSortedStrings(
    pages.filter((page) => page.policy.state === "BLOCKED" || page.policy.state === "REVIEW_REQUIRED").map((page) => page.pageId),
  );

  let state: SiteRolloutPolicyState = "SITE_SHADOW_ALLOWED";
  let recommendedNextStep: RolloutPolicyNextStep = "SHADOW_ONLY";
  const reasons: string[] = [];

  if (blockedPages.length > 0) {
    state = "SITE_BLOCKED";
    recommendedNextStep = blockedPages.some((page) => page.policy.recommendsAiRemediation) ? "AI_REMEDIATION_FIRST" : "STOP_AND_REVIEW";
    reasons.push("blocked_pages_present");
  } else if (rootPage.policy.state === "REVIEW_REQUIRED" || reviewPages.length > 0 || !rootPage.policy.allowsShadow) {
    state = "SITE_REVIEW_REQUIRED";
    recommendedNextStep = reviewPages.some((page) => page.policy.recommendsAiRemediation) ? "AI_REMEDIATION_FIRST" : "STOP_AND_REVIEW";
    reasons.push("operator_review_required");
    if (!rootPage.policy.allowsCanary) reasons.push("root_page_not_canary_ready");
  } else if (rootPage.policy.allowsCanary && canaryRatio >= 0.6) {
    state = "SITE_CANARY_ALLOWED";
    recommendedNextStep = "CANARY_REVIEW";
    reasons.push("site_canary_ratio_meets_threshold");
    reasons.push("root_page_canary_ready");
  } else {
    const shadowRatio = round3(pages.filter((page) => page.policy.allowsShadow).length / pages.length);
    const shadowRecommended = shadowRatio >= 0.9 && averageScore >= 0.72;
    state = shadowRecommended ? "SITE_SHADOW_RECOMMENDED" : "SITE_SHADOW_ALLOWED";
    recommendedNextStep = shadowRecommended ? "SHADOW_VALIDATE" : "SHADOW_ONLY";
    reasons.push("site_shadow_rollout_allowed");
    if (!rootPage.policy.allowsCanary) reasons.push("root_page_not_canary_ready");
  }

  const allowsProductionConsideration =
    blockedPages.length === 0 &&
    reviewPages.length === 0 &&
    rootPage.policy.allowsProductionConsideration &&
    productionRatio >= 0.6;
  if (!allowsProductionConsideration) reasons.push("production_consideration_disallowed");

  if (state === "SITE_CANARY_ALLOWED" && !allowsProductionConsideration && productionDisallowedPages.length > 0) {
    state = "SITE_PRODUCTION_DISALLOWED";
    recommendedNextStep = "NOT_FOR_PRODUCTION";
    reasons.push("site_explicitly_not_for_production");
  }

  const allowsShadow =
    state === "SITE_SHADOW_ALLOWED" ||
    state === "SITE_SHADOW_RECOMMENDED" ||
    state === "SITE_CANARY_ALLOWED" ||
    state === "SITE_PRODUCTION_DISALLOWED";
  const allowsCanary = state === "SITE_CANARY_ALLOWED" || state === "SITE_PRODUCTION_DISALLOWED";
  const requiresOperatorReview = state === "SITE_BLOCKED" || state === "SITE_REVIEW_REQUIRED" || state === "SITE_PRODUCTION_DISALLOWED";
  const recommendsAiRemediation =
    blockedPages.some((page) => page.policy.recommendsAiRemediation) || reviewPages.some((page) => page.policy.recommendsAiRemediation);

  return {
    state,
    reasons: uniqueSortedStrings([...reasons, `canary_ratio:${canaryRatio.toFixed(3)}`, `production_ratio:${productionRatio.toFixed(3)}`]),
    blockingPages,
    recommendedNextStep,
    requiresOperatorReview,
    allowsShadow,
    allowsCanary,
    allowsProductionConsideration,
    recommendsAiRemediation,
  };
}

export function toSiteRolloutPolicyPageResult(input: {
  pageId: string;
  sourcePath: string;
  isRoot?: boolean;
  score: number;
  pageGateResult: Parameters<typeof evaluatePageRolloutPolicy>[0];
}): SiteRolloutPolicyPageResult {
  return {
    pageId: input.pageId,
    sourcePath: input.sourcePath,
    isRoot: Boolean(input.isRoot),
    score: round3(input.score),
    policy: evaluatePageRolloutPolicy(input.pageGateResult),
  };
}
