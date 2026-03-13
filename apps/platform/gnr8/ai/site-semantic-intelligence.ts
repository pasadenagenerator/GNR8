import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";

export type SiteSemanticHealthLabel = "low" | "medium" | "high";

export type SiteSemanticAutomationReadinessLabel =
  | "not-ready"
  | "review-needed"
  | "automation-candidate";

export type SiteSemanticIntelligence = {
  semanticHealthScore: number;
  semanticHealthLabel: SiteSemanticHealthLabel;

  semanticAutomationReadiness: {
    score: number;
    label: SiteSemanticAutomationReadinessLabel;
  };

  semanticDistribution: {
    highConfidencePages: number;
    mediumConfidencePages: number;
    lowConfidencePages: number;
  };

  semanticWeaknessClusters: string[];
  semanticBottleneckPages: string[];

  semanticSuggestionSummary: {
    improveHero: number;
    improveCTA: number;
    normalizeFAQ: number;
    completePricing: number;
    completeFeatureGrid: number;
  };

  semanticCoverage: {
    heroCoverage: number;
    ctaCoverage: number;
    faqCoverage: number;
    pricingCoverage: number;
    featureGridCoverage: number;
  };

  recommendations: string[];
  summary: string;
  notes: string[];
};

const CLUSTER_SUGGESTIONS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

type ClusterSuggestion = (typeof CLUSTER_SUGGESTIONS)[number];

