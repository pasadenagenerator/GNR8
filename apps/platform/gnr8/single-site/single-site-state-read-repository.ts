import "server-only";

import { getSuperadminPool } from "../../src/superadmin/db";
import {
  buildSingleSiteMigrationReadModel,
  type SingleSiteMigrationReadModel,
  type SingleSiteMigrationReadRepositorySnapshot,
  type SingleSiteRawBlockerRow,
  type SingleSiteRawCloseoutRow,
  type SingleSiteRawSourceEvidenceRefRow,
  type SingleSiteRawStageSummaryRow,
  type SingleSiteSourceEvidenceReviewSummary,
  type SingleSiteStateHistoryItem,
} from "./single-site-state-read-model";
import type {
  SingleSiteCloneReviewEventRow,
  SingleSiteCloneReviewItemRow,
  SingleSiteCloneReviewRefRow,
  SingleSiteCloneReviewRow,
  SingleSiteEvidenceItemRow,
  SingleSiteMigrationRefRow,
  SingleSiteMigrationRow,
  SingleSitePgClient,
  SingleSiteReviewEventRow,
  SingleSiteSourceEvidenceReviewRow,
  SingleSiteStateEventRow,
} from "./single-site-state-writer-repository";

export type SingleSiteStateReadClient = SingleSitePgClient & {
  release?: () => void;
};

export type SingleSiteStateReadPool = {
  connect(): Promise<SingleSiteStateReadClient>;
};

export class SingleSiteStateReadRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";
    super(`${message}${causeMessage}`);
    this.name = "SingleSiteStateReadRepositoryError";
  }
}

function requiredText(field: string, value: unknown): string {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    throw new SingleSiteStateReadRepositoryError(`${field} is required`);
  }
  return String(value).trim();
}

async function withReadOnlyTransaction<T>(
  pool: SingleSiteStateReadPool,
  fn: (client: SingleSiteStateReadClient, capturedAt: string) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let started = false;
  try {
    await client.query("begin isolation level repeatable read read only");
    started = true;
    const captured = await client.query("select transaction_timestamp()::text as captured_at");
    const capturedAt = String(captured.rows[0]?.captured_at ?? new Date().toISOString());
    const result = await fn(client, capturedAt);
    await client.query("commit");
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("rollback");
      } catch {
        // Best-effort cleanup for a failed read-only projection.
      }
    }
    throw new SingleSiteStateReadRepositoryError("single_site_state_read_repository_failed", error);
  } finally {
    client.release?.();
  }
}

export class SingleSiteStateReadRepository {
  constructor(private readonly pool: SingleSiteStateReadPool = getSuperadminPool()) {}

