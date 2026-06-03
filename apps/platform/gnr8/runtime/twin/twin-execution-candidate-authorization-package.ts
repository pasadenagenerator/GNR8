import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidateAuthorizationRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-authorization";
import type { ExecutionCandidateAuthorizationReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-authorization-readiness";
import type { ExecutionCandidatePackageRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-package";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";

export type ExecutionCandidateAuthorizationPackageState =
  | "package_incomplete"
  | "package_ready";

export type ExecutionCandidateAuthorizationPackageGovernanceState =
  "execution_candidate_authorization_package_preview_only";

export interface ExecutionCandidateAuthorizationPackageRecord {
  proposalId: string;
  packageState: ExecutionCandidateAuthorizationPackageState;
  readinessState: "incomplete" | "nearly_ready" | "ready";
  readinessScore: number;
  authorizationType: string;
  includedComponents: string[];
  missingComponents: string[];
  blockedReasons: string[];
  governanceState: ExecutionCandidateAuthorizationPackageGovernanceState;
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  summary: string;
}

export const TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS = {
  CREATED: "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_CREATED",
  INCOMPLETE: "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_INCOMPLETE",
  READY: "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_READY",
} as const;

type CandidateAuthorizationPackageRule = Pick<
  ExecutionCandidateAuthorizationPackageRecord,
  "packageState" | "includedComponents" | "missingComponents" | "blockedReasons" | "summary"
>;

const GOVERNANCE_BLOCKED_REASON = "governance_execution_blocked";

const CANDIDATE_AUTHORIZATION_PACKAGE_RULES_BY_TYPE = new Map<string, CandidateAuthorizationPackageRule>([
  [
    "conversion_flow_execution_candidate",
    {
      packageState: "package_incomplete",
      includedComponents: [
        "candidate_authorization",
        "candidate_authorization_readiness",
        "authorization_scope",
        "authorization_requirements",
      ],
      missingComponents: ["conversion_baseline", "design_evidence"],
      blockedReasons: [
        "missing_conversion_baseline",
        "missing_design_evidence",
        GOVERNANCE_BLOCKED_REASON,
      ],
      summary:
        "Candidate authorization package is incomplete because conversion baseline and design evidence remain unavailable for read-only governance inspection.",
    },
  ],
  [
    "homepage_messaging_execution_candidate",
    {
      packageState: "package_ready",
      includedComponents: [
        "candidate_authorization",
        "candidate_authorization_readiness",
        "authorization_scope",
        "authorization_requirements",
        "authorization_package",
      ],
      missingComponents: ["design_evidence"],
      blockedReasons: ["missing_design_evidence", GOVERNANCE_BLOCKED_REASON],
      summary:
        "Candidate authorization package is assembled for read-only preview, while design evidence and governance continue to block execution.",
    },
  ],
  [
    "validation_runtime_execution_candidate",
    {
      packageState: "package_ready",
      includedComponents: [
        "candidate_authorization",
        "candidate_authorization_readiness",
        "authorization_scope",
        "authorization_requirements",
        "authorization_package",
      ],
      missingComponents: [],
      blockedReasons: [GOVERNANCE_BLOCKED_REASON],
      summary:
        "Candidate authorization package is assembled inside read-only validation governance with execution still blocked.",
    },
  ],
]);

const FALLBACK_CANDIDATE_AUTHORIZATION_PACKAGE_RULE: CandidateAuthorizationPackageRule = {
  packageState: "package_incomplete",
  includedComponents: [],
  missingComponents: ["candidate_authorization_package_requirements_unknown"],
  blockedReasons: ["candidate_authorization_package_requirements_unknown", GOVERNANCE_BLOCKED_REASON],
  summary:
    "Candidate authorization package cannot be assembled because read-only authorization evidence is incomplete.",
};

function resolveCandidateAuthorizationPackageRule(input: {
  authorizationRecord: ExecutionCandidateAuthorizationRecord;
  authorizationReadinessRecord: ExecutionCandidateAuthorizationReadinessRecord | undefined;
  candidateRecord: ExecutionCandidateRecord | undefined;
  candidateReadinessRecord: ExecutionCandidateReadinessRecord | undefined;
  candidatePackageRecord: ExecutionCandidatePackageRecord | undefined;
}): CandidateAuthorizationPackageRule {
  if (
    !input.authorizationReadinessRecord ||
    !input.candidateRecord ||
    !input.candidateReadinessRecord ||
    !input.candidatePackageRecord
  ) {
    return FALLBACK_CANDIDATE_AUTHORIZATION_PACKAGE_RULE;
  }

  const rule = CANDIDATE_AUTHORIZATION_PACKAGE_RULES_BY_TYPE.get(input.candidateRecord.candidateType);
  return rule ?? FALLBACK_CANDIDATE_AUTHORIZATION_PACKAGE_RULE;
}

function toPackageReadinessState(
  authorizationReadinessRecord: ExecutionCandidateAuthorizationReadinessRecord | undefined,
): ExecutionCandidateAuthorizationPackageRecord["readinessState"] {
  if (
    authorizationReadinessRecord?.readinessState === "incomplete" ||
    authorizationReadinessRecord?.readinessState === "nearly_ready" ||
    authorizationReadinessRecord?.readinessState === "ready"
  ) {
    return authorizationReadinessRecord.readinessState;
  }
  return "incomplete";
}

export function buildExecutionCandidateAuthorizationPackageRecords(
  executionCandidateAuthorizationRecords: ExecutionCandidateAuthorizationRecord[],
  executionCandidateAuthorizationReadinessRecords: ExecutionCandidateAuthorizationReadinessRecord[],
  executionCandidateRecords: ExecutionCandidateRecord[],
  executionCandidateReadinessRecords: ExecutionCandidateReadinessRecord[],
  executionCandidatePackageRecords: ExecutionCandidatePackageRecord[],
): ExecutionCandidateAuthorizationPackageRecord[] {
  const authorizationReadinessByProposalId = new Map(
    executionCandidateAuthorizationReadinessRecords.map((readinessRecord) => [
      readinessRecord.proposalId,
      readinessRecord,
    ]),
  );
  const candidateByProposalId = new Map(
    executionCandidateRecords.map((candidateRecord) => [
      candidateRecord.proposalId,
      candidateRecord,
    ]),
  );
  const candidateReadinessByProposalId = new Map(
    executionCandidateReadinessRecords.map((readinessRecord) => [
      readinessRecord.proposalId,
      readinessRecord,
    ]),
  );
  const candidatePackageByProposalId = new Map(
    executionCandidatePackageRecords.map((packageRecord) => [
      packageRecord.proposalId,
      packageRecord,
    ]),
  );

  return executionCandidateAuthorizationRecords.map((authorizationRecord) => {
    const authorizationReadinessRecord = authorizationReadinessByProposalId.get(authorizationRecord.proposalId);
    const candidateRecord = candidateByProposalId.get(authorizationRecord.proposalId);
    const candidateReadinessRecord = candidateReadinessByProposalId.get(authorizationRecord.proposalId);
    const candidatePackageRecord = candidatePackageByProposalId.get(authorizationRecord.proposalId);
    const rule = resolveCandidateAuthorizationPackageRule({
      authorizationRecord,
      authorizationReadinessRecord,
      candidateRecord,
      candidateReadinessRecord,
      candidatePackageRecord,
    });

    return {
      proposalId: authorizationRecord.proposalId,
      packageState: rule.packageState,
      readinessState: toPackageReadinessState(authorizationReadinessRecord),
      readinessScore: authorizationReadinessRecord?.readinessScore ?? 0,
      authorizationType: authorizationRecord.authorizationType,
      includedComponents: [...rule.includedComponents],
      missingComponents: [...rule.missingComponents],
      blockedReasons: [...rule.blockedReasons],
      governanceState: "execution_candidate_authorization_package_preview_only",
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      summary: rule.summary,
    };
  });
}

export const generateTwinExecutionCandidateAuthorizationPackageRecords =
  buildExecutionCandidateAuthorizationPackageRecords;

export function getExecutionCandidateAuthorizationPackageDiagnostics(
  records: ExecutionCandidateAuthorizationPackageRecord[],
): string[] {
  const diagnostics: string[] = [
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS.CREATED,
  ];
  if (records.some((record) => record.packageState === "package_incomplete")) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS.INCOMPLETE);
  }
  if (records.some((record) => record.packageState === "package_ready")) {
    diagnostics.push(TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS.READY);
  }
  return diagnostics;
}
