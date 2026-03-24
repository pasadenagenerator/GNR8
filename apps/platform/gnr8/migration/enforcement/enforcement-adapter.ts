import type { PageEnforcementByStage, RolloutEnforcementDecision, RolloutEnforcementStage } from "@/gnr8/migration/enforcement/page-enforcement";
import type { SiteEnforcementByStage } from "@/gnr8/migration/enforcement/site-enforcement";

export type EnforcementAdapterStage = "shadow" | "canary" | "production";

export type EnforcementAdapterDecision = {
  stage: EnforcementAdapterStage;
  decision: RolloutEnforcementDecision;
  reasons: string[];
  blockingPages: string[];
  requiresOperatorReview: boolean;
  enforcementSource: {
    gateState: {
      page: string[];
      site: string;
    };
    rolloutPolicyState: {
      page: string[];
      site: string;
    };
    enforcementState: {
      page: string[];
      site: RolloutEnforcementDecision;
    };
  };
};

export type EnforcementAdapterInput = {
  stage: EnforcementAdapterStage;
  pageEnforcement: Array<{
    pageId: string;
    enforcement: PageEnforcementByStage;
  }>;
  siteEnforcement: SiteEnforcementByStage;
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function toRolloutStage(stage: EnforcementAdapterStage): RolloutEnforcementStage {
  if (stage === "shadow") return "SHADOW";
  if (stage === "canary") return "CANARY";
  return "PRODUCTION";
}

function prefixed(values: string[], prefix: string): string[] {
  return values.map((value) => `${prefix}${value}`);
}

export function buildEnforcementAdapterDecision(input: EnforcementAdapterInput): EnforcementAdapterDecision {
  const targetStage = toRolloutStage(input.stage);
  const site = input.siteEnforcement[targetStage];
  const pages = input.pageEnforcement
    .slice()
    .sort((a, b) => a.pageId.localeCompare(b.pageId))
    .map((entry) => ({
      pageId: entry.pageId,
      value: entry.enforcement[targetStage],
    }));

  const hasPageDeny = pages.some((entry) => entry.value.decision === "DENY");
  const hasPageReview = pages.some((entry) => entry.value.decision === "REVIEW_ONLY");
  const siteDeny = site.decision === "DENY";
  const siteReview = site.decision === "REVIEW_ONLY";

  let decision: RolloutEnforcementDecision = "ALLOW";
  if (siteDeny || hasPageDeny) decision = "DENY";
  else if (siteReview || hasPageReview) decision = "REVIEW_ONLY";

  const pageGateState = uniqueSorted(pages.map((entry) => entry.value.enforcementSourceState.pageMigrationGateState));
  const pageRolloutPolicyState = uniqueSorted(pages.map((entry) => entry.value.enforcementSourceState.pageRolloutPolicyState));
  const pageEnforcementState = uniqueSorted(pages.map((entry) => entry.value.decision));

  const reasons = uniqueSorted([
    ...prefixed(site.reasons, "site:"),
    ...prefixed(site.blockingReasons, "site_blocking:"),
    ...pages.flatMap((entry) => prefixed(entry.value.reasons, `page:${entry.pageId}:`)),
    ...pages.flatMap((entry) => prefixed(entry.value.blockingReasons, `page_blocking:${entry.pageId}:`)),
  ]);

  const pageDeniedOrReview = pages
    .filter((entry) => entry.value.decision === "DENY" || entry.value.decision === "REVIEW_ONLY")
    .map((entry) => entry.pageId);

  return {
    stage: input.stage,
    decision,
    reasons,
    blockingPages: uniqueSorted([...site.blockingPages, ...pageDeniedOrReview]),
    requiresOperatorReview:
      decision === "REVIEW_ONLY" ||
      site.requiresOperatorReview ||
      pages.some((entry) => entry.value.requiresOperatorReview),
    enforcementSource: {
      gateState: {
        page: pageGateState,
        site: site.enforcementSourceState.siteMigrationGateState,
      },
      rolloutPolicyState: {
        page: pageRolloutPolicyState,
        site: site.enforcementSourceState.siteRolloutPolicyState,
      },
      enforcementState: {
        page: pageEnforcementState,
        site: site.decision,
      },
    },
  };
}
