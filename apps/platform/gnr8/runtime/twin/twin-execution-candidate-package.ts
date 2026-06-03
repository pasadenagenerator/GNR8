import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";

export type ExecutionCandidatePackageState =
  | "package_incomplete"
  | "package_ready"
  | "unknown";

export type ExecutionCandidatePackageGovernanceState =
  "execution_candidate_package_preview_only";

export interface ExecutionCandidatePackageRecord {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  packageState: ExecutionCandidatePackageState;
  readinessState: ExecutionCandidateReadinessRecord["readinessState"];
  readinessScore: number;
  candidateType: string;
  includedComponents: string[];
  missingComponents: string[];
  blockedReasons: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: ExecutionCandidatePackageGovernanceState;
  summary: string;
}

export const TWIN_EXECUTION_CANDIDATE_PACKAGE_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_CANDIDATE_PACKAGE_STARTED",
  COMPLETED: "TWIN_EXECUTION_CANDIDATE_PACKAGE_COMPLETED",
  FALLBACK_APPLIED: "TWIN_EXECUTION_CANDIDATE_PACKAGE_FALLBACK_APPLIED",
} as const;

type CandidatePackageRule = Pick<
  ExecutionCandidatePackageRecord,
  "packageState" | "includedComponents" | "missingComponents" | "summary"
>;

const GOVERNANCE_BLOCKED_REASON = "governance_execution_blocked";

const INCOMPLETE_CANDIDATE_PACKAGE_RULE: CandidatePackageRule = {
  packageState: "package_incomplete",
  includedComponents: [
    "execution_candidate",
    "execution_candidate_readiness",
    "candidate_scope",
    "candidate_artifacts",
  ],
  missingComponents: ["conversion_baseline", "design_evidence"],
  summary:
    "Execution candidate package is incomplete because conversion baseline and design evidence remain missing.",
};

const NEARLY_READY_CANDIDATE_PACKAGE_RULE: CandidatePackageRule = {
  packageState: "package_ready",
  includedComponents: [
    "execution_candidate",
    "execution_candidate_readiness",
    "candidate_scope",
    "candidate_artifacts",
    "candidate_requirements",
  ],
  missingComponents: ["design_evidence"],
  summary:
    "Execution candidate package is assembled for preview, while design evidence and governance still block execution.",
};

const READY_CANDIDATE_PACKAGE_RULE: CandidatePackageRule = {
  packageState: "package_ready",
  includedComponents: [
    "execution_candidate",
    "execution_candidate_readiness",
    "candidate_scope",
    "candidate_artifacts",
    "candidate_requirements",
  ],
  missingComponents: [],
  summary:
    "Execution candidate package is assembled within read-only validation governance.",
};

const FALLBACK_CANDIDATE_PACKAGE_RULE: CandidatePackageRule = {
  packageState: "unknown",
  includedComponents: [],
  missingComponents: ["execution_candidate_package_requirements_unknown"],
  summary:
    "Execution candidate package cannot be assembled because candidate readiness evidence is unknown.",
};

function resolveCandidatePackageRule(
  readinessRecord: ExecutionCandidateReadinessRecord | undefined,
): CandidatePackageRule {
  if (!readinessRecord) return FALLBACK_CANDIDATE_PACKAGE_RULE;
  if (readinessRecord.readinessState === "incomplete") return INCOMPLETE_CANDIDATE_PACKAGE_RULE;
  if (readinessRecord.readinessState === "nearly_ready") return NEARLY_READY_CANDIDATE_PACKAGE_RULE;
  if (readinessRecord.readinessState === "ready") return READY_CANDIDATE_PACKAGE_RULE;
  return FALLBACK_CANDIDATE_PACKAGE_RULE;
}

export function buildExecutionCandidatePackageRecords(
  candidateRecords: ExecutionCandidateRecord[],
  candidateReadinessRecords: ExecutionCandidateReadinessRecord[],
): ExecutionCandidatePackageRecord[] {
  const readinessByCandidateId = new Map(
    candidateReadinessRecords.map((readinessRecord) => [
      readinessRecord.candidateId,
      readinessRecord,
    ]),
  );

  return candidateRecords.map((candidateRecord) => {
    const readinessRecord = readinessByCandidateId.get(candidateRecord.candidateId);
    const rule = resolveCandidatePackageRule(readinessRecord);
    const isFallback = rule === FALLBACK_CANDIDATE_PACKAGE_RULE;
    const blockedReasons = [
      ...new Set([
        ...candidateRecord.blockedReasons,
        ...(readinessRecord?.blockedReasons ?? []),
        GOVERNANCE_BLOCKED_REASON,
      ]),
    ];

    return {
      candidateId: candidateRecord.candidateId,
      proposalId: candidateRecord.proposalId,
      proposalTitle: candidateRecord.proposalTitle,
      packageState: rule.packageState,
      readinessState: isFallback ? "unknown" : readinessRecord?.readinessState ?? "unknown",
      readinessScore: isFallback ? 0 : readinessRecord?.readinessScore ?? 0,
      candidateType: candidateRecord.candidateType,
      includedComponents: [...rule.includedComponents],
      missingComponents: [...rule.missingComponents],
      blockedReasons,
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_candidate_package_preview_only",
      summary: rule.summary,
    };
  });
}

export const generateTwinExecutionCandidatePackageRecords =
  buildExecutionCandidatePackageRecords;

export function hasExecutionCandidatePackageFallbackApplied(
  records: ExecutionCandidatePackageRecord[],
): boolean {
  return records.some((record) => record.packageState === FALLBACK_CANDIDATE_PACKAGE_RULE.packageState);
}
