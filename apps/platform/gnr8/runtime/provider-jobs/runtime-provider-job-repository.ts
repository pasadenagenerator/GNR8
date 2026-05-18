import type { PoolClient } from "pg";

import { ensureRuntimeTables } from "@/gnr8/runtime/runtime-store";
import {
  createRuntimeProviderJobInsertRows,
  mapRuntimeProviderJobRow,
  type RuntimeProviderJobRow,
} from "@/gnr8/runtime/provider-jobs/runtime-provider-job-store";
import type { RuntimeProviderJob, RuntimeProviderJobStatus } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";
import { getSuperadminPool } from "@/src/superadmin/db";

type QueryableClient = Pick<PoolClient, "query">;

const VALID_STATUS_TRANSITIONS = new Set<string>([
  "queued->running",
  "running->completed",
  "running->failed",
  "queued->blocked",
]);

export type RuntimeProviderJobTransitionReport = {
  status: "applied" | "rejected";
  previousStatus: RuntimeProviderJobStatus;
  requestedStatus: RuntimeProviderJobStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type UpdateRuntimeProviderJobStatusInput = {
  id: string;
  status: RuntimeProviderJobStatus;
  updatedAt: string;
};

export type UpdateRuntimeProviderJobStatusResult = {
  job: RuntimeProviderJob;
  report: RuntimeProviderJobTransitionReport;
};

function isAllowedTransition(previousStatus: RuntimeProviderJobStatus, requestedStatus: RuntimeProviderJobStatus): boolean {
  return VALID_STATUS_TRANSITIONS.has(`${previousStatus}->${requestedStatus}`);
}

async function getRuntimeProviderJobByIdWithClient(client: QueryableClient, id: string): Promise<RuntimeProviderJob | null> {
  const res = await client.query<RuntimeProviderJobRow>(
    `
    select
      id::text as id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      operation_kind::text as operation_kind,
      status::text as status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_jobs
    where id = $1::text
    limit 1
    `,
    [id],
  );
  const row = res.rows[0];
  return row ? mapRuntimeProviderJobRow(row) : null;
}

export async function createRuntimeProviderJobs(input: RuntimeProviderJob[]): Promise<RuntimeProviderJob[]> {
  await ensureRuntimeTables();
  const rows = createRuntimeProviderJobInsertRows(input);
  if (rows.length === 0) return [];

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderJobRow>(
    `
    insert into public.gnr8_runtime_provider_jobs (
      id,
      site_id,
      site_version_id,
      provider_id,
      environment,
      operation_kind,
      status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key,
      created_at,
      updated_at
    )
    select
      t.id::text,
      t.site_id::text,
      t.site_version_id::text,
      t.provider_id::text,
      t.environment::text,
      t.operation_kind::text,
      t.status::text,
      t.intent_payload::jsonb,
      t.dry_run_payload::jsonb,
      t.result_payload::jsonb,
      t.error_payload::jsonb,
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
      $8::jsonb[],
      $9::jsonb[],
      $10::jsonb[],
      $11::jsonb[],
      $12::text[],
      $13::timestamptz[],
      $14::timestamptz[]
    ) as t(
      id,
      site_id,
      site_version_id,
      provider_id,
      environment,
      operation_kind,
      status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key,
      created_at,
      updated_at
    )
    on conflict (correlation_key) do nothing
    returning
      id::text as id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      operation_kind::text as operation_kind,
      status::text as status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    `,
    [
      rows.map((row) => row.id),
      rows.map((row) => row.site_id),
      rows.map((row) => row.site_version_id),
      rows.map((row) => row.provider_id),
      rows.map((row) => row.environment),
      rows.map((row) => row.operation_kind),
      rows.map((row) => row.status),
      rows.map((row) => row.intent_payload),
      rows.map((row) => row.dry_run_payload),
      rows.map((row) => row.result_payload),
      rows.map((row) => row.error_payload),
      rows.map((row) => row.correlation_key),
      rows.map((row) => row.created_at),
      rows.map((row) => row.updated_at),
    ],
  );

  return res.rows.map(mapRuntimeProviderJobRow);
}

export async function getRuntimeProviderJobById(id: string): Promise<RuntimeProviderJob | null> {
  await ensureRuntimeTables();
  const pool = getSuperadminPool();
  return getRuntimeProviderJobByIdWithClient(pool, id);
}

export async function getRuntimeProviderJobsBySite(siteId: string): Promise<RuntimeProviderJob[]> {
  await ensureRuntimeTables();
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderJobRow>(
    `
    select
      id::text as id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      operation_kind::text as operation_kind,
      status::text as status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_jobs
    where site_id = $1::text
    order by created_at asc, id asc
    `,
    [siteId],
  );
  return res.rows.map(mapRuntimeProviderJobRow);
}

export async function getRuntimeProviderJobsByCorrelationKey(correlationKey: string): Promise<RuntimeProviderJob[]> {
  await ensureRuntimeTables();
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderJobRow>(
    `
    select
      id::text as id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      operation_kind::text as operation_kind,
      status::text as status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    from public.gnr8_runtime_provider_jobs
    where correlation_key = $1::text
    order by created_at asc, id asc
    `,
    [correlationKey],
  );
  return res.rows.map(mapRuntimeProviderJobRow);
}

export async function updateRuntimeProviderJobStatus(input: UpdateRuntimeProviderJobStatusInput): Promise<UpdateRuntimeProviderJobStatusResult | null> {
  await ensureRuntimeTables();
  const pool = getSuperadminPool();
  const current = await getRuntimeProviderJobByIdWithClient(pool, input.id);
  if (!current) return null;

  const allowed = isAllowedTransition(current.status, input.status);
  if (!allowed) {
    return {
      job: current,
      report: {
        status: "rejected",
        previousStatus: current.status,
        requestedStatus: input.status,
        warnings: [`invalid_status_transition:${current.status}->${input.status}`],
        blockers: [`status_transition_not_allowed:${current.status}->${input.status}`],
        correlationKey: current.correlationKey,
      },
    };
  }

  const res = await pool.query<RuntimeProviderJobRow>(
    `
    update public.gnr8_runtime_provider_jobs
    set
      status = $2::text,
      updated_at = $3::timestamptz
    where id = $1::text
    returning
      id::text as id,
      site_id::text as site_id,
      site_version_id::text as site_version_id,
      provider_id::text as provider_id,
      environment::text as environment,
      operation_kind::text as operation_kind,
      status::text as status,
      intent_payload,
      dry_run_payload,
      result_payload,
      error_payload,
      correlation_key::text as correlation_key,
      created_at::text as created_at,
      updated_at::text as updated_at
    `,
    [input.id, input.status, input.updatedAt],
  );
  const updatedRow = res.rows[0];
  if (!updatedRow) return null;
  const updated = mapRuntimeProviderJobRow(updatedRow);
  return {
    job: updated,
    report: {
      status: "applied",
      previousStatus: current.status,
      requestedStatus: input.status,
      warnings: [],
      blockers: [],
      correlationKey: current.correlationKey,
    },
  };
}
