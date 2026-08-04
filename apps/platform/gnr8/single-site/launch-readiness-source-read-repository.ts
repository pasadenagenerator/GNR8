import "server-only";

import type { Pool } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { SingleSitePgClient } from "./single-site-state-writer-repository";

export type LaunchReadinessSourceReadClient = SingleSitePgClient & {
  release?: () => void;
};

export type LaunchReadinessSourceReadPool = Pick<Pool, "connect">;

export type LaunchReadinessApprovalSourceRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  content_approval_id: string;
  content_approval_status: string;
  aaf_content_approval_decision_id: string;
  require_client_approval: boolean;
  client_approval_id: string | null;
  client_approval_status: string | null;
  aaf_client_approval_decision_id: string | null;
  improved_version_review_id: string;
  improved_version_review_status: string;
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  domain_readiness_ref: string | null;
  billing_hosting_entitlement_ref: string | null;
  rollback_readiness_ref: string | null;
  publish_target_ref: string | null;
  status: string;
  decision: string | null;
  readiness_work_ready: boolean;
  approved_with_limitations: boolean;
  aaf_launch_approval_request_id: string | null;
  aaf_launch_approval_decision_id: string | null;
  aaf_launch_approval_scope: string | null;
  aaf_launch_approval_action: string | null;
  aaf_launch_approval_subject_type: string | null;
  evidence_package_refs_json: unknown;
  launch_checklist_refs_json: unknown;
  blocker_refs_json: unknown;
  smoke_qa_refs_json: unknown;
  limitations_json: unknown;
  findings_summary_json: unknown;
  decision_summary_json: unknown;
  semantic_watermark: string | null;
  payload_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessContentApprovalSourceRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  improved_version_review_id: string;
  improved_version_review_status: string;
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  status: string;
  decision: string | null;
  content_approval_ready: boolean;
  approved_with_limitations: boolean;
  aaf_content_approval_request_id: string | null;
  aaf_content_approval_decision_id: string | null;
  aaf_content_approval_scope: string | null;
  aaf_content_approval_action: string | null;
  aaf_content_approval_subject_type: string | null;
  evidence_package_refs_json: unknown;
  rendered_snapshot_refs_json: unknown;
  content_snapshot_refs_json: unknown;
  metadata_snapshot_refs_json: unknown;
  caveat_refs_json: unknown;
  limitations_json: unknown;
  unresolved_not_applied_recommendations_json: unknown;
  findings_summary_json: unknown;
  semantic_watermark: string | null;
  payload_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessClientApprovalSourceRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  content_approval_id: string;
  content_approval_status: string;
  aaf_content_approval_decision_id: string;
  improved_version_review_id: string;
  improved_version_review_status: string;
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  status: string;
  decision: string | null;
  client_approval_ready: boolean;
  approved_with_limitations: boolean;
  aaf_client_approval_request_id: string | null;
  aaf_client_approval_decision_id: string | null;
  aaf_client_approval_scope: string | null;
  aaf_client_approval_action: string | null;
  aaf_client_approval_subject_type: string | null;
  evidence_package_refs_json: unknown;
  rendered_snapshot_refs_json: unknown;
  client_facing_summary_refs_json: unknown;
  limitations_json: unknown;
  deferred_or_not_applied_recommendation_refs_json: unknown;
  findings_summary_json: unknown;
  semantic_watermark: string | null;
  payload_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessImprovedReviewSourceRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  review_status: string;
  review_decision: string | null;
  content_approval_ready: boolean;
  accepted_with_limitations: boolean;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  diagnostics_json: unknown;
  semantic_watermark: string | null;
  payload_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessRuntimeSiteVersionSourceRow = {
  id: string;
  site_id: string;
  version_no: number | string | null;
  state: string;
  source: string;
  actor: string;
  renderer_compatibility_version: string;
  import_provenance_summary: unknown | null;
  artifact_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export type LaunchReadinessRuntimeArtifactSourceRow = {
  id: string;
  site_id: string;
  site_version_id: string;
  renderer_compatibility_version: string;
  bundle_sha256: string;
  html_path_count: number | string;
  asset_fingerprint_count: number | string;
  manifest: unknown;
  publish_stage: string;
  shadow_restricted: boolean;
  artifact_governance: unknown;
  created_at: string;
};

export type LaunchReadinessPublishTargetSourceRow = {
  id: string;
  environment: string;
  target_kind: string;
  publish_stage: string;
  status: string;
  policy_version: string;
  requires_aaf: boolean;
  requires_ddom_snapshot: boolean;
  requires_launch_signoff: boolean;
  allowed_artifact_stages: unknown;
  limitations_json: unknown;
  source_watermark: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessDdomSnapshotSourceRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  site_id: string;
  site_version_id: string | null;
  domain_binding_id: string | null;
  host_binding_id: string | null;
  domain: string | null;
  internal_host: string | null;
  intended_launch_domain: string | null;
  readiness_state: string;
  readiness_blockers: unknown;
  readiness_warnings: unknown;
  freshness_state: string;
  fresh_until: string | null;
  stale_reason: string | null;
  captured_at: string;
  source_watermark: string;
  source_watermark_json: unknown;
  snapshot_json: unknown;
  created_at: string;
};

export type LaunchReadinessDdomRefSourceRow = {
  id: string;
  snapshot_id: string;
  ref_role: string;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  captured_at: string | null;
  metadata_json: unknown;
  created_at: string;
};

export type LaunchReadinessMigrationRefSourceRow = {
  id: string;
  migration_id: string;
  ref_role: string;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  semantic_watermark: string | null;
  content_hash: string | null;
  captured_at: string | null;
  fresh_until: string | null;
  evidence_only: boolean;
  metadata_json: unknown;
  created_at: string;
};

export type LaunchReadinessSourceReadRepositoryLike = {
  withReadOnlyTransaction<T>(fn: (client: LaunchReadinessSourceReadClient, capturedAt: string) => Promise<T>): Promise<T>;
  readLaunchApproval(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; launchApprovalDecisionRef: string },
  ): Promise<LaunchReadinessApprovalSourceRow | null>;
  readContentApproval(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; contentApprovalId?: string | null; candidateRef: string; artifactRef: string },
  ): Promise<LaunchReadinessContentApprovalSourceRow | null>;
  readClientApproval(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; clientApprovalId?: string | null; candidateRef: string; artifactRef: string },
  ): Promise<LaunchReadinessClientApprovalSourceRow | null>;
  readImprovedVersionReview(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; candidateRef: string; artifactRef: string },
  ): Promise<LaunchReadinessImprovedReviewSourceRow | null>;
  readRuntimeSiteVersion(client: SingleSitePgClient, versionRefOrId: string): Promise<LaunchReadinessRuntimeSiteVersionSourceRow | null>;
  readRuntimeArtifact(
    client: SingleSitePgClient,
    input: { artifactRefOrId: string; siteVersionRefOrId: string },
  ): Promise<LaunchReadinessRuntimeArtifactSourceRow | null>;
  readPublishTarget(client: SingleSitePgClient, targetId: string): Promise<LaunchReadinessPublishTargetSourceRow | null>;
  readLatestDdomSnapshot(
    client: SingleSitePgClient,
    input: { tenantId: string; clientId: string; siteId: string; siteVersionRefOrId?: string | null; domainHint?: string | null },
  ): Promise<LaunchReadinessDdomSnapshotSourceRow | null>;
  readDdomRefs(client: SingleSitePgClient, snapshotId: string): Promise<LaunchReadinessDdomRefSourceRow[]>;
  readMigrationRefs(client: SingleSitePgClient, input: { migrationId: string; roles: readonly string[] }): Promise<LaunchReadinessMigrationRefSourceRow[]>;
};

export class LaunchReadinessSourceReadRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";
    super(`${message}${causeMessage}`);
    this.name = "LaunchReadinessSourceReadRepositoryError";
  }
}

function sourceId(refOrId: string): string {
  const trimmed = refOrId.trim();
  const parts = trimmed.split(":");
  return parts[parts.length - 1] || trimmed;
}

export class LaunchReadinessSourceReadRepository implements LaunchReadinessSourceReadRepositoryLike {
  constructor(private readonly pool: LaunchReadinessSourceReadPool = getSuperadminPool()) {}

  async withReadOnlyTransaction<T>(fn: (client: LaunchReadinessSourceReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
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
          // Best-effort cleanup for a failed read-only source transaction.
        }
      }
      throw new LaunchReadinessSourceReadRepositoryError("launch_readiness_source_read_repository_failed", error);
    } finally {
      client.release?.();
    }
  }

  async readLaunchApproval(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; launchApprovalDecisionRef: string },
  ): Promise<LaunchReadinessApprovalSourceRow | null> {
    const refId = sourceId(input.launchApprovalDecisionRef);
    const result = await client.query(
      `
      select
        id::text,
        migration_id::text,
        client_id::text,
        site_id::text,
        content_approval_id::text,
        content_approval_status,
        aaf_content_approval_decision_id,
        require_client_approval,
        client_approval_id::text,
        client_approval_status,
        aaf_client_approval_decision_id,
        improved_version_review_id::text,
        improved_version_review_status,
        improved_candidate_site_version_ref,
        improved_runtime_artifact_ref,
        domain_readiness_ref,
        billing_hosting_entitlement_ref,
        rollback_readiness_ref,
        publish_target_ref,
        status,
        decision,
        readiness_work_ready,
        approved_with_limitations,
        aaf_launch_approval_request_id,
        aaf_launch_approval_decision_id,
        aaf_launch_approval_scope,
        aaf_launch_approval_action,
        aaf_launch_approval_subject_type,
        evidence_package_refs_json,
        launch_checklist_refs_json,
        blocker_refs_json,
        smoke_qa_refs_json,
        limitations_json,
        findings_summary_json,
        decision_summary_json,
        semantic_watermark,
        payload_hash,
        created_at::text,
        updated_at::text
      from public.gnr8_single_site_launch_approvals
      where migration_id::text = $1
        and client_id::text = $2
        and site_id::text = $3
        and (aaf_launch_approval_decision_id = $4 or id::text = $4)
      order by updated_at desc, created_at desc
      limit 1
      `,
      [input.migrationId, input.clientId, input.siteId, refId],
    );
    return (result.rows[0] as LaunchReadinessApprovalSourceRow | undefined) ?? null;
  }

  async readContentApproval(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; contentApprovalId?: string | null; candidateRef: string; artifactRef: string },
  ): Promise<LaunchReadinessContentApprovalSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        migration_id::text,
        client_id::text,
        site_id::text,
        improved_version_review_id::text,
        improved_version_review_status,
        improved_candidate_site_version_ref,
        improved_runtime_artifact_ref,
        status,
        decision,
        content_approval_ready,
        approved_with_limitations,
        aaf_content_approval_request_id,
        aaf_content_approval_decision_id,
        aaf_content_approval_scope,
        aaf_content_approval_action,
        aaf_content_approval_subject_type,
        evidence_package_refs_json,
        rendered_snapshot_refs_json,
        content_snapshot_refs_json,
        metadata_snapshot_refs_json,
        caveat_refs_json,
        limitations_json,
        unresolved_not_applied_recommendations_json,
        findings_summary_json,
        semantic_watermark,
        payload_hash,
        created_at::text,
        updated_at::text
      from public.gnr8_single_site_content_approvals
      where migration_id::text = $1
        and client_id::text = $2
        and site_id::text = $3
        and ($4::text is null or id::text = $4::text)
        and ($4::text is not null or (
          improved_candidate_site_version_ref = $5
          and improved_runtime_artifact_ref = $6
        ))
      order by
        (status in ('approved', 'approved_with_limitations')) desc,
        updated_at desc,
        created_at desc
      limit 1
      `,
      [input.migrationId, input.clientId, input.siteId, input.contentApprovalId ?? null, input.candidateRef, input.artifactRef],
    );
    return (result.rows[0] as LaunchReadinessContentApprovalSourceRow | undefined) ?? null;
  }

  async readClientApproval(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; clientApprovalId?: string | null; candidateRef: string; artifactRef: string },
  ): Promise<LaunchReadinessClientApprovalSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        migration_id::text,
        client_id::text,
        site_id::text,
        content_approval_id::text,
        content_approval_status,
        aaf_content_approval_decision_id,
        improved_version_review_id::text,
        improved_version_review_status,
        improved_candidate_site_version_ref,
        improved_runtime_artifact_ref,
        status,
        decision,
        client_approval_ready,
        approved_with_limitations,
        aaf_client_approval_request_id,
        aaf_client_approval_decision_id,
        aaf_client_approval_scope,
        aaf_client_approval_action,
        aaf_client_approval_subject_type,
        evidence_package_refs_json,
        rendered_snapshot_refs_json,
        client_facing_summary_refs_json,
        limitations_json,
        deferred_or_not_applied_recommendation_refs_json,
        findings_summary_json,
        semantic_watermark,
        payload_hash,
        created_at::text,
        updated_at::text
      from public.gnr8_single_site_client_approvals
      where migration_id::text = $1
        and client_id::text = $2
        and site_id::text = $3
        and ($4::text is null or id::text = $4::text)
        and ($4::text is not null or (
          improved_candidate_site_version_ref = $5
          and improved_runtime_artifact_ref = $6
        ))
      order by
        (status in ('approved', 'approved_with_limitations')) desc,
        updated_at desc,
        created_at desc
      limit 1
      `,
      [input.migrationId, input.clientId, input.siteId, input.clientApprovalId ?? null, input.candidateRef, input.artifactRef],
    );
    return (result.rows[0] as LaunchReadinessClientApprovalSourceRow | undefined) ?? null;
  }

  async readImprovedVersionReview(
    client: SingleSitePgClient,
    input: { migrationId: string; clientId: string; siteId: string; candidateRef: string; artifactRef: string },
  ): Promise<LaunchReadinessImprovedReviewSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        migration_id::text,
        client_id::text,
        site_id::text,
        improved_candidate_site_version_ref,
        improved_runtime_artifact_ref,
        review_status,
        review_decision,
        content_approval_ready,
        accepted_with_limitations,
        limitations_json,
        warnings_json,
        blockers_json,
        diagnostics_json,
        semantic_watermark,
        payload_hash,
        created_at::text,
        updated_at::text
      from public.gnr8_single_site_improved_version_reviews
      where migration_id::text = $1
        and client_id::text = $2
        and site_id::text = $3
        and improved_candidate_site_version_ref = $4
        and improved_runtime_artifact_ref = $5
      order by
        (review_status in ('accepted', 'accepted_with_limitations')) desc,
        updated_at desc,
        created_at desc
      limit 1
      `,
      [input.migrationId, input.clientId, input.siteId, input.candidateRef, input.artifactRef],
    );
    return (result.rows[0] as LaunchReadinessImprovedReviewSourceRow | undefined) ?? null;
  }

  async readRuntimeSiteVersion(client: SingleSitePgClient, versionRefOrId: string): Promise<LaunchReadinessRuntimeSiteVersionSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        site_id::text,
        version_no,
        state::text,
        source::text,
        actor::text,
        renderer_compatibility_version::text,
        import_provenance_summary,
        artifact_id::text,
        created_at::text,
        updated_at::text
      from public.gnr8_runtime_site_versions
      where id::text = $1
      limit 1
      `,
      [sourceId(versionRefOrId)],
    );
    return (result.rows[0] as LaunchReadinessRuntimeSiteVersionSourceRow | undefined) ?? null;
  }

  async readRuntimeArtifact(
    client: SingleSitePgClient,
    input: { artifactRefOrId: string; siteVersionRefOrId: string },
  ): Promise<LaunchReadinessRuntimeArtifactSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        site_id::text,
        site_version_id::text,
        renderer_compatibility_version::text,
        bundle_sha256::text,
        (select count(*)::text from jsonb_object_keys(coalesce(html_by_path, '{}'::jsonb))) as html_path_count,
        (select count(*)::text from jsonb_object_keys(coalesce(asset_fingerprint_map, '{}'::jsonb))) as asset_fingerprint_count,
        manifest,
        publish_stage::text,
        shadow_restricted,
        artifact_governance,
        created_at::text
      from public.gnr8_runtime_artifacts
      where id::text = $1
         or (id::text is distinct from $1 and site_version_id::text = $2)
      order by (id::text = $1) desc, created_at desc
      limit 1
      `,
      [sourceId(input.artifactRefOrId), sourceId(input.siteVersionRefOrId)],
    );
    return (result.rows[0] as LaunchReadinessRuntimeArtifactSourceRow | undefined) ?? null;
  }

  async readPublishTarget(client: SingleSitePgClient, targetId: string): Promise<LaunchReadinessPublishTargetSourceRow | null> {
    const result = await client.query(
      `
      select
        id,
        environment,
        target_kind,
        publish_stage,
        status,
        policy_version,
        requires_aaf,
        requires_ddom_snapshot,
        requires_launch_signoff,
        allowed_artifact_stages,
        limitations_json,
        source_watermark,
        created_at::text,
        updated_at::text
      from public.gnr8_publish_targets
      where id = $1::text
      limit 1
      `,
      [sourceId(targetId)],
    );
    return (result.rows[0] as LaunchReadinessPublishTargetSourceRow | undefined) ?? null;
  }

  async readLatestDdomSnapshot(
    client: SingleSitePgClient,
    input: { tenantId: string; clientId: string; siteId: string; siteVersionRefOrId?: string | null; domainHint?: string | null },
  ): Promise<LaunchReadinessDdomSnapshotSourceRow | null> {
    const siteVersionId = input.siteVersionRefOrId ? sourceId(input.siteVersionRefOrId) : null;
    const result = await client.query(
      `
      select
        id::text,
        tenant_id,
        client_id,
        site_id,
        site_version_id::text,
        domain_binding_id::text,
        host_binding_id::text,
        domain,
        internal_host,
        intended_launch_domain,
        readiness_state,
        readiness_blockers,
        readiness_warnings,
        freshness_state,
        fresh_until::text,
        stale_reason,
        captured_at::text,
        source_watermark,
        source_watermark_json,
        snapshot_json,
        created_at::text
      from public.gnr8_ddom_readiness_snapshots
      where tenant_id = $1::text
        and client_id is not distinct from $2::text
        and site_id = $3::text
        and ($4::text is null or site_version_id::text = $4::text or site_version_id is null)
        and (
          $5::text is null
          or domain_binding_id::text = $5::text
          or host_binding_id::text = $5::text
          or lower(coalesce(domain, '')) = lower($5::text)
          or lower(coalesce(intended_launch_domain, '')) = lower($5::text)
          or (domain is null and intended_launch_domain is null)
        )
      order by
        (site_version_id::text = $4::text) desc nulls last,
        captured_at desc
      limit 1
      `,
      [input.tenantId, input.clientId, input.siteId, siteVersionId, input.domainHint ?? null],
    );
    return (result.rows[0] as LaunchReadinessDdomSnapshotSourceRow | undefined) ?? null;
  }

  async readDdomRefs(client: SingleSitePgClient, snapshotId: string): Promise<LaunchReadinessDdomRefSourceRow[]> {
    const result = await client.query(
      `
      select
        id::text,
        snapshot_id::text,
        ref_role,
        ref_type,
        source_system,
        source_table,
        source_record_id,
        source_version,
        source_watermark,
        captured_at::text,
        metadata_json,
        created_at::text
      from public.gnr8_ddom_readiness_snapshot_refs
      where snapshot_id::text = $1
      order by ref_role asc, source_table asc nulls last, source_record_id asc, id::text asc
      `,
      [snapshotId],
    );
    return result.rows as LaunchReadinessDdomRefSourceRow[];
  }

  async readMigrationRefs(client: SingleSitePgClient, input: { migrationId: string; roles: readonly string[] }): Promise<LaunchReadinessMigrationRefSourceRow[]> {
    if (input.roles.length === 0) return [];
    const result = await client.query(
      `
      select
        id::text,
        migration_id::text,
        ref_role,
        ref_type,
        source_system,
        source_table,
        source_record_id,
        source_version,
        source_watermark,
        semantic_watermark,
        content_hash,
        captured_at::text,
        fresh_until::text,
        evidence_only,
        metadata_json,
        created_at::text
      from public.gnr8_single_site_migration_refs
      where migration_id::text = $1
        and ref_role = any($2::text[])
      order by ref_role asc, source_table asc nulls last, source_record_id asc, id::text asc
      `,
      [input.migrationId, input.roles],
    );
    return result.rows as LaunchReadinessMigrationRefSourceRow[];
  }
}
