import type { RuntimeProviderExecutionHandoffArtifact } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";

export type RuntimeProviderExecutionHandoffArtifactRecord = RuntimeProviderExecutionHandoffArtifact & {
  createdAt: string;
  updatedAt: string;
};

export type RuntimeProviderExecutionHandoffArtifactRow = {
  id: string;
  handoff_id: string;
  artifact_id: string;
  site_id: string;
  site_version_id: string | null;
  provider_id: RuntimeProviderExecutionHandoffArtifact["providerId"];
  environment: RuntimeProviderExecutionHandoffArtifact["environment"];
  capability: RuntimeProviderExecutionHandoffArtifact["capability"];
  operation_kind: RuntimeProviderExecutionHandoffArtifact["operationKind"];
  approval_status: RuntimeProviderExecutionHandoffArtifact["approvalStatus"];
  risk_level: RuntimeProviderExecutionHandoffArtifact["riskLevel"];
  handoff_status: RuntimeProviderExecutionHandoffArtifact["handoffStatus"];
  planned_job_ids: string[];
  warnings: string[];
  blockers: string[];
  correlation_key: string;
  created_at: string;
  updated_at: string;
};

export function mapExecutionHandoffArtifactToRow(
  artifact: RuntimeProviderExecutionHandoffArtifactRecord,
): RuntimeProviderExecutionHandoffArtifactRow {
  return {
    id: artifact.handoffId,
    handoff_id: artifact.handoffId,
    artifact_id: artifact.artifactId,
    site_id: artifact.siteId,
    site_version_id: artifact.siteVersionId ?? null,
    provider_id: artifact.providerId,
    environment: artifact.environment,
    capability: artifact.capability,
    operation_kind: artifact.operationKind,
    approval_status: artifact.approvalStatus,
    risk_level: artifact.riskLevel,
    handoff_status: artifact.handoffStatus,
    planned_job_ids: artifact.plannedJobIds,
    warnings: artifact.warnings,
    blockers: artifact.blockers,
    correlation_key: artifact.correlationKey,
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  };
}

export function mapExecutionHandoffArtifactRow(
  row: RuntimeProviderExecutionHandoffArtifactRow,
): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: row.handoff_id,
    artifactId: row.artifact_id,
    siteId: row.site_id,
    siteVersionId: row.site_version_id ?? undefined,
    providerId: row.provider_id,
    environment: row.environment,
    capability: row.capability,
    operationKind: row.operation_kind,
    approvalStatus: row.approval_status,
    riskLevel: row.risk_level,
    handoffStatus: row.handoff_status,
    plannedJobIds: row.planned_job_ids,
    warnings: row.warnings,
    blockers: row.blockers,
    correlationKey: row.correlation_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createExecutionHandoffInsertRows(
  artifacts: readonly RuntimeProviderExecutionHandoffArtifactRecord[],
): RuntimeProviderExecutionHandoffArtifactRow[] {
  return [...artifacts]
    .map(mapExecutionHandoffArtifactToRow)
    .sort((a, b) => a.correlation_key.localeCompare(b.correlation_key) || a.id.localeCompare(b.id));
}
