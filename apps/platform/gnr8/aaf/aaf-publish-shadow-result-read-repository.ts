import "server-only";

import type { Pool } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { AafPgClient } from "./aaf-writer-repository";
import {
  buildPublishShadowResultReadModel,
  type PublishShadowRawApprovalTimelineRow,
  type PublishShadowRawAuditEventRow,
  type PublishShadowRawDdomSnapshotRow,
  type PublishShadowRawEvidencePackageRow,
  type PublishShadowRawFreshnessCheckRow,
  type PublishShadowRawGateAttemptRow,
  type PublishShadowRawPolicyEvaluationRow,
  type PublishShadowRawPublishTargetRow,
  type PublishShadowRawSourceRefRow,
  type PublishShadowResultReadInput,
  type PublishShadowResultReadModel,
  type PublishShadowResultRepositorySnapshot,
  type PublishShadowRuntimeContext,
} from "./aaf-publish-shadow-result-read-model";

type ReadClient = AafPgClient & { release?: () => void };
type ReadPool = Pick<Pool, "connect">;

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function errorCode(error: unknown): string {
  if (error instanceof Error) return error.name === "Error" ? error.message : error.name;
  return "publish_shadow_read_repository_unavailable";
}

export class AafPublishShadowResultReadRepository {
  constructor(private readonly pool: ReadPool = getSuperadminPool()) {}

