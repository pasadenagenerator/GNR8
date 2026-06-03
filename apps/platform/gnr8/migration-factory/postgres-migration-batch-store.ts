import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import {
  MIGRATION_BATCH_STATUSES,
  type AddMigrationJobToBatchInput,
  type CreateMigrationBatchInput,
  type MigrationBatch,
  type MigrationBatchJob,
  type MigrationBatchJobSummary,
  type MigrationBatchJsonObject,
  type MigrationBatchStatus,
  type MigrationBatchSummary,
  type MigrationBatchWithSummary,
} from "@/gnr8/migration-factory/migration-batch-types";
import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import type { MigrationJobState } from "@/gnr8/migration-factory/migration-job-types";
import { deterministicId } from "@/gnr8/runtime/deterministic";
import { getSuperadminPool } from "@/src/superadmin/db";

type QueryableClient = Pick<Pool | PoolClient, "query">;

type MigrationBatchRow = {
  id: string;
  organization_id: string | null;
  agency_id: string | null;
  client_id: string | null;
  name: string;
  description: string | null;
  status: MigrationBatchStatus;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  failed_at: Date | string | null;
  metadata: MigrationBatchJsonObject | null;
  diagnostics: MigrationBatchJsonObject | null;
};

type MigrationBatchJobRow = {
  batch_id: string;
  job_id: string;
  site_id: string | null;
  site_version_id: string | null;
  source_url: string | null;
  position: number;
  added_at: Date | string;
  metadata: MigrationBatchJsonObject | null;
};

type MigrationBatchJobSummaryRow = MigrationBatchJobRow & {
  job_status: MigrationJobState;
  job_created_at: Date | string;
  job_updated_at: Date | string;
  latest_event_at: Date | string | null;
};

type MigrationBatchSummaryCountRow = {
  batch_id: string;
  total_jobs: number;
  pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  paused_jobs: number;
  latest_event_at: Date | string | null;
};

type MigrationJobLookupRow = {
  id: string;
  site_id: string;
  site_version_id: string | null;
  source_url: string;
};

function jsonParam(value: unknown): string {
  if (value === null || value === undefined) return "{}";
  return JSON.stringify(value);
}

function coerceIso(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? value : new Date(millis).toISOString();
}

