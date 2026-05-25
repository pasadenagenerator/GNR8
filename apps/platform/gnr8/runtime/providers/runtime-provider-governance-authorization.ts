import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifact } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";

export type RuntimeProviderGovernanceAuthorizationStatus =
  | "not_requested"
  | "pending_authorization"
  | "authorized_for_future_execution"
  | "denied";

export type RuntimeProviderGovernanceAuthorizationDiagnosticCode =
  | "GOVERNANCE_AUTHORIZATION_CREATED"
  | "GOVERNANCE_AUTHORIZATION_DENIED"
  | "GOVERNANCE_AUTHORIZATION_INTENT_ONLY"
  | "GOVERNANCE_AUTHORIZATION_FAILED_CLOSED";

export type RuntimeProviderGovernanceAuthorizationArtifact = {
  authorizationId: string;
  handoffId: string;
  correlationKey: string;
  authorizationStatus: RuntimeProviderGovernanceAuthorizationStatus;
  authorizationReason: string;
  intentOnly: true;
  executionBlocked: true;
  createdAt: string;
  diagnostics: RuntimeProviderGovernanceAuthorizationDiagnosticCode[];
};

export type RuntimeProviderGovernanceAuthorizationSummary = {
  authorizationStatus: RuntimeProviderGovernanceAuthorizationStatus;
  authorizationReason: string;
  intentOnly: true;
  executionBlocked: true;
  authorizationCount: number;
  latestAuthorizationId: string;
  latestCreatedAt: string;
};

export type RuntimeProviderGovernanceAuthorizationSummaryResult = {
  summary: RuntimeProviderGovernanceAuthorizationSummary;
  diagnostics: RuntimeProviderGovernanceAuthorizationDiagnosticCode[];
};

type HandoffReference = Pick<RuntimeProviderExecutionHandoffArtifact, "handoffId" | "correlationKey">;

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): RuntimeProviderGovernanceAuthorizationDiagnosticCode[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b)) as RuntimeProviderGovernanceAuthorizationDiagnosticCode[];
}

function sortChronologically(
  artifacts: readonly RuntimeProviderGovernanceAuthorizationArtifact[],
): RuntimeProviderGovernanceAuthorizationArtifact[] {
  return [...artifacts].sort((a, b) => {
    const createdAtCompare = sanitizeToken(a.createdAt).localeCompare(sanitizeToken(b.createdAt));
    if (createdAtCompare !== 0) return createdAtCompare;
    return sanitizeToken(a.authorizationId).localeCompare(sanitizeToken(b.authorizationId));
  });
}

export function buildRuntimeProviderGovernanceAuthorizationSummary(input: {
  artifacts: readonly RuntimeProviderGovernanceAuthorizationArtifact[];
}): RuntimeProviderGovernanceAuthorizationSummaryResult {
  const ordered = sortChronologically(input.artifacts);
  const latest = ordered.at(-1);

  if (!latest) {
    return {
      summary: {
        authorizationStatus: "not_requested",
        authorizationReason: "",
        intentOnly: true,
        executionBlocked: true,
        authorizationCount: 0,
        latestAuthorizationId: "",
        latestCreatedAt: "",
      },
      diagnostics: ["GOVERNANCE_AUTHORIZATION_INTENT_ONLY"],
    };
  }

  return {
    summary: {
      authorizationStatus: latest.authorizationStatus,
      authorizationReason: latest.authorizationReason,
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: ordered.length,
      latestAuthorizationId: latest.authorizationId,
      latestCreatedAt: latest.createdAt,
    },
    diagnostics: uniqueSorted(["GOVERNANCE_AUTHORIZATION_INTENT_ONLY"]),
  };
}

export function createRuntimeProviderGovernanceAuthorization(input: {
  handoffRef: Partial<HandoffReference> | null | undefined;
  authorizationStatus: RuntimeProviderGovernanceAuthorizationStatus;
  authorizationReason?: string;
  createdAt?: string;
}): {
  artifact: RuntimeProviderGovernanceAuthorizationArtifact | null;
  intentOnly: true;
  executionBlocked: true;
  diagnostics: RuntimeProviderGovernanceAuthorizationDiagnosticCode[];
  blockedReasons: string[];
  correlationKey: string;
} {
  const handoffId = sanitizeToken(input.handoffRef?.handoffId);
  const handoffCorrelationKey = sanitizeToken(input.handoffRef?.correlationKey);
  const authorizationReason = sanitizeToken(input.authorizationReason) || "authorization_intent_recorded";
  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();

  if (!handoffId || !handoffCorrelationKey) {
    const failedCorrelationKey = createRuntimeCorrelationKey({
      diagnostic: "GOVERNANCE_AUTHORIZATION_FAILED_CLOSED",
      handoffId,
      handoffCorrelationKey,
      authorizationStatus: input.authorizationStatus,
    });
    return {
      artifact: null,
      intentOnly: true,
      executionBlocked: true,
      diagnostics: ["GOVERNANCE_AUTHORIZATION_FAILED_CLOSED"],
      blockedReasons: ["missing_required_governance_authorization_references"],
      correlationKey: failedCorrelationKey,
    };
  }

  const correlationKey = createRuntimeCorrelationKey({
    handoffId,
    handoffCorrelationKey,
    authorizationStatus: input.authorizationStatus,
    authorizationReason,
    createdAt,
  });

  const authorizationId = createRuntimeCorrelationKey({
    governanceAuthorizationCorrelationKey: correlationKey,
  });

  const artifact: RuntimeProviderGovernanceAuthorizationArtifact = {
    authorizationId,
    handoffId,
    correlationKey,
    authorizationStatus: input.authorizationStatus,
    authorizationReason,
    intentOnly: true,
    executionBlocked: true,
    createdAt,
    diagnostics:
      input.authorizationStatus === "denied"
        ? ["GOVERNANCE_AUTHORIZATION_CREATED", "GOVERNANCE_AUTHORIZATION_DENIED", "GOVERNANCE_AUTHORIZATION_INTENT_ONLY"]
        : ["GOVERNANCE_AUTHORIZATION_CREATED", "GOVERNANCE_AUTHORIZATION_INTENT_ONLY"],
  };

  return {
    artifact,
    intentOnly: true,
    executionBlocked: true,
    diagnostics: artifact.diagnostics,
    blockedReasons: [
      "provider_execution_disabled_control_plane_boundary",
      input.authorizationStatus === "authorized_for_future_execution"
        ? "authorized_for_future_execution_is_intent_only_not_execution_authorization"
        : "governance_authorization_intent_only",
    ].sort((a, b) => a.localeCompare(b)),
    correlationKey,
  };
}
