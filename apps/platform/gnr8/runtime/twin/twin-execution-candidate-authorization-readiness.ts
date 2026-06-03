import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidateAuthorizationRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-authorization";
import type { ExecutionCandidatePackageRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-package";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";

export type ExecutionCandidateAuthorizationReadinessState =
  | "incomplete"
  | "nearly_ready"
  | "ready";

export type ExecutionCandidateAuthorizationReadinessGovernanceState =
  "execution_candidate_authorization_readiness_preview_only";

export interface ExecutionCandidateAuthorizationReadinessRecord {
  proposalId: string;
  readinessState: ExecutionCandidateAuthorizationReadinessState;
  readinessScore: number;
  authorizationPresent: boolean;
  authorizationRequirementsPresent: boolean;
  requirementsMet: string[];
  requirementsMissing: string[];
  blockedReasons: string[];
  governanceState: ExecutionCandidateAuthorizationReadinessGovernanceState;
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  summary: string;
}

export const TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS = {
  CREATED: "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_CREATED",
  INCOMPLETE: "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_INCOMPLETE",
  NEARLY_READY: "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_NEARLY_READY",
  READY: "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_READY",
} as const;

type CandidateAuthorizationReadinessRule = Pick<
  ExecutionCandidateAuthorizationReadinessRecord,
  | "readinessState"
  | "readinessScore"
  | "requirementsMet"
  | "requirementsMissing"
  | "blockedReasons"
  | "authorizationRequirementsPresent"
  | "summary"
>;

const GOVERNANCE_BLOCKED_REASON = "governance_execution_blocked";

const CANDIDATE_AUTHORIZATION_READINESS_RULES_BY_TYPE = new Map<string, CandidateAuthorizationReadinessRule>([
  [
    "conversion_flow_execution_candidate",
    {
      readinessState: "incomplete",
      readinessScore: 85,
      authorizationRequirementsPresent: true,
      requirementsMet: [
        "candidate_authorization_present",
        "candidate_authorization_scope_defined",
      ],
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      blockedReasons: [
        "missing_conversion_baseline",
        "missing_design_evidence",
        GOVERNANCE_BLOCKED_REASON,
      ],
      summary:
        "Candidate authorization readiness is incomplete because conversion baseline and design evidence remain unavailable for preview review planning.",
    },
  ],
  [
    "homepage_messaging_execution_candidate",
    {
      readinessState: "nearly_ready",
      readinessScore: 95,
      authorizationRequirementsPresent: true,
      requirementsMet: [
        "candidate_authorization_present",
        "candidate_authorization_scope_defined",
        "candidate_authorization_package_available",
      ],
      requirementsMissing: ["design_evidence"],
      blockedReasons: ["missing_design_evidence", GOVERNANCE_BLOCKED_REASON],
      summary:
        "Candidate authorization readiness is nearly complete, with design evidence still required before future authorization review planning.",
    },
  ],
  [
    "validation_runtime_execution_candidate",
    {
      readinessState: "ready",
      readinessScore: 100,
      authorizationRequirementsPresent: true,
      requirementsMet: [
        "candidate_authorization_present",
        "governance_boundary_present",
        "validation_runtime_active",
      ],
      requirementsMissing: [],
      blockedReasons: [GOVERNANCE_BLOCKED_REASON],
      summary:
        "Candidate authorization readiness is complete for read-only validation governance review planning.",
    },
  ],
]);

const FALLBACK_CANDIDATE_AUTHORIZATION_READINESS_RULE: CandidateAuthorizationReadinessRule = {
  readinessState: "incomplete",
  readinessScore: 0,
  authorizationRequirementsPresent: false,
  requirementsMet: [],
  requirementsMissing: ["candidate_authorization_readiness_requirements_unknown"],
  blockedReasons: [
    "candidate_authorization_readiness_requirements_unknown",
    GOVERNANCE_BLOCKED_REASON,
  ],
  summary:
    "Candidate authorization readiness cannot be evaluated because read-only candidate authorization evidence is incomplete.",
};

function resolveCandidateAuthorizationReadinessRule(input: {
  candidateRecord: ExecutionCandidateRecord | undefined;
  readinessRecord: ExecutionCandidateReadinessRecord | undefined;
  packageRecord: ExecutionCandidatePackageRecord | undefined;
}): CandidateAuthorizationReadinessRule {
  if (!input.candidateRecord || !input.readinessRecord || !input.packageRecord) {
    return FALLBACK_CANDIDATE_AUTHORIZATION_READINESS_RULE;
  }
  const rule = CANDIDATE_AUTHORIZATION_READINESS_RULES_BY_TYPE.get(input.candidateRecord.candidateType);
  if (!rule) return FALLBACK_CANDIDATE_AUTHORIZATION_READINESS_RULE;
  return rule;
}

export function buildExecutionCandidateAuthorizationReadinessRecords(
  executionCandidateAuthorizationRecords: ExecutionCandidateAuthorizationRecord[],
  executionCandidateRecords: ExecutionCandidateRecord[],
  executionCandidateReadinessRecords: ExecutionCandidateReadinessRecord[],
  executionCandidatePackageRecords: ExecutionCandidatePackageRecord[],
): ExecutionCandidateAuthorizationReadinessRecord[] {
  const candidateByProposalId = new Map(
    executionCandidateRecords.map((candidateRecord) => [
      candidateRecord.proposalId,
      candidateRecord,
    ]),
  );
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

  return executionCandidateAuthorizationRecords.map((authorizationRecord) => {
    const candidateRecord = candidateByProposalId.get(authorizationRecord.proposalId);
    const readinessRecord = readinessByProposalId.get(authorizationRecord.proposalId);
    const packageRecord = packageByProposalId.get(authorizationRecord.proposalId);
    const rule = resolveCandidateAuthorizationReadinessRule({
      candidateRecord,
      readinessRecord,
      packageRecord,
    });

    return {
      proposalId: authorizationRecord.proposalId,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      authorizationPresent: true,
      authorizationRequirementsPresent: rule.authorizationRequirementsPresent,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      blockedReasons: [...rule.blockedReasons],
      governanceState: "execution_candidate_authorization_readiness_preview_only",
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      summary: rule.summary,
    };
  });
}

export const generateTwinExecutionCandidateAuthorizationReadinessRecords =
  buildExecutionCandidateAuthorizationReadinessRecords;

export function getExecutionCandidateAuthorizationReadinessDiagnostics(
  records: ExecutionCandidateAuthorizationReadinessRecord[],
): string[] {
  const diagnostics: string[] = [
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.CREATED,
  ];
  if (records.some((record) => record.readinessState === "incomplete")) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.INCOMPLETE);
  }
  if (records.some((record) => record.readinessState === "nearly_ready")) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.NEARLY_READY);
  }
  if (records.some((record) => record.readinessState === "ready")) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.READY);
  }
  return diagnostics;
}