function jsonObject(value: MigrationBatchJsonObject | null | undefined): MigrationBatchJsonObject {
  if (!value || Array.isArray(value)) return {};
  return value;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStatus(status: MigrationBatchStatus | undefined): MigrationBatchStatus {
  const normalized = status ?? "draft";
  if (!MIGRATION_BATCH_STATUSES.includes(normalized)) {
    throw new Error(`Unknown migration batch status: ${normalized}`);
  }
  return normalized;
}

function progressPercent(totalJobs: number, completedJobs: number): number {
  if (totalJobs <= 0) return 0;
  return Math.round((completedJobs / totalJobs) * 100);
}

function buildBatchId(input: CreateMigrationBatchInput, createdAt: string): string {
  if (input.batchId) return input.batchId;
  return deterministicId("migration_batch", `${input.name}:${createdAt}:${randomUUID()}`);
}

function batchFromRow(row: MigrationBatchRow): MigrationBatch {
  return {
    batchId: row.id,
    organizationId: row.organization_id,
    agencyId: row.agency_id,
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    createdAt: coerceIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: coerceIso(row.updated_at) ?? new Date(0).toISOString(),
    startedAt: coerceIso(row.started_at),
    completedAt: coerceIso(row.completed_at),
    failedAt: coerceIso(row.failed_at),
    metadata: jsonObject(row.metadata),
    diagnostics: jsonObject(row.diagnostics),
  };
}

function batchJobFromRow(row: MigrationBatchJobRow): MigrationBatchJob {
  return {
    batchId: row.batch_id,
    jobId: row.job_id,
    siteId: row.site_id,
    siteVersionId: row.site_version_id,
    sourceUrl: row.source_url,
    position: row.position,
    addedAt: coerceIso(row.added_at) ?? new Date(0).toISOString(),
    metadata: jsonObject(row.metadata),
  };
}

function batchJobSummaryFromRow(row: MigrationBatchJobSummaryRow): MigrationBatchJobSummary {
  return {
    ...batchJobFromRow(row),
    jobStatus: row.job_status,
    jobCreatedAt: coerceIso(row.job_created_at) ?? new Date(0).toISOString(),
    jobUpdatedAt: coerceIso(row.job_updated_at) ?? new Date(0).toISOString(),
    latestEventAt: coerceIso(row.latest_event_at),
  };
}

function summaryFromRow(row: MigrationBatchSummaryCountRow): MigrationBatchSummary {
  const totalJobs = Number(row.total_jobs);
  const completedJobs = Number(row.completed_jobs);
  return {
    batchId: row.batch_id,
    totalJobs,
    pendingJobs: Number(row.pending_jobs),
    runningJobs: Number(row.running_jobs),
    completedJobs,
    failedJobs: Number(row.failed_jobs),
    pausedJobs: Number(row.paused_jobs),
    progressPercent: progressPercent(totalJobs, completedJobs),
    latestEventAt: coerceIso(row.latest_event_at),
  };
}

export class PostgresMigrationBatchStore implements MigrationBatchStore {
  private readonly client: QueryableClient;

  private readonly now: () => string;

  constructor(options?: { client?: QueryableClient; now?: () => string }) {
    this.client = options?.client ?? getSuperadminPool();
    this.now = options?.now ?? (() => new Date().toISOString());
  }

  async createBatch(input: CreateMigrationBatchInput): Promise<MigrationBatch> {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("Migration batch name is required");

    const createdAt = this.now();
    const batchId = buildBatchId(input, createdAt);
    const status = normalizeStatus(input.status);

    await this.client.query(
      `
      insert into public.gnr8_migration_batches (
        id,
        organization_id,
        agency_id,
        client_id,
        name,
        description,
        status,
        created_by,
        created_at,
        updated_at,
        metadata,
        diagnostics
      )
      values (
        $1::text,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::text,
        $6::text,
        $7::text,
        $8::text,
        $9::timestamptz,
        $9::timestamptz,
        $10::jsonb,
        $11::jsonb
      )
      `,
      [
        batchId,
        normalizeOptionalText(input.organizationId),
        normalizeOptionalText(input.agencyId),
        normalizeOptionalText(input.clientId),
        name,
        normalizeOptionalText(input.description),
        status,
        normalizeOptionalText(input.createdBy),
        createdAt,
        jsonParam(input.metadata),
        jsonParam(input.diagnostics),
      ],
    );

    const created = await this.getBatch(batchId);
    if (!created) throw new Error(`Migration batch was not persisted: ${batchId}`);
    return created;
  }

  async getBatch(batchId: string): Promise<MigrationBatch | null> {
    const res = await this.client.query<MigrationBatchRow>(
      `
      select
        id,
        organization_id,
        agency_id,
        client_id,
        name,
        description,
        status,
        created_by,
        created_at,
        updated_at,
        started_at,
        completed_at,
        failed_at,
        metadata,
        diagnostics
      from public.gnr8_migration_batches
      where id = $1::text
      limit 1
      `,
      [batchId],
    );
    const row = res.rows[0];
    return row ? batchFromRow(row) : null;
  }

  async listBatches(): Promise<MigrationBatchWithSummary[]> {
    const res = await this.client.query<MigrationBatchRow>(
      `
      select
        id,
        organization_id,
        agency_id,
        client_id,
        name,
        description,
        status,
        created_by,
        created_at,
        updated_at,
        started_at,
        completed_at,
        failed_at,
        metadata,
        diagnostics
      from public.gnr8_migration_batches
      order by created_at desc, id asc
      `,
    );

    const batches = await Promise.all(
      res.rows.map(async (row) => {
        const batch = batchFromRow(row);
        const summary = await this.getBatchSummary(batch.batchId);
        return {
          ...batch,
          summary: summary ?? emptySummary(batch.batchId),
        };
      }),
    );
    return batches;
  }

  async addJobToBatch(input: AddMigrationJobToBatchInput): Promise<MigrationBatchJob> {
    const batchId = normalizeOptionalText(input.batchId);
    const jobId = normalizeOptionalText(input.jobId);
    if (!batchId) throw new Error("Migration batch id is required");
    if (!jobId) throw new Error("Migration job id is required");

    const [batch, job] = await Promise.all([
      this.getBatch(batchId),
      this.getMigrationJobForMembership(jobId),
    ]);
    if (!batch) throw new Error(`Migration batch not found: ${batchId}`);
    if (!job) throw new Error(`Migration job not found: ${jobId}`);

    const position = input.position ?? (await this.nextPosition(batchId));
    const addedAt = this.now();
    const siteId = normalizeOptionalText(input.siteId) ?? job.site_id;
    const siteVersionId = normalizeOptionalText(input.siteVersionId) ?? job.site_version_id;
    const sourceUrl = normalizeOptionalText(input.sourceUrl) ?? job.source_url;

    const res = await this.client.query<MigrationBatchJobRow>(
      `
      insert into public.gnr8_migration_batch_jobs (
        batch_id,
        job_id,
        site_id,
        site_version_id,
        source_url,
        position,
        added_at,
        metadata
      )
      values (
        $1::text,
        $2::text,
        $3::text,
        $4::uuid,
        $5::text,
        $6::integer,
        $7::timestamptz,
        $8::jsonb
      )
      on conflict (batch_id, job_id)
      do update set
        site_id = excluded.site_id,
        site_version_id = excluded.site_version_id,
        source_url = excluded.source_url,
        position = case
          when $9::boolean then excluded.position
          else gnr8_migration_batch_jobs.position
        end,
        metadata = excluded.metadata
      returning
        batch_id,
        job_id,
        site_id,
        site_version_id,
        source_url,
        position,
        added_at,
        metadata
      `,
      [
        batchId,
        jobId,
        siteId,
        siteVersionId,
        sourceUrl,
        position,
        addedAt,
        jsonParam(input.metadata),
        input.position !== undefined && input.position !== null,
      ],
    );

    await this.touchBatch(batchId);

    const row = res.rows[0];
    if (!row) throw new Error(`Migration job was not added to batch: ${jobId}`);
    return batchJobFromRow(row);
  }

  async removeJobFromBatch(batchId: string, jobId: string): Promise<boolean> {
    const res = await this.client.query(
      `
      delete from public.gnr8_migration_batch_jobs
      where batch_id = $1::text
        and job_id = $2::text
      `,
      [batchId, jobId],
    );
    if ((res.rowCount ?? 0) > 0) {
      await this.touchBatch(batchId);
      return true;
    }
    return false;
  }

  async listBatchJobs(batchId: string): Promise<MigrationBatchJobSummary[]> {
    const res = await this.client.query<MigrationBatchJobSummaryRow>(
      `
      select
        bj.batch_id,
        bj.job_id,
        bj.site_id,
        bj.site_version_id,
        bj.source_url,
        bj.position,
        bj.added_at,
        bj.metadata,
        j.status as job_status,
        j.created_at as job_created_at,
        j.updated_at as job_updated_at,
        le.latest_event_at
      from public.gnr8_migration_batch_jobs bj
      join public.gnr8_migration_jobs j
        on j.id = bj.job_id
      left join lateral (
        select max(event_timestamp) as latest_event_at
        from public.gnr8_migration_job_events e
        where e.job_id = bj.job_id
      ) le on true
      where bj.batch_id = $1::text
      order by bj.position asc, bj.added_at asc, bj.job_id asc
      `,
      [batchId],
    );
    return res.rows.map(batchJobSummaryFromRow);
  }

  async getBatchSummary(batchId: string): Promise<MigrationBatchSummary | null> {
    const batch = await this.getBatch(batchId);
    if (!batch) return null;

    const res = await this.client.query<MigrationBatchSummaryCountRow>(
      `
      select
        $1::text as batch_id,
        count(j.id)::integer as total_jobs,
        count(j.id) filter (where j.status = 'PENDING')::integer as pending_jobs,
        count(j.id) filter (where j.status = 'RUNNING')::integer as running_jobs,
        count(j.id) filter (where j.status = 'COMPLETED')::integer as completed_jobs,
        count(j.id) filter (where j.status = 'FAILED')::integer as failed_jobs,
        count(j.id) filter (where j.status = 'PAUSED')::integer as paused_jobs,
        max(le.latest_event_at) as latest_event_at
      from public.gnr8_migration_batch_jobs bj
      join public.gnr8_migration_jobs j
        on j.id = bj.job_id
      left join lateral (
        select max(event_timestamp) as latest_event_at
        from public.gnr8_migration_job_events e
        where e.job_id = bj.job_id
      ) le on true
      where bj.batch_id = $1::text
      `,
      [batchId],
    );

    return summaryFromRow(res.rows[0] ?? {
      batch_id: batchId,
      total_jobs: 0,
      pending_jobs: 0,
      running_jobs: 0,
      completed_jobs: 0,
      failed_jobs: 0,
      paused_jobs: 0,
      latest_event_at: null,
    });
  }

  private async getMigrationJobForMembership(jobId: string): Promise<MigrationJobLookupRow | null> {
    const res = await this.client.query<MigrationJobLookupRow>(
      `
      select
        id,
        site_id,
        site_version_id,
        source_url
      from public.gnr8_migration_jobs
      where id = $1::text
      limit 1
      `,
      [jobId],
    );
    return res.rows[0] ?? null;
  }

  private async nextPosition(batchId: string): Promise<number> {
    const res = await this.client.query<{ next_position: number }>(
      `
      select coalesce(max(position), -1) + 1 as next_position
      from public.gnr8_migration_batch_jobs
      where batch_id = $1::text
      `,
      [batchId],
    );
    return Number(res.rows[0]?.next_position ?? 0);
  }

  private async touchBatch(batchId: string): Promise<void> {
    await this.client.query(
      `
      update public.gnr8_migration_batches
      set updated_at = $2::timestamptz
      where id = $1::text
      `,
      [batchId, this.now()],
    );
  }
}

function emptySummary(batchId: string): MigrationBatchSummary {
  return {
    batchId,
    totalJobs: 0,
    pendingJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    pausedJobs: 0,
    progressPercent: 0,
    latestEventAt: null,
  };
}
