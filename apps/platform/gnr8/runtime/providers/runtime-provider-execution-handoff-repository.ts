import {
  createExecutionHandoffInsertRows,
  mapExecutionHandoffArtifactRow,
  type RuntimeProviderExecutionHandoffArtifactRecord,
  type RuntimeProviderExecutionHandoffArtifactRow,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import { getSuperadminPool } from "@/src/superadmin/db";

function stringifyJsonbColumnValue(input: { field: string; rowId: string; value: unknown }): string {
  if (typeof input.value === "string") {
    throw new Error(
      `provider_execution_handoff_persistence_invalid_json_field:${input.field}:row=${input.rowId}:reason=string_payload_not_allowed`,
    );
  }
  try {
    const json = JSON.stringify(input.value);
    if (typeof json !== "string") {
      throw new Error("json_stringify_returned_non_string");
    }
    JSON.parse(json);
    return json;
  } catch {
    throw new Error(
      `provider_execution_handoff_persistence_invalid_json_field:${input.field}:row=${input.rowId}:reason=not_json_serializable`,
    );
  }
}

export async function createProviderExecutionHandoffArtifacts(
  input: readonly RuntimeProviderExecutionHandoffArtifactRecord[],
): Promise<RuntimeProviderExecutionHandoffArtifactRecord[]> {
  const rows = createExecutionHandoffInsertRows(input);
  if (rows.length === 0) return [];
  const plannedJobIdsJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "planned_job_ids", rowId: row.id, value: row.planned_job_ids }),
  );
  const warningsJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "warnings", rowId: row.id, value: row.warnings }),
  );
  const blockersJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "blockers", rowId: row.id, value: row.blockers }),
  );

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderExecutionHandoffArtifactRow>(
    `
    insert into public.gnr8_runtime_provider_execution_handoffs (
      id,
      handoff_id,
      artifact_id,
      site_id,
      site_version_id,
      provider_id,
      environment,
      capability,
      operation_kind,
      approval_status,
      risk_level,
      handoff_status,
      planned_job_ids,
      warnings,
      blockers,
      correlation_key,
      created_at,
      updated_at
    )
    select
      t.id::text,
      t.handoff_id::text,
      t.artifact_id::text,
      t.site_id::text,
      t.site_version_id::text,
      t.provider_id::text,
      t.environment::text,
      t.capability::text,
      t.operation_kind::text,
      t.approval_status::text,
      t.risk_level::text,
      t.handoff_status::text,
      t.planned_job_ids::jsonb,
      t.warnings::jsonb,
      t.blockers::jsonb,
      t.correlation_key::text,
      t.created_at::timestamptz,
      t.updated_at::timestamptz
    from unnest(
      $1::text[],
      $2::text[],
      $3::text[],
      $4::text[],
      $5::text[],
      $6::text[],
      $7::text[],
      $8::text[],
      $9::text[],
      $10::text[],
      $11::text[],
      $12::text[],
      $13::text[],
      $14::text[],
      $15::text[],
      $16::text[],
      $17::timestamptz[],
      $18::timestamptz[]
    ) as t(
      id,
      handoff_id,
      artifact_id,
      site_id,
      site_version_id,
      provider_id,
      environment,
      capability,
      operation_kind,
      approval_status,
      risk_level,
      handoff_status,
      planned_job_ids,
      warnings,
      blockers,
      correlation_key,
      created_at,
      updated_at
    )
    on conflict do nothing
    returning
      id::text as id,
      handoff_id::text as handoff_id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      handoff_status::text as handoff_status,
      planned_job_ids,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    `,
    [
      rows.map((row) => row.id),
      rows.map((row) => row.handoff_id),
      rows.map((row) => row.artifact_id),
      rows.map((row) => row.site_id),
      rows.map((row) => row.site_version_id),
      rows.map((row) => row.provider_id),
      rows.map((row) => row.environment),
      rows.map((row) => row.capability),
      rows.map((row) => row.operation_kind),
      rows.map((row) => row.approval_status),
      rows.map((row) => row.risk_level),
      rows.map((row) => row.handoff_status),
      plannedJobIdsJson,
      warningsJson,
      blockersJson,
      rows.map((row) => row.correlation_key),
      rows.map((row) => row.created_at),
      rows.map((row) => row.updated_at),
    ],
  );

  return res.rows.map(mapExecutionHandoffArtifactRow);
}

export async function getProviderExecutionHandoffByHandoffId(
  handoffId: string,
): Promise<RuntimeProviderExecutionHandoffArtifactRecord | null> {
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderExecutionHandoffArtifactRow>(
    `
    select
      id::text as id,
      handoff_id::text as handoff_id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      handoff_status::text as handoff_status,
      planned_job_ids,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_execution_handoffs
    where handoff_id = $1::text
    limit 1
    `,
    [handoffId],
  );

  const row = res.rows[0];
  return row ? mapExecutionHandoffArtifactRow(row) : null;
}

export async function getProviderExecutionHandoffsBySite(
  siteId: string,
): Promise<RuntimeProviderExecutionHandoffArtifactRecord[]> {
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderExecutionHandoffArtifactRow>(
    `
    select
      id::text as id,
      handoff_id::text as handoff_id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      handoff_status::text as handoff_status,
      planned_job_ids,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_execution_handoffs
    where site_id = $1::text
    order by created_at asc, handoff_id asc
    `,
    [siteId],
  );

  return res.rows.map(mapExecutionHandoffArtifactRow);
}

export async function getProviderExecutionHandoffsByCorrelationKey(
  correlationKey: string,
): Promise<RuntimeProviderExecutionHandoffArtifactRecord[]> {
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderExecutionHandoffArtifactRow>(
    `
    select
      id::text as id,
      handoff_id::text as handoff_id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      handoff_status::text as handoff_status,
      planned_job_ids,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_execution_handoffs
    where correlation_key = $1::text
    order by created_at asc, handoff_id asc
    `,
    [correlationKey],
  );

  return res.rows.map(mapExecutionHandoffArtifactRow);
}
