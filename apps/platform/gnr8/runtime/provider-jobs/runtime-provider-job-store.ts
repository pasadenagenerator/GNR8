import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";

export type RuntimeProviderJobRow = {
  id: string;
  site_id: string;
  site_version_id: string | null;
  provider_id: string;
  environment: RuntimeProviderJob["environment"];
  operation_kind: RuntimeProviderJob["operationKind"];
  status: RuntimeProviderJob["status"];
  intent_payload: Record<string, unknown>;
  dry_run_payload: Record<string, unknown> | null;
  result_payload: Record<string, unknown> | null;
  error_payload: Record<string, unknown> | null;
  correlation_key: string;
  created_at: string;
  updated_at: string;
};

export function mapRuntimeProviderJobToRow(job: RuntimeProviderJob): RuntimeProviderJobRow {
  return {
    id: job.id,
    site_id: job.siteId,
    site_version_id: job.siteVersionId ?? null,
    provider_id: job.providerId,
    environment: job.environment,
    operation_kind: job.operationKind,
    status: job.status,
    intent_payload: job.intentPayload,
    dry_run_payload: job.dryRunPayload ?? null,
    result_payload: job.resultPayload ?? null,
    error_payload: job.errorPayload ?? null,
    correlation_key: job.correlationKey,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

export function mapRuntimeProviderJobRow(row: RuntimeProviderJobRow): RuntimeProviderJob {
  return {
    id: row.id,
    siteId: row.site_id,
    siteVersionId: row.site_version_id ?? undefined,
    providerId: row.provider_id,
    environment: row.environment,
    operationKind: row.operation_kind,
    status: row.status,
    intentPayload: row.intent_payload,
    dryRunPayload: row.dry_run_payload ?? undefined,
    resultPayload: row.result_payload ?? undefined,
    errorPayload: row.error_payload ?? undefined,
    correlationKey: row.correlation_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createRuntimeProviderJobInsertRows(jobs: readonly RuntimeProviderJob[]): RuntimeProviderJobRow[] {
  return [...jobs]
    .map(mapRuntimeProviderJobToRow)
    .sort((a, b) => a.correlation_key.localeCompare(b.correlation_key) || a.id.localeCompare(b.id));
}
