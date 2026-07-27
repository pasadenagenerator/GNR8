import "server-only";

import type { AafApprovalScope } from "@gnr8/runtime-contracts";

import {
  hashPublishActivationStableValue,
  type PublishActivationApprovalSnapshot,
  type PublishActivationCanonicalSourceSnapshot,
  type PublishActivationContentOverrideSnapshot,
  type PublishActivationDomainReadinessSnapshot,
  type PublishActivationEvidenceReaderInput,
  type PublishActivationEvidenceSourceReader,
  type PublishActivationEvidenceFreshnessStatus,
  type PublishActivationSourceReaderResult,
} from "./aaf-publish-activation-evidence-builder";
import {
  AafPublishActivationReadOnlyTransactionUnavailableError,
  AafPublishActivationSourceReadRepository,
  type AafActivePointerSourceRow,
  type AafApprovalTimelineSourceRow,
  type AafContentOverrideAggregateSourceRow,
  type AafDdomReadinessSourceRow,
  type AafPublishActivationSourceReadRepositoryLike,
  type AafPublishTargetSourceRow,
  type AafRuntimeArtifactSourceRow,
  type AafSiteVersionSourceRow,
} from "./aaf-publish-activation-source-read-repository";
import type { AafPgClient } from "./aaf-writer-repository";

