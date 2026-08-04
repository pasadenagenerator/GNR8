import "server-only";

import { createHash } from "node:crypto";

import {
  LaunchReadinessSourceReadRepository,
  LaunchReadinessSourceReadRepositoryError,
  type LaunchReadinessApprovalSourceRow,
  type LaunchReadinessClientApprovalSourceRow,
  type LaunchReadinessContentApprovalSourceRow,
  type LaunchReadinessDdomRefSourceRow,
  type LaunchReadinessDdomSnapshotSourceRow,
  type LaunchReadinessImprovedReviewSourceRow,
  type LaunchReadinessMigrationRefSourceRow,
  type LaunchReadinessPublishTargetSourceRow,
  type LaunchReadinessRuntimeArtifactSourceRow,
  type LaunchReadinessRuntimeSiteVersionSourceRow,
  type LaunchReadinessSourceReadClient,
  type LaunchReadinessSourceReadRepositoryLike,
} from "./launch-readiness-source-read-repository";

export const LAUNCH_READINESS_SOURCE_READER_VERSION = "mvp-38-launch-readiness-source-reader:v1" as const;

export const LAUNCH_READINESS_SOURCE_DIMENSIONS = [
  "launch_approval",
  "content_approval",
  "client_approval",
  "improved_candidate",
  "publish_target",
  "domain_readiness",
  "dns_operator_evidence",
  "vercel_custom_domain_ssl",
  "billing_subscription",
  "hosting_entitlement",
  "stripe_payment",
  "rollback_readiness",
  "preview_smoke_qa",
  "limitations",
  "audit_timeline",
  "pasr_shadow_diagnostics",
] as const;

export type LaunchReadinessSourceDimension = (typeof LAUNCH_READINESS_SOURCE_DIMENSIONS)[number];
export type LaunchReadinessDimensionStatus = "ready" | "ready_with_limitations" | "blocked" | "stale" | "missing" | "not_applicable" | "unknown";
export type LaunchReadinessFreshnessStatus = "fresh" | "stale" | "missing" | "unknown" | "not_applicable";
export type LaunchReadinessOverallSourceStatus = "ready" | "ready_with_limitations" | "blocked" | "stale" | "missing" | "unknown";

export type LaunchReadinessActorTraceInput = {
  actorType: "human" | "system" | "provider" | "external_reference" | "ai_advisory";
  actorId: string;
  actorRole: string;
  actorDisplayLabel?: string | null;
};

export type LaunchReadinessSourceReaderPolicy = {
  clientApprovalRequired?: boolean | null;
  intendedPublishTarget?: string | null;
  trustedPublishEnvironment?: string | null;
  intendedPublishStage?: string | null;
  domainHint?: string | null;
  billingSubscriptionRequired?: boolean | null;
  hostingEntitlementRequired?: boolean | null;
  stripePaymentRequired?: boolean | null;
  rollbackReadinessRequired?: boolean | null;
  previewSmokeQaRequired?: boolean | null;
};

export type ReadSingleSiteLaunchReadinessSourcesInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  improvedCandidateSiteVersionRef: string;
  improvedRuntimeArtifactRef: string;
  launchApprovalDecisionRef: string;
  actor: LaunchReadinessActorTraceInput;
  correlationId: string;
  idempotencyKey: string;
  causationId?: string | null;
  requestId?: string | null;
  policy?: LaunchReadinessSourceReaderPolicy;
};

export type LaunchReadinessSourceRef = {
  sourceSystem: string;
  sourceTable: string | null;
  sourceType: string;
  sourceRecordId: string;
  sourceRef: string;
  sourceVersion: string | null;
  sourceWatermark: string | null;
  capturedAt: string | null;
  freshUntil: string | null;
  evidenceOnly: boolean;
  metadata?: Record<string, unknown>;
};

export type LaunchReadinessSourceDimensionPackage = {
  dimension: LaunchReadinessSourceDimension;
  status: LaunchReadinessDimensionStatus;
  freshnessStatus: LaunchReadinessFreshnessStatus;
  sourceRefs: LaunchReadinessSourceRef[];
  sourceWatermarks: string[];
  semanticSourceWatermark: string;
  sourceCapturedAt: string | null;
  freshUntil: string | null;
  blockers: string[];
  limitations: string[];
  warnings: string[];
  diagnostics: Record<string, unknown>;
  requiredForLaunchReadiness: boolean;
  requiredForPublishActivation: boolean;
};

export type LaunchReadinessSourcePackage = {
  identity: {
    tenantId: string;
    clientId: string;
    siteId: string;
    migrationId: string;
    improvedCandidateSiteVersionRef: string;
    improvedRuntimeArtifactRef: string;
    launchApprovalDecisionRef: string;
  };
  readTrace: {
    actorType: string;
    actorId: string;
    actorRole: string;
    correlationId: string;
    causationId: string | null;
    idempotencyKey: string;
    requestId: string | null;
    readerVersion: typeof LAUNCH_READINESS_SOURCE_READER_VERSION;
  };
  transactionTimestamp: string;
  overallSourceStatus: LaunchReadinessOverallSourceStatus;
  freshnessStatus: LaunchReadinessFreshnessStatus;
  dimensions: Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>;
  blockerSummaries: string[];
  limitations: string[];
  warnings: string[];
  diagnostics: Record<string, unknown>;
  missingSourceTruth: string[];
  staleSourceTruth: string[];
  unsupportedSourceTruth: string[];
  recommendedNextAction: string;
  semanticSourceWatermark: string;
  derivedOnly: true;
  mutatesSourceTruth: false;
  nonEnforcing: true;
  publishActionBlocked: false;
  publishActivationApproved: false;
};

