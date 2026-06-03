import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { deterministicId } from "@/gnr8/runtime/deterministic";
import {
  MIGRATION_STAGE_STATES,
  MIGRATION_STAGES,
  type MigrationActivationExecutionResult,
  type MigrationExecutionEvent,
  type MigrationExecutionReport,
  type MigrationJob,
  type MigrationJobState,
  type MigrationStage,
  type MigrationStageError,
  type MigrationStageStatusRecord,
  type StartMigrationJobInput,
} from "@/gnr8/migration-factory/migration-job-types";
import type {
  MigrationJobStore,
  UpdateMigrationJobPatch,
  UpdateStageStatePatch,
} from "@/gnr8/migration-factory/migration-job-store";
import { createInitialStageStates, MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";
import { getSuperadminPool } from "@/src/superadmin/db";

type QueryableClient = Pick<Pool | PoolClient, "query">;

type MigrationJobRow = {
  id: string;
  site_id: string;
  source_url: string;
  status: MigrationJobState;
  current_stage: MigrationStage | null;
  last_error: MigrationStageError | null;
  last_execution_report: MigrationExecutionReport | null;
  last_activation_execution_result: MigrationActivationExecutionResult | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type MigrationJobStageRow = {
  job_id: string;
  stage: MigrationStage;
  status: MigrationStageStatusRecord["state"];
  started_at: Date | string | null;
  ended_at: Date | string | null;
  attempts: number;
  diagnostics: MigrationStageStatusRecord["diagnostics"];
  output_refs: MigrationStageStatusRecord["outputRefs"];
  error: MigrationStageStatusRecord["error"];
};

type MigrationJobEventRow = {
  event_type: MigrationExecutionEvent["type"];
  event_timestamp: Date | string;
  stage: MigrationStage | null;
  message: string;
  details: Record<string, unknown> | null;
};

type MigrationActivationHistoryRow = {
  result: MigrationActivationExecutionResult;
};

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonParam(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function coerceIso(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? value : new Date(millis).toISOString();
}

function stageFromRow(row: MigrationJobStageRow): MigrationStageStatusRecord {
  return {
    stage: row.stage,
    state: row.status,
    startedAt: coerceIso(row.started_at),
    endedAt: coerceIso(row.ended_at),
    attempts: row.attempts,
    diagnostics: row.diagnostics ?? [],
    outputRefs: row.output_refs ?? {},
    error: row.error ?? null,
  };
}

function eventFromRow(row: MigrationJobEventRow): MigrationExecutionEvent {
  return {
    type: row.event_type,
    timestamp: coerceIso(row.event_timestamp) ?? new Date(0).toISOString(),
    stage: row.stage ?? undefined,
    message: row.message,
    details: row.details ?? undefined,
  };
}

function failureReasonFor(error: MigrationStageError | null | undefined): string | null {
  return error?.message ?? null;
}

function buildJobId(input: StartMigrationJobInput, createdAt: string): string {
  if (input.jobId) return input.jobId;
  return deterministicId("migration_job", `${input.siteId}:${input.sourceUrl}:${createdAt}:${randomUUID()}`);
}

function validateStage(stage: MigrationStage): void {
  if (!MIGRATION_STAGES.includes(stage)) throw new Error(`Unknown migration stage: ${stage}`);
}

function validateStageStateRecord(record: MigrationStageStatusRecord): void {
  validateStage(record.stage);
  if (!MIGRATION_STAGE_STATES.includes(record.state)) {
    throw new Error(`Unknown migration stage state for ${record.stage}: ${record.state}`);
  }
}

export class PostgresMigrationJobStore implements MigrationJobStore {
  private readonly client: QueryableClient;

  private readonly now: () => string;

  constructor(options?: { client?: QueryableClient; now?: () => string }) {
    this.client = options?.client ?? getSuperadminPool();
    this.now = options?.now ?? (() => new Date().toISOString());
  }

  async createJob(input: StartMigrationJobInput): Promise<MigrationJob> {
    const now = this.now();
    const jobId = buildJobId(input, now);
    const stageStates = createInitialStageStates();

    await this.client.query(
      `
      insert into public.gnr8_migration_jobs (
        id,
        site_id,
        source_url,
        source_metadata,
        status,
        current_stage,
        last_error,
        failure_reason,
        last_execution_report,
        last_activation_execution_result,
        created_at,
        updated_at
      )
      values (
        $1::text,
        $2::text,
        $3::text,
        '{}'::jsonb,
        'PENDING',
        null,
        null,
        null,
        null,
        null,
        $4::timestamptz,
        $4::timestamptz
      )
      `,
      [jobId, input.siteId, input.sourceUrl, now],
    );

    await this.persistStageStates(jobId, stageStates, now);

    const created = await this.getJob(jobId);
    if (!created) throw new Error(`Migration job was not persisted: ${jobId}`);
    return created;
  }

  async getJob(jobId: string): Promise<MigrationJob | null> {
    const jobRes = await this.client.query<MigrationJobRow>(
      `
      select
        id,
        site_id,
        source_url,
        status,
        current_stage,
        last_error,
        last_execution_report,
        last_activation_execution_result,
        created_at,
        updated_at
      from public.gnr8_migration_jobs
      where id = $1::text
      limit 1
      `,
      [jobId],
    );
    const row = jobRes.rows[0];
    if (!row) return null;

    const [stageRes, eventRes, activationRes] = await Promise.all([
      this.client.query<MigrationJobStageRow>(
        `
        select
          job_id,
          stage,
          status,
          started_at,
          ended_at,
          attempts,
          diagnostics,
          output_refs,
          error
        from public.gnr8_migration_job_stages
        where job_id = $1::text
        order by array_position($2::text[], stage), stage
        `,
        [jobId, MIGRATION_STAGE_ORDER],
      ),
      this.client.query<MigrationJobEventRow>(
        `
        select
          event_type,
          event_timestamp,
          stage,
          message,
          details
        from public.gnr8_migration_job_events
        where job_id = $1::text
        order by event_index asc
        `,
        [jobId],
      ),
      this.client.query<MigrationActivationHistoryRow>(
        `
        select result
        from public.gnr8_migration_job_activation_history
        where job_id = $1::text
        order by history_index asc
        `,
        [jobId],
      ),
    ]);

    const stageStates = createInitialStageStates();
    for (const stageRow of stageRes.rows) {
      const record = stageFromRow(stageRow);
      validateStageStateRecord(record);
      stageStates[record.stage] = record;
    }

    return deepCopy({
      jobId: row.id,
      siteId: row.site_id,
      sourceUrl: row.source_url,
      overallState: row.status,
      currentStage: row.current_stage,
      stageStates,
      createdAt: coerceIso(row.created_at) ?? new Date(0).toISOString(),
      updatedAt: coerceIso(row.updated_at) ?? new Date(0).toISOString(),
      lastError: row.last_error ?? null,
      lastExecutionReport: row.last_execution_report ?? null,
      lastActivationExecutionResult: row.last_activation_execution_result ?? null,
      activationExecutionHistory: activationRes.rows.map((historyRow) => historyRow.result),
      executionEvents: eventRes.rows.map(eventFromRow),
    });
  }

  async updateJob(jobId: string, patch: UpdateMigrationJobPatch): Promise<MigrationJob> {
    const current = await this.getJob(jobId);
    if (!current) throw new Error(`Migration job not found: ${jobId}`);

    const updatedAt = this.now();
    const next: MigrationJob = {
      ...current,
      ...patch,
      jobId: current.jobId,
      siteId: current.siteId,
      sourceUrl: current.sourceUrl,
      createdAt: current.createdAt,
      executionEvents: current.executionEvents,
      updatedAt,
    };

    const lastError = next.lastError ?? null;
    await this.client.query(
      `
      update public.gnr8_migration_jobs
      set
        status = $2::text,
        current_stage = $3::text,
        last_error = $4::jsonb,
        failure_reason = $5::text,
        last_execution_report = $6::jsonb,
        last_activation_execution_result = $7::jsonb,
        updated_at = $8::timestamptz,
        started_at = case
          when $2::text = 'RUNNING' then coalesce(started_at, $8::timestamptz)
          else started_at
        end,
        completed_at = case
          when $2::text = 'COMPLETED' then $8::timestamptz
          else completed_at
        end,
        failed_at = case
          when $2::text = 'FAILED' then $8::timestamptz
          else failed_at
        end
      where id = $1::text
      `,
      [
        jobId,
        next.overallState,
        next.currentStage,
        jsonParam(lastError),
        failureReasonFor(lastError),
        jsonParam(next.lastExecutionReport),
        jsonParam(next.lastActivationExecutionResult),
        updatedAt,
      ],
    );

    if (patch.stageStates) {
      await this.persistStageStates(jobId, next.stageStates, updatedAt);
    }

    if (patch.activationExecutionHistory) {
      await this.persistActivationHistory(jobId, next.activationExecutionHistory);
    }

    const updated = await this.getJob(jobId);
    if (!updated) throw new Error(`Migration job not found after update: ${jobId}`);
    return updated;
  }

  async updateStageState(jobId: string, stage: MigrationStage, patch: UpdateStageStatePatch): Promise<MigrationJob> {
    validateStage(stage);
    const current = await this.getJob(jobId);
    if (!current) throw new Error(`Migration job not found: ${jobId}`);

    const stageState = current.stageStates[stage];
    if (!stageState) throw new Error(`Unknown migration stage: ${stage}`);

    const updatedAt = this.now();
    const nextStageState: MigrationStageStatusRecord = {
      ...stageState,
      ...patch,
      stage,
    };
    validateStageStateRecord(nextStageState);

    await this.persistStageStates(
      jobId,
      {
        ...current.stageStates,
        [stage]: nextStageState,
      },
      updatedAt,
    );
    await this.client.query(
      `
      update public.gnr8_migration_jobs
      set updated_at = $2::timestamptz
      where id = $1::text
      `,
      [jobId, updatedAt],
    );

    const updated = await this.getJob(jobId);
    if (!updated) throw new Error(`Migration job not found after stage update: ${jobId}`);
    return updated;
  }

  async appendExecutionEvent(jobId: string, event: MigrationExecutionEvent): Promise<void> {
    const current = await this.getJob(jobId);
    if (!current) throw new Error(`Migration job not found: ${jobId}`);
    if (event.stage) validateStage(event.stage);

    const nextIndexRes = await this.client.query<{ next_index: number }>(
      `
      select (coalesce(max(event_index), -1) + 1)::integer as next_index
      from public.gnr8_migration_job_events
      where job_id = $1::text
      `,
      [jobId],
    );
    const nextIndex = nextIndexRes.rows[0]?.next_index ?? 0;
    const updatedAt = this.now();

    await this.client.query(
      `
      insert into public.gnr8_migration_job_events (
        job_id,
        event_index,
        event_type,
        event_timestamp,
        stage,
        message,
        details
      )
      values (
        $1::text,
        $2::integer,
        $3::text,
        $4::timestamptz,
        $5::text,
        $6::text,
        $7::jsonb
      )
      `,
      [jobId, nextIndex, event.type, event.timestamp, event.stage ?? null, event.message, jsonParam(event.details)],
    );

    await this.client.query(
      `
      update public.gnr8_migration_jobs
      set
        updated_at = $2::timestamptz,
        started_at = case
          when $3::text in ('JOB_STARTED', 'JOB_RESUMED') then coalesce(started_at, $4::timestamptz)
          else started_at
        end,
        completed_at = case
          when $3::text = 'JOB_COMPLETED' then $4::timestamptz
          else completed_at
        end,
        failed_at = case
          when $3::text = 'JOB_FAILED' then $4::timestamptz
          else failed_at
        end
      where id = $1::text
      `,
      [jobId, updatedAt, event.type, event.timestamp],
    );
  }

  async listJobs(): Promise<MigrationJob[]> {
    const res = await this.client.query<{ id: string }>(
      `
      select id
      from public.gnr8_migration_jobs
      order by created_at asc, id asc
      `,
    );
    const jobs = await Promise.all(res.rows.map((row) => this.getJob(row.id)));
    return jobs.filter((job): job is MigrationJob => job !== null);
  }

  private async persistStageStates(
    jobId: string,
    stageStates: Record<MigrationStage, MigrationStageStatusRecord>,
    updatedAt: string,
  ): Promise<void> {
    const ordered = MIGRATION_STAGE_ORDER.map((stage) => stageStates[stage]);
    for (const record of ordered) validateStageStateRecord(record);

    await this.client.query(
      `
      insert into public.gnr8_migration_job_stages (
        job_id,
        stage,
        status,
        started_at,
        ended_at,
        attempts,
        diagnostics,
        output_refs,
        error,
        updated_at
      )
      select
        t.job_id::text,
        t.stage::text,
        t.status::text,
        t.started_at::timestamptz,
        t.ended_at::timestamptz,
        t.attempts::integer,
        t.diagnostics::jsonb,
        t.output_refs::jsonb,
        t.error::jsonb,
        t.updated_at::timestamptz
      from unnest(
        $1::text[],
        $2::text[],
        $3::text[],
        $4::timestamptz[],
        $5::timestamptz[],
        $6::integer[],
        $7::jsonb[],
        $8::jsonb[],
        $9::jsonb[],
        $10::timestamptz[]
      ) as t(
        job_id,
        stage,
        status,
        started_at,
        ended_at,
        attempts,
        diagnostics,
        output_refs,
        error,
        updated_at
      )
      on conflict (job_id, stage)
      do update set
        status = excluded.status,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        attempts = excluded.attempts,
        diagnostics = excluded.diagnostics,
        output_refs = excluded.output_refs,
        error = excluded.error,
        updated_at = excluded.updated_at
      `,
      [
        ordered.map(() => jobId),
        ordered.map((record) => record.stage),
        ordered.map((record) => record.state),
        ordered.map((record) => record.startedAt),
        ordered.map((record) => record.endedAt),
        ordered.map((record) => record.attempts),
        ordered.map((record) => jsonParam(record.diagnostics) ?? "[]"),
        ordered.map((record) => jsonParam(record.outputRefs) ?? "{}"),
        ordered.map((record) => jsonParam(record.error)),
        ordered.map(() => updatedAt),
      ],
    );
  }

  private async persistActivationHistory(
    jobId: string,
    history: MigrationActivationExecutionResult[],
  ): Promise<void> {
    await this.client.query(`delete from public.gnr8_migration_job_activation_history where job_id = $1::text`, [jobId]);

    if (history.length === 0) {
      return;
    }

    await this.client.query(
      `
      insert into public.gnr8_migration_job_activation_history (
        job_id,
        execution_id,
        history_index,
        result
      )
      select
        t.job_id::text,
        t.execution_id::text,
        t.history_index::integer,
        t.result::jsonb
      from unnest(
        $1::text[],
        $2::text[],
        $3::integer[],
        $4::jsonb[]
      ) as t(
        job_id,
        execution_id,
        history_index,
        result
      )
      on conflict (job_id, execution_id)
      do update set
        history_index = excluded.history_index,
        result = excluded.result
      `,
      [
        history.map(() => jobId),
        history.map((result) => result.executionId),
        history.map((_result, index) => index),
        history.map((result) => jsonParam(result) ?? "{}"),
      ],
    );
  }
}