const SOURCE_SYSTEM = "gnr8";
const MVP_DEFAULT_ENVIRONMENT = "production";
const MVP_DEFAULT_STAGE = "production";

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isPast(value: unknown, now: Date): boolean {
  const raw = text(value);
  if (!raw) return false;
  const parsed = new Date(raw);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

function hasItems(value: unknown): boolean {
  return stringArray(value).length > 0;
}

function sourceRef(sourceTable: string, sourceRecordId: string): string {
  return `${SOURCE_SYSTEM}:${sourceTable}:${sourceRecordId}`;
}

function aggregateWatermark(value: unknown): string {
  return `sha256:${hashPublishActivationStableValue(value)}`;
}

function baseSnapshot(input: {
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | null;
  canonicalFields: Record<string, unknown>;
  canonicalWatermark?: string | null;
  canonicalWatermarkField?: string | null;
  hashFields?: readonly string[];
  snapshotRef?: string | null;
  queryRef: string;
  capturedAt: string;
  freshness?: PublishActivationEvidenceFreshnessStatus;
  staleReason?: string | null;
  expiresAt?: string | null;
  limitations?: readonly string[];
}): PublishActivationCanonicalSourceSnapshot {
  return {
    sourceSystem: SOURCE_SYSTEM,
    sourceTable: input.sourceTable,
    sourceRecordId: input.sourceRecordId,
    sourceRef: sourceRef(input.sourceTable, input.sourceRecordId),
    sourceVersion: input.sourceVersion ?? null,
    canonicalFields: input.canonicalFields,
    canonicalWatermark: input.canonicalWatermark ?? null,
    canonicalWatermarkField: input.canonicalWatermarkField ?? null,
    hashFields: input.hashFields ?? Object.keys(input.canonicalFields).sort((left, right) => left.localeCompare(right)),
    snapshotRef: input.snapshotRef ?? null,
    queryRef: input.queryRef,
    capturedAt: input.capturedAt,
    freshness: input.freshness ?? "fresh",
    staleReason: input.staleReason ?? null,
    expiresAt: input.expiresAt ?? null,
    limitations: input.limitations ?? [],
  };
}

function updatedAtWatermark(value: unknown): string | null {
  const raw = text(value);
  return raw ? `updated_at:${raw}` : null;
}

function mapSiteVersion(row: AafSiteVersionSourceRow, capturedAt: string): PublishActivationCanonicalSourceSnapshot {
  return baseSnapshot({
    sourceTable: "gnr8_runtime_site_versions",
    sourceRecordId: row.id,
    sourceVersion: text(row.version_no) ?? text(row.updated_at),
    canonicalFields: {
      id: row.id,
      siteId: row.site_id,
      versionNo: row.version_no,
      state: row.state,
      source: row.source,
      actor: row.actor,
      rendererCompatibilityVersion: row.renderer_compatibility_version,
      importProvenanceSummary: row.import_provenance_summary ?? null,
      artifactId: row.artifact_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? null,
    },
    canonicalWatermark: updatedAtWatermark(row.updated_at),
    canonicalWatermarkField: row.updated_at ? "updated_at" : null,
    queryRef: "aaf_publish_activation_source_reader:v1:site_version",
    capturedAt,
  });
}

function mapRuntimeArtifact(input: {
  row: AafRuntimeArtifactSourceRow;
  expectedSiteId: string;
  expectedSiteVersionId: string;
  requestedRuntimeArtifactId?: string | null;
  capturedAt: string;
}): PublishActivationCanonicalSourceSnapshot {
  const limitations: string[] = [];
  if (text(input.requestedRuntimeArtifactId) && input.row.id !== text(input.requestedRuntimeArtifactId)) {
    limitations.push("runtime_artifact_id_mismatch");
  }
  if (input.row.site_version_id !== input.expectedSiteVersionId) limitations.push("runtime_artifact_site_version_mismatch");
  if (input.row.site_id !== input.expectedSiteId) limitations.push("runtime_artifact_site_mismatch");
  return baseSnapshot({
    sourceTable: "gnr8_runtime_artifacts",
    sourceRecordId: input.row.id,
    sourceVersion: input.row.bundle_sha256,
    canonicalFields: {
      id: input.row.id,
      siteId: input.row.site_id,
      siteVersionId: input.row.site_version_id,
      rendererCompatibilityVersion: input.row.renderer_compatibility_version,
      bundleSha256: input.row.bundle_sha256,
      htmlPathCount: Number(input.row.html_path_count ?? 0),
      assetFingerprintCount: Number(input.row.asset_fingerprint_count ?? 0),
      manifest: input.row.manifest ?? null,
      publishStage: input.row.publish_stage,
      shadowRestricted: input.row.shadow_restricted,
      artifactGovernance: input.row.artifact_governance ?? {},
      createdAt: input.row.created_at,
    },
    canonicalWatermark: input.row.bundle_sha256 ? `bundle_sha256:${input.row.bundle_sha256}|id:${input.row.id}` : null,
    canonicalWatermarkField: input.row.bundle_sha256 ? "bundle_sha256,id" : null,
    queryRef: "aaf_publish_activation_source_reader:v1:runtime_artifact",
    capturedAt: input.capturedAt,
    freshness: limitations.length > 0 ? "failed" : "fresh",
    staleReason: limitations[0] ?? null,
    limitations,
  });
}

function mapActivePointer(row: AafActivePointerSourceRow, capturedAt: string): PublishActivationSourceReaderResult["activePointer"] {
  return {
    ...baseSnapshot({
      sourceTable: "gnr8_runtime_active_pointers",
      sourceRecordId: row.site_id,
      sourceVersion: text(row.updated_at),
      canonicalFields: {
        siteId: row.site_id,
        activeSiteVersionId: row.active_site_version_id,
        activeArtifactId: row.active_artifact_id,
        updatedAt: row.updated_at ?? null,
      },
      canonicalWatermark: updatedAtWatermark(row.updated_at),
      canonicalWatermarkField: row.updated_at ? "updated_at" : null,
      queryRef: "aaf_publish_activation_source_reader:v1:active_pointer",
      capturedAt,
    }),
    activeSiteVersionId: row.active_site_version_id,
    activeArtifactId: row.active_artifact_id,
  };
}

function mapPublishTarget(input: {
  row: AafPublishTargetSourceRow;
  trustedEnvironment: string;
  intendedStage: string;
  artifactStage: string | null;
  capturedAt: string;
}): PublishActivationCanonicalSourceSnapshot {
  const limitations: string[] = [];
  if (input.row.status === "disabled") limitations.push("disabled_publish_target");
  if (input.row.status === "retired") limitations.push("retired_publish_target");
  if (input.row.status !== "active" && input.row.status !== "disabled" && input.row.status !== "retired") {
    limitations.push("publish_target_status_not_active");
  }
  if (input.row.environment !== input.trustedEnvironment) limitations.push("publish_target_environment_mismatch");
  if (input.row.publish_stage !== input.intendedStage) limitations.push("publish_target_stage_mismatch");
  const allowedStages = stringArray(input.row.allowed_artifact_stages);
  if (input.artifactStage && allowedStages.length > 0 && !allowedStages.includes(input.artifactStage)) {
    limitations.push("artifact_stage_not_allowed_by_target");
  }
  return baseSnapshot({
    sourceTable: "gnr8_publish_targets",
    sourceRecordId: input.row.id,
    sourceVersion: input.row.policy_version,
    canonicalFields: {
      id: input.row.id,
      environment: input.row.environment,
      targetKind: input.row.target_kind,
      publishStage: input.row.publish_stage,
      status: input.row.status,
      policyVersion: input.row.policy_version,
      requiresAaf: input.row.requires_aaf,
      requiresDdomSnapshot: input.row.requires_ddom_snapshot,
      requiresLaunchSignoff: input.row.requires_launch_signoff,
      allowedArtifactStages: allowedStages,
      limitationsJson: input.row.limitations_json ?? {},
      sourceWatermark: input.row.source_watermark ?? null,
      updatedAt: input.row.updated_at,
    },
    canonicalWatermark: text(input.row.source_watermark) ?? null,
    canonicalWatermarkField: text(input.row.source_watermark) ? "source_watermark" : null,
    queryRef: "aaf_publish_activation_source_reader:v1:publish_target",
    capturedAt: input.capturedAt,
    freshness: limitations.some((item) => /disabled|retired|mismatch|not_allowed|not_active/.test(item)) ? "failed" : "fresh",
    staleReason: limitations.find((item) => /disabled|retired|mismatch|not_allowed|not_active/.test(item)) ?? null,
    limitations,
  });
}

function mapDdomReadiness(row: AafDdomReadinessSourceRow, capturedAt: string): PublishActivationDomainReadinessSnapshot {
  const blockers = stringArray(row.readiness_blockers);
  const warnings = stringArray(row.readiness_warnings);
  const limitations: string[] = [];
  let readinessStatus: PublishActivationDomainReadinessSnapshot["readinessStatus"] = "blocked";
  let stale = false;
  let freshness: PublishActivationEvidenceFreshnessStatus = row.freshness_state as PublishActivationEvidenceFreshnessStatus;
  let staleReason = text(row.stale_reason);

  if (row.readiness_state === "ready" || row.readiness_state === "ready_with_warnings") {
    readinessStatus = "ready";
    freshness = row.freshness_state === "stale" ? "stale" : "fresh";
    if (row.readiness_state === "ready_with_warnings") warnings.push("domain_readiness_ready_with_warnings");
  } else if (row.readiness_state === "not_applicable") {
    readinessStatus = "not_applicable";
    freshness = row.freshness_state === "stale" ? "stale" : "fresh";
  } else if (row.readiness_state === "manually_excepted") {
    readinessStatus = "manually_excepted";
    freshness = row.freshness_state === "stale" ? "stale" : "fresh";
  } else if (row.readiness_state === "stale") {
    stale = true;
    readinessStatus = "blocked";
    freshness = "stale";
    staleReason = staleReason ?? "domain_readiness_stale";
    blockers.push("domain_readiness_stale");
    limitations.push("stale_ddom_snapshot");
  } else {
    readinessStatus = "blocked";
    freshness = row.freshness_state === "partial_timeline" ? "partial_timeline" : "failed";
    if (blockers.length === 0) blockers.push("domain_readiness_blocked");
  }

  if (row.freshness_state === "stale") {
    stale = true;
    readinessStatus = "blocked";
    freshness = "stale";
    staleReason = staleReason ?? "domain_readiness_stale";
    if (!blockers.includes("domain_readiness_stale")) blockers.push("domain_readiness_stale");
  }

  return {
    ...baseSnapshot({
      sourceTable: "gnr8_ddom_readiness_snapshots",
      sourceRecordId: row.id,
      sourceVersion: row.captured_at,
      canonicalFields: {
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id,
        siteId: row.site_id,
        siteVersionId: row.site_version_id,
        domainBindingId: row.domain_binding_id,
        hostBindingId: row.host_binding_id,
        domain: row.domain,
        internalHost: row.internal_host,
        intendedLaunchDomain: row.intended_launch_domain,
        readinessState: row.readiness_state,
        readinessBlockers: blockers,
        readinessWarnings: warnings,
        freshnessState: row.freshness_state,
        freshUntil: row.fresh_until,
        staleReason,
        capturedAt: row.captured_at,
        sourceWatermark: row.source_watermark,
        sourceWatermarkJson: row.source_watermark_json ?? {},
        snapshotJson: row.snapshot_json ?? {},
      },
      canonicalWatermark: row.source_watermark,
      canonicalWatermarkField: "source_watermark",
      snapshotRef: sourceRef("gnr8_ddom_readiness_snapshots", row.id),
      queryRef: "aaf_publish_activation_source_reader:v1:domain_readiness",
      capturedAt,
      freshness,
      staleReason,
      expiresAt: row.fresh_until,
      limitations,
    }),
    readinessStatus,
    blockers,
    warnings,
    stale,
  };
}

function mapContentOverrideState(input: {
  row: AafContentOverrideAggregateSourceRow;
  required: boolean;
  capturedAt: string;
}): PublishActivationContentOverrideSnapshot {
  const count = Number(input.row.published_count ?? 0);
  const aggregateKey = `site_version:${input.row.site_version_id}:published`;
  const rows = input.row.rows_watermark_json ?? [];
  if (!input.required) {
    return {
      ...baseSnapshot({
        sourceTable: "gnr8_content_overrides",
        sourceRecordId: aggregateKey,
        sourceVersion: "not_applicable",
        canonicalFields: {
          siteVersionId: input.row.site_version_id,
          required: false,
          status: "not_applicable",
          publishedOverrideCount: count,
        },
        canonicalWatermark: aggregateWatermark({ required: false, siteVersionId: input.row.site_version_id, status: "not_applicable" }),
        canonicalWatermarkField: "aggregate_not_applicable",
        snapshotRef: sourceRef("gnr8_content_overrides", aggregateKey),
        queryRef: "aaf_publish_activation_source_reader:v1:content_override_published_state",
        capturedAt: input.capturedAt,
      }),
      status: "not_applicable",
    };
  }

  const status = count > 0 ? "published" : "not_published";
  return {
    ...baseSnapshot({
      sourceTable: "gnr8_content_overrides",
      sourceRecordId: aggregateKey,
      sourceVersion: text(input.row.max_updated_at) ?? "empty",
      canonicalFields: {
        siteId: input.row.site_id,
        siteVersionId: input.row.site_version_id,
        required: true,
        status,
        publishedOverrideCount: count,
        maxUpdatedAt: input.row.max_updated_at,
        rows,
      },
      canonicalWatermark: aggregateWatermark({ siteVersionId: input.row.site_version_id, count, rows }),
      canonicalWatermarkField: "aggregate_published_rows",
      snapshotRef: sourceRef("gnr8_content_overrides", aggregateKey),
      queryRef: "aaf_publish_activation_source_reader:v1:content_override_published_state",
      capturedAt: input.capturedAt,
      freshness: count > 0 ? "fresh" : "failed",
      staleReason: count > 0 ? null : "missing_required_content_override_state",
      limitations: count > 0 ? [] : ["missing_required_content_override_state"],
    }),
    status,
  };
}

function mapApprovalTimeline(input: {
  row: AafApprovalTimelineSourceRow;
  expectedScope: AafApprovalScope;
  required: boolean;
  capturedAt: string;
  now: Date;
}): PublishActivationApprovalSnapshot {
  const limitations: string[] = [];
  let freshness: PublishActivationEvidenceFreshnessStatus = "fresh";
  let staleReason: string | null = null;

  const revocations = input.row.revocations_json ?? [];
  const supersessions = input.row.supersessions_json ?? [];
  const partialTimeline = input.row.partial_timeline_json ?? [];

  if (input.row.scope !== input.expectedScope) limitations.push("approval_wrong_scope");
  if (!input.row.approval_decision_id) limitations.push("approval_decision_missing");
  if (input.row.decision_status !== "granted") limitations.push(`approval_status_${text(input.row.decision_status) ?? "missing"}`);
  if (isPast(input.row.decision_expires_at, input.now) || isPast(input.row.requested_expires_at, input.now)) {
    limitations.push("approval_expired");
  }
  if (hasItems(revocations)) limitations.push("approval_revoked");
  if (hasItems(supersessions)) limitations.push("approval_superseded");
  if (hasItems(partialTimeline)) limitations.push("partial_aaf_approval_timeline");

  if (limitations.includes("partial_aaf_approval_timeline")) {
    freshness = "partial_timeline";
    staleReason = "partial_aaf_approval_timeline";
  }
  if (limitations.some((item) => /expired|revoked|superseded/.test(item))) {
    freshness = "stale";
    staleReason = limitations.find((item) => /expired|revoked|superseded/.test(item)) ?? "approval_stale";
  }
  if (limitations.some((item) => /wrong_scope|missing|status_/.test(item))) {
    freshness = "failed";
    staleReason = limitations.find((item) => /wrong_scope|missing|status_/.test(item)) ?? "approval_failed";
  }

  const sourceRecordId = input.row.approval_decision_id ?? input.row.approval_request_id;
  const sourceTable = input.row.approval_decision_id ? "gnr8_aaf_approval_decisions" : "gnr8_aaf_approval_requests";
  const watermarkInput = {
    requestId: input.row.approval_request_id,
    decisionId: input.row.approval_decision_id,
    scope: input.row.scope,
    subjectType: input.row.subject_type,
    subjectId: input.row.subject_id,
    requestStatus: input.row.request_status,
    decisionStatus: input.row.decision_status,
    requestPolicyVersion: input.row.request_policy_version,
    decisionPolicyVersion: input.row.decision_policy_version,
    evidencePackageId: input.row.evidence_package_id,
    policyEvaluationId: input.row.policy_evaluation_id,
    requestedExpiresAt: input.row.requested_expires_at,
    decisionExpiresAt: input.row.decision_expires_at,
    revocations,
    supersessions,
    partialTimeline,
  };

  return {
    ...baseSnapshot({
      sourceTable,
      sourceRecordId,
      sourceVersion: text(input.row.decided_at) ?? input.row.request_created_at,
      canonicalFields: {
        ...watermarkInput,
        tenantId: input.row.tenant_id,
        clientId: input.row.client_id,
        siteId: input.row.site_id,
        batchId: input.row.batch_id,
        jobId: input.row.job_id,
        siteVersionId: input.row.site_version_id,
        domainId: input.row.domain_id,
        costCenterId: input.row.cost_center_id,
        requiredByPolicy: input.required,
      },
      canonicalWatermark: aggregateWatermark(watermarkInput),
      canonicalWatermarkField: "aggregate_aaf_approval_timeline",
      snapshotRef: sourceRef(sourceTable, sourceRecordId),
      queryRef: `aaf_publish_activation_source_reader:v1:approval:${input.expectedScope}`,
      capturedAt: input.capturedAt,
      freshness,
      staleReason,
      expiresAt: input.row.decision_expires_at ?? input.row.requested_expires_at,
      limitations,
    }),
    approvalRequestId: input.row.approval_request_id,
    approvalDecisionId: input.row.approval_decision_id,
    scope: input.row.scope,
    requiredByPolicy: input.required,
  };
}

function approvalRefScopeMismatchSnapshot(input: {
  scope: AafApprovalScope | null | undefined;
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  siteVersionId: string;
  expectedScope: AafApprovalScope;
  capturedAt: string;
}): PublishActivationApprovalSnapshot {
  const sourceRecordId = text(input.approvalDecisionId) ?? text(input.approvalRequestId) ?? input.siteVersionId;
  return {
    ...baseSnapshot({
      sourceTable: text(input.approvalDecisionId) ? "gnr8_aaf_approval_decisions" : "gnr8_aaf_approval_requests",
      sourceRecordId,
      sourceVersion: null,
      canonicalFields: {
        approvalRequestId: text(input.approvalRequestId),
        approvalDecisionId: text(input.approvalDecisionId),
        providedScope: input.scope ?? null,
        expectedScope: input.expectedScope,
        subjectType: "site_version",
        subjectId: input.siteVersionId,
      },
      canonicalWatermark: aggregateWatermark({
        approvalRequestId: text(input.approvalRequestId),
        approvalDecisionId: text(input.approvalDecisionId),
        providedScope: input.scope ?? null,
        expectedScope: input.expectedScope,
      }),
      canonicalWatermarkField: "aggregate_rejected_approval_ref",
      queryRef: `aaf_publish_activation_source_reader:v1:approval:${input.expectedScope}:scope_rejected`,
      capturedAt: input.capturedAt,
      freshness: "failed",
      staleReason: "approval_wrong_scope",
      limitations: ["approval_wrong_scope"],
    }),
    approvalRequestId: text(input.approvalRequestId),
    approvalDecisionId: text(input.approvalDecisionId),
    scope: input.scope ?? null,
    requiredByPolicy: true,
  };
}

export class AafPublishActivationSourceReader implements PublishActivationEvidenceSourceReader {
  constructor(private readonly repository: AafPublishActivationSourceReadRepositoryLike = new AafPublishActivationSourceReadRepository()) {}

  async readPublishActivationSources(input: PublishActivationEvidenceReaderInput): Promise<PublishActivationSourceReaderResult> {
    try {
      return await this.repository.withReadOnlyTransaction(async (client, capturedAt) => {
        const warnings: string[] = [];
        const limitations: string[] = [];
        const now = new Date(capturedAt);
        const trustedEnvironment = text(input.trustedPublishEnvironment) ?? MVP_DEFAULT_ENVIRONMENT;
        const intendedStage = text(input.intendedPublishStage) ?? MVP_DEFAULT_STAGE;

        const siteVersionRow = await this.repository.readSiteVersion(client, input.siteVersionId);
        const siteVersion = siteVersionRow ? mapSiteVersion(siteVersionRow, capturedAt) : null;
        if (!siteVersionRow) limitations.push("missing_site_version");

        const artifactRow = await this.repository.readRuntimeArtifact(client, {
          runtimeArtifactId: input.runtimeArtifactId ?? text(siteVersionRow?.artifact_id),
          siteVersionId: input.siteVersionId,
        });
        const runtimeArtifact = artifactRow
          ? mapRuntimeArtifact({
              row: artifactRow,
              expectedSiteId: input.siteId,
              expectedSiteVersionId: input.siteVersionId,
              requestedRuntimeArtifactId: input.runtimeArtifactId ?? text(siteVersionRow?.artifact_id),
              capturedAt,
            })
          : null;
        if (!artifactRow) limitations.push("missing_runtime_artifact");
        if (runtimeArtifact?.limitations?.length) limitations.push(...runtimeArtifact.limitations);

        const activePointerRow = await this.repository.readActivePointer(client, input.siteId);
        const activePointer = activePointerRow ? mapActivePointer(activePointerRow, capturedAt) : null;
        if (!activePointerRow) limitations.push("missing_active_pointer");

        const publishTargetRow = await this.repository.readPublishTarget(client, input.intendedPublishTarget);
        const publishTarget = publishTargetRow
          ? mapPublishTarget({
              row: publishTargetRow,
              trustedEnvironment,
              intendedStage,
              artifactStage: text(artifactRow?.publish_stage),
              capturedAt,
            })
          : null;
        if (!publishTargetRow) limitations.push("missing_publish_target");
        if (publishTarget?.limitations?.length) limitations.push(...publishTarget.limitations);

        const ddomRow = await this.repository.readLatestDdomReadiness(client, {
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          domainHint: input.intendedDomain ?? input.domainId ?? null,
        });
        const domainReadiness = ddomRow ? mapDdomReadiness(ddomRow, capturedAt) : null;
        if (!ddomRow) limitations.push("missing_ddom_snapshot");
        if (domainReadiness?.limitations?.length) limitations.push(...domainReadiness.limitations);
        if (domainReadiness?.warnings?.length) warnings.push(...domainReadiness.warnings);

        const contentRow = await this.repository.readPublishedContentOverrideAggregate(client, input.siteVersionId);
        const contentOverridePublishedState = mapContentOverrideState({
          row: contentRow,
          required: input.contentOverrideStateRequired === true,
          capturedAt,
        });
        if (contentOverridePublishedState.limitations?.length) limitations.push(...contentOverridePublishedState.limitations);

        const launchSignoff =
          input.launchSignoffRequiredByPolicy === true
            ? await this.readApproval({
                client,
                input,
                capturedAt,
                now,
                expectedScope: "launch_signoff",
                required: true,
              })
            : null;
        if (input.launchSignoffRequiredByPolicy === true && !launchSignoff) limitations.push("missing_required_launch_signoff");
        if (launchSignoff?.limitations?.length) limitations.push(...launchSignoff.limitations);

        const publishActivationApproval = await this.readApproval({
          client,
          input,
          capturedAt,
          now,
          expectedScope: "publish_activation",
          required: Boolean(input.publishActivationApprovalRef?.approvalDecisionId ?? input.publishActivationApprovalRef?.approvalRequestId),
          approvalRequestId: input.publishActivationApprovalRef?.approvalRequestId ?? null,
          approvalDecisionId: input.publishActivationApprovalRef?.approvalDecisionId ?? null,
          providedScope: input.publishActivationApprovalRef?.scope ?? null,
        });
        if (input.publishActivationApprovalRef && !publishActivationApproval) limitations.push("missing_publish_activation_approval");
        if (publishActivationApproval?.limitations?.length) limitations.push(...publishActivationApproval.limitations);

        return {
          siteVersion,
          runtimeArtifact,
          activePointer,
          publishTarget,
          domainReadiness,
          contentOverridePublishedState,
          launchSignoff,
          publishActivationApproval,
          warnings: Array.from(new Set(warnings)).sort((left, right) => left.localeCompare(right)),
          limitations: Array.from(new Set(limitations)).sort((left, right) => left.localeCompare(right)),
        };
      });
    } catch (error) {
      const limitation =
        error instanceof AafPublishActivationReadOnlyTransactionUnavailableError
          ? "read_only_transaction_unavailable"
          : "publish_activation_source_reader_unavailable";
      return {
        warnings: ["publish_activation_source_reader_failed_closed"],
        limitations: [limitation],
      };
    }
  }

  private async readApproval(input: {
    client: AafPgClient;
    input: PublishActivationEvidenceReaderInput;
    capturedAt: string;
    now: Date;
    expectedScope: AafApprovalScope;
    required: boolean;
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    providedScope?: AafApprovalScope | null;
  }): Promise<PublishActivationApprovalSnapshot | null> {
    if (input.providedScope && input.providedScope !== input.expectedScope) {
      return approvalRefScopeMismatchSnapshot({
        scope: input.providedScope,
        approvalRequestId: input.approvalRequestId,
        approvalDecisionId: input.approvalDecisionId,
        siteVersionId: input.input.siteVersionId,
        expectedScope: input.expectedScope,
        capturedAt: input.capturedAt,
      });
    }

    const row = await this.repository.readApprovalTimeline(input.client, {
      tenantId: input.input.tenantId,
      clientId: input.input.clientId ?? null,
      siteId: input.input.siteId,
      batchId: input.input.batchId ?? null,
      jobId: input.input.jobId ?? null,
      siteVersionId: input.input.siteVersionId,
      domainId: input.input.domainId ?? null,
      costCenterId: input.input.costCenterId ?? null,
      scope: input.expectedScope,
      subjectType: "site_version",
      subjectId: input.input.siteVersionId,
      approvalRequestId: input.approvalRequestId ?? null,
      approvalDecisionId: input.approvalDecisionId ?? null,
    });
    if (!row) return null;
    return mapApprovalTimeline({
      row,
      expectedScope: input.expectedScope,
      required: input.required,
      capturedAt: input.capturedAt,
      now: input.now,
    });
  }
}

export async function readPublishActivationSources(
  input: PublishActivationEvidenceReaderInput,
): Promise<PublishActivationSourceReaderResult> {
  return new AafPublishActivationSourceReader().readPublishActivationSources(input);
}