const SOURCE_SYSTEM = "gnr8";
const DEFAULT_PUBLISH_TARGET = "production";
const DEFAULT_ENVIRONMENT = "production";
const DEFAULT_STAGE = "production";

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function sourceId(refOrId: string): string {
  const trimmed = refOrId.trim();
  const parts = trimmed.split(":");
  return parts[parts.length - 1] || trimmed;
}

function sourceRef(sourceTable: string | null, sourceRecordId: string): string {
  return `${SOURCE_SYSTEM}:${sourceTable ?? "unknown"}:${sourceRecordId}`;
}

function arrayFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function stringArray(value: unknown): string[] {
  return arrayFromUnknown(value)
    .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
    .filter((item): item is string => Boolean(text(item)))
    .sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function hashLaunchReadinessStableValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function aggregateWatermark(value: unknown): string {
  return `sha256:${hashLaunchReadinessStableValue(value)}`;
}

function maybeFreshUntilStatus(freshUntil: string | null | undefined, capturedAt: string): LaunchReadinessFreshnessStatus {
  if (!freshUntil) return "fresh";
  const freshUntilDate = new Date(freshUntil);
  const capturedDate = new Date(capturedAt);
  if (Number.isNaN(freshUntilDate.getTime()) || Number.isNaN(capturedDate.getTime())) return "unknown";
  return freshUntilDate.getTime() <= capturedDate.getTime() ? "stale" : "fresh";
}

function baseSourceRef(input: {
  sourceTable: string | null;
  sourceType: string;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
  evidenceOnly?: boolean;
  metadata?: Record<string, unknown>;
}): LaunchReadinessSourceRef {
  return {
    sourceSystem: SOURCE_SYSTEM,
    sourceTable: input.sourceTable,
    sourceType: input.sourceType,
    sourceRecordId: input.sourceRecordId,
    sourceRef: sourceRef(input.sourceTable, input.sourceRecordId),
    sourceVersion: text(input.sourceVersion),
    sourceWatermark: text(input.sourceWatermark),
    capturedAt: text(input.capturedAt),
    freshUntil: text(input.freshUntil),
    evidenceOnly: input.evidenceOnly ?? true,
    metadata: input.metadata,
  };
}

function migrationRef(row: LaunchReadinessMigrationRefSourceRow): LaunchReadinessSourceRef {
  return {
    sourceSystem: row.source_system,
    sourceTable: row.source_table,
    sourceType: row.ref_type,
    sourceRecordId: row.source_record_id,
    sourceRef: `${row.source_system}:${row.source_table ?? row.ref_role}:${row.source_record_id}`,
    sourceVersion: row.source_version,
    sourceWatermark: row.source_watermark ?? row.semantic_watermark ?? row.content_hash,
    capturedAt: row.captured_at,
    freshUntil: row.fresh_until,
    evidenceOnly: row.evidence_only,
    metadata: { refRole: row.ref_role },
  };
}

function ddomSourceRef(row: LaunchReadinessDdomRefSourceRow): LaunchReadinessSourceRef {
  return {
    sourceSystem: row.source_system,
    sourceTable: row.source_table,
    sourceType: row.ref_type,
    sourceRecordId: row.source_record_id,
    sourceRef: `${row.source_system}:${row.source_table ?? row.ref_role}:${row.source_record_id}`,
    sourceVersion: row.source_version,
    sourceWatermark: row.source_watermark,
    capturedAt: row.captured_at,
    freshUntil: null,
    evidenceOnly: true,
    metadata: { refRole: row.ref_role },
  };
}

function dimension(input: {
  dimension: LaunchReadinessSourceDimension;
  status: LaunchReadinessDimensionStatus;
  freshnessStatus?: LaunchReadinessFreshnessStatus;
  sourceRefs?: LaunchReadinessSourceRef[];
  sourceCapturedAt?: string | null;
  freshUntil?: string | null;
  blockers?: string[];
  limitations?: string[];
  warnings?: string[];
  diagnostics?: Record<string, unknown>;
  requiredForLaunchReadiness?: boolean;
  requiredForPublishActivation?: boolean;
}): LaunchReadinessSourceDimensionPackage {
  const refs = [...(input.sourceRefs ?? [])].sort((left, right) => left.sourceRef.localeCompare(right.sourceRef));
  const sourceWatermarks = uniqueSorted(refs.map((ref) => ref.sourceWatermark));
  const blockers = uniqueSorted(input.blockers ?? []);
  const limitations = uniqueSorted(input.limitations ?? []);
  const warnings = uniqueSorted(input.warnings ?? []);
  const freshnessStatus = input.freshnessStatus ?? (input.status === "not_applicable" ? "not_applicable" : input.status === "missing" ? "missing" : "fresh");
  const canonical = {
    dimension: input.dimension,
    status: input.status,
    freshnessStatus,
    sourceRefs: refs.map((ref) => ({
      sourceSystem: ref.sourceSystem,
      sourceTable: ref.sourceTable,
      sourceType: ref.sourceType,
      sourceRecordId: ref.sourceRecordId,
      sourceVersion: ref.sourceVersion,
      sourceWatermark: ref.sourceWatermark,
      capturedAt: ref.capturedAt,
      freshUntil: ref.freshUntil,
      evidenceOnly: ref.evidenceOnly,
    })),
    sourceWatermarks,
    sourceCapturedAt: input.sourceCapturedAt ?? null,
    freshUntil: input.freshUntil ?? null,
    blockers,
    limitations,
    warnings,
    diagnostics: input.diagnostics ?? {},
    requiredForLaunchReadiness: input.requiredForLaunchReadiness ?? true,
    requiredForPublishActivation: input.requiredForPublishActivation ?? true,
  };
  return {
    dimension: input.dimension,
    status: input.status,
    freshnessStatus,
    sourceRefs: refs,
    sourceWatermarks,
    semanticSourceWatermark: aggregateWatermark(canonical),
    sourceCapturedAt: input.sourceCapturedAt ?? null,
    freshUntil: input.freshUntil ?? null,
    blockers,
    limitations,
    warnings,
    diagnostics: input.diagnostics ?? {},
    requiredForLaunchReadiness: input.requiredForLaunchReadiness ?? true,
    requiredForPublishActivation: input.requiredForPublishActivation ?? true,
  };
}

function approvalStatus(row: {
  status: string;
  approved_with_limitations: boolean;
  limitations_json: unknown;
  semantic_watermark: string | null;
  updated_at: string;
}): { status: LaunchReadinessDimensionStatus; blockers: string[]; limitations: string[]; freshnessStatus: LaunchReadinessFreshnessStatus } {
  if (row.status === "approved") return { status: "ready", blockers: [], limitations: [], freshnessStatus: "fresh" };
  if (row.status === "approved_with_limitations") {
    return {
      status: "ready_with_limitations",
      blockers: [],
      limitations: uniqueSorted(["approval_granted_with_limitations", ...stringArray(row.limitations_json)]),
      freshnessStatus: "fresh",
    };
  }
  return {
    status: "blocked",
    blockers: [`approval_status_${row.status}`],
    limitations: [],
    freshnessStatus: "unknown",
  };
}

function mapLaunchApproval(row: LaunchReadinessApprovalSourceRow | null, input: ReadSingleSiteLaunchReadinessSourcesInput): LaunchReadinessSourceDimensionPackage {
  if (!row) {
    return dimension({
      dimension: "launch_approval",
      status: "missing",
      freshnessStatus: "missing",
      blockers: ["missing_required_launch_approval"],
      diagnostics: { expectedDecisionRef: input.launchApprovalDecisionRef, requiredAafScope: "single_site_launch_approval" },
    });
  }
  const aafValid =
    row.aaf_launch_approval_decision_id === sourceId(input.launchApprovalDecisionRef) &&
    row.aaf_launch_approval_scope === "single_site_launch_approval" &&
    row.aaf_launch_approval_action === "approve_single_site_launch_readiness" &&
    row.aaf_launch_approval_subject_type === "single_site_launch_readiness_review";
  const mapped = approvalStatus(row);
  const blockers = [...mapped.blockers];
  if (!aafValid) blockers.push("invalid_single_site_launch_approval_aaf_decision_ref");
  return dimension({
    dimension: "launch_approval",
    status: aafValid ? mapped.status : "blocked",
    freshnessStatus: aafValid ? mapped.freshnessStatus : "unknown",
    sourceRefs: [
      baseSourceRef({
        sourceTable: "gnr8_single_site_launch_approvals",
        sourceType: "single_site_launch_approval",
        sourceRecordId: row.id,
        sourceVersion: row.updated_at,
        sourceWatermark: row.semantic_watermark ?? row.payload_hash,
        capturedAt: row.updated_at,
      }),
      ...(row.aaf_launch_approval_decision_id
        ? [
            baseSourceRef({
              sourceTable: "gnr8_aaf_approval_decisions",
              sourceType: "single_site_launch_approval_aaf_decision",
              sourceRecordId: row.aaf_launch_approval_decision_id,
              sourceVersion: row.updated_at,
              sourceWatermark: row.semantic_watermark ?? row.payload_hash,
              capturedAt: row.updated_at,
            }),
          ]
        : []),
    ],
    sourceCapturedAt: row.updated_at,
    blockers,
    limitations: mapped.limitations,
    diagnostics: {
      status: row.status,
      decision: row.decision,
      aafScope: row.aaf_launch_approval_scope,
      aafAction: row.aaf_launch_approval_action,
      aafSubjectType: row.aaf_launch_approval_subject_type,
      readinessWorkReady: row.readiness_work_ready,
    },
  });
}

function mapContentApproval(row: LaunchReadinessContentApprovalSourceRow | null): LaunchReadinessSourceDimensionPackage {
  if (!row) {
    return dimension({
      dimension: "content_approval",
      status: "missing",
      freshnessStatus: "missing",
      blockers: ["missing_required_content_approval"],
    });
  }
  const aafValid =
    row.aaf_content_approval_decision_id &&
    row.aaf_content_approval_scope === "single_site_content_approval" &&
    row.aaf_content_approval_action === "approve_single_site_content" &&
    row.aaf_content_approval_subject_type === "single_site_improved_version_review";
  const mapped = approvalStatus(row);
  const blockers = [...mapped.blockers];
  if (!aafValid) blockers.push("invalid_single_site_content_approval_aaf_decision_ref");
  return dimension({
    dimension: "content_approval",
    status: aafValid ? mapped.status : "blocked",
    freshnessStatus: aafValid ? mapped.freshnessStatus : "unknown",
    sourceRefs: [
      baseSourceRef({
        sourceTable: "gnr8_single_site_content_approvals",
        sourceType: "single_site_content_approval",
        sourceRecordId: row.id,
        sourceVersion: row.updated_at,
        sourceWatermark: row.semantic_watermark ?? row.payload_hash,
        capturedAt: row.updated_at,
      }),
      ...(row.aaf_content_approval_decision_id
        ? [
            baseSourceRef({
              sourceTable: "gnr8_aaf_approval_decisions",
              sourceType: "single_site_content_approval_aaf_decision",
              sourceRecordId: row.aaf_content_approval_decision_id,
              sourceVersion: row.updated_at,
              sourceWatermark: row.semantic_watermark ?? row.payload_hash,
              capturedAt: row.updated_at,
            }),
          ]
        : []),
    ],
    sourceCapturedAt: row.updated_at,
    blockers,
    limitations: mapped.limitations,
    diagnostics: { status: row.status, decision: row.decision, contentApprovalReady: row.content_approval_ready },
  });
}

function mapClientApproval(row: LaunchReadinessClientApprovalSourceRow | null, required: boolean): LaunchReadinessSourceDimensionPackage {
  if (!required) {
    return dimension({
      dimension: "client_approval",
      status: "not_applicable",
      freshnessStatus: "not_applicable",
      requiredForLaunchReadiness: false,
      requiredForPublishActivation: false,
      diagnostics: { clientApprovalRequired: false },
    });
  }
  if (!row) {
    return dimension({
      dimension: "client_approval",
      status: "missing",
      freshnessStatus: "missing",
      blockers: ["missing_required_client_approval"],
      diagnostics: { clientApprovalRequired: true },
    });
  }
  const aafValid =
    row.aaf_client_approval_decision_id &&
    row.aaf_client_approval_scope === "single_site_client_approval" &&
    row.aaf_client_approval_action === "approve_single_site_client_acceptance" &&
    row.aaf_client_approval_subject_type === "single_site_improved_candidate_client_acceptance";
  const mapped = approvalStatus(row);
  const blockers = [...mapped.blockers];
  if (!aafValid) blockers.push("invalid_single_site_client_approval_aaf_decision_ref");
  return dimension({
    dimension: "client_approval",
    status: aafValid ? mapped.status : "blocked",
    freshnessStatus: aafValid ? mapped.freshnessStatus : "unknown",
    sourceRefs: [
      baseSourceRef({
        sourceTable: "gnr8_single_site_client_approvals",
        sourceType: "single_site_client_approval",
        sourceRecordId: row.id,
        sourceVersion: row.updated_at,
        sourceWatermark: row.semantic_watermark ?? row.payload_hash,
        capturedAt: row.updated_at,
      }),
      ...(row.aaf_client_approval_decision_id
        ? [
            baseSourceRef({
              sourceTable: "gnr8_aaf_approval_decisions",
              sourceType: "single_site_client_approval_aaf_decision",
              sourceRecordId: row.aaf_client_approval_decision_id,
              sourceVersion: row.updated_at,
              sourceWatermark: row.semantic_watermark ?? row.payload_hash,
              capturedAt: row.updated_at,
            }),
          ]
        : []),
    ],
    sourceCapturedAt: row.updated_at,
    blockers,
    limitations: mapped.limitations,
    diagnostics: { status: row.status, decision: row.decision, clientApprovalReady: row.client_approval_ready },
  });
}

function mapImprovedCandidate(input: {
  review: LaunchReadinessImprovedReviewSourceRow | null;
  siteVersion: LaunchReadinessRuntimeSiteVersionSourceRow | null;
  artifact: LaunchReadinessRuntimeArtifactSourceRow | null;
  expectedSiteId: string;
  expectedVersionRef: string;
  expectedArtifactRef: string;
}): LaunchReadinessSourceDimensionPackage {
  const blockers: string[] = [];
  const limitations: string[] = [];
  const warnings: string[] = [];
  const refs: LaunchReadinessSourceRef[] = [];
  if (!input.review) blockers.push("missing_improved_version_review");
  if (!input.siteVersion) blockers.push("missing_improved_candidate_site_version");
  if (!input.artifact) blockers.push("missing_improved_runtime_artifact");
  if (input.review && !["accepted", "accepted_with_limitations"].includes(input.review.review_status)) blockers.push(`improved_review_status_${input.review.review_status}`);
  if (input.siteVersion && input.siteVersion.site_id !== input.expectedSiteId) blockers.push("improved_candidate_site_mismatch");
  if (input.artifact && input.artifact.site_id !== input.expectedSiteId) blockers.push("improved_runtime_artifact_site_mismatch");
  if (input.artifact && input.siteVersion && input.artifact.site_version_id !== input.siteVersion.id) blockers.push("improved_runtime_artifact_version_mismatch");
  if (input.review?.review_status === "accepted_with_limitations") limitations.push("improved_candidate_accepted_with_limitations", ...stringArray(input.review.limitations_json));
  if (input.review) warnings.push(...stringArray(input.review.warnings_json));
  if (input.siteVersion) {
    refs.push(
      baseSourceRef({
        sourceTable: "gnr8_runtime_site_versions",
        sourceType: "improved_candidate_site_version",
        sourceRecordId: input.siteVersion.id,
        sourceVersion: text(input.siteVersion.version_no) ?? input.siteVersion.updated_at,
        sourceWatermark: input.siteVersion.updated_at ? `updated_at:${input.siteVersion.updated_at}` : null,
        capturedAt: input.siteVersion.updated_at ?? input.siteVersion.created_at,
      }),
    );
  }
  if (input.artifact) {
    refs.push(
      baseSourceRef({
        sourceTable: "gnr8_runtime_artifacts",
        sourceType: "improved_runtime_artifact",
        sourceRecordId: input.artifact.id,
        sourceVersion: input.artifact.bundle_sha256,
        sourceWatermark: input.artifact.bundle_sha256 ? `bundle_sha256:${input.artifact.bundle_sha256}|id:${input.artifact.id}` : null,
        capturedAt: input.artifact.created_at,
      }),
    );
  }
  if (input.review) {
    refs.push(
      baseSourceRef({
        sourceTable: "gnr8_single_site_improved_version_reviews",
        sourceType: "improved_version_review",
        sourceRecordId: input.review.id,
        sourceVersion: input.review.updated_at,
        sourceWatermark: input.review.semantic_watermark ?? input.review.payload_hash,
        capturedAt: input.review.updated_at,
      }),
    );
  }
  return dimension({
    dimension: "improved_candidate",
    status: blockers.length > 0 ? "blocked" : limitations.length > 0 ? "ready_with_limitations" : "ready",
    freshnessStatus: blockers.length > 0 ? "missing" : "fresh",
    sourceRefs: refs,
    sourceCapturedAt: input.artifact?.created_at ?? input.siteVersion?.updated_at ?? input.review?.updated_at ?? null,
    blockers,
    limitations,
    warnings,
    diagnostics: {
      expectedCandidateRef: input.expectedVersionRef,
      expectedArtifactRef: input.expectedArtifactRef,
      artifactPublishStage: input.artifact?.publish_stage ?? null,
      reviewStatus: input.review?.review_status ?? null,
    },
  });
}

function mapPublishTarget(
  row: LaunchReadinessPublishTargetSourceRow | null,
  artifact: LaunchReadinessRuntimeArtifactSourceRow | null,
  policy: LaunchReadinessSourceReaderPolicy | undefined,
): LaunchReadinessSourceDimensionPackage {
  if (!row) {
    return dimension({
      dimension: "publish_target",
      status: "missing",
      freshnessStatus: "missing",
      blockers: ["missing_publish_target"],
    });
  }
  const blockers: string[] = [];
  const trustedEnvironment = text(policy?.trustedPublishEnvironment) ?? DEFAULT_ENVIRONMENT;
  const intendedStage = text(policy?.intendedPublishStage) ?? DEFAULT_STAGE;
  const allowedStages = stringArray(row.allowed_artifact_stages);
  if (row.status === "disabled") blockers.push("disabled_publish_target");
  if (row.status === "retired") blockers.push("retired_publish_target");
  if (!["active", "disabled", "retired"].includes(row.status)) blockers.push("publish_target_status_unknown");
  if (row.environment !== trustedEnvironment) blockers.push("publish_target_environment_mismatch");
  if (row.publish_stage !== intendedStage) blockers.push("publish_target_stage_mismatch");
  if (artifact?.publish_stage && allowedStages.length > 0 && !allowedStages.includes(artifact.publish_stage)) blockers.push("artifact_stage_not_allowed_by_target");
  return dimension({
    dimension: "publish_target",
    status: blockers.length > 0 ? "blocked" : "ready",
    freshnessStatus: blockers.length > 0 ? "unknown" : "fresh",
    sourceRefs: [
      baseSourceRef({
        sourceTable: "gnr8_publish_targets",
        sourceType: "publish_target",
        sourceRecordId: row.id,
        sourceVersion: row.policy_version,
        sourceWatermark: row.source_watermark,
        capturedAt: row.updated_at,
      }),
    ],
    sourceCapturedAt: row.updated_at,
    blockers,
    limitations: stringArray(row.limitations_json),
    diagnostics: {
      status: row.status,
      environment: row.environment,
      publishStage: row.publish_stage,
      targetKind: row.target_kind,
      allowedArtifactStages: allowedStages,
      artifactPublishStage: artifact?.publish_stage ?? null,
    },
  });
}

function mapDdom(row: LaunchReadinessDdomSnapshotSourceRow | null, ddomRefs: LaunchReadinessDdomRefSourceRow[], capturedAt: string): LaunchReadinessSourceDimensionPackage {
  if (!row) {
    return dimension({
      dimension: "domain_readiness",
      status: "missing",
      freshnessStatus: "missing",
      blockers: ["missing_ddom_snapshot"],
      diagnostics: { ddomSnapshotCreationPerformed: false },
    });
  }
  const blockers = stringArray(row.readiness_blockers);
  const warnings = stringArray(row.readiness_warnings);
  const limitations: string[] = [];
  let status: LaunchReadinessDimensionStatus = "blocked";
  let freshnessStatus: LaunchReadinessFreshnessStatus = row.freshness_state === "stale" ? "stale" : "fresh";
  if (row.readiness_state === "ready") status = "ready";
  if (row.readiness_state === "ready_with_warnings") {
    status = "ready_with_limitations";
    limitations.push("domain_readiness_ready_with_warnings");
  }
  if (row.readiness_state === "not_applicable") {
    status = "not_applicable";
    freshnessStatus = "not_applicable";
  }
  if (row.readiness_state === "manually_excepted") {
    status = "ready_with_limitations";
    limitations.push("domain_readiness_manually_excepted");
  }
  if (row.readiness_state === "stale" || row.freshness_state === "stale" || maybeFreshUntilStatus(row.fresh_until, capturedAt) === "stale") {
    status = "stale";
    freshnessStatus = "stale";
    blockers.push("domain_readiness_stale");
    limitations.push("stale_ddom_snapshot");
  }
  if (row.readiness_state === "blocked" && blockers.length === 0) blockers.push("domain_readiness_blocked");
  return dimension({
    dimension: "domain_readiness",
    status,
    freshnessStatus,
    sourceRefs: [
      baseSourceRef({
        sourceTable: "gnr8_ddom_readiness_snapshots",
        sourceType: "ddom_readiness_snapshot",
        sourceRecordId: row.id,
        sourceVersion: row.captured_at,
        sourceWatermark: row.source_watermark,
        capturedAt: row.captured_at,
        freshUntil: row.fresh_until,
      }),
      ...ddomRefs.map(ddomSourceRef),
    ],
    sourceCapturedAt: row.captured_at,
    freshUntil: row.fresh_until,
    blockers,
    limitations,
    warnings,
    diagnostics: {
      readinessState: row.readiness_state,
      freshnessState: row.freshness_state,
      staleReason: row.stale_reason,
      domain: row.domain,
      intendedLaunchDomain: row.intended_launch_domain,
      ddomSnapshotCreationPerformed: false,
    },
  });
}

function refsDimension(input: {
  dimension: LaunchReadinessSourceDimension;
  refs: LaunchReadinessSourceRef[];
  missingStatus?: LaunchReadinessDimensionStatus;
  missingBlocker?: string;
  missingLimitation?: string;
  unsupported?: string;
  required?: boolean;
  nonEnforcing?: boolean;
}): LaunchReadinessSourceDimensionPackage {
  const staleRefs = input.refs.filter((ref) => maybeFreshUntilStatus(ref.freshUntil, ref.capturedAt ?? new Date(0).toISOString()) === "stale");
  if (input.refs.length > 0) {
    return dimension({
      dimension: input.dimension,
      status: staleRefs.length > 0 ? "stale" : "ready",
      freshnessStatus: staleRefs.length > 0 ? "stale" : "fresh",
      sourceRefs: input.refs,
      sourceCapturedAt: input.refs.map((ref) => ref.capturedAt).find(Boolean) ?? null,
      blockers: staleRefs.length > 0 && input.required !== false ? [`stale_${input.dimension}`] : [],
      limitations: staleRefs.length > 0 ? [`stale_${input.dimension}`] : [],
      diagnostics: { nonEnforcing: input.nonEnforcing === true },
      requiredForLaunchReadiness: input.required !== false,
      requiredForPublishActivation: input.required !== false,
    });
  }
  return dimension({
    dimension: input.dimension,
    status: input.missingStatus ?? "missing",
    freshnessStatus: input.missingStatus === "not_applicable" ? "not_applicable" : "missing",
    blockers: input.missingBlocker ? [input.missingBlocker] : [],
    limitations: uniqueSorted([input.missingLimitation, input.unsupported]),
    diagnostics: { unsupportedSourceTruth: input.unsupported ?? null, nonEnforcing: input.nonEnforcing === true },
    requiredForLaunchReadiness: input.required !== false,
    requiredForPublishActivation: input.required !== false,
  });
}

function limitationsDimension(allDimensions: Partial<Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>>): LaunchReadinessSourceDimensionPackage {
  const limitations = uniqueSorted(Object.values(allDimensions).flatMap((item) => item?.limitations ?? []));
  const warnings = uniqueSorted(Object.values(allDimensions).flatMap((item) => item?.warnings ?? []));
  return dimension({
    dimension: "limitations",
    status: limitations.length > 0 || warnings.length > 0 ? "ready_with_limitations" : "ready",
    freshnessStatus: "fresh",
    limitations,
    warnings,
    requiredForLaunchReadiness: false,
    requiredForPublishActivation: false,
    diagnostics: { derivedFromDimensions: Object.keys(allDimensions).sort() },
  });
}

function overallStatus(dimensions: Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>): LaunchReadinessOverallSourceStatus {
  const enforcing = Object.values(dimensions).filter((item) => item.requiredForLaunchReadiness);
  if (enforcing.some((item) => item.status === "blocked")) return "blocked";
  if (enforcing.some((item) => item.status === "stale")) return "stale";
  if (enforcing.some((item) => item.status === "missing")) return "missing";
  if (enforcing.some((item) => item.status === "unknown")) return "unknown";
  if (Object.values(dimensions).some((item) => item.status === "ready_with_limitations")) return "ready_with_limitations";
  return "ready";
}

function overallFreshness(dimensions: Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>): LaunchReadinessFreshnessStatus {
  const enforcing = Object.values(dimensions).filter((item) => item.requiredForLaunchReadiness);
  if (enforcing.some((item) => item.freshnessStatus === "stale")) return "stale";
  if (enforcing.some((item) => item.freshnessStatus === "missing")) return "missing";
  if (enforcing.some((item) => item.freshnessStatus === "unknown")) return "unknown";
  return "fresh";
}

function nextAction(dimensions: Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>): string {
  const priority = Object.values(dimensions)
    .filter((item) => item.requiredForLaunchReadiness && ["blocked", "stale", "missing", "unknown"].includes(item.status))
    .sort((left, right) => LAUNCH_READINESS_SOURCE_DIMENSIONS.indexOf(left.dimension) - LAUNCH_READINESS_SOURCE_DIMENSIONS.indexOf(right.dimension))[0];
  if (!priority) return "review_source_package_for_future_launch_readiness_writer";
  if (priority.status === "stale") return `refresh_${priority.dimension}_source_truth_outside_launch_readiness_reader`;
  if (priority.status === "missing") return `provide_${priority.dimension}_source_truth`;
  return `resolve_${priority.dimension}_blocker`;
}

function emptyDimensions(): Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage> {
  return Object.fromEntries(
    LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => [
      name,
      dimension({
        dimension: name,
        status: "unknown",
        freshnessStatus: "unknown",
        blockers: name === "limitations" || name === "audit_timeline" || name === "pasr_shadow_diagnostics" ? [] : [`${name}_unread`],
        requiredForLaunchReadiness: !["limitations", "audit_timeline", "pasr_shadow_diagnostics", "stripe_payment"].includes(name),
        requiredForPublishActivation: !["limitations", "audit_timeline", "pasr_shadow_diagnostics", "stripe_payment"].includes(name),
      }),
    ]),
  ) as Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>;
}

