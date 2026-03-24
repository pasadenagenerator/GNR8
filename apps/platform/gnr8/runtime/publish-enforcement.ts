import { buildEnforcementAdapterDecision, type EnforcementAdapterDecision, type EnforcementAdapterStage } from "@/gnr8/migration/enforcement/enforcement-adapter";
import { evaluateSiteRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/site-enforcement";
import { evaluateSiteRolloutPolicy, toSiteRolloutPolicyPageResult } from "@/gnr8/migration/policy/site-rollout-policy";
import { evaluateSiteMigrationGate } from "@/gnr8/migration/quality-gates/site-quality-gate";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

export type PublishEnforcementResult = {
  adapter: EnforcementAdapterDecision;
  artifactGovernance: RuntimeArtifact["artifactGovernance"];
  shadowRestricted: boolean;
};

function stageToUpper(stage: EnforcementAdapterStage): "SHADOW" | "CANARY" | "PRODUCTION" {
  if (stage === "shadow") return "SHADOW";
  if (stage === "canary") return "CANARY";
  return "PRODUCTION";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function evaluatePublishEnforcement(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  stage: EnforcementAdapterStage;
}): PublishEnforcementResult {
  const pagesWithGovernance = input.siteVersion.pages
    .filter((page) => page.migrationGovernance)
    .map((page) => ({
      pageId: page.pageId,
      sourcePath: page.path,
      isRoot: page.path === "/",
      governance: page.migrationGovernance!,
    }));

  if (pagesWithGovernance.length === 0) {
    throw new Error("publish-enforcement requires page migration governance on site version pages");
  }

  const siteMigrationGate = evaluateSiteMigrationGate({
    pageResults: pagesWithGovernance.map((page) => ({
      pageId: page.pageId,
      sourcePath: page.sourcePath,
      isRoot: page.isRoot,
      gate: page.governance.pageMigrationGate,
    })),
  });
  const siteRolloutPolicy = evaluateSiteRolloutPolicy({
    siteGateResult: siteMigrationGate,
    pagePolicyResults: pagesWithGovernance.map((page) =>
      toSiteRolloutPolicyPageResult({
        pageId: page.pageId,
        sourcePath: page.sourcePath,
        isRoot: page.isRoot,
        score: page.governance.pageMigrationGate.score,
        pageGateResult: page.governance.pageMigrationGate,
      }),
    ),
  });
  const siteEnforcement = evaluateSiteRolloutEnforcementByStage({
    siteMigrationGate,
    siteRolloutPolicy,
  });

  const adapter = buildEnforcementAdapterDecision({
    stage: input.stage,
    pageEnforcement: pagesWithGovernance.map((page) => ({
      pageId: page.pageId,
      enforcement: page.governance.pageEnforcement,
    })),
    siteEnforcement,
  });

  const artifactGovernance: RuntimeArtifact["artifactGovernance"] = {
    pageGateState: uniqueSorted(pagesWithGovernance.map((page) => page.governance.pageMigrationGate.state)),
    pageRolloutPolicyState: uniqueSorted(pagesWithGovernance.map((page) => page.governance.pageRolloutPolicy.state)),
    pageEnforcementState: {
      shadow: uniqueSorted(pagesWithGovernance.map((page) => page.governance.pageEnforcement.SHADOW.decision)),
      canary: uniqueSorted(pagesWithGovernance.map((page) => page.governance.pageEnforcement.CANARY.decision)),
      production: uniqueSorted(pagesWithGovernance.map((page) => page.governance.pageEnforcement.PRODUCTION.decision)),
    },
    siteGateState: siteMigrationGate.state,
    siteRolloutPolicyState: siteRolloutPolicy.state,
    siteEnforcementState: {
      shadow: siteEnforcement.SHADOW.decision,
      canary: siteEnforcement.CANARY.decision,
      production: siteEnforcement.PRODUCTION.decision,
    },
    publishStage: input.stage,
  };

  return {
    adapter,
    artifactGovernance,
    shadowRestricted: adapter.decision === "REVIEW_ONLY" && stageToUpper(input.stage) === "SHADOW",
  };
}

export function evaluateRuntimeArtifactServingEligibility(input: {
  artifact: RuntimeArtifact;
  servingStage: EnforcementAdapterStage;
}): { allow: boolean; reason: string } {
  const governance = input.artifact.artifactGovernance;
  if (!governance || !governance.siteEnforcementState) return { allow: false, reason: "artifact_missing_governance_metadata" };

  if (input.servingStage === "shadow") {
    const siteShadow = governance.siteEnforcementState.shadow;
    if (siteShadow !== "ALLOW" && siteShadow !== "REVIEW_ONLY") {
      return { allow: false, reason: "shadow_stage_site_enforcement_blocked" };
    }
    return { allow: true, reason: "shadow_stage_enforcement_permits_resolution" };
  }

  if (input.servingStage === "canary") {
    if (governance.siteEnforcementState.canary !== "ALLOW") {
      return { allow: false, reason: "canary_stage_requires_allow" };
    }
    return { allow: true, reason: "canary_stage_allow" };
  }

  if (governance.siteEnforcementState.production !== "ALLOW") {
    return { allow: false, reason: "production_stage_requires_allow" };
  }
  const allPagesAllowProduction = (governance.pageEnforcementState?.production ?? []).every((state) => state === "ALLOW");
  if (!allPagesAllowProduction) {
    return { allow: false, reason: "production_stage_not_production_eligible" };
  }
  return { allow: true, reason: "production_stage_allow" };
}
