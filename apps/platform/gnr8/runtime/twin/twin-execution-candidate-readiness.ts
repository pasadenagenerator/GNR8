import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";

export type ExecutionCandidateReadinessState = "ready" | "nearly_ready" | "incomplete" | "unknown";

export type ExecutionCandidateReadinessGovernanceState =
  "execution_candidate_readiness_preview_only";

export interface ExecutionCandidateReadinessRecord {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  readinessState: ExecutionCandidateReadinessState;
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  candidatePresent: boolean;
  candidateArtifactsPresent: boolean;
  blockedReasons: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: ExecutionCandidateReadinessGovernanceState;
  summary: string;
}

export const TWIN_EXECUTION_CANDIDATE_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_CANDIDATE_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_CANDIDATE_READINESS_COMPLETED",
  FALLBACK_APPLIED: "TWIN_EXECUTION_CANDIDATE_READINESS_FALLBACK_APPLIED",
} as const;

type CandidateReadinessRule = Pick<
  ExecutionCandidateReadinessRecord,
  | "readinessState"
  | "readinessScore"
  | "requirementsMet"
  | "requirementsMissing"
  | "candidatePresent"
  | "candidateArtifactsPresent"
  | "summary"
>;

const GOVERNANCE_BLOCKED_REASON = "governance_execution_blocked";

const FALLBACK_CANDIDATE_READINESS_RULE: CandidateReadinessRule = {
  readinessState: "unknown",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: ["execution_candidate_readiness_requirements_unknown"],
  candidatePresent: false,
  candidateArtifactsPresent: false,
  summary: "Execution candidate readiness cannot be evaluated because candidate evidence is unknown.",
};

function hasCandidateArtifacts(candidateRecord: ExecutionCandidateRecord): boolean {
  return (
    candidateRecord.candidateArtifacts.length > 0 &&
    !candidateRecord.candidateArtifacts.includes("future_execution_candidate_definition")
  );
}

function resolveCandidateReadinessRule(
  candidateRecord: ExecutionCandidateRecord,
): CandidateReadinessRule {
  if (candidateRecord.candidateState === "blocked_candidate") {
    return {
      readinessState: "incomplete",
      readinessScore: 85,
      requirementsMet: candidateRecord.candidateRequirements.filter(
        (requirement) => requirement !== "conversion_baseline" && requirement !== "design_evidence",
      ),
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      candidatePresent: true,
      candidateArtifactsPresent: hasCandidateArtifacts(candidateRecord),
      summary:
        "Execution candidate readiness is incomplete because conversion baseline and design evidence remain missing.",
    };
  }

  if (candidateRecord.candidateState === "candidate_ready_preview" && candidateRecord.readinessScore === 100) {
    return {
      readinessState: "ready",
      readinessScore: 100,
      requirementsMet: [...candidateRecord.candidateRequirements],
      requirementsMissing: [],
      candidatePresent: true,
      candidateArtifactsPresent: hasCandidateArtifacts(candidateRecord),
      summary: "Execution candidate readiness is qualified for preview only; governance still blocks execution.",
    };
  }

  if (candidateRecord.candidateState === "candidate_ready_preview") {
    return {
      readinessState: "nearly_ready",
      readinessScore: 95,
      requirementsMet: candidateRecord.candidateRequirements.filter(
        (requirement) => requirement !== "design_evidence",
      ),
      requirementsMissing: ["design_evidence"],
      candidatePresent: true,
      candidateArtifactsPresent: hasCandidateArtifacts(candidateRecord),
      summary: "Execution candidate readiness is nearly qualified but still requires design evidence.",
    };
  }

  return FALLBACK_CANDIDATE_READINESS_RULE;
}

export function buildExecutionCandidateReadinessRecords(
  candidateRecords: ExecutionCandidateRecord[],
): ExecutionCandidateReadinessRecord[] {
  return candidateRecords.map((candidateRecord) => {
    const rule = resolveCandidateReadinessRule(candidateRecord);
    const blockedReasons = [...new Set([...candidateRecord.blockedReasons, GOVERNANCE_BLOCKED_REASON])];

    return {
      candidateId: candidateRecord.candidateId,
      proposalId: candidateRecord.proposalId,
      proposalTitle: candidateRecord.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      candidatePresent: rule.candidatePresent,
      candidateArtifactsPresent: rule.candidateArtifactsPresent,
      blockedReasons,
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_candidate_readiness_preview_only",
      summary: rule.summary,
    };
  });
}

export const generateTwinExecutionCandidateReadinessRecords =
  buildExecutionCandidateReadinessRecords;

export function hasExecutionCandidateReadinessFallbackApplied(
  records: ExecutionCandidateReadinessRecord[],
): boolean {
  return records.some((record) => record.readinessState === FALLBACK_CANDIDATE_READINESS_RULE.readinessState);
}