function packageResult(input: ReadSingleSiteLaunchReadinessSourcesInput, capturedAt: string, dimensions: Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>, diagnostics: Record<string, unknown> = {}): LaunchReadinessSourcePackage {
  const blockerSummaries = uniqueSorted(Object.values(dimensions).flatMap((item) => item.blockers));
  const limitations = uniqueSorted(Object.values(dimensions).flatMap((item) => item.limitations));
  const warnings = uniqueSorted(Object.values(dimensions).flatMap((item) => item.warnings));
  const missingSourceTruth = uniqueSorted(Object.values(dimensions).filter((item) => item.status === "missing").map((item) => item.dimension));
  const staleSourceTruth = uniqueSorted(Object.values(dimensions).filter((item) => item.status === "stale" || item.freshnessStatus === "stale").map((item) => item.dimension));
  const unsupportedSourceTruth = uniqueSorted(
    Object.values(dimensions)
      .flatMap((item) => [text(item.diagnostics.unsupportedSourceTruth)])
      .filter((item): item is string => Boolean(item)),
  );
  const semanticInput = {
    identity: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
      improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef,
      improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef,
      launchApprovalDecisionRef: input.launchApprovalDecisionRef,
    },
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, item]) => [key, item.semanticSourceWatermark])),
    blockerSummaries,
    limitations,
    warnings,
    missingSourceTruth,
    staleSourceTruth,
    unsupportedSourceTruth,
  };
  return {
    identity: semanticInput.identity,
    readTrace: {
      actorType: input.actor.actorType,
      actorId: input.actor.actorId,
      actorRole: input.actor.actorRole,
      correlationId: input.correlationId,
      causationId: input.causationId ?? null,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId ?? null,
      readerVersion: LAUNCH_READINESS_SOURCE_READER_VERSION,
    },
    transactionTimestamp: capturedAt,
    overallSourceStatus: overallStatus(dimensions),
    freshnessStatus: overallFreshness(dimensions),
    dimensions,
    blockerSummaries,
    limitations,
    warnings,
    diagnostics: {
      ...diagnostics,
      derivedOnly: true,
      mutatesSourceTruth: false,
      nonEnforcing: true,
      publishActionBlocked: false,
      publishActivationApproved: false,
    },
    missingSourceTruth,
    staleSourceTruth,
    unsupportedSourceTruth,
    recommendedNextAction: nextAction(dimensions),
    semanticSourceWatermark: aggregateWatermark(semanticInput),
    derivedOnly: true,
    mutatesSourceTruth: false,
    nonEnforcing: true,
    publishActionBlocked: false,
    publishActivationApproved: false,
  };
}

