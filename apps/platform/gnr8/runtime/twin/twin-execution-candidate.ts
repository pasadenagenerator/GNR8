import type { ExecutionPlanReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-plan-readiness";

export type ExecutionCandidateState =
  | "blocked_candidate"
  | "candidate_ready_preview"
  | "candidate_unknown";

export type ExecutionCandidateGovernanceState = "execution_candidate_preview_only";

export interface ExecutionCandidateRecord {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  candidateState: ExecutionCandidateState;
  readinessState: ExecutionPlanReadinessRecord["readinessState"];
  readinessScore: number;
  candidateType: string;
  candidateScope: string[];
  candidateArtifacts: string[];
  candidateRequirements: string[];
  blockedReasons: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: ExecutionCandidateGovernanceState;
  summary: string;
}

export const TWIN_EXECUTION_CANDIDATE_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_CANDIDATE_STARTED",
  COMPLETED: "TWIN_EXECUTION_CANDIDATE_COMPLETED",
  FALLBACK_APPLIED: "TWIN_EXECUTION_CANDIDATE_FALLBACK_APPLIED",
} as const;

type ExecutionCandidateRule = Pick<
  ExecutionCandidateRecord,
  | "candidateState"
  | "readinessScore"
  | "candidateType"
  | "candidateScope"
  | "candidateArtifacts"
  | "candidateRequirements"
  | "blockedReasons"
  | "summary"
>;

const GOVERNANCE_BLOCKED_REASON = "governance_execution_blocked";

const CANDIDATE_RULES_BY_TITLE = new Map<string, ExecutionCandidateRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      candidateState: "blocked_candidate",
      readinessScore: 80,
      candidateType: "conversion_flow_execution_candidate",
      candidateScope: ["homepage", "primary_conversion_path"],
      candidateArtifacts: ["conversion_review_document", "conversion_improvement_plan"],
      candidateRequirements: [
        "execution_plan_present",
        "planning_artifacts_present",
        "conversion_plan_defined",
        "conversion_baseline",
        "design_evidence",
      ],
      blockedReasons: [
        "missing_conversion_baseline",
        "missing_design_evidence",
        GOVERNANCE_BLOCKED_REASON,
      ],
      summary:
        "Execution candidate is blocked because conversion baseline and design evidence remain missing; governance remains preview-only.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      candidateState: "candidate_ready_preview",
      readinessScore: 90,
      candidateType: "homepage_messaging_execution_candidate",
      candidateScope: ["homepage_hero", "homepage_messaging"],
      candidateArtifacts: ["messaging_review_document", "content_improvement_plan"],
      candidateRequirements: [
        "execution_plan_present",
        "planning_artifacts_present",
        "content_plan_defined",
        "homepage_messaging_scope_defined",
        "design_evidence",
      ],
      blockedReasons: ["missing_design_evidence", GOVERNANCE_BLOCKED_REASON],
      summary:
        "Execution candidate is ready for preview planning, while design evidence and governance still block execution.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      candidateState: "candidate_ready_preview",
      readinessScore: 100,
      candidateType: "validation_runtime_execution_candidate",
      candidateScope: ["runtime_governance"],
      candidateArtifacts: ["validation_status_report"],
      candidateRequirements: [
        "execution_plan_present",
        "planning_artifacts_present",
        "governance_boundary_present",
        "validation_runtime_active",
      ],
      blockedReasons: [GOVERNANCE_BLOCKED_REASON],
      summary:
        "Execution candidate is ready for preview planning inside read-only validation governance.",
    },
  ],
]);

const FALLBACK_CANDIDATE_RULE: ExecutionCandidateRule = {
  candidateState: "candidate_unknown",
  readinessScore: 0,
  candidateType: "unknown_execution_candidate",
  candidateScope: ["unknown"],
  candidateArtifacts: ["future_execution_candidate_definition"],
  candidateRequirements: ["execution_candidate_requirements_unknown"],
  blockedReasons: ["execution_candidate_requirements_unknown", GOVERNANCE_BLOCKED_REASON],
  summary: "Execution candidate cannot be evaluated because plan readiness requirements are unknown.",
};

function resolveExecutionCandidateRule(
  readinessRecord: ExecutionPlanReadinessRecord,
): ExecutionCandidateRule {
  const rule = CANDIDATE_RULES_BY_TITLE.get(readinessRecord.proposalTitle);
  if (!rule) return FALLBACK_CANDIDATE_RULE;
  if (readinessRecord.readinessState === "incomplete" && rule.candidateState === "blocked_candidate") return rule;
  if (
    (readinessRecord.readinessState === "nearly_ready" || readinessRecord.readinessState === "ready") &&
    rule.candidateState === "candidate_ready_preview"
  ) {
    return rule;
  }
  return FALLBACK_CANDIDATE_RULE;
}

export function buildExecutionCandidateRecords(
  readinessRecords: ExecutionPlanReadinessRecord[],
): ExecutionCandidateRecord[] {
  return readinessRecords.map((readinessRecord) => {
    const rule = resolveExecutionCandidateRule(readinessRecord);

    return {
      candidateId: `execution_candidate_${readinessRecord.proposalId}`,
      proposalId: readinessRecord.proposalId,
      proposalTitle: readinessRecord.proposalTitle,
      candidateState: rule.candidateState,
      readinessState: readinessRecord.readinessState,
      readinessScore: rule.readinessScore,
      candidateType: rule.candidateType,
      candidateScope: [...rule.candidateScope],
      candidateArtifacts: [...rule.candidateArtifacts],
      candidateRequirements: [...rule.candidateRequirements],
      blockedReasons: [...rule.blockedReasons],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_candidate_preview_only",
      summary: rule.summary,
    };
  });
}

export const generateTwinExecutionCandidateRecords = buildExecutionCandidateRecords;

export function hasExecutionCandidateFallbackApplied(records: ExecutionCandidateRecord[]): boolean {
  return records.some((record) => record.candidateState === FALLBACK_CANDIDATE_RULE.candidateState);
}
