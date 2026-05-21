import {
  createApprovalInsertRows,
  mapApprovalArtifactRow,
  type RuntimeProviderOperationApprovalArtifactRecord,
  type RuntimeProviderOperationApprovalArtifactRow,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-store";
import {
  applyProviderOperationApprovalStateTransition,
  createProviderOperationApprovalTransitionReport,
  type ProviderOperationApprovalState,
  type ProviderOperationApprovalTransitionReport,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-transitions";
import { getSuperadminPool } from "@/src/superadmin/db";

function stringifyJsonbColumnValue(input: { field: string; rowId: string; value: unknown }): string {
  if (typeof input.value === "string") {
    throw new Error(
      `provider_operation_approval_persistence_invalid_json_field:${input.field}:row=${input.rowId}:reason=string_payload_not_allowed`,
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
      `provider_operation_approval_persistence_invalid_json_field:${input.field}:row=${input.rowId}:reason=not_json_serializable`,
    );
  }
}

export async function createProviderOperationApprovalArtifacts(
  input: readonly RuntimeProviderOperationApprovalArtifactRecord[],
): Promise<RuntimeProviderOperationApprovalArtifactRecord[]> {
  const rows = createApprovalInsertRows(input);
  if (rows.length === 0) return [];
  const requiredApprovalsJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "required_approvals", rowId: row.id, value: row.required_approvals }),
  );
  const reviewerChecklistJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "reviewer_checklist", rowId: row.id, value: row.reviewer_checklist }),
  );
  const warningsJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "warnings", rowId: row.id, value: row.warnings }),
  );
  const blockersJson = rows.map((row) =>
    stringifyJsonbColumnValue({ field: "blockers", rowId: row.id, value: row.blockers }),
  );

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperationApprovalArtifactRow>(
    `
    insert into public.gnr8_runtime_provider_operation_approvals (
      id,
      artifact_id,
      site_id,
      site_version_id,
      provider_id,
      environment,
      capability,
      operation_kind,
      approval_status,
      risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key,
      created_at,
      updated_at
    )
    select
      t.id::text,
      t.artifact_id::text,
      t.site_id::text,
      t.site_version_id::text,
      t.provider_id::text,
      t.environment::text,
      t.capability::text,
      t.operation_kind::text,
      t.approval_status::text,
      t.risk_level::text,
      t.required_approvals::jsonb,
      t.reviewer_checklist::jsonb,
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
      $16::timestamptz[],
      $17::timestamptz[]
    ) as t(
      id,
      artifact_id,
      site_id,
      site_version_id,
      provider_id,
      environment,
      capability,
      operation_kind,
      approval_status,
      risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key,
      created_at,
      updated_at
    )
    on conflict do nothing
    returning
      id::text as id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    `,
    [
      rows.map((row) => row.id),
      rows.map((row) => row.artifact_id),
      rows.map((row) => row.site_id),
      rows.map((row) => row.site_version_id),
      rows.map((row) => row.provider_id),
      rows.map((row) => row.environment),
      rows.map((row) => row.capability),
      rows.map((row) => row.operation_kind),
      rows.map((row) => row.approval_status),
      rows.map((row) => row.risk_level),
      requiredApprovalsJson,
      reviewerChecklistJson,
      warningsJson,
      blockersJson,
      rows.map((row) => row.correlation_key),
      rows.map((row) => row.created_at),
      rows.map((row) => row.updated_at),
    ],
  );

  return res.rows.map(mapApprovalArtifactRow);
}

export async function getProviderOperationApprovalByArtifactId(
  artifactId: string,
): Promise<RuntimeProviderOperationApprovalArtifactRecord | null> {
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperationApprovalArtifactRow>(
    `
    select
      id::text as id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_operation_approvals
    where artifact_id = $1::text
    limit 1
    `,
    [artifactId],
  );

  const row = res.rows[0];
  return row ? mapApprovalArtifactRow(row) : null;
}

export async function getProviderOperationApprovalsBySite(
  siteId: string,
): Promise<RuntimeProviderOperationApprovalArtifactRecord[]> {
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperationApprovalArtifactRow>(
    `
    select
      id::text as id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_operation_approvals
    where site_id = $1::text
    order by created_at asc, artifact_id asc
    `,
    [siteId],
  );

  return res.rows.map(mapApprovalArtifactRow);
}

export async function getProviderOperationApprovalsByCorrelationKey(
  correlationKey: string,
): Promise<RuntimeProviderOperationApprovalArtifactRecord[]> {
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperationApprovalArtifactRow>(
    `
    select
      id::text as id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_operation_approvals
    where correlation_key = $1::text
    order by created_at asc, artifact_id asc
    `,
    [correlationKey],
  );

  return res.rows.map(mapApprovalArtifactRow);
}

export async function updateProviderOperationApprovalState(input: {
  artifactId: string;
  previousState: ProviderOperationApprovalState;
  requestedState: ProviderOperationApprovalState;
}): Promise<{
  approvalArtifact?: RuntimeProviderOperationApprovalArtifactRecord;
  transitionReport: ProviderOperationApprovalTransitionReport;
}> {
  const existing = await getProviderOperationApprovalByArtifactId(input.artifactId);
  if (!existing) {
    return {
      transitionReport: {
        ...createProviderOperationApprovalTransitionReport(input.previousState, input.requestedState),
        status: "rejected",
        blockers: ["approval_artifact_not_found"],
      },
    };
  }

  const transitionReport = applyProviderOperationApprovalStateTransition(
    existing,
    input.previousState,
    input.requestedState,
  );
  if (transitionReport.status === "rejected") {
    return {
      approvalArtifact: existing,
      transitionReport,
    };
  }

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperationApprovalArtifactRow>(
    `
    update public.gnr8_runtime_provider_operation_approvals
    set approval_status = $2::text
    where artifact_id = $1::text
    returning
      id::text as id,
      artifact_id::text as artifact_id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      capability::text as capability,
      operation_kind::text as operation_kind,
      approval_status::text as approval_status,
      risk_level::text as risk_level,
      required_approvals,
      reviewer_checklist,
      warnings,
      blockers,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    `,
    [input.artifactId, input.requestedState],
  );

  const updated = res.rows[0];
  if (!updated) {
    return {
      transitionReport: {
        ...transitionReport,
        status: "rejected",
        blockers: [...transitionReport.blockers, "approval_artifact_not_found"],
      },
    };
  }

  return {
    approvalArtifact: mapApprovalArtifactRow(updated),
    transitionReport,
  };
}