export class SingleSiteLaunchReadinessSourceReader {
  constructor(private readonly repository: LaunchReadinessSourceReadRepositoryLike = new LaunchReadinessSourceReadRepository()) {}

  async readSingleSiteLaunchReadinessSources(input: ReadSingleSiteLaunchReadinessSourcesInput): Promise<LaunchReadinessSourcePackage> {
    try {
      return await this.repository.withReadOnlyTransaction(async (client, capturedAt) => this.readWithinTransaction(client, capturedAt, input));
    } catch (error) {
      const dimensions = emptyDimensions();
      dimensions.launch_approval = dimension({
        dimension: "launch_approval",
        status: "blocked",
        freshnessStatus: "unknown",
        blockers: ["launch_readiness_source_reader_failed_closed"],
        limitations: [error instanceof LaunchReadinessSourceReadRepositoryError ? "read_only_transaction_unavailable" : "launch_readiness_source_reader_unavailable"],
        diagnostics: { errorName: error instanceof Error ? error.name : "unknown" },
      });
      return packageResult(input, new Date(0).toISOString(), dimensions, {
        failClosed: true,
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  private async readWithinTransaction(
    client: LaunchReadinessSourceReadClient,
    capturedAt: string,
    input: ReadSingleSiteLaunchReadinessSourcesInput,
  ): Promise<LaunchReadinessSourcePackage> {
    const launch = await this.repository.readLaunchApproval(client, input);
    const content = await this.repository.readContentApproval(client, {
      migrationId: input.migrationId,
      clientId: input.clientId,
      siteId: input.siteId,
      contentApprovalId: launch?.content_approval_id ?? null,
      candidateRef: input.improvedCandidateSiteVersionRef,
      artifactRef: input.improvedRuntimeArtifactRef,
    });
    const clientApprovalRequired = input.policy?.clientApprovalRequired ?? launch?.require_client_approval ?? false;
    const clientApproval = clientApprovalRequired
      ? await this.repository.readClientApproval(client, {
          migrationId: input.migrationId,
          clientId: input.clientId,
          siteId: input.siteId,
          clientApprovalId: launch?.client_approval_id ?? null,
          candidateRef: input.improvedCandidateSiteVersionRef,
          artifactRef: input.improvedRuntimeArtifactRef,
        })
      : null;
    const improvedReview = await this.repository.readImprovedVersionReview(client, {
      migrationId: input.migrationId,
      clientId: input.clientId,
      siteId: input.siteId,
      candidateRef: input.improvedCandidateSiteVersionRef,
      artifactRef: input.improvedRuntimeArtifactRef,
    });
    const siteVersion = await this.repository.readRuntimeSiteVersion(client, input.improvedCandidateSiteVersionRef);
    const artifact = await this.repository.readRuntimeArtifact(client, {
      artifactRefOrId: input.improvedRuntimeArtifactRef,
      siteVersionRefOrId: input.improvedCandidateSiteVersionRef,
    });
    const targetId = text(input.policy?.intendedPublishTarget) ?? text(launch?.publish_target_ref) ?? DEFAULT_PUBLISH_TARGET;
    const publishTarget = await this.repository.readPublishTarget(client, targetId);
    const ddom = await this.repository.readLatestDdomSnapshot(client, {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      siteVersionRefOrId: input.improvedCandidateSiteVersionRef,
      domainHint: input.policy?.domainHint ?? launch?.domain_readiness_ref ?? null,
    });
    const ddomRefs = ddom ? await this.repository.readDdomRefs(client, ddom.id) : [];
    const migrationRefs = await this.repository.readMigrationRefs(client, {
      migrationId: input.migrationId,
      roles: [
        "subscription",
        "hosting_entitlement",
        "billing_account",
        "cost_center",
        "stripe_customer",
        "stripe_subscription",
        "rollback_target",
        "pasr_shadow_result",
        "aaf_audit_event",
        "external_reference",
      ],
    });

    const byRole = (role: string) => migrationRefs.filter((ref) => ref.ref_role === role).map(migrationRef);
    const ddomByRole = (role: string) => ddomRefs.filter((ref) => ref.ref_role === role).map(ddomSourceRef);
    const dimensions: Partial<Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>> = {};
    dimensions.launch_approval = mapLaunchApproval(launch, input);
    dimensions.content_approval = mapContentApproval(content);
    dimensions.client_approval = mapClientApproval(clientApproval, clientApprovalRequired);
    dimensions.improved_candidate = mapImprovedCandidate({
      review: improvedReview,
      siteVersion,
      artifact,
      expectedSiteId: input.siteId,
      expectedVersionRef: input.improvedCandidateSiteVersionRef,
      expectedArtifactRef: input.improvedRuntimeArtifactRef,
    });
    dimensions.publish_target = mapPublishTarget(publishTarget, artifact, input.policy);
    dimensions.domain_readiness = mapDdom(ddom, ddomRefs, capturedAt);
    dimensions.dns_operator_evidence = refsDimension({
      dimension: "dns_operator_evidence",
      refs: [...ddomByRole("manual_completion_evidence"), ...ddomByRole("dns_instruction_snapshot")],
      missingBlocker: "missing_required_dns_operator_evidence",
      missingLimitation: "stored_dns_operator_evidence_missing",
    });
    dimensions.vercel_custom_domain_ssl = refsDimension({
      dimension: "vercel_custom_domain_ssl",
      refs: ddomByRole("vercel_snapshot"),
      missingBlocker: "missing_stored_vercel_custom_domain_ssl_state",
      missingLimitation: "stored_vercel_custom_domain_ssl_state_missing",
    });
    dimensions.billing_subscription = refsDimension({
      dimension: "billing_subscription",
      refs: byRole("subscription"),
      missingBlocker: input.policy?.billingSubscriptionRequired === false ? undefined : "missing_billing_subscription_source_truth",
      unsupported: "site_scoped_billing_subscription_truth_absent",
      required: input.policy?.billingSubscriptionRequired !== false,
    });
    dimensions.hosting_entitlement = refsDimension({
      dimension: "hosting_entitlement",
      refs: byRole("hosting_entitlement"),
      missingBlocker: input.policy?.hostingEntitlementRequired === false ? undefined : "missing_site_scoped_hosting_entitlement_truth",
      unsupported: "site_scoped_hosting_entitlement_truth_absent",
      required: input.policy?.hostingEntitlementRequired !== false,
    });
    dimensions.stripe_payment =
      input.policy?.stripePaymentRequired === true
        ? refsDimension({
            dimension: "stripe_payment",
            refs: [...byRole("stripe_customer"), ...byRole("stripe_subscription")],
            missingBlocker: "missing_stored_stripe_payment_truth",
            unsupported: "site_scoped_stripe_payment_truth_absent",
            required: true,
          })
        : dimension({
            dimension: "stripe_payment",
            status: "not_applicable",
            freshnessStatus: "not_applicable",
            requiredForLaunchReadiness: false,
            requiredForPublishActivation: false,
            diagnostics: { stripePaymentRequired: false, stripeCalled: false },
          });
    dimensions.rollback_readiness = refsDimension({
      dimension: "rollback_readiness",
      refs: byRole("rollback_target"),
      missingBlocker: input.policy?.rollbackReadinessRequired === false ? undefined : "missing_rollback_readiness_evidence",
      missingLimitation: "rollback_readiness_evidence_missing",
      required: input.policy?.rollbackReadinessRequired !== false,
    });
    const smokeRefs = arrayFromUnknown(launch?.smoke_qa_refs_json).map((item, index) =>
      baseSourceRef({
        sourceTable: "gnr8_single_site_launch_approvals",
        sourceType: "preview_smoke_qa_ref",
        sourceRecordId: `${launch?.id ?? "missing"}:smoke:${index}`,
        sourceVersion: launch?.updated_at ?? null,
        sourceWatermark: aggregateWatermark(item),
        capturedAt: launch?.updated_at ?? null,
        metadata: { value: item as Record<string, unknown> },
      }),
    );
    dimensions.preview_smoke_qa = refsDimension({
      dimension: "preview_smoke_qa",
      refs: smokeRefs,
      missingBlocker: input.policy?.previewSmokeQaRequired === false ? undefined : "missing_preview_smoke_qa_evidence",
      missingLimitation: "preview_smoke_qa_evidence_missing",
      required: input.policy?.previewSmokeQaRequired !== false,
    });
    dimensions.audit_timeline = refsDimension({
      dimension: "audit_timeline",
      refs: [...byRole("aaf_audit_event"), ...byRole("external_reference")],
      missingStatus: "unknown",
      missingLimitation: "durable_audit_timeline_refs_missing",
      required: false,
    });
    dimensions.pasr_shadow_diagnostics = refsDimension({
      dimension: "pasr_shadow_diagnostics",
      refs: byRole("pasr_shadow_result"),
      missingStatus: "unknown",
      missingLimitation: "pasr_shadow_diagnostics_missing",
      required: false,
      nonEnforcing: true,
    });
    dimensions.limitations = limitationsDimension(dimensions);

    return packageResult(input, capturedAt, dimensions as Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>, {
      providerCallsPerformed: false,
      ddomSnapshotCreationPerformed: false,
      aafMutationPerformed: false,
      launchReadinessPersistenceMutationPerformed: false,
      runtimeMutationPerformed: false,
      publishMutationPerformed: false,
      rollbackMutationPerformed: false,
    });
  }
}

export async function readSingleSiteLaunchReadinessSources(input: ReadSingleSiteLaunchReadinessSourcesInput): Promise<LaunchReadinessSourcePackage> {
  return new SingleSiteLaunchReadinessSourceReader().readSingleSiteLaunchReadinessSources(input);
}
