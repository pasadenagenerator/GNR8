import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidatePackageRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-package";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";

export type ExecutionCandidateAuthorizationState =
  | "authorization_blocked"
  | "authorization_ready_preview";

export type ExecutionCandidateAuthorizationGovernanceState =
  "execution_candidate_authorization_preview_only";

export interface ExecutionCandidateAuthorizationRecord {
  proposalId: string;
  proposalTitle: string;
  authorizationState: ExecutionCandidateAuthorizationState;
  readinessState: "incomplete" | "nearly_ready" | "ready";
  readinessScore: number;
  authorizationType: string;
  requiredAuthorizations: string[];
  blockedReasons: string[];
  governanceState: ExecutionCandidateAuthorizationGovernanceState;
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  summary: string;
}

export const TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS = {
  CREATED: "EXECUTION_CANDIDATE_AUTHORIZATION_CREATED",
  BLOCKED: "EXECUTION_CANDIDATE_AUTHORIZATION_BLOCKED",
  READY: "EXECUTION_CANDIDATE_AUTHORIZATION_READY",
} as const;

type CandidateAuthorizationRule = Pick<
  ExecutionCandidateAuthorizationRecord,
  "authorizationState" | "authorizationType" | "requiredAuthorizations" | "blockedReasons" | "summary"
>;

const GOVERNANCE_BLOCKED_REASON = "governance_execution_blocked";

const CANDIDATE_AUTHORIZATION_RULES_BY_TYPE = new Map<string, CandidateAuthorizationRule>([
  [
    "conversion_flow_execution_candidate",
    {
      authorizationState: "authorization_blocked",
      authorizationType: "conversion_candidate_authorization",
      requiredAuthorizations: [
        "operator_review",
        "conversion_baseline_review",
        "design_review",
      ],
      blockedReasons: [
        "missing_conversion_baseline",
        "missing_design_evidence",
        GOVERNANCE_BLOCKED_REASON,
      ],
      summary:
        "Execution candidate authorization is blocked until operator, conversion baseline, and design review requirements can be inspected in preview.",
    },
  ],
  [
    "homepage_messaging_execution_candidate",
    {
      authorizationState: "authorization_ready_preview",
      authorizationType: "content_candidate_authorization",
      requiredAuthorizations: ["operator_review", "design_review"],
      blockedReasons: ["missing_design_evidence", GOVERNANCE_BLOCKED_REASON],
      summary:
        "Execution candidate authorization is ready for preview inspection, while design evidence and governance continue to block execution.",
    },
  ],
  [
    "validation_runtime_execution_candidate",
    {
      authorizationState: "authorization_ready_preview",
      authorizationType: "governance_candidate_authorization",
      requiredAuthorizations: ["operator_review"],
      blockedReasons: [GOVERNANCE_BLOCKED_REASON],
      summary:
        "Execution candidate authorization is ready for preview inspection inside read-only validation governance.",
    },
  ],
]);

const FALLBACK_CANDIDATE_AUTHORIZATION_RULE: CandidateAuthorizationRule = {
  authorizationState: "authorization_blocked",
  authorizationType: "unknown_candidate_authorization",
  requiredAuthorizations: ["operator_review"],
  blockedReasons: ["execution_candidate_authorization_requirements_unknown", GOVERNANCE_BLOCKED_REASON],
  summary:
    "Execution candidate authorization cannot be evaluated because candidate authorization evidence is unknown.",
};

function toAuthorizationReadinessState(
  readinessRecord: ExecutionCandidateReadinessRecord | undefined,
): ExecutionCandidateAuthorizationRecord["readinessState"] {
  if (
    readinessRecord?.readinessState === "incomplete" ||
    readinessRecord?.readinessState === "nearly_ready" ||
    readinessRecord?.readinessState === "ready"
  ) {
    return readinessRecord.readinessState;
  }
  return "incomplete";
}

function resolveCandidateAuthorizationRule(
  candidateRecord: ExecutionCandidateRecord,
  readinessRecord: ExecutionCandidateReadinessRecord | undefined,
  packageRecord: ExecutionCandidatePackageRecord | undefined,
): CandidateAuthorizationRule {
  const rule = CANDIDATE_AUTHORIZATION_RULES_BY_TYPE.get(candidateRecord.candidateType);
  if (!rule || !readinessRecord || !packageRecord) return FALLBACK_CANDIDATE_AUTHORIZATION_RULE;
  return rule;
}

export function buildExecutionCandidateAuthorizationRecords(
  executionCandidateRecords: ExecutionCandidateRecord[],
  executionCandidateReadinessRecords: ExecutionCandidateReadinessRecord[],
  executionCandidatePackageRecords: ExecutionCandidatePackageRecord[],
): ExecutionCandidateAuthorizationRecord[] {
  const readinessByProposalId = new Map(
    executionCandidateReadinessRecords.map((readinessRecord) => [
      readinessRecord.proposalId,
      readinessRecord,
    ]),
  );
  const packageByProposalId = new Map(
    executionCandidatePackageRecords.map((packageRecord) => [
      packageRecord.proposalId,
      packageRecord,
    ]),
  );

  return executionCandidateRecords.map((candidateRecord) => {
    const readinessRecord = readinessByProposalId.get(candidateRecord.proposalId);
    const packageRecord = packageByProposalId.get(candidateRecord.proposalId);
    const rule = resolveCandidateAuthorizationRule(candidateRecord, readinessRecord, packageRecord);

    return {
      proposalId: candidateRecord.proposalId,
      proposalTitle: candidateRecord.proposalTitle,
      authorizationState: rule.authorizationState,
      readinessState: toAuthorizationReadinessState(readinessRecord),
      readinessScore: readinessRecord?.readinessScore ?? 0,
      authorizationType: rule.authorizationType,
      requiredAuthorizations: [...rule.requiredAuthorizations],
      blockedReasons: [...rule.blockedReasons],
      governanceState: "execution_candidate_authorization_preview_only",
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      summary: rule.summary,
    };
  });
}

export const generateTwinExecutionCandidateAuthorizationRecords =
  buildExecutionCandidateAuthorizationRecords;

export function getExecutionCandidateAuthorizationDiagnostics(
  records: ExecutionCandidateAuthorizationRecord[],
): string[] {
  const diagnostics: string[] = [TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS.CREATED];
  if (records.some((record) => record.blockedReasons.includes(GOVERNANCE_BLOCKED_REASON))) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS.BLOCKED);
  }
  if (records.some((record) => record.authorizationState === "authorization_ready_preview")) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS.READY);
  }
  return diagnostics;
}
