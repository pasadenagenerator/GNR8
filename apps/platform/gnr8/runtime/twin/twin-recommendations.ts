import type { TwinInsight } from "@/gnr8/runtime/twin/twin-insights";

export type TwinRecommendationPriority = "low" | "medium" | "high";

export type TwinRecommendation = {
  recommendationId: string;
  category: "content" | "design" | "experience" | "governance" | "operations";
  priority: TwinRecommendationPriority;
  title: string;
  summary: string;
  supportingInsights: string[];
};

export const TWIN_RECOMMENDATION_DIAGNOSTICS = {
  STARTED: "TWIN_RECOMMENDATIONS_STARTED",
  COMPLETED: "TWIN_RECOMMENDATIONS_COMPLETED",
} as const;

function hasInsightTitle(insights: TwinInsight[], title: string): boolean {
  return insights.some((insight) => insight.title === title);
}

export function generateTwinRecommendations(insights: TwinInsight[]): TwinRecommendation[] {
  const recommendations: TwinRecommendation[] = [];

  if (hasInsightTitle(insights, "Focused Website Footprint")) {
    recommendations.push({
      recommendationId: "rec_content_prioritize_core_page_quality",
      category: "content",
      priority: "medium",
      title: "Prioritize Core Page Quality",
      summary: "Improve homepage clarity and core company messaging before expanding site structure.",
      supportingInsights: ["Focused Website Footprint"],
    });
  }

  if (hasInsightTitle(insights, "Primary Entry Experience Detected")) {
    recommendations.push({
      recommendationId: "rec_experience_evaluate_homepage_conversion_flow",
      category: "experience",
      priority: "medium",
      title: "Evaluate Homepage Conversion Flow",
      summary: "Review the primary entry experience and key conversion paths.",
      supportingInsights: ["Primary Entry Experience Detected"],
    });
  }

  if (hasInsightTitle(insights, "Limited Design Evidence Available")) {
    recommendations.push({
      recommendationId: "rec_design_collect_additional_design_evidence",
      category: "design",
      priority: "high",
      title: "Collect Additional Design Evidence",
      summary: "Capture additional design evidence before performing deeper design evaluation.",
      supportingInsights: ["Limited Design Evidence Available"],
    });
  }

  if (hasInsightTitle(insights, "Governance Boundary Enforced")) {
    recommendations.push({
      recommendationId: "rec_governance_maintain_read_only_validation_mode",
      category: "governance",
      priority: "low",
      title: "Maintain Read-Only Validation Mode",
      summary: "Continue validating Website OS behavior before enabling future mutation workflows.",
      supportingInsights: ["Governance Boundary Enforced"],
    });
  }

  return recommendations;
}
