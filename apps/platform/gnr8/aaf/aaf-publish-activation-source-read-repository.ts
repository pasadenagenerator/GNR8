import "server-only";

import type { Pool } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { AafApprovalScope } from "@gnr8/runtime-contracts";
import type { AafPgClient } from "./aaf-writer-repository";

export type AafPublishActivationSourceReadClient = AafPgClient & {
  release?: () => void;
};

export type AafPublishActivationSourceReadPool = Pick<Pool, "connect">;

export type AafSiteVersionSourceRow = {
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

export type AafRuntimeArtifactSourceRow = {
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

export type AafActivePointerSourceRow = {
  site_id: string;
  active_site_version_id: string;
  active_artifact_id: string;
  updated_at: string | null;
};

export type AafPublishTargetSourceRow = {
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

export type AafDdomReadinessSourceRow = {
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

export type AafContentOverrideAggregateSourceRow = {
  site_id: string | null;
  site_version_id: string;
  published_count: string;
  max_updated_at: string | null;
  rows_watermark_json: unknown;
};

export type AafApprovalTimelineSourceRow = {
  approval_request_id: string;
  approval_decision_id: string | null;
  tenant_id: string;
  client_id: string | null;
  site_id: string | null;
  batch_id: string | null;
  job_id: string | null;
  site_version_id: string | null;
  domain_id: string | null;
  cost_center_id: string | null;
  scope: AafApprovalScope;
  subject_type: string;
  subject_id: string;
  request_status: string;
  request_policy_version: string;
  requested_expires_at: string | null;
  request_created_at: string;
  decision_status: string | null;
  decided_at: string | null;
  decision_policy_version: string | null;
  evidence_package_id: string | null;
  policy_evaluation_id: string | null;
  decision_expires_at: string | null;
  revocations_json: unknown;
  supersessions_json: unknown;
  partial_timeline_json: unknown;
};

export type AafPublishActivationSourceReadRepositoryLike = {
  withReadOnlyTransaction<T>(fn: (client: AafPublishActivationSourceReadClient, capturedAt: string) => Promise<T>): Promise<T>;
  readSiteVersion(client: AafPgClient, siteVersionId: string): Promise<AafSiteVersionSourceRow | null>;
  readRuntimeArtifact(
    client: AafPgClient,
    input: { runtimeArtifactId?: string | null; siteVersionId: string },
  ): Promise<AafRuntimeArtifactSourceRow | null>;
  readActivePointer(client: AafPgClient, siteId: string): Promise<AafActivePointerSourceRow | null>;
  readPublishTarget(client: AafPgClient, targetId: string): Promise<AafPublishTargetSourceRow | null>;
  readLatestDdomReadiness(
    client: AafPgClient,
    input: { siteId: string; siteVersionId?: string | null; domainHint?: string | null },
  ): Promise<AafDdomReadinessSourceRow | null>;
  readPublishedContentOverrideAggregate(client: AafPgClient, siteVersionId: string): Promise<AafContentOverrideAggregateSourceRow>;
  readApprovalTimeline(
    client: AafPgClient,
    input: {
      tenantId: string;
      clientId?: string | null;
      siteId?: string | null;
      batchId?: string | null;
      jobId?: string | null;
      siteVersionId?: string | null;
      domainId?: string | null;
      costCenterId?: string | null;
      scope: AafApprovalScope;
      subjectType: string;
      subjectId: string;
      approvalRequestId?: string | null;
      approvalDecisionId?: string | null;
    },
  ): Promise<AafApprovalTimelineSourceRow | null>;
};

export class AafPublishActivationReadOnlyTransactionUnavailableError extends Error {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "AafPublishActivationReadOnlyTransactionUnavailableError";
  }
}

export class AafPublishActivationSourceReadRepository implements AafPublishActivationSourceReadRepositoryLike {
  constructor(private readonly pool: AafPublishActivationSourceReadPool = getSuperadminPool()) {}

  async withReadOnlyTransaction<T>(fn: (client: AafPublishActivationSourceReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    const client = (await this.pool.connect()) as AafPublishActivationSourceReadClient;
    let transactionStarted = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      transactionStarted = true;
      const captured = await client.query("select transaction_timestamp()::text as captured_at");
      const capturedAt = String(captured.rows[0]?.captured_at ?? new Date().toISOString());
      const result = await fn(client, capturedAt);
      await client.query("commit");
      transactionStarted = false;
      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("rollback");
        } catch {
          // Best-effort cleanup after a failed read-only transaction.
        }
      }
      throw new AafPublishActivationReadOnlyTransactionUnavailableError("read_only_transaction_unavailable", error);
    } finally {
      client.release?.();
    }
  }

  async readSiteVersion(client: AafPgClient, siteVersionId: string): Promise<AafSiteVersionSourceRow | null> {
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
      where id = $1::uuid
      limit 1
      `,
      [siteVersionId],
    );
    return (result.rows[0] as AafSiteVersionSourceRow | undefined) ?? null;
  }

  async readRuntimeArtifact(
    client: AafPgClient,
    input: { runtimeArtifactId?: string | null; siteVersionId: string },
  ): Promise<AafRuntimeArtifactSourceRow | null> {
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
      where ($1::uuid is not null and id = $1::uuid)
         or ($1::uuid is null and site_version_id = $2::uuid)
      order by created_at desc
      limit 1
      `,
      [input.runtimeArtifactId ?? null, input.siteVersionId],
    );
    return (result.rows[0] as AafRuntimeArtifactSourceRow | undefined) ?? null;
  }

  async readActivePointer(client: AafPgClient, siteId: string): Promise<AafActivePointerSourceRow | null> {
    const result = await client.query(
      `
      select
        site_id::text,
        active_site_version_id::text,
        active_artifact_id::text,
        updated_at::text
      from public.gnr8_runtime_active_pointers
      where site_id = $1::text
      limit 1
      `,
      [siteId],
    );
    return (result.rows[0] as AafActivePointerSourceRow | undefined) ?? null;
  }

  async readPublishTarget(client: AafPgClient, targetId: string): Promise<AafPublishTargetSourceRow | null> {
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
      [targetId],
    );
    return (result.rows[0] as AafPublishTargetSourceRow | undefined) ?? null;
  }

  async readLatestDdomReadiness(
    client: AafPgClient,
    input: { siteId: string; siteVersionId?: string | null; domainHint?: string | null },
  ): Promise<AafDdomReadinessSourceRow | null> {
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
      where site_id = $1::text
        and ($2::uuid is null or site_version_id = $2::uuid or site_version_id is null)
        and (
          $3::text is null
          or domain_binding_id::text = $3::text
          or host_binding_id::text = $3::text
          or lower(coalesce(domain, '')) = lower($3::text)
          or lower(coalesce(intended_launch_domain, '')) = lower($3::text)
          or (domain is null and intended_launch_domain is null)
        )
      order by
        (site_version_id = $2::uuid) desc nulls last,
        (
          $3::text is not null
          and (
            domain_binding_id::text = $3::text
            or host_binding_id::text = $3::text
            or lower(coalesce(domain, '')) = lower($3::text)
            or lower(coalesce(intended_launch_domain, '')) = lower($3::text)
          )
        ) desc,
        captured_at desc
      limit 1
      `,
      [input.siteId, input.siteVersionId ?? null, input.domainHint ?? null],
    );
    return (result.rows[0] as AafDdomReadinessSourceRow | undefined) ?? null;
  }

  async readPublishedContentOverrideAggregate(client: AafPgClient, siteVersionId: string): Promise<AafContentOverrideAggregateSourceRow> {
    const result = await client.query(
      `
      select
        max(site_id)::text as site_id,
        $1::text as site_version_id,
        count(*)::text as published_count,
        max(updated_at)::text as max_updated_at,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', id::text,
              'siteId', site_id::text,
              'siteVersionId', site_version_id::text,
              'slotKey', slot_key::text,
              'valueType', value_type::text,
              'valueJson', value_json,
              'status', status::text,
              'updatedAt', updated_at::text
            )
            order by slot_key asc, id::text asc
          ) filter (where id is not null),
          '[]'::jsonb
        ) as rows_watermark_json
      from public.gnr8_content_overrides
      where site_version_id = $1::uuid
        and status = 'published'
      `,
      [siteVersionId],
    );
    return result.rows[0] as AafContentOverrideAggregateSourceRow;
  }

  async readApprovalTimeline(
    client: AafPgClient,
    input: {
      tenantId: string;
      clientId?: string | null;
      siteId?: string | null;
      batchId?: string | null;
      jobId?: string | null;
      siteVersionId?: string | null;
      domainId?: string | null;
      costCenterId?: string | null;
      scope: AafApprovalScope;
      subjectType: string;
      subjectId: string;
      approvalRequestId?: string | null;
      approvalDecisionId?: string | null;
    },
  ): Promise<AafApprovalTimelineSourceRow | null> {
    const result = await client.query(
      `
      select
        r.id::text as approval_request_id,
        d.id::text as approval_decision_id,
        r.tenant_id,
        r.client_id,
        r.site_id,
        r.batch_id,
        r.job_id,
        r.site_version_id,
        r.domain_id,
        r.cost_center_id,
        r.scope,
        r.subject_type,
        r.subject_id,
        r.status as request_status,
        r.policy_version as request_policy_version,
        r.requested_expires_at::text,
        r.created_at::text as request_created_at,
        d.status as decision_status,
        d.decided_at::text,
        d.policy_version as decision_policy_version,
        d.evidence_package_id::text,
        d.policy_evaluation_id::text,
        d.expires_at::text as decision_expires_at,
        coalesce(rv.revocations_json, '[]'::jsonb) as revocations_json,
        coalesce(sp.supersessions_json, '[]'::jsonb) as supersessions_json,
        coalesce(pt.partial_timeline_json, '[]'::jsonb) as partial_timeline_json
      from public.gnr8_aaf_approval_requests r
      left join lateral (
        select *
        from public.gnr8_aaf_approval_decisions d
        where d.approval_request_id = r.id
          and ($11::text is null or d.id::text = $11::text)
        order by
          (d.status = 'granted') desc,
          d.decided_at desc,
          d.created_at desc
        limit 1
      ) d on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', id::text,
            'approvalDecisionId', approval_decision_id::text,
            'revokedAt', revoked_at::text,
            'reason', reason,
            'createdAt', created_at::text
          )
          order by created_at asc
        ) as revocations_json
        from public.gnr8_aaf_approval_revocations
        where d.id is not null
          and approval_decision_id = d.id
      ) rv on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', id::text,
            'supersededApprovalRequestId', superseded_approval_request_id::text,
            'supersedingApprovalRequestId', superseding_approval_request_id::text,
            'supersededDecisionId', superseded_decision_id::text,
            'supersedingDecisionId', superseding_decision_id::text,
            'reason', reason,
            'createdAt', created_at::text
          )
          order by created_at asc
        ) as supersessions_json
        from public.gnr8_aaf_approval_supersession_links
        where superseded_approval_request_id = r.id
           or (d.id is not null and superseded_decision_id = d.id)
      ) sp on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', id::text,
            'missingEventName', missing_event_name,
            'failureReason', failure_reason,
            'status', status,
            'createdAt', created_at::text
          )
          order by created_at asc
        ) as partial_timeline_json
        from public.gnr8_aaf_audit_partial_timeline_markers
        where tenant_id = r.tenant_id
          and subject_type = r.subject_type
          and subject_id = r.subject_id
          and status = 'open'
      ) pt on true
      where r.tenant_id = $1::text
        and r.scope = $2::text
        and r.subject_type = $3::text
        and r.subject_id = $4::text
        and r.client_id is not distinct from $5::text
        and r.site_id is not distinct from $6::text
        and r.batch_id is not distinct from $7::text
        and r.job_id is not distinct from $8::text
        and r.site_version_id is not distinct from $9::text
        and r.domain_id is not distinct from $12::text
        and r.cost_center_id is not distinct from $13::text
        and ($10::text is null or r.id::text = $10::text)
      order by
        (d.status = 'granted') desc nulls last,
        d.decided_at desc nulls last,
        r.created_at desc
      limit 1
      `,
      [
        input.tenantId,
        input.scope,
        input.subjectType,
        input.subjectId,
        input.clientId ?? null,
        input.siteId ?? null,
        input.batchId ?? null,
        input.jobId ?? null,
        input.siteVersionId ?? null,
        input.approvalRequestId ?? null,
        input.approvalDecisionId ?? null,
        input.domainId ?? null,
        input.costCenterId ?? null,
      ],
    );
    return (result.rows[0] as AafApprovalTimelineSourceRow | undefined) ?? null;
  }
}
