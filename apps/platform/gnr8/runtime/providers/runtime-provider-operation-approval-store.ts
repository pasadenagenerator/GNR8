import type { RuntimeProviderOperationApprovalArtifact } from "@/gnr8/runtime/providers/runtime-provider-operation-approval-artifact";

export type RuntimeProviderOperationApprovalArtifactRecord = RuntimeProviderOperationApprovalArtifact & {
  createdAt: string;
  updatedAt: string;
};

export type RuntimeProviderOperationApprovalArtifactRow = {
  id: string;
  artifact_id: string;
  site_id: string;
  site_version_id: string | null;
  provider_id: RuntimeProviderOperationApprovalArtifact["providerId"];
  environment: RuntimeProviderOperationApprovalArtifact["environment"];
  capability: RuntimeProviderOperationApprovalArtifact["capability"];
  operation_kind: RuntimeProviderOperationApprovalArtifact["operationKind"];
  approval_status: RuntimeProviderOperationApprovalArtifact["approvalStatus"];
  risk_level: RuntimeProviderOperationApprovalArtifact["riskLevel"];
  required_approvals: string[];
  reviewer_checklist: string[];
  warnings: string[];
  blockers: string[];
  correlation_key: string;
  created_at: string;
  updated_at: string;
};

export function mapApprovalArtifactToRow(
  artifact: RuntimeProviderOperationApprovalArtifactRecord,
): RuntimeProviderOperationApprovalArtifactRow {
  return {
    id: artifact.artifactId,
    artifact_id: artifact.artifactId,
    site_id: artifact.siteId,
    site_version_id: artifact.siteVersionId ?? null,
    provider_id: artifact.providerId,
    environment: artifact.environment,
    capability: artifact.capability,
    operation_kind: artifact.operationKind,
    approval_status: artifact.approvalStatus,
    risk_level: artifact.riskLevel,
    required_approvals: artifact.requiredApprovals,
    reviewer_checklist: artifact.reviewerChecklist,
    warnings: artifact.warnings,
    blockers: artifact.blockers,
    correlation_key: artifact.correlationKey,
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  };
}

export function mapApprovalArtifactRow(
  row: RuntimeProviderOperationApprovalArtifactRow,
): RuntimeProviderOperationApprovalArtifactRecord {
  return {
    artifactId: row.artifact_id,
    siteId: row.site_id,
    siteVersionId: row.site_version_id ?? undefined,
    providerId: row.provider_id,
    environment: row.environment,
    capability: row.capability,
    operationKind: row.operation_kind,
    bundleStatus: "ready_for_manual",
    approvalStatus: row.approval_status,
    requiredApprovals: row.required_approvals,
    summary: [
      `provider=${row.provider_id}`,
      `environment=${row.environment}`,
      `operation=${row.operation_kind}`,
      `approval=${row.approval_status}`,
      `risk=${row.risk_level}`,
    ].join("; "),
    riskLevel: row.risk_level,
    reviewerChecklist: row.reviewer_checklist,
    warnings: row.warnings,
    blockers: row.blockers,
    correlationKey: row.correlation_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createApprovalInsertRows(
  artifacts: readonly RuntimeProviderOperationApprovalArtifactRecord[],
): RuntimeProviderOperationApprovalArtifactRow[] {
  return [...artifacts]
    .map(mapApprovalArtifactToRow)
    .sort((a, b) => a.correlation_key.localeCompare(b.correlation_key) || a.id.localeCompare(b.id));
}
