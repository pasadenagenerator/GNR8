import type {
  RuntimeProviderGovernanceAuthorizationArtifact,
  RuntimeProviderGovernanceAuthorizationDiagnosticCode,
  RuntimeProviderGovernanceAuthorizationStatus,
} from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";

export type RuntimeProviderGovernanceAuthorizationArtifactRecord = RuntimeProviderGovernanceAuthorizationArtifact;

export type RuntimeProviderGovernanceAuthorizationArtifactRow = {
  authorization_id: string;
  handoff_id: string;
  correlation_key: string;
  authorization_status: RuntimeProviderGovernanceAuthorizationStatus;
  authorization_reason: string;
  intent_only: boolean;
  execution_blocked: boolean;
  diagnostics: RuntimeProviderGovernanceAuthorizationDiagnosticCode[];
  created_at: string;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function mapGovernanceAuthorizationArtifactToRow(
  artifact: RuntimeProviderGovernanceAuthorizationArtifactRecord,
): RuntimeProviderGovernanceAuthorizationArtifactRow {
  return {
    authorization_id: artifact.authorizationId,
    handoff_id: artifact.handoffId,
    correlation_key: artifact.correlationKey,
    authorization_status: artifact.authorizationStatus,
    authorization_reason: artifact.authorizationReason,
    intent_only: true,
    execution_blocked: true,
    diagnostics: uniqueSorted(artifact.diagnostics) as RuntimeProviderGovernanceAuthorizationDiagnosticCode[],
    created_at: artifact.createdAt,
  };
}

export function mapGovernanceAuthorizationArtifactRow(
  row: RuntimeProviderGovernanceAuthorizationArtifactRow,
): RuntimeProviderGovernanceAuthorizationArtifactRecord {
  return {
    authorizationId: String(row.authorization_id),
    handoffId: String(row.handoff_id),
    correlationKey: String(row.correlation_key),
    authorizationStatus: row.authorization_status,
    authorizationReason: String(row.authorization_reason),
    intentOnly: true,
    executionBlocked: true,
    diagnostics: uniqueSorted(Array.isArray(row.diagnostics) ? row.diagnostics : []) as RuntimeProviderGovernanceAuthorizationDiagnosticCode[],
    createdAt: String(row.created_at),
  };
}

export function createGovernanceAuthorizationInsertRows(
  artifacts: readonly RuntimeProviderGovernanceAuthorizationArtifactRecord[],
): RuntimeProviderGovernanceAuthorizationArtifactRow[] {
  return [...artifacts]
    .map(mapGovernanceAuthorizationArtifactToRow)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.authorization_id.localeCompare(b.authorization_id));
}
