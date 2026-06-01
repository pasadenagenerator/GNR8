import type { TwinOptimizationScore } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import type { TwinOptimizationOpportunity } from "@/gnr8/runtime/twin/twin-optimizations";

export type TwinProposalCandidateStatus = "proposal_candidate";
export type TwinProposalCandidateExecutionState = "blocked";
export type TwinProposalCandidateRisk = "low" | "medium" | "high";

export type TwinProposalCandidate = {
  proposalId: string;
  status: TwinProposalCandidateStatus;
  executionState: TwinProposalCandidateExecutionState;
  title: string;
  summary: string;
  priority: "low" | "medium" | "high";
  expectedImpact: "low" | "medium" | "high";
  expectedEffort: "low" | "medium" | "high";
  risk: TwinProposalCandidateRisk;
  optimizationRank: number;
  optimizationScore: number;
  sourceOpportunityId: string;
  supportingRecommendations: string[];
  reason: string;
  boundaries: string[];
};

export const TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS = {
  STARTED: "TWIN_PROPOSAL_CANDIDATES_STARTED",
  COMPLETED: "TWIN_PROPOSAL_CANDIDATES_COMPLETED",
} as const;

const DEFAULT_TOP_RANK_LIMIT = 3;
const REQUIRED_BOUNDARIES = [
  "read_only",
  "non_executable",
  "no_content_mutation",
  "no_design_mutation",
  "no_publish",
  "no_provider_execution",
] as const;

type ProposalRule = {
  title: string;
  summary: string;
  risk: TwinProposalCandidateRisk;
  reason: string;
};

const PROPOSAL_RULES_BY_OPPORTUNITY_TITLE: Record<string, ProposalRule> = {
  "Homepage Conversion Review": {
    title: "Improve Homepage Conversion Flow",
    summary:
      "Review and improve the primary visitor journey on the homepage to strengthen lead generation and visitor conversion effectiveness.",
    risk: "low",
    reason: "The homepage was identified as the primary entry experience and the optimization has high impact with low effort.",
  },
  "Homepage Quality Improvement": {
    title: "Improve Homepage Quality and Messaging",
    summary: "Improve homepage clarity, messaging, and presentation quality before expanding site structure.",
    risk: "medium",
    reason:
      "The website appears to be a focused presentation site, so homepage quality is a high-leverage improvement area.",
  },
  "Design Evidence Collection": {
    title: "Collect Additional Design Evidence",
    summary: "Collect additional design evidence before deeper design evaluation or visual improvement planning.",
    risk: "low",
    reason:
      "Design evidence is currently limited, so additional capture evidence should be gathered before design-level planning.",
  },
  "Validation Stability Preservation": {
    title: "Maintain Read-Only Validation Mode",
    summary: "Continue validating Website OS behavior in read-only mode before enabling future mutation workflows.",
    risk: "low",
    reason: "The current governance boundary prevents mutation and should remain enforced during runtime validation.",
  },
};

export function generateTwinProposalCandidates(input: {
  opportunities: TwinOptimizationOpportunity[];
  scores: TwinOptimizationScore[];
  limit?: number;
}): TwinProposalCandidate[] {
  const topRankLimit = input.limit ?? DEFAULT_TOP_RANK_LIMIT;
  const opportunitiesById = new Map(input.opportunities.map((entry) => [entry.opportunityId, entry]));

  return [...input.scores]
    .sort((a, b) => a.rank - b.rank || a.opportunityId.localeCompare(b.opportunityId))
    .slice(0, topRankLimit)
    .flatMap((score): TwinProposalCandidate[] => {
      const opportunity = opportunitiesById.get(score.opportunityId);
      if (!opportunity) return [];
      const rule = PROPOSAL_RULES_BY_OPPORTUNITY_TITLE[opportunity.title];
      if (!rule) return [];

      return [
        {
          proposalId: `proposal_candidate_${opportunity.opportunityId}`,
          status: "proposal_candidate",
          executionState: "blocked",
          title: rule.title,
          summary: rule.summary,
          priority: opportunity.priority,
          expectedImpact: opportunity.impact,
          expectedEffort: opportunity.effort,
          risk: rule.risk,
          optimizationRank: score.rank,
          optimizationScore: score.totalScore,
          sourceOpportunityId: opportunity.opportunityId,
          supportingRecommendations: [...opportunity.supportingRecommendations],
          reason: rule.reason,
          boundaries: [...REQUIRED_BOUNDARIES],
        },
      ];
    });
}