  withReadOnlyTransaction<T>(fn: (client: SingleSiteStateReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    return withReadOnlyTransaction(this.pool, fn);
  }

  async readByMigrationId(migrationId: string): Promise<SingleSiteMigrationReadModel | null> {
    return this.withReadOnlyTransaction(async (client, capturedAt) => {
      const snapshot = await this.readSnapshotByMigrationId(client, capturedAt, requiredText("migrationId", migrationId));
      return snapshot ? buildSingleSiteMigrationReadModel(snapshot) : null;
    });
  }

  async listBySiteId(siteId: string, limit = 50): Promise<SingleSiteMigrationReadModel[]> {
    return this.withReadOnlyTransaction(async (client, capturedAt) => {
      const rows = await this.listMigrationHeadersBySiteId(client, requiredText("siteId", siteId), limit);
      const snapshots = await Promise.all(rows.map((row) => this.readSnapshotForMigration(client, capturedAt, row)));
      return snapshots.map(buildSingleSiteMigrationReadModel);
    });
  }

  async listByClientId(clientId: string, limit = 50): Promise<SingleSiteMigrationReadModel[]> {
    return this.withReadOnlyTransaction(async (client, capturedAt) => {
      const rows = await this.listMigrationHeadersByClientId(client, requiredText("clientId", clientId), limit);
      const snapshots = await Promise.all(rows.map((row) => this.readSnapshotForMigration(client, capturedAt, row)));
      return snapshots.map(buildSingleSiteMigrationReadModel);
    });
  }

  async listActiveNonTerminalMigrations(limit = 50): Promise<SingleSiteMigrationReadModel[]> {
    return this.withReadOnlyTransaction(async (client, capturedAt) => {
      const rows = await this.listActiveMigrationHeaders(client, limit);
      const snapshots = await Promise.all(rows.map((row) => this.readSnapshotForMigration(client, capturedAt, row)));
      return snapshots.map(buildSingleSiteMigrationReadModel);
    });
  }

  async readLatestSourceEvidenceReviewForMigration(migrationId: string): Promise<SingleSiteSourceEvidenceReviewSummary | null> {
    const model = await this.readByMigrationId(migrationId);
    return model?.sourceEvidenceReview ?? null;
  }

  async readBlockersForMigration(migrationId: string): Promise<SingleSiteMigrationReadModel["blockers"] | null> {
    const model = await this.readByMigrationId(migrationId);
    return model?.blockers ?? null;
  }

  async readStateHistoryForMigration(migrationId: string): Promise<SingleSiteStateHistoryItem[] | null> {
    const model = await this.readByMigrationId(migrationId);
    return model?.stateHistory ?? null;
  }

  async readSnapshotByMigrationId(
    client: SingleSitePgClient,
    capturedAt: string,
    migrationId: string,
  ): Promise<SingleSiteMigrationReadRepositorySnapshot | null> {
    const migration = await this.readMigrationHeader(client, migrationId);
    return migration ? this.readSnapshotForMigration(client, capturedAt, migration) : null;
  }

  private async readSnapshotForMigration(
    client: SingleSitePgClient,
    capturedAt: string,
    migration: SingleSiteMigrationRow,
  ): Promise<SingleSiteMigrationReadRepositorySnapshot> {
    const stateEvents = await this.readStateEventRows(client, migration.id);
    const refs = await this.readMigrationRefs(client, migration.id);
    const stageSummaries = await this.readStageSummaries(client, migration.id);
    const blockers = await this.readBlockerRows(client, migration.id);
    const closeout = await this.readCloseout(client, migration.id);
    const sourceEvidenceReviews = await this.readSourceEvidenceReviewRows(client, migration.id);
    const latestSourceEvidenceReview = this.pickLatestSourceEvidenceReview(migration, sourceEvidenceReviews);
    const sourceEvidenceItems = latestSourceEvidenceReview ? await this.readSourceEvidenceItems(client, latestSourceEvidenceReview.id) : [];
    const sourceEvidenceRefs = latestSourceEvidenceReview ? await this.readSourceEvidenceRefs(client, latestSourceEvidenceReview.id) : [];
    const sourceEvidenceEvents = latestSourceEvidenceReview ? await this.readSourceEvidenceEvents(client, latestSourceEvidenceReview.id) : [];
    const cloneReviews = await this.readCloneReviewRows(client, migration.id);
    const latestCloneReview = cloneReviews[0] ?? null;
    const cloneReviewItems = latestCloneReview ? await this.readCloneReviewItems(client, latestCloneReview.id) : [];
    const cloneReviewRefs = latestCloneReview ? await this.readCloneReviewRefs(client, latestCloneReview.id) : [];
    const cloneReviewEvents = latestCloneReview ? await this.readCloneReviewEvents(client, latestCloneReview.id) : [];

    return {
      capturedAt,
      migration,
      stateEvents,
      refs,
      stageSummaries,
      blockers,
      closeout,
      sourceEvidenceReviews,
      latestSourceEvidenceReview,
      sourceEvidenceItems,
      sourceEvidenceRefs,
      sourceEvidenceEvents,
      cloneReviews,
      latestCloneReview,
      cloneReviewItems,
      cloneReviewRefs,
      cloneReviewEvents,
    };
  }

  private async readMigrationHeader(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteMigrationRow | null> {
    const result = await client.query(
      `
      select
        *,
        terminal_at::text as terminal_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_migrations
      where id = $1::uuid
      limit 1
      `,
      [requiredText("migrationId", migrationId)],
    );
    return (result.rows[0] as SingleSiteMigrationRow | undefined) ?? null;
  }

  private async listMigrationHeadersBySiteId(client: SingleSitePgClient, siteId: string, limit: number): Promise<SingleSiteMigrationRow[]> {
    const result = await client.query(
      `
      select
        *,
        terminal_at::text as terminal_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_migrations
      where site_id::text = $1::text
         or ownership_site_id::text = $1::text
         or runtime_site_id = $1::text
      order by public.gnr8_single_site_migrations.updated_at desc, public.gnr8_single_site_migrations.created_at desc
      limit $2
      `,
      [siteId, Math.max(1, Math.min(Number(limit) || 50, 200))],
    );
    return result.rows as SingleSiteMigrationRow[];
  }

  private async listMigrationHeadersByClientId(client: SingleSitePgClient, clientId: string, limit: number): Promise<SingleSiteMigrationRow[]> {
    const result = await client.query(
      `
      select
        *,
        terminal_at::text as terminal_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_migrations
      where client_id::text = $1::text
      order by public.gnr8_single_site_migrations.updated_at desc, public.gnr8_single_site_migrations.created_at desc
      limit $2
      `,
      [clientId, Math.max(1, Math.min(Number(limit) || 50, 200))],
    );
    return result.rows as SingleSiteMigrationRow[];
  }

  private async listActiveMigrationHeaders(client: SingleSitePgClient, limit: number): Promise<SingleSiteMigrationRow[]> {
    const result = await client.query(
      `
      select
        *,
        terminal_at::text as terminal_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_migrations
      where current_state not in ('migration_closed_out', 'migration_failed', 'migration_cancelled')
      order by public.gnr8_single_site_migrations.updated_at desc, public.gnr8_single_site_migrations.created_at desc
      limit $1
      `,
      [Math.max(1, Math.min(Number(limit) || 50, 200))],
    );
    return result.rows as SingleSiteMigrationRow[];
  }

  private async readStateEventRows(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteStateEventRow[]> {
    const result = await client.query(
      `
      select
        *,
        occurred_at::text as occurred_at,
        created_at::text as created_at
      from public.gnr8_single_site_migration_state_events
      where migration_id = $1::uuid
      order by event_index asc, public.gnr8_single_site_migration_state_events.occurred_at asc
      `,
      [migrationId],
    );
    return result.rows as SingleSiteStateEventRow[];
  }

  private async readMigrationRefs(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteMigrationRefRow[]> {
    const result = await client.query(
      `
      select
        *,
        captured_at::text as captured_at,
        fresh_until::text as fresh_until,
        created_at::text as created_at
      from public.gnr8_single_site_migration_refs
      where migration_id = $1::uuid
      order by public.gnr8_single_site_migration_refs.created_at asc, ref_role asc
      `,
      [migrationId],
    );
    return result.rows as SingleSiteMigrationRefRow[];
  }

  private async readStageSummaries(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteRawStageSummaryRow[]> {
    const result = await client.query(
      `
      select
        *,
        started_at::text as started_at,
        completed_at::text as completed_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_migration_stage_summaries
      where migration_id = $1::uuid
      order by stage asc
      `,
      [migrationId],
    );
    return result.rows as SingleSiteRawStageSummaryRow[];
  }

  private async readBlockerRows(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteRawBlockerRow[]> {
    const result = await client.query(
      `
      select
        *,
        opened_at::text as opened_at,
        resolved_at::text as resolved_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_migration_blockers
      where migration_id = $1::uuid
      order by
        case severity when 'p0' then 0 when 'p1' then 1 when 'p2' then 2 when 'p3' then 3 else 4 end,
        public.gnr8_single_site_migration_blockers.opened_at desc
      `,
      [migrationId],
    );
    return result.rows as SingleSiteRawBlockerRow[];
  }

  private async readCloseout(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteRawCloseoutRow | null> {
    const result = await client.query(
      `
      select
        *,
        closed_at::text as closed_at,
        created_at::text as created_at
      from public.gnr8_single_site_migration_closeouts
      where migration_id = $1::uuid
      order by public.gnr8_single_site_migration_closeouts.created_at desc
      limit 1
      `,
      [migrationId],
    );
    return (result.rows[0] as SingleSiteRawCloseoutRow | undefined) ?? null;
  }

  private async readSourceEvidenceReviewRows(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteSourceEvidenceReviewRow[]> {
    const result = await client.query(
      `
      select
        *,
        capture_started_at::text as capture_started_at,
        capture_completed_at::text as capture_completed_at,
        evidence_captured_at::text as evidence_captured_at,
        fresh_until::text as fresh_until,
        review_started_at::text as review_started_at,
        reviewed_at::text as reviewed_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_source_evidence_reviews
      where migration_id = $1::uuid
      order by public.gnr8_single_site_source_evidence_reviews.updated_at desc, public.gnr8_single_site_source_evidence_reviews.created_at desc
      `,
      [migrationId],
    );
    return result.rows as SingleSiteSourceEvidenceReviewRow[];
  }

  private pickLatestSourceEvidenceReview(
    migration: SingleSiteMigrationRow,
    reviews: readonly SingleSiteSourceEvidenceReviewRow[],
  ): SingleSiteSourceEvidenceReviewRow | null {
    if (migration.latest_source_evidence_review_id) {
      const linked = reviews.find((review) => review.id === migration.latest_source_evidence_review_id);
      if (linked) return linked;
    }
    return reviews[0] ?? null;
  }

  private async readSourceEvidenceItems(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteEvidenceItemRow[]> {
    const result = await client.query(
      `
      select
        *,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_source_evidence_review_items
      where review_id = $1::uuid
      order by evidence_category asc
      `,
      [reviewId],
    );
    return result.rows as SingleSiteEvidenceItemRow[];
  }

  private async readSourceEvidenceRefs(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteRawSourceEvidenceRefRow[]> {
    const result = await client.query(
      `
      select
        *,
        captured_at::text as captured_at,
        fresh_until::text as fresh_until,
        created_at::text as created_at
      from public.gnr8_single_site_source_evidence_review_refs
      where review_id = $1::uuid
      order by public.gnr8_single_site_source_evidence_review_refs.created_at asc, ref_role asc
      `,
      [reviewId],
    );
    return result.rows as SingleSiteRawSourceEvidenceRefRow[];
  }

  private async readSourceEvidenceEvents(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteReviewEventRow[]> {
    const result = await client.query(
      `
      select
        *,
        occurred_at::text as occurred_at,
        created_at::text as created_at
      from public.gnr8_single_site_source_evidence_review_events
      where review_id = $1::uuid
      order by event_index asc, public.gnr8_single_site_source_evidence_review_events.occurred_at asc
      `,
      [reviewId],
    );
    return result.rows as SingleSiteReviewEventRow[];
  }

  private async readCloneReviewRows(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteCloneReviewRow[]> {
    const result = await client.query(
      `
      select
        *,
        review_started_at::text as review_started_at,
        reviewed_at::text as reviewed_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_clone_reviews
      where migration_id = $1::uuid
      order by public.gnr8_single_site_clone_reviews.updated_at desc, public.gnr8_single_site_clone_reviews.created_at desc
      `,
      [migrationId],
    );
    return result.rows as SingleSiteCloneReviewRow[];
  }

  private async readCloneReviewItems(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteCloneReviewItemRow[]> {
    const result = await client.query(
      `
      select
        *,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_single_site_clone_review_items
      where review_id = $1::uuid
      order by item_key asc
      `,
      [reviewId],
    );
    return result.rows as SingleSiteCloneReviewItemRow[];
  }

  private async readCloneReviewRefs(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteCloneReviewRefRow[]> {
    const result = await client.query(
      `
      select
        *,
        captured_at::text as captured_at,
        fresh_until::text as fresh_until,
        created_at::text as created_at
      from public.gnr8_single_site_clone_review_refs
      where review_id = $1::uuid
      order by public.gnr8_single_site_clone_review_refs.created_at asc, ref_role asc
      `,
      [reviewId],
    );
    return result.rows as SingleSiteCloneReviewRefRow[];
  }

  private async readCloneReviewEvents(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteCloneReviewEventRow[]> {
    const result = await client.query(
      `
      select
        *,
        occurred_at::text as occurred_at,
        created_at::text as created_at
      from public.gnr8_single_site_clone_review_events
      where review_id = $1::uuid
      order by event_index asc, public.gnr8_single_site_clone_review_events.occurred_at asc
      `,
      [reviewId],
    );
    return result.rows as SingleSiteCloneReviewEventRow[];
  }
}
