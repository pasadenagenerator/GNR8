import type { TwinRecommendation } from "@/gnr8/runtime/twin/twin-recommendations";

export type TwinOptimizationImpact = "low" | "medium" | "high";
export type TwinOptimizationEffort = "low" | "medium" | "high";
export type TwinOptimizationPriority = "low" | "medium" | "high";

export type TwinOptimizationOpportunity = {
  opportunityId: string;
  title: string;
  summary: string;
  impact: TwinOptimizationImpact;
  effort: TwinOptimizationEffort;
  priority: TwinOptimizationPriority;
  supportingRecommendations: string[];
};

export const TWIN_OPTIMIZATION_DIAGNOSTICS = {
  STARTED: "TWIN_OPTIMIZATIONS_STARTED",
  COMPLETED: "TWIN_OPTIMIZATIONS_COMPLETED",
} as const;

const PRIORITY_ORDER: Record<TwinOptimizationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function hasRecommendationTitle(recommendations: TwinRecommendation[], title: string): boolean {
  return recommendations.some((recommendation) => recommendation.title === title);
}

export function generateTwinOptimizationOpportunities(
  recommendations: TwinRecommendation[],
): TwinOptimizationOpportunity[] {
  const opportunities: TwinOptimizationOpportunity[] = [];

  if (hasRecommendationTitle(recommendations, "Prioritize Core Page Quality")) {
    opportunities.push({
      opportunityId: "opt_homepage_quality_improvement",
      title: "Homepage Quality Improvement",
      summary: "Improve homepage clarity, messaging, and presentation quality.",
      impact: "high",
      effort: "medium",
      priority: "high",
      supportingRecommendations: ["Prioritize Core Page Quality"],
    });
  }

  if (hasRecommendationTitle(recommendations, "Evaluate Homepage Conversion Flow")) {
    opportunities.push({
      opportunityId: "opt_homepage_conversion_review",
      title: "Homepage Conversion Review",
      summary: "Review and improve key visitor conversion paths.",
      impact: "high",
      effort: "low",
      priority: "high",
      supportingRecommendations: ["Evaluate Homepage Conversion Flow"],
    });
  }

  if (hasRecommendationTitle(recommendations, "Collect Additional Design Evidence")) {
    opportunities.push({
      opportunityId: "opt_design_evidence_collection",
      title: "Design Evidence Collection",
      summary: "Collect additional design evidence before deeper design evaluation.",
      impact: "medium",
      effort: "medium",
      priority: "medium",
      supportingRecommendations: ["Collect Additional Design Evidence"],
    });
  }

  if (hasRecommendationTitle(recommendations, "Maintain Read-Only Validation Mode")) {
    opportunities.push({
      opportunityId: "opt_validation_stability_preservation",
      title: "Validation Stability Preservation",
      summary: "Continue operating in read-only mode while validating Website OS behavior.",
      impact: "low",
      effort: "low",
      priority: "low",
      supportingRecommendations: ["Maintain Read-Only Validation Mode"],
    });
  }

  return opportunities.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
