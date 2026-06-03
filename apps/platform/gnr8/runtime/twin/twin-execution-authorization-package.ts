import type { TwinExecutionAuthorizationPreviewRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-preview";
import type { TwinExecutionAuthorizationReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-readiness";

export type TwinExecutionAuthorizationPackageState =
  | "package_incomplete"
  | "package_ready";

export interface TwinExecutionAuthorizationPackageRecord {
  proposalId: string;
  proposalTitle: string;

  packageState: TwinExecutionAuthorizationPackageState;

  readinessState: string;
  readinessScore: number;

  authorizationType: string;

  includedComponents: string[];
  missingComponents: string[];

  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;

  governanceState: "execution_authorization_package_preview_only";

  summary: string;
}

export const TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED",
  COMPLETED: "TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED",
} as const;

type AuthorizationPackageRule = Pick<
  TwinExecutionAuthorizationPackageRecord,
  "packageState" | "includedComponents" | "missingComponents" | "summary"
>;

const AUTHORIZATION_PACKAGE_INCOMPLETE_RULE: AuthorizationPackageRule = {
  packageState: "package_incomplete",
  includedComponents: ["authorization_preview", "authorization_readiness"],
  missingComponents: ["conversion_baseline", "design_evidence"],
  summary:
    "Execution authorization package is incomplete because required authorization evidence is unavailable.",
};

const AUTHORIZATION_PACKAGE_NEARLY_READY_RULE: AuthorizationPackageRule = {
  packageState: "package_ready",
  includedComponents: [
    "authorization_preview",
    "authorization_readiness",
    "authorization_requirements",
  ],
  missingComponents: ["design_evidence"],
  summary:
    "Execution authorization package is structurally ready for future authorization planning but remains governance blocked.",
};

const AUTHORIZATION_PACKAGE_READY_RULE: AuthorizationPackageRule = {
  packageState: "package_ready",
  includedComponents: [
    "authorization_preview",
    "authorization_readiness",
    "authorization_requirements",
  ],
  missingComponents: [],
  summary:
    "Execution authorization package is complete within current governance validation boundaries.",
};

const FALLBACK_AUTHORIZATION_PACKAGE_RULE: AuthorizationPackageRule = {
  packageState: "package_incomplete",
  includedComponents: [],
  missingComponents: ["authorization_package_unavailable"],
  summary: "Execution authorization package could not be generated.",
};

function resolveAuthorizationPackageRule(input: {
  authorizationPreview: TwinExecutionAuthorizationPreviewRecord;
  authorizationReadiness: TwinExecutionAuthorizationReadinessRecord | undefined;
}): AuthorizationPackageRule {
  if (input.authorizationPreview.authorizationPreviewState === "authorization_preview_incomplete") {
    return AUTHORIZATION_PACKAGE_INCOMPLETE_RULE;
  }
  if (input.authorizationReadiness?.readinessState === "nearly_ready") {
    return AUTHORIZATION_PACKAGE_NEARLY_READY_RULE;
  }
  if (input.authorizationReadiness?.readinessState === "ready") {
    return AUTHORIZATION_PACKAGE_READY_RULE;
  }
  return FALLBACK_AUTHORIZATION_PACKAGE_RULE;
}

export function generateTwinExecutionAuthorizationPackageRecords(
  authorizationPreviews: TwinExecutionAuthorizationPreviewRecord[],
  authorizationReadinessRecords: TwinExecutionAuthorizationReadinessRecord[],
): TwinExecutionAuthorizationPackageRecord[] {
  const authorizationReadinessByProposalId = new Map(
    authorizationReadinessRecords.map((authorizationReadiness) => [
      authorizationReadiness.proposalId,
      authorizationReadiness,
    ]),
  );

  return authorizationPreviews.map((authorizationPreview) => {
    const authorizationReadiness = authorizationReadinessByProposalId.get(
      authorizationPreview.proposalId,
    );
    const rule = resolveAuthorizationPackageRule({
      authorizationPreview,
      authorizationReadiness,
    });
    const isFallback = rule === FALLBACK_AUTHORIZATION_PACKAGE_RULE;

    return {
      proposalId: authorizationPreview.proposalId,
      proposalTitle: authorizationPreview.proposalTitle,
      packageState: rule.packageState,
      readinessState: isFallback ? "unknown" : authorizationReadiness?.readinessState ?? "unknown",
      readinessScore: isFallback ? 0 : authorizationReadiness?.readinessScore ?? 0,
      authorizationType: authorizationPreview.authorizationType,
      includedComponents: [...rule.includedComponents],
      missingComponents: [...rule.missingComponents],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_authorization_package_preview_only",
      summary: rule.summary,
    };
  });
}
