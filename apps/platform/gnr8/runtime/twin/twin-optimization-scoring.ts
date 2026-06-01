import type { TwinOptimizationOpportunity } from "@/gnr8/runtime/twin/twin-optimizations";

export type TwinOptimizationScore = {
  opportunityId: string;
  impactScore: number;
  effortScore: number;
  confidenceScore: number;
  evidenceQualityScore: number;
  totalScore: number;
  rank: number;
};

export const TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS = {
  STARTED: "TWIN_OPTIMIZATION_SCORING_STARTED",
  COMPLETED: "TWIN_OPTIMIZATION_SCORING_COMPLETED",
} as const;

const IMPACT_SCORES: Record<TwinOptimizationOpportunity["impact"], number> = {
  high: 100,
  medium: 60,
  low: 20,
};

const EFFORT_SCORES: Record<TwinOptimizationOpportunity["effort"], number> = {
  low: 100,
  medium: 60,
  high: 20,
};

const CONFIDENCE_SCORE_DEFAULT = 100;

const EVIDENCE_QUALITY_SCORES_BY_TITLE: Record<string, number> = {
  "Homepage Quality Improvement": 80,
  "Homepage Conversion Review": 90,
  "Design Evidence Collection": 50,
  "Validation Stability Preservation": 100,
};

export function scoreOptimizationOpportunities(
  opportunities: TwinOptimizationOpportunity[],
): TwinOptimizationScore[] {
  const scored = opportunities.map((opportunity) => {
    const impactScore = IMPACT_SCORES[opportunity.impact];
    const effortScore = EFFORT_SCORES[opportunity.effort];
    const confidenceScore = CONFIDENCE_SCORE_DEFAULT;
    const evidenceQualityScore = EVIDENCE_QUALITY_SCORES_BY_TITLE[opportunity.title] ?? 0;
    const totalScore = impactScore + effortScore + confidenceScore + evidenceQualityScore;
    return {
      opportunityId: opportunity.opportunityId,
      impactScore,
      effortScore,
      confidenceScore,
      evidenceQualityScore,
      totalScore,
      rank: 0,
    };
  });

  const sorted = [...scored].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.opportunityId.localeCompare(b.opportunityId);
  });

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
