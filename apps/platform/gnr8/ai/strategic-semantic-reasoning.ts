import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

export type StrategicReadinessLabel = "low" | "medium" | "high";

export type SemanticStrategyType =
  | "foundation-needed"
  | "structure-first"
  | "content-first"
  | "optimization-phase"
  | "automation-phase";

export type SemanticExecutionPriority = "structural" | "semantic" | "consistency" | "automation";

export type SemanticMaturityStage = "early" | "developing" | "structured" | "automation-ready";

export type StrategicSemanticReasoning = {
  strategicReadiness: {
    score: number;
    label: StrategicReadinessLabel;
  };

  semanticStrategyType: SemanticStrategyType;

  primaryStrategicBlockers: string[];
  secondaryStrategicRisks: string[];

  strategicOpportunities: string[];

  semanticExecutionPriority: SemanticExecutionPriority;
  semanticMaturityStage: SemanticMaturityStage;

  notes: string[];
};

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function readinessLabelForScore(score: number): StrategicReadinessLabel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function uniqStableLimited(values: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const value = typeof v === "string" ? v.trim() : "";
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function maturityStageForHealthScore(semanticHealthScore: number): SemanticMaturityStage {
  if (semanticHealthScore < 40) return "early";
  if (semanticHealthScore <= 60) return "developing";
  if (semanticHealthScore <= 80) return "structured";
  return "automation-ready";
}

function normalizeWeaknessClusters(clusters: string[]): string[] {
  if (!Array.isArray(clusters)) return [];
  return clusters.map((c) => (typeof c === "string" ? c.trim() : "")).filter(Boolean);
}

function buildPageLevelSemanticSignals(resolvedPages: Array<{ slug: string; page: Gnr8Page }>): {
  anyAutomationCandidate: boolean;
  automationCandidateSlugs: string[];
} {
  let anyAutomationCandidate = false;
  const automationCandidateSlugs: string[] = [];

  for (const p of resolvedPages) {
    const review = buildMigrationReviewSummary(p.page);
    const label = review.semanticAutomationReadiness?.label ?? "not-ready";
    if (label === "automation-candidate") {
      anyAutomationCandidate = true;
      automationCandidateSlugs.push(p.slug);
    }
  }

  return {
    anyAutomationCandidate,
    automationCandidateSlugs: uniqStableLimited(automationCandidateSlugs, 10),
  };
}

function hasLowConsistencyDimensions(consistency: SiteSemanticConsistency): {
  lowCount: number;
  mediumCount: number;
} {
  const dims = consistency.consistencyDimensions;
  const values = [dims.heroConsistency, dims.ctaConsistency, dims.faqConsistency, dims.pricingConsistency];
  return {
    lowCount: values.filter((v) => v === "low").length,
    mediumCount: values.filter((v) => v === "medium").length,
  };
}

function inferSemanticExecutionPriority(input: {
  strategicReadinessLabel: StrategicReadinessLabel;
  semanticWeaknessClusters: string[];
  bottleneckRatio: number;
  semanticCoverage: SiteSemanticIntelligence["semanticCoverage"];
  siteSemanticConsistency: SiteSemanticConsistency;
}): SemanticExecutionPriority {
  const { lowCount } = hasLowConsistencyDimensions(input.siteSemanticConsistency);

  const heroLow = input.semanticCoverage.heroCoverage < 60;
  const ctaLow = input.semanticCoverage.ctaCoverage < 60;
  const pricingLow = input.semanticCoverage.pricingCoverage < 50;

  const structuralIssues = (heroLow ? 1 : 0) + (ctaLow ? 1 : 0) + (pricingLow ? 1 : 0);
  const consistencyIssues = input.siteSemanticConsistency.consistencyLabel === "low" ? 3 : lowCount;
  const semanticIssues = input.semanticWeaknessClusters.length;

  if (input.strategicReadinessLabel === "high" && input.siteSemanticConsistency.consistencyLabel === "high" && input.bottleneckRatio <= 0.2) {
    return "automation";
  }

  if (structuralIssues >= 2 && structuralIssues >= semanticIssues && structuralIssues >= consistencyIssues) {
    return "structural";
  }

  if (consistencyIssues >= 2 && consistencyIssues >= semanticIssues) {
    return "consistency";
  }

  if (semanticIssues >= 2) return "semantic";

  if (input.strategicReadinessLabel === "high") return "automation";
  if (structuralIssues > 0) return "structural";
  if (consistencyIssues > 0) return "consistency";
  return "semantic";
}

function inferStrategyType(input: {
  semanticHealthScore: number;
  strategicReadinessLabel: StrategicReadinessLabel;
  bottleneckRatio: number;
  semanticWeaknessClusters: string[];
  semanticCoverage: SiteSemanticIntelligence["semanticCoverage"];
  siteSemanticConsistency: SiteSemanticConsistency;
}): SemanticStrategyType {
  if (input.semanticHealthScore < 40) return "foundation-needed";

  const { lowCount } = hasLowConsistencyDimensions(input.siteSemanticConsistency);
  const lowHeroOrCta = input.semanticCoverage.heroCoverage < 60 || input.semanticCoverage.ctaCoverage < 60;
  const structureIssues = input.siteSemanticConsistency.consistencyLabel === "low" || lowCount >= 2 || lowHeroOrCta;

  const highConsistency = input.siteSemanticConsistency.consistencyLabel === "high" && !lowHeroOrCta;
  const highWeaknessClusters = input.semanticWeaknessClusters.length >= 2;

  const automationPhase =
    input.strategicReadinessLabel === "high" &&
    input.siteSemanticConsistency.consistencyLabel === "high" &&
    input.bottleneckRatio <= 0.2;
  if (automationPhase) return "automation-phase";

  if (structureIssues) return "structure-first";
  if (highConsistency && highWeaknessClusters) return "content-first";

  const improvingConsistency =
    input.siteSemanticConsistency.consistencyLabel === "medium" &&
    hasLowConsistencyDimensions(input.siteSemanticConsistency).lowCount === 0;
  if (input.strategicReadinessLabel === "medium" && improvingConsistency) return "optimization-phase";

  if (input.semanticWeaknessClusters.length > 0) return "content-first";
  return "optimization-phase";
}

function blockerForConsistencyDimension(label: "hero" | "cta" | "faq" | "pricing"): string {
  switch (label) {
    case "hero":
      return "Hero semantics are inconsistent across pages.";
    case "cta":
      return "CTA semantics are inconsistent across pages.";
    case "faq":
      return "FAQ completeness varies across pages.";
    case "pricing":
      return "Pricing completeness varies across pages.";
    default:
      return "Cross-page semantic inconsistency detected.";
  }
}

function riskForConsistencyDimension(label: "hero" | "cta" | "faq" | "pricing"): string {
  switch (label) {
    case "hero":
      return "Hero semantics show moderate variation across pages.";
    case "cta":
      return "CTA semantics show moderate variation across pages.";
    case "faq":
      return "FAQ completeness shows moderate variation across pages.";
    case "pricing":
      return "Pricing completeness shows moderate variation across pages.";
    default:
      return "Moderate cross-page semantic variation detected.";
  }
}

function opportunityForCoverage(label: "hero" | "cta" | "faq" | "pricing" | "featureGrid"): string {
  switch (label) {
    case "hero":
      return "Strong hero coverage; standardize hero semantics as the primary funnel entry point.";
    case "cta":
      return "Strong CTA coverage; normalize CTA semantics to enable reliable automation patterns.";
    case "faq":
      return "FAQ coverage is strong; use it to reinforce consistent intent and objections handling.";
    case "pricing":
      return "Pricing coverage is strong; align pricing semantics for downstream automation readiness.";
    case "featureGrid":
      return "Feature grid coverage is strong; normalize feature semantics for consistent value framing.";
    default:
      return "Strong structured coverage present; leverage it for consistent semantics.";
  }
}

export function buildStrategicSemanticReasoning(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
}): StrategicSemanticReasoning {
  const resolvedCount = input.resolvedPages.length;
  const totalInputs = input.pages.length;

  const bottleneckPages = input.siteSemanticIntelligence.semanticBottleneckPages ?? [];
  const bottleneckRatio = resolvedCount > 0 ? bottleneckPages.length / resolvedCount : 0;
  const weaknessClusters = input.siteSemanticIntelligence.semanticWeaknessClusters ?? [];

  const pageSignals = buildPageLevelSemanticSignals(input.resolvedPages);
  const hasAutomationCandidatePages = pageSignals.anyAutomationCandidate;

  let strategicReadinessScore = input.siteSemanticIntelligence.semanticHealthScore;
  if (input.siteSemanticConsistency.consistencyLabel === "low") strategicReadinessScore -= 15;
  if (bottleneckRatio > 0.3) strategicReadinessScore -= 10;
  if (!hasAutomationCandidatePages && resolvedCount > 0) strategicReadinessScore -= 10;
  if (weaknessClusters.length >= 3) strategicReadinessScore -= 10;

  strategicReadinessScore = clampScore(strategicReadinessScore);
  const strategicReadinessLabel = readinessLabelForScore(strategicReadinessScore);

  const semanticStrategyType = inferStrategyType({
    semanticHealthScore: input.siteSemanticIntelligence.semanticHealthScore,
    strategicReadinessLabel,
    bottleneckRatio,
    semanticWeaknessClusters: normalizeWeaknessClusters(weaknessClusters),
    semanticCoverage: input.siteSemanticIntelligence.semanticCoverage,
    siteSemanticConsistency: input.siteSemanticConsistency,
  });

  const semanticExecutionPriority = inferSemanticExecutionPriority({
    strategicReadinessLabel,
    semanticWeaknessClusters: normalizeWeaknessClusters(weaknessClusters),
    bottleneckRatio,
    semanticCoverage: input.siteSemanticIntelligence.semanticCoverage,
    siteSemanticConsistency: input.siteSemanticConsistency,
  });

  const semanticMaturityStage = maturityStageForHealthScore(input.siteSemanticIntelligence.semanticHealthScore);

  const primaryStrategicBlockers: string[] = [];
  const secondaryStrategicRisks: string[] = [];
  const strategicOpportunities: string[] = [];

  const coverage = input.siteSemanticIntelligence.semanticCoverage;
  const heroLow = coverage.heroCoverage < 60;
  const ctaLow = coverage.ctaCoverage < 60;
  const pricingLow = coverage.pricingCoverage < 50;

  if (heroLow) addUniqueLimited(primaryStrategicBlockers, "Low hero coverage across pages; funnel entry semantics are not consistently established.", 5);
  if (ctaLow) addUniqueLimited(primaryStrategicBlockers, "Low CTA coverage across pages; funnel progression semantics are not consistently established.", 5);
  if (pricingLow) addUniqueLimited(primaryStrategicBlockers, "Pricing coverage is insufficient; pricing semantics are not consistently available for decision-stage pages.", 5);

  const dims = input.siteSemanticConsistency.consistencyDimensions;
  if (dims.heroConsistency === "low") addUniqueLimited(primaryStrategicBlockers, blockerForConsistencyDimension("hero"), 5);
  if (dims.ctaConsistency === "low") addUniqueLimited(primaryStrategicBlockers, blockerForConsistencyDimension("cta"), 5);
  if (dims.faqConsistency === "low") addUniqueLimited(primaryStrategicBlockers, blockerForConsistencyDimension("faq"), 5);
  if (dims.pricingConsistency === "low") addUniqueLimited(primaryStrategicBlockers, blockerForConsistencyDimension("pricing"), 5);

  if (resolvedCount > 0 && bottleneckPages.length > 0) {
    const ratioPct = Math.round(bottleneckRatio * 100);
    const descriptor = bottleneckRatio > 0.3 ? "High concentration" : "Bottleneck";
    const exampleSlugs = uniqStableLimited(bottleneckPages, 3).join(", ");
    addUniqueLimited(
      primaryStrategicBlockers,
      `${descriptor} of semantic bottleneck pages (${bottleneckPages.length}/${resolvedCount}, ${ratioPct}%). Examples: ${exampleSlugs}.`,
      5,
    );
  }

  if (dims.heroConsistency === "medium") addUniqueLimited(secondaryStrategicRisks, riskForConsistencyDimension("hero"), 5);
  if (dims.ctaConsistency === "medium") addUniqueLimited(secondaryStrategicRisks, riskForConsistencyDimension("cta"), 5);
  if (dims.faqConsistency === "medium") addUniqueLimited(secondaryStrategicRisks, riskForConsistencyDimension("faq"), 5);
  if (dims.pricingConsistency === "medium") addUniqueLimited(secondaryStrategicRisks, riskForConsistencyDimension("pricing"), 5);

  if (strategicReadinessLabel === "medium") {
    addUniqueLimited(secondaryStrategicRisks, "Strategic readiness is medium; maintain normalization focus before scaling automation.", 5);
  }

  const unresolvedRatio = totalInputs > 0 ? input.unresolvedPages.length / totalInputs : 0;
  if (unresolvedRatio > 0.2) {
    addUniqueLimited(
      secondaryStrategicRisks,
      `Unresolved page ratio is high (${input.unresolvedPages.length}/${totalInputs}, ${Math.round(unresolvedRatio * 100)}%); site-level reasoning may be incomplete.`,
      5,
    );
  }

  if (coverage.heroCoverage >= 80) addUniqueLimited(strategicOpportunities, opportunityForCoverage("hero"), 5);
  if (coverage.ctaCoverage >= 80) addUniqueLimited(strategicOpportunities, opportunityForCoverage("cta"), 5);
  if (coverage.faqCoverage >= 70) addUniqueLimited(strategicOpportunities, opportunityForCoverage("faq"), 5);
  if (coverage.pricingCoverage >= 70) addUniqueLimited(strategicOpportunities, opportunityForCoverage("pricing"), 5);
  if (coverage.featureGridCoverage >= 70) addUniqueLimited(strategicOpportunities, opportunityForCoverage("featureGrid"), 5);

  if (hasAutomationCandidatePages) {
    const sample = pageSignals.automationCandidateSlugs.slice(0, 3).join(", ");
    addUniqueLimited(
      strategicOpportunities,
      `Automation-candidate pages exist; use them as reference patterns for site-wide normalization. Examples: ${sample}.`,
      5,
    );
  } else if (resolvedCount > 0) {
    addUniqueLimited(
      strategicOpportunities,
      "No automation-candidate pages detected; focus on baseline semantic improvements to create reference-quality pages.",
      5,
    );
  }

  if (weaknessClusters.length > 0) {
    addUniqueLimited(
      strategicOpportunities,
      `Weakness clusters are identifiable (${weaknessClusters.length}); batch-fix clustered issues for broad site-level lift.`,
      5,
    );
  } else {
    addUniqueLimited(
      strategicOpportunities,
      "No weakness clusters detected; prioritize consistency and automation execution readiness.",
      5,
    );
  }

  const notes: string[] = [];
  notes.push("Strategic semantic reasoning only; no changes are applied.");
  {
    const adjustments: string[] = [];
    if (input.siteSemanticConsistency.consistencyLabel === "low") adjustments.push("consistency low (-15)");
    if (bottleneckRatio > 0.3) adjustments.push("bottleneckPages > 30% (-10)");
    if (!hasAutomationCandidatePages && resolvedCount > 0) adjustments.push("no automation-candidate pages (-10)");
    if (weaknessClusters.length >= 3) adjustments.push("weaknessClusters >= 3 (-10)");
    const adj = adjustments.length > 0 ? adjustments.join(", ") : "no adjustments";
    notes.push(
      `Strategic readiness score starts from semanticHealthScore (${input.siteSemanticIntelligence.semanticHealthScore}) and applies deterministic adjustments: ${adj} => ${strategicReadinessScore} (${strategicReadinessLabel}).`,
    );
  }
  notes.push(
    `semanticStrategyType="${semanticStrategyType}" and semanticExecutionPriority="${semanticExecutionPriority}" are derived deterministically from consistency labels, coverage thresholds (hero/cta < 60; pricing < 50), bottleneck ratio, and weakness cluster count.`,
  );
  if (input.unresolvedPages.length > 0) {
    notes.push(`Unresolved pages: ${input.unresolvedPages.length}/${totalInputs}.`);
  }

  return {
    strategicReadiness: {
      score: strategicReadinessScore,
      label: strategicReadinessLabel,
    },
    semanticStrategyType,
    primaryStrategicBlockers: uniqStableLimited(primaryStrategicBlockers, 5),
    secondaryStrategicRisks: uniqStableLimited(secondaryStrategicRisks, 5),
    strategicOpportunities: uniqStableLimited(strategicOpportunities, 5),
    semanticExecutionPriority,
    semanticMaturityStage,
    notes: notes.slice(0, 5),
  };
}