function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function avgOrZero(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function healthLabelForScore(score: number): SiteSemanticHealthLabel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function readinessLabelForScore(score: number): SiteSemanticAutomationReadinessLabel {
  if (score >= 75) return "automation-candidate";
  if (score >= 40) return "review-needed";
  return "not-ready";
}

function uniqStable(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const value = typeof v === "string" ? v.trim() : "";
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function countBySuggestion(pagesSuggestions: string[][]): Record<ClusterSuggestion, number> {
  const counts: Record<ClusterSuggestion, number> = {
    "Improve hero clarity": 0,
    "Improve CTA clarity": 0,
    "Normalize FAQ content": 0,
    "Complete pricing content": 0,
    "Complete feature grid content": 0,
  };

  for (const suggestions of pagesSuggestions) {
    const set = new Set(suggestions);
    for (const key of CLUSTER_SUGGESTIONS) {
      if (set.has(key)) counts[key] += 1;
    }
  }

  return counts;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function buildSummary(input: {
  health: SiteSemanticHealthLabel;
  readiness: SiteSemanticAutomationReadinessLabel;
  weaknessClusters: string[];
}): string {
  if (input.health === "high" && input.readiness === "automation-candidate" && input.weaknessClusters.length === 0) {
    return "Site semantic health is high and automation-ready.";
  }

  if (input.health === "medium") {
    if (input.weaknessClusters.length > 0) return "Site semantic quality is moderate with clustered weaknesses.";
    return "Site semantic quality is moderate and requires review before automation.";
  }

  if (input.health === "high" && input.readiness !== "automation-candidate") {
    return "Site semantic health is high but automation needs review.";
  }

  return "Site semantic baseline is weak and requires improvement.";
}

export function buildSiteSemanticIntelligence(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
}): SiteSemanticIntelligence {
  const resolved = Array.isArray(input.resolvedPages) ? input.resolvedPages : [];
  const unresolved = Array.isArray(input.unresolvedPages) ? input.unresolvedPages : [];
  const totalInputs = Array.isArray(input.pages) ? input.pages.length : resolved.length + unresolved.length;

  const confidenceScores: number[] = [];
  const confidenceLabels: Array<"low" | "medium" | "high"> = [];
  const readinessScores: number[] = [];
  const readinessLabels: Array<SiteSemanticAutomationReadinessLabel> = [];
  const followUpSuggestionsByPage: string[][] = [];

  const bottleneckSlugs: string[] = [];

  let pagesWithHero = 0;
  let pagesWithCta = 0;
  let pagesWithFaq = 0;
  let pagesWithPricing = 0;
  let pagesWithFeatureGrid = 0;

  for (const p of resolved) {
    const review = buildMigrationReviewSummary(p.page);
    const semanticConfidence = review.semanticConfidence;
    const semanticAutomationReadiness = review.semanticAutomationReadiness;
    const semanticFollowUpSuggestions = review.semanticOptimizationSuggestions;

    confidenceScores.push(typeof semanticConfidence?.score === "number" ? semanticConfidence.score : 0);
    confidenceLabels.push(semanticConfidence?.label ?? "low");

    readinessScores.push(typeof semanticAutomationReadiness?.score === "number" ? semanticAutomationReadiness.score : 0);
    readinessLabels.push(semanticAutomationReadiness?.label ?? "not-ready");

    followUpSuggestionsByPage.push(Array.isArray(semanticFollowUpSuggestions) ? semanticFollowUpSuggestions : []);

    const isBottleneck =
      semanticConfidence?.label === "low" || semanticAutomationReadiness?.label === "not-ready";
    if (isBottleneck) bottleneckSlugs.push(p.slug);

    const countsByType = review.countsByType ?? {};
    if ((countsByType["hero.split"] ?? 0) > 0) pagesWithHero += 1;
    if ((countsByType["cta.simple"] ?? 0) > 0) pagesWithCta += 1;
    if ((countsByType["faq.basic"] ?? 0) > 0) pagesWithFaq += 1;
    if ((countsByType["pricing.basic"] ?? 0) > 0) pagesWithPricing += 1;
    if ((countsByType["feature.grid"] ?? 0) > 0) pagesWithFeatureGrid += 1;
  }

  const resolvedCount = resolved.length;

  const lowConfidencePages = confidenceLabels.filter((l) => l === "low").length;
  const mediumConfidencePages = confidenceLabels.filter((l) => l === "medium").length;
  const highConfidencePages = confidenceLabels.filter((l) => l === "high").length;

  const pagesWithFollowUps = followUpSuggestionsByPage.filter((s) => s.length > 0).length;

  const suggestionCounts = countBySuggestion(followUpSuggestionsByPage);
  const weaknessClusters = CLUSTER_SUGGESTIONS.filter((s) => suggestionCounts[s] >= 2);

  const avgConfidence = avgOrZero(confidenceScores);
  let semanticHealthScore = Math.round(avgConfidence);

  const lowConfidenceRatio = resolvedCount > 0 ? lowConfidencePages / resolvedCount : 0;
  const followUpsRatio = resolvedCount > 0 ? pagesWithFollowUps / resolvedCount : 0;
  const unresolvedRatio = totalInputs > 0 ? unresolved.length / totalInputs : 0;
  const anyAutomationCandidate = readinessLabels.some((l) => l === "automation-candidate");

  if (lowConfidenceRatio > 0.4) semanticHealthScore -= 15;
  if (followUpsRatio > 0.3) semanticHealthScore -= 10;
  if (!anyAutomationCandidate && resolvedCount > 0) semanticHealthScore -= 10;
  if (unresolvedRatio > 0.25) semanticHealthScore -= 10;

  semanticHealthScore = clampScore(semanticHealthScore);
  const semanticHealthLabel = healthLabelForScore(semanticHealthScore);

  const avgReadiness = avgOrZero(readinessScores);
  const siteReadinessScore = clampScore(Math.round(avgReadiness));

  const anyNotReady = readinessLabels.some((l) => l === "not-ready");
  const allAutomationCandidate = resolvedCount > 0 && readinessLabels.every((l) => l === "automation-candidate");

  let siteReadinessLabel = readinessLabelForScore(siteReadinessScore);
  if (allAutomationCandidate) siteReadinessLabel = "automation-candidate";
  else if (anyNotReady) siteReadinessLabel = "review-needed";
  else if (resolvedCount === 0) siteReadinessLabel = "not-ready";

  const heroCoverage = percent(pagesWithHero, resolvedCount);
  const ctaCoverage = percent(pagesWithCta, resolvedCount);
  const faqCoverage = percent(pagesWithFaq, resolvedCount);
  const pricingCoverage = percent(pagesWithPricing, resolvedCount);
  const featureGridCoverage = percent(pagesWithFeatureGrid, resolvedCount);

  const recommendations: string[] = [];
  const addRec = (rec: string) => {
    if (recommendations.length >= 8) return;
    if (recommendations.includes(rec)) return;
    recommendations.push(rec);
  };

  if (unresolved.length > 0) addRec("Resolve missing page data before automation.");

  if (weaknessClusters.includes("Improve hero clarity") || heroCoverage < 60) {
    addRec("Improve hero messaging across key pages.");
  }
  if (weaknessClusters.includes("Improve CTA clarity") || ctaCoverage < 60) {
    addRec("Strengthen CTA clarity site-wide.");
  }
  if (weaknessClusters.includes("Normalize FAQ content") || faqCoverage < 50) {
    addRec("Normalize FAQ content before automation.");
  }
  if (weaknessClusters.includes("Complete pricing content") || pricingCoverage < 50) {
    addRec("Complete pricing messaging before scaling.");
  }

  if (semanticHealthLabel !== "high" || weaknessClusters.length > 0) {
    addRec("Improve semantic consistency across pages.");
  }

  const summary = buildSummary({
    health: semanticHealthLabel,
    readiness: siteReadinessLabel,
    weaknessClusters,
  });

  const notes: string[] = [];
  notes.push("Site semantic intelligence only; no changes are applied.");
  if (resolvedCount === 0) {
    notes.push("No pages were resolved; site-level scores are based on 0 resolved pages.");
  } else if (unresolved.length > 0) {
    notes.push(`Unresolved pages: ${unresolved.length}/${totalInputs}.`);
  }

  if (resolvedCount > 0 && lowConfidenceRatio > 0.4) {
    notes.push(`Low-confidence pages exceed 40% (${Math.round(lowConfidenceRatio * 100)}%).`);
  } else if (resolvedCount > 0 && lowConfidencePages > 0) {
    notes.push(`Low-confidence pages present: ${lowConfidencePages}/${resolvedCount}.`);
  }

  if (resolvedCount > 0) {
    if (siteReadinessLabel === "automation-candidate") {
      notes.push("All resolved pages are automation-candidates.");
    } else if (anyNotReady) {
      notes.push("At least one page is not-ready; site readiness is capped to review-needed.");
    } else {
      notes.push("Some pages require review before automation.");
    }
  }

  return {
    semanticHealthScore,
    semanticHealthLabel,
    semanticAutomationReadiness: {
      score: siteReadinessScore,
      label: siteReadinessLabel,
    },
    semanticDistribution: {
      highConfidencePages,
      mediumConfidencePages,
      lowConfidencePages,
    },
    semanticWeaknessClusters: [...weaknessClusters],
    semanticBottleneckPages: uniqStable(bottleneckSlugs),
    semanticSuggestionSummary: {
      improveHero: suggestionCounts["Improve hero clarity"],
      improveCTA: suggestionCounts["Improve CTA clarity"],
      normalizeFAQ: suggestionCounts["Normalize FAQ content"],
      completePricing: suggestionCounts["Complete pricing content"],
      completeFeatureGrid: suggestionCounts["Complete feature grid content"],
    },
    semanticCoverage: {
      heroCoverage,
      ctaCoverage,
      faqCoverage,
      pricingCoverage,
      featureGridCoverage,
    },
    recommendations: uniqStable(recommendations),
    summary,
    notes: notes.slice(0, 4),
  };
}