  async withReadOnlyTransaction<T>(fn: (client: ReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    const client = (await this.pool.connect()) as ReadClient;
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
          // Best-effort cleanup for a failed read-only projection.
        }
      }
      throw error;
    } finally {
      client.release?.();
    }
  }

  readPublishShadowResultSnapshot(input: PublishShadowResultReadInput): Promise<PublishShadowResultRepositorySnapshot> {
    return this.withReadOnlyTransaction(async (client, capturedAt) => {
      const evidencePackage = await this.readLatestEvidencePackage(client, input);
      const sourceRefs = evidencePackage ? await this.readEvidenceSourceRefs(client, evidencePackage.id) : [];
      const freshnessChecks = evidencePackage ? await this.readEvidenceFreshnessChecks(client, evidencePackage.id) : [];
      const gateAttempt = await this.readLatestGateAttempt(client, input, evidencePackage?.id ?? null);
      const policyEvaluation = await this.readPolicyEvaluation(client, {
        policyEvaluationId: gateAttempt?.policy_evaluation_id ?? null,
        evidencePackageId: evidencePackage?.id ?? gateAttempt?.evidence_package_id ?? null,
        input,
      });
      const auditEvent = await this.readAuditEvent(client, {
        auditEventId: gateAttempt?.pre_action_audit_event_id ?? policyEvaluation?.audit_event_id ?? null,
        evidencePackageId: evidencePackage?.id ?? gateAttempt?.evidence_package_id ?? null,
        policyEvaluationId: policyEvaluation?.id ?? null,
        input,
      });
      const ddomSnapshot = await this.readLatestDdomSnapshot(client, input);
      const publishTarget = await this.readPublishTarget(client, input);
      const approvalTimeline = await this.readApprovalTimeline(client, input, {
        approvalRequestId: gateAttempt?.approval_request_id ?? policyEvaluation?.approval_request_id ?? null,
        approvalDecisionId: gateAttempt?.approval_decision_id ?? policyEvaluation?.approval_decision_id ?? null,
      });
      const runtimeContext = await this.readRuntimeContext(client, input);

      return {
        capturedAt,
        input,
        evidencePackage,
        sourceRefs,
        freshnessChecks,
        gateAttempt,
        policyEvaluation,
        auditEvent,
        ddomSnapshot,
        publishTarget,
        approvalTimeline,
        runtimeContext,
        limitations: evidencePackage || gateAttempt ? [] : ["shadow_observation_records_not_found"],
      };
    });
  }

  async readLatestEvidencePackage(
    client: AafPgClient,
    input: PublishShadowResultReadInput,
  ): Promise<PublishShadowRawEvidencePackageRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        tenant_id,
        client_id,
        site_id,
        site_version_id,
        package_type,
        subject_type,
        subject_id,
        status,
        created_by_actor_type,
        created_by_actor_id,
        created_at::text,
        source_watermark,
        freshness_label,
        expires_at::text,
        limitations_json,
        correlation_id,
        causation_id,
        idempotency_key,
        request_id
      from public.gnr8_aaf_evidence_packages
      where package_type = 'publish_activation_evidence'
        and subject_type = 'site_version'
        and subject_id = $1::text
        and ($2::text is null or site_id = $2::text)
        and ($3::text is null or tenant_id = $3::text)
        and ($4::text is null or client_id is not distinct from $4::text)
        and (
          ($5::text is null and $6::text is null)
          or correlation_id = $5::text
          or idempotency_key = $6::text
        )
      order by
        (correlation_id = $5::text) desc,
        (idempotency_key = $6::text) desc,
        created_at desc
      limit 1
      `,
      [input.siteVersionId, input.siteId, input.tenantId ?? null, input.clientId ?? null, input.correlationId ?? null, input.idempotencyKey ?? null],
    );
    return (result.rows[0] as PublishShadowRawEvidencePackageRow | undefined) ?? null;
  }

  async readEvidenceSourceRefs(client: AafPgClient, evidencePackageId: string): Promise<PublishShadowRawSourceRefRow[]> {
    const result = await client.query(
      `
      select
        id::text,
        evidence_package_id::text,
        source_system,
        source_table,
        source_record_id,
        source_version,
        source_watermark,
        captured_at::text,
        query_ref,
        snapshot_ref,
        metadata_json
      from public.gnr8_aaf_evidence_package_source_refs
      where evidence_package_id = $1::uuid
      order by source_table asc, source_record_id asc
      `,
      [evidencePackageId],
    );
    return result.rows as PublishShadowRawSourceRefRow[];
  }

  async readEvidenceFreshnessChecks(client: AafPgClient, evidencePackageId: string): Promise<PublishShadowRawFreshnessCheckRow[]> {
    const result = await client.query(
      `
      select
        id::text,
        evidence_package_id::text,
        policy_version,
        result,
        checked_at::text,
        stale_reason,
        expires_at::text,
        current_source_watermark,
        audit_event_id::text,
        correlation_id,
        idempotency_key
      from public.gnr8_aaf_evidence_package_freshness_checks
      where evidence_package_id = $1::uuid
      order by checked_at desc, created_at desc
      `,
      [evidencePackageId],
    );
    return result.rows as PublishShadowRawFreshnessCheckRow[];
  }

  async readLatestGateAttempt(
    client: AafPgClient,
    input: PublishShadowResultReadInput,
    evidencePackageId: string | null,
  ): Promise<PublishShadowRawGateAttemptRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        tenant_id,
        client_id,
        site_id,
        site_version_id,
        action_key,
        scope,
        subject_type,
        subject_id,
        actor_type,
        actor_id,
        actor_role,
        policy_evaluation_id::text,
        evidence_package_id::text,
        approval_request_id::text,
        approval_decision_id::text,
        pre_action_audit_event_id::text,
        outcome_audit_event_id::text,
        gate_result,
        fail_closed_reason,
        correlation_id,
        causation_id,
        idempotency_key,
        request_id,
        started_at::text,
        completed_at::text,
        created_at::text
      from public.gnr8_aaf_action_gate_attempts
      where action_key = 'publish.activation'
        and scope = 'publish_activation'
        and subject_type = 'site_version'
        and subject_id = $1::text
        and ($2::text is null or site_id = $2::text)
        and ($3::text is null or tenant_id = $3::text)
        and ($4::text is null or client_id is not distinct from $4::text)
        and (
          $5::uuid is null
          or evidence_package_id = $5::uuid
          or correlation_id = $6::text
          or idempotency_key = $7::text
        )
      order by
        (evidence_package_id = $5::uuid) desc,
        (correlation_id = $6::text) desc,
        (idempotency_key = $7::text) desc,
        created_at desc
      limit 1
      `,
      [
        input.siteVersionId,
        input.siteId,
        input.tenantId ?? null,
        input.clientId ?? null,
        evidencePackageId,
        input.correlationId ?? null,
        input.idempotencyKey ?? null,
      ],
    );
    return (result.rows[0] as PublishShadowRawGateAttemptRow | undefined) ?? null;
  }

  async readPolicyEvaluation(
    client: AafPgClient,
    input: { policyEvaluationId?: string | null; evidencePackageId?: string | null; input: PublishShadowResultReadInput },
  ): Promise<PublishShadowRawPolicyEvaluationRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        result,
        policy_version,
        scope,
        action_key,
        subject_type,
        subject_id,
        approval_request_id::text,
        approval_decision_id::text,
        evidence_package_id::text,
        blocker_codes,
        stale_reason,
        audit_event_id::text,
        evaluated_at::text,
        correlation_id,
        idempotency_key
      from public.gnr8_aaf_approval_policy_evaluations
      where scope = 'publish_activation'
        and action_key = 'publish.activation'
        and subject_type = 'site_version'
        and subject_id = $1::text
        and (
          $2::uuid is null
          or id = $2::uuid
          or evidence_package_id = $3::uuid
          or correlation_id = $4::text
          or idempotency_key = concat($5::text, ':policy')
        )
      order by
        (id = $2::uuid) desc,
        (evidence_package_id = $3::uuid) desc,
        (correlation_id = $4::text) desc,
        created_at desc
      limit 1
      `,
      [
        input.input.siteVersionId,
        input.policyEvaluationId ?? null,
        input.evidencePackageId ?? null,
        input.input.correlationId ?? null,
        input.input.idempotencyKey ?? null,
      ],
    );
    return (result.rows[0] as PublishShadowRawPolicyEvaluationRow | undefined) ?? null;
  }

  async readAuditEvent(
    client: AafPgClient,
    input: {
      auditEventId?: string | null;
      evidencePackageId?: string | null;
      policyEvaluationId?: string | null;
      input: PublishShadowResultReadInput;
    },
  ): Promise<PublishShadowRawAuditEventRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        event_name,
        event_family,
        severity,
        subject_type,
        subject_id,
        policy_evaluation_id::text,
        evidence_package_id::text,
        approval_request_id::text,
        approval_decision_id::text,
        payload_json,
        correlation_id,
        idempotency_key,
        created_at::text
      from public.gnr8_aaf_audit_events
      where event_family = 'publish'
        and subject_type = 'site_version'
        and subject_id = $1::text
        and (
          $2::uuid is null
          or id = $2::uuid
          or evidence_package_id = $3::uuid
          or policy_evaluation_id = $4::uuid
          or correlation_id = $5::text
          or idempotency_key = concat($6::text, ':audit')
        )
      order by
        (id = $2::uuid) desc,
        (evidence_package_id = $3::uuid) desc,
        (policy_evaluation_id = $4::uuid) desc,
        (correlation_id = $5::text) desc,
        created_at desc
      limit 1
      `,
      [
        input.input.siteVersionId,
        input.auditEventId ?? null,
        input.evidencePackageId ?? null,
        input.policyEvaluationId ?? null,
        input.input.correlationId ?? null,
        input.input.idempotencyKey ?? null,
      ],
    );
    return (result.rows[0] as PublishShadowRawAuditEventRow | undefined) ?? null;
  }

  async readLatestDdomSnapshot(client: AafPgClient, input: PublishShadowResultReadInput): Promise<PublishShadowRawDdomSnapshotRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        readiness_state,
        readiness_blockers,
        readiness_warnings,
        freshness_state,
        fresh_until::text,
        stale_reason,
        captured_at::text,
        source_watermark,
        created_at::text
      from public.gnr8_ddom_readiness_snapshots
      where site_id = $1::text
        and ($2::uuid is null or site_version_id = $2::uuid or site_version_id is null)
      order by
        (site_version_id = $2::uuid) desc nulls last,
        captured_at desc
      limit 1
      `,
      [input.siteId, input.siteVersionId],
    );
    return (result.rows[0] as PublishShadowRawDdomSnapshotRow | undefined) ?? null;
  }

  async readPublishTarget(client: AafPgClient, input: PublishShadowResultReadInput): Promise<PublishShadowRawPublishTargetRow | null> {
    const targetId = text(input.publishTargetId) ?? text(input.intendedPublishTarget) ?? "production";
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
    return (result.rows[0] as PublishShadowRawPublishTargetRow | undefined) ?? null;
  }

  async readApprovalTimeline(
    client: AafPgClient,
    input: PublishShadowResultReadInput,
    refs: { approvalRequestId?: string | null; approvalDecisionId?: string | null },
  ): Promise<PublishShadowRawApprovalTimelineRow | null> {
    const result = await client.query(
      `
      select
        r.id::text as approval_request_id,
        d.id::text as approval_decision_id,
        r.scope,
        r.subject_type,
        r.subject_id,
        r.status as request_status,
        r.policy_version as request_policy_version,
        r.created_at::text as request_created_at,
        r.requested_expires_at::text,
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
          and ($6::uuid is null or d.id = $6::uuid)
        order by (d.status = 'granted') desc, d.decided_at desc, d.created_at desc
        limit 1
      ) d on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('id', id::text, 'reason', reason, 'createdAt', created_at::text)) as revocations_json
        from public.gnr8_aaf_approval_revocations
        where d.id is not null and approval_decision_id = d.id
      ) rv on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('id', id::text, 'reason', reason, 'createdAt', created_at::text)) as supersessions_json
        from public.gnr8_aaf_approval_supersession_links
        where superseded_approval_request_id = r.id or (d.id is not null and superseded_decision_id = d.id)
      ) sp on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('id', id::text, 'missingEventName', missing_event_name, 'failureReason', failure_reason)) as partial_timeline_json
        from public.gnr8_aaf_audit_partial_timeline_markers
        where tenant_id = r.tenant_id and subject_type = r.subject_type and subject_id = r.subject_id and status = 'open'
      ) pt on true
      where r.scope = 'publish_activation'
        and r.subject_type = 'site_version'
        and r.subject_id = $1::text
        and ($2::text is null or r.tenant_id = $2::text)
        and ($3::text is null or r.client_id is not distinct from $3::text)
        and ($4::text is null or r.site_id is not distinct from $4::text)
        and ($5::uuid is null or r.id = $5::uuid)
      order by
        (r.id = $5::uuid) desc,
        (d.id = $6::uuid) desc,
        (d.status = 'granted') desc nulls last,
        d.decided_at desc nulls last,
        r.created_at desc
      limit 1
      `,
      [
        input.siteVersionId,
        input.tenantId ?? null,
        input.clientId ?? null,
        input.siteId,
        refs.approvalRequestId ?? null,
        refs.approvalDecisionId ?? null,
      ],
    );
    return (result.rows[0] as PublishShadowRawApprovalTimelineRow | undefined) ?? null;
  }

  async readRuntimeContext(client: AafPgClient, input: PublishShadowResultReadInput): Promise<PublishShadowRuntimeContext> {
    const siteVersion = await client.query(
      `
      select id::text, site_id::text, state::text, artifact_id::text, updated_at::text
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [input.siteVersionId],
    );
    const runtimeArtifact = await client.query(
      `
      select id::text, site_id::text, site_version_id::text, publish_stage::text, created_at::text
      from public.gnr8_runtime_artifacts
      where ($1::uuid is not null and id = $1::uuid)
         or ($1::uuid is null and site_version_id = $2::uuid)
      order by created_at desc
      limit 1
      `,
      [input.runtimeArtifactId ?? null, input.siteVersionId],
    );
    const activePointer = await client.query(
      `
      select site_id::text, active_site_version_id::text, active_artifact_id::text, updated_at::text
      from public.gnr8_runtime_active_pointers
      where site_id = $1::text
      limit 1
      `,
      [input.siteId],
    );
    return {
      siteVersion: (siteVersion.rows[0] as PublishShadowRuntimeContext["siteVersion"] | undefined) ?? null,
      runtimeArtifact: (runtimeArtifact.rows[0] as PublishShadowRuntimeContext["runtimeArtifact"] | undefined) ?? null,
      activePointer: (activePointer.rows[0] as PublishShadowRuntimeContext["activePointer"] | undefined) ?? null,
    };
  }
}

export async function readPublishShadowResult(
  input: PublishShadowResultReadInput,
  deps: { repository?: Pick<AafPublishShadowResultReadRepository, "readPublishShadowResultSnapshot"> } = {},
): Promise<PublishShadowResultReadModel> {
  const repository = deps.repository ?? new AafPublishShadowResultReadRepository();
  try {
    const snapshot = await repository.readPublishShadowResultSnapshot(input);
    return buildPublishShadowResultReadModel(snapshot);
  } catch (error) {
    return buildPublishShadowResultReadModel({
      capturedAt: null,
      input,
      evidencePackage: null,
      sourceRefs: [],
      freshnessChecks: [],
      gateAttempt: null,
      policyEvaluation: null,
      auditEvent: null,
      ddomSnapshot: null,
      publishTarget: null,
      approvalTimeline: null,
      runtimeContext: {
        siteVersion: null,
        runtimeArtifact: null,
        activePointer: null,
      },
      limitations: ["publish_shadow_read_repository_unavailable", errorCode(error)],
    });
  }
}
