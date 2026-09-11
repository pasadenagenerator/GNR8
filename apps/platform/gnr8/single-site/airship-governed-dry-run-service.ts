import "server-only";

import { createHash } from "node:crypto";

import { getActivePointerForSite, getArtifactById, getSiteVersion } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

import {
  PostgresAirshipPublishReadinessRepository,
  readAirshipPublishReadinessById,
  type AirshipPublishReadinessRecord,
  type AirshipPublishReadinessRepository,
} from "./airship-single-site-publish-readiness-service";
import {
  buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest,
  createSingleSitePublishOperatorActionAuditService,
  type SingleSitePublishOperatorActionAuditActor,
  type SingleSitePublishOperatorActionAuditRow,
  type SingleSitePublishOperatorActionAuditService,
} from "./single-site-publish-operator-action-audit";
import {
  projectSingleSitePublishOperatorDryRunResult,
  type SingleSitePublishOperatorDryRunCanonicalRef,
  type SingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunSafeResult,
} from "./single-site-publish-operator-dry-run-caller";
import {
  AIRSHIP_PUBLISH_ACTIVATION_HANDOFF_SOURCE_TYPE,
  type AirshipPublishActivationHandoff,
  type PublishActivationMetadataHandoffDecisionRef,
  type PublishActivationMetadataHandoffRequestRef,
  type AirshipPublishActivationGateAttemptRef,
} from "./publish-activation-metadata-handoff";
import {
  publishSingleSiteApprovedCandidateShadow,
  type SingleSitePublishWrapperInput,
} from "./single-site-publish-wrapper-orchestrator";

export const AIRSHIP_GOVERNED_DRY_RUN_SERVICE_VERSION = "airship-21-governed-dry-run:v1" as const;

export type AirshipGovernedDryRunRefs = {
  readinessPackageId: string;
  reviewRecordId: string;
  candidateVersionId: string;
  artifactId: string;
  draftId: string;
  draftVersion: number;
  migrationId: string;
};

export type AirshipGovernedDryRunReadback = {
  ok: boolean;
  actionId: string | null;
  actionStatus: string | null;
  preflightStatus: string | null;
  resolverStatus: string | null;
  wrapperDryRunStatus: string | null;
  blockerCodes: string[];
  warnings: string[];
  limitationCodes: string[];
  safeRefs: SingleSitePublishOperatorDryRunSafeResult["safeRefs"] | null;
  idempotencyKey: string;
  correlationId: string | null;
  createdAt: string | null;
  completedAt: string | null;
};

export type AirshipGovernedDryRunOutput = {
  status: "created" | "reused";
  serviceVersion: typeof AIRSHIP_GOVERNED_DRY_RUN_SERVICE_VERSION;
  refs: AirshipGovernedDryRunRefs;
  readiness: Pick<
    AirshipPublishReadinessRecord,
    | "id"
    | "readinessStatus"
    | "nextStep"
    | "currentLiveActivePointerBefore"
    | "currentLiveActivePointerAfter"
    | "siteClientSourceLabels"
    | "limitationsWarnings"
    | "noPublishConfirmation"
  >;
  result: AirshipGovernedDryRunReadback;
  dryRunResult: SingleSitePublishOperatorDryRunSafeResult | null;
  nextStep: "eligible for separately approved shadow-publish task" | "resolve listed blockers";
  mutationFlags: {
    dryRunRecordMutation: boolean;
    dryRunAttemptExecuted: boolean;
    dryRun: true;
    publishes: false;
    shadowPublish: false;
    runtimeMutation: false;
    activePointerChanged: false;
    liveSiteMutated: false;
    sourceCapture: false;
    providerCall: false;
  };
};

export type RunAirshipGovernedDryRunInput = {
  readinessPackageId: string;
  reviewRecordId: string;
  candidateVersionId: string;
  artifactId: string;
  draftId: string;
  draftVersion: number;
  migrationId: string;
  actorId: string;
  idempotencyKey?: string | null;
  correlationId?: string | null;
};

export type AirshipGovernedDryRunDependencies = {
  readinessRepository: AirshipPublishReadinessRepository;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  auditService: Pick<
    SingleSitePublishOperatorActionAuditService,
    "readActionByIdempotencyKey" | "createOrReuseAction" | "markDryRunStarted" | "markDryRunCompleted"
  >;
  publishSingleSiteApprovedCandidateShadow: typeof publishSingleSiteApprovedCandidateShadow;
};

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUTE_ACTION_SOURCE = "api/gnr8/admin/airship/single-site/governed-dry-run";
const PRODUCTION_TARGET_REF = {
  role: "publish_target",
  sourceSystem: "gnr8",
  sourceTable: "gnr8_publish_targets",
  sourceRecordId: "production",
  sourceRef: "gnr8:gnr8_publish_targets:production",
  sourceVersion: "ptt-1",
  sourceWatermark: "ptt-1:gnr8_publish_targets:production",
  metadataJson: {
    environment: "production",
    publishStage: "production",
    status: "active",
  },
} satisfies Exclude<SingleSitePublishOperatorDryRunCanonicalRef, string>;

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`airship_governed_dry_run_${field}_required`);
  return normalized;
}

function uuid(field: string, value: unknown): string {
  const normalized = required(field, value);
  if (!UUIDISH.test(normalized)) throw new Error(`airship_governed_dry_run_${field}_invalid`);
  return normalized;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function jsonArray(value: unknown): unknown[] {
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

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        const entry = (value as Record<string, unknown>)[key];
        if (entry !== undefined && typeof entry !== "function") acc[key] = stableValue(entry);
        return acc;
      }, {});
  }
  return value ?? null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

export function airshipGovernedDryRunIdempotencyKey(input: Omit<AirshipGovernedDryRunRefs, "migrationId">): string {
  return `airship-governed-dry-run:${sha256(idempotencyScopeRefs(input))}`;
}

function idempotencyScopeRefs(input: Omit<AirshipGovernedDryRunRefs, "migrationId">): Omit<AirshipGovernedDryRunRefs, "migrationId"> {
  return {
    readinessPackageId: input.readinessPackageId,
    reviewRecordId: input.reviewRecordId,
    candidateVersionId: input.candidateVersionId,
    artifactId: input.artifactId,
    draftId: input.draftId,
    draftVersion: input.draftVersion,
  };
}

function legacyMigrationScopedIdempotencyKey(refs: AirshipGovernedDryRunRefs): string {
  return `airship-governed-dry-run:${sha256(refs)}`;
}

function samePointer(
  left: { siteVersionId: string | null; artifactId: string | null } | null,
  right: { siteVersionId: string | null; artifactId: string | null } | null,
): boolean {
  return (left?.siteVersionId ?? null) === (right?.siteVersionId ?? null) && (left?.artifactId ?? null) === (right?.artifactId ?? null);
}

function canonicalRef(input: {
  role: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark: string;
  metadataJson?: Record<string, unknown>;
}): Exclude<SingleSitePublishOperatorDryRunCanonicalRef, string> {
  return {
    role: input.role,
    sourceSystem: "gnr8",
    sourceTable: input.sourceTable,
    sourceRecordId: input.sourceRecordId,
    sourceRef: `gnr8:${input.sourceTable}:${input.sourceRecordId}`,
    sourceVersion: input.sourceVersion ?? null,
    sourceWatermark: input.sourceWatermark,
    metadataJson: input.metadataJson ?? {},
  };
}

function sourceIdentity(readiness: AirshipPublishReadinessRecord): { tenantId: string; clientId: string; siteId: string } {
  return {
    tenantId: required("tenant_id", readiness.siteClientSourceLabels.tenantId),
    clientId: required("client_id", readiness.siteClientSourceLabels.clientId),
    siteId: required("site_id", readiness.siteClientSourceLabels.siteId),
  };
}

function optionalMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  return text(metadata[key]);
}

function optionalHandoffRequest(metadata: Record<string, unknown>): PublishActivationMetadataHandoffRequestRef | null {
  const id = optionalMetadataString(metadata, "expectedPublishActivationRequestRef");
  const ref = optionalMetadataString(metadata, "expectedPublishActivationRequestDisplayRef") ?? optionalMetadataString(metadata, "expectedPublishActivationRequestRef");
  const status = optionalMetadataString(metadata, "expectedPublishActivationRequestStatus");
  return id || ref || status ? { id, ref, status } : null;
}

function optionalHandoffDecision(metadata: Record<string, unknown>): PublishActivationMetadataHandoffDecisionRef | null {
  const id = optionalMetadataString(metadata, "expectedPublishActivationDecisionRef");
  const ref = optionalMetadataString(metadata, "expectedPublishActivationDecisionDisplayRef") ?? optionalMetadataString(metadata, "expectedPublishActivationDecisionRef");
  const status = optionalMetadataString(metadata, "expectedPublishActivationDecisionStatus");
  return id || ref || status ? { id, ref, status } : null;
}

function optionalHandoffGate(metadata: Record<string, unknown>): AirshipPublishActivationGateAttemptRef | null {
  const id = optionalMetadataString(metadata, "expectedGateAttemptResultRef");
  const ref = optionalMetadataString(metadata, "expectedGateAttemptResultDisplayRef") ?? optionalMetadataString(metadata, "expectedGateAttemptResultRef");
  const status = optionalMetadataString(metadata, "expectedGateAttemptStatus");
  const watermark = optionalMetadataString(metadata, "expectedGateInputWatermark");
  return id || ref || status || watermark ? { id, ref, status, watermark } : null;
}

function baseRequest(input: {
  readiness: AirshipPublishReadinessRecord;
  refs: AirshipGovernedDryRunRefs;
  idempotencyKey: string;
  correlationId: string;
}): SingleSitePublishOperatorDryRunRequest {
  const identity = sourceIdentity(input.readiness);
  const metadata = {
    tenantId: identity.tenantId,
    clientId: identity.clientId,
    siteId: identity.siteId,
    migrationId: input.refs.migrationId,
    readinessPackageId: input.refs.readinessPackageId,
    reviewRecordId: input.refs.reviewRecordId,
    draftId: input.refs.draftId,
    draftVersion: input.refs.draftVersion,
    sourceBoundary: "airship_publish_readiness_package",
  };
  const readinessMetadata = jsonObject(input.readiness.metadata);
  const readinessPackageRef = canonicalRef({
    role: "launch_readiness_evidence",
    sourceTable: "gnr8_airship_publish_readiness_packages",
    sourceRecordId: input.refs.readinessPackageId,
    sourceVersion: input.readiness.serviceVersion,
    sourceWatermark: `airship-publish-readiness:${input.refs.readinessPackageId}:${input.refs.reviewRecordId}:${input.refs.candidateVersionId}:${input.refs.artifactId}:${input.refs.draftId}:${input.refs.draftVersion}`,
    metadataJson: metadata,
  });
  const reviewRecordRef = canonicalRef({
    role: "airship_review_record",
    sourceTable: "gnr8_airship_internal_preview_candidate_reviews",
    sourceRecordId: input.refs.reviewRecordId,
    sourceVersion: input.readiness.serviceVersion,
    sourceWatermark: `airship-review:${input.refs.reviewRecordId}:candidate:${input.refs.candidateVersionId}`,
    metadataJson: metadata,
  });
  const candidateSiteVersionRef = canonicalRef({
    role: "candidate_site_version",
    sourceTable: "gnr8_runtime_site_versions",
    sourceRecordId: input.refs.candidateVersionId,
    sourceVersion: `airship-draft:${input.refs.draftVersion}`,
    sourceWatermark: `airship-candidate:${input.refs.candidateVersionId}:readiness:${input.refs.readinessPackageId}`,
    metadataJson: metadata,
  });
  const runtimeArtifactRef = canonicalRef({
    role: "runtime_artifact",
    sourceTable: "gnr8_runtime_artifacts",
    sourceRecordId: input.refs.artifactId,
    sourceVersion: `airship-draft:${input.refs.draftVersion}`,
    sourceWatermark: `airship-artifact:${input.refs.artifactId}:readiness:${input.refs.readinessPackageId}`,
    metadataJson: metadata,
  });
  const airshipPublishActivationHandoff: AirshipPublishActivationHandoff = {
    sourceType: AIRSHIP_PUBLISH_ACTIVATION_HANDOFF_SOURCE_TYPE,
    readinessPackageId: input.refs.readinessPackageId,
    reviewRecordId: input.refs.reviewRecordId,
    candidateVersionId: input.refs.candidateVersionId,
    artifactId: input.refs.artifactId,
    draftId: input.refs.draftId,
    draftVersion: input.refs.draftVersion,
    publishTargetRef: PRODUCTION_TARGET_REF,
    sourceEvidenceRefs: {
      readinessPackageRef,
      reviewRecordRef,
      candidateSourceRef: candidateSiteVersionRef,
      artifactSourceRef: runtimeArtifactRef,
    },
    activationRequestRef: optionalHandoffRequest(readinessMetadata),
    activationDecisionRef: optionalHandoffDecision(readinessMetadata),
    gateAttemptRef: optionalHandoffGate(readinessMetadata),
  };
  return {
    mode: "dry_run",
    ...identity,
    migrationId: input.refs.migrationId,
    candidateSiteVersionRef,
    runtimeArtifactRef,
    expectedPublishTargetRef: PRODUCTION_TARGET_REF,
    publishStage: "production",
    publishEnvironment: "production",
    expectedLaunchReadinessEvidenceRef: readinessPackageRef,
    expectedPublishActivationRequestRef: optionalMetadataString(readinessMetadata, "expectedPublishActivationRequestRef") ?? "",
    expectedPublishActivationDecisionRef: optionalMetadataString(readinessMetadata, "expectedPublishActivationDecisionRef") ?? "",
    expectedGateAttemptResultRef: optionalMetadataString(readinessMetadata, "expectedGateAttemptResultRef") ?? "",
    expectedGateAttemptResultDisplayRef: optionalMetadataString(readinessMetadata, "expectedGateAttemptResultDisplayRef") ?? null,
    expectedHandoffWatermark: optionalMetadataString(readinessMetadata, "expectedHandoffWatermark") ?? "",
    expectedGateInputWatermark: optionalMetadataString(readinessMetadata, "expectedGateInputWatermark") ?? "",
    airshipPublishActivationHandoff,
    operatorConfirmation: {
      mode: "dry_run",
      dryRunOnly: true,
      publishes: false,
      runtimeMutation: false,
      migrationId: input.refs.migrationId,
      candidateSiteVersionRef: input.refs.candidateVersionId,
    },
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
    allowWarningsWithLimitations: true,
  };
}

function wrapperInputFromAirshipRequest(
  request: SingleSitePublishOperatorDryRunRequest,
  readiness: AirshipPublishReadinessRecord,
  actor: SingleSitePublishOperatorActionAuditActor,
): SingleSitePublishWrapperInput {
  const metadata = jsonObject(readiness.metadata);
  return {
    enabled: true,
    mode: "shadow_publish",
    dryRun: true,
    tenantId: request.tenantId,
    clientId: request.clientId,
    siteId: request.siteId,
    migrationId: request.migrationId,
    candidateSiteVersionRef: request.candidateSiteVersionRef,
    runtimeArtifactRef: request.runtimeArtifactRef,
    expectedPublishTargetRef: request.expectedPublishTargetRef,
    publishStage: request.publishStage,
    publishEnvironment: request.publishEnvironment,
    expectedLaunchReadinessEvidenceRef: request.expectedLaunchReadinessEvidenceRef,
    expectedPublishActivationRequestRef: optionalMetadataString(metadata, "expectedPublishActivationRequestRef"),
    expectedPublishActivationDecisionRef: optionalMetadataString(metadata, "expectedPublishActivationDecisionRef"),
    expectedGateAttemptResultRef: optionalMetadataString(metadata, "expectedGateAttemptResultRef"),
    expectedHandoffWatermark: optionalMetadataString(metadata, "expectedHandoffWatermark"),
    expectedGateInputWatermark: optionalMetadataString(metadata, "expectedGateInputWatermark"),
    airshipPublishActivationHandoff: request.airshipPublishActivationHandoff ?? null,
    actor,
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    allowWarningsWithLimitations: true,
  };
}

function auditActor(actorId: string): SingleSitePublishOperatorActionAuditActor {
  return {
    actorType: "human",
    actorId,
    actorRole: "platform_superadmin",
  };
}

function codeList(...values: unknown[]): string[] {
  const result: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const normalized = text(value);
    if (normalized) result.push(normalized);
  };
  values.forEach(visit);
  return Array.from(new Set(result)).sort((left, right) => left.localeCompare(right));
}

function readbackFromSafeResult(input: {
  actionId: string;
  actionStatus: string;
  result: SingleSitePublishOperatorDryRunSafeResult;
  createdAt: string | null;
  completedAt: string | null;
}): AirshipGovernedDryRunReadback {
  return {
    ok: input.result.ok,
    actionId: input.actionId,
    actionStatus: input.actionStatus,
    preflightStatus: input.result.preflightStatus,
    resolverStatus: input.result.resolverStatus,
    wrapperDryRunStatus: input.result.wrapperDryRunStatus,
    blockerCodes: input.result.blockerCodes,
    warnings: input.result.warnings,
    limitationCodes: input.result.limitationCodes,
    safeRefs: input.result.safeRefs,
    idempotencyKey: input.result.idempotencyKey,
    correlationId: input.result.correlationId,
    createdAt: input.createdAt,
    completedAt: input.completedAt,
  };
}

export function airshipGovernedDryRunReadbackFromAuditRow(row: SingleSitePublishOperatorActionAuditRow): AirshipGovernedDryRunReadback {
  const result = jsonObject(row.result_summary_json);
  const diagnostics = jsonObject(row.redacted_diagnostics_json);
  const limitations = jsonObject(row.limitation_summary_json);
  const metadataCompleteness = jsonObject(diagnostics.metadataCompleteness);
  return {
    ok: result.ok === true,
    actionId: row.id,
    actionStatus: row.status,
    preflightStatus: text(result.preflightStatus),
    resolverStatus: text(result.resolverStatus ?? diagnostics.resolverStatus),
    wrapperDryRunStatus: text(result.wrapperStatus ?? result.wrapperDryRunStatus ?? diagnostics.wrapperStatus),
    blockerCodes: codeList(limitations.blockerCodes, diagnostics.blockerCodes, metadataCompleteness.missingCodes, metadataCompleteness.mismatchCodes),
    warnings: codeList(limitations.warningCodes, limitations.warnings, diagnostics.warnings, metadataCompleteness.warningCodes),
    limitationCodes: codeList(limitations.limitationCodes, diagnostics.limitationCodes),
    safeRefs: jsonObject(diagnostics.safeRefs) as AirshipGovernedDryRunReadback["safeRefs"],
    idempotencyKey: row.idempotency_key,
    correlationId: row.correlation_id,
    createdAt: text(row.created_at),
    completedAt: text(row.completed_at),
  };
}

function refsFromInput(input: RunAirshipGovernedDryRunInput): AirshipGovernedDryRunRefs {
  return {
    readinessPackageId: uuid("readiness_package_id", input.readinessPackageId),
    reviewRecordId: uuid("review_record_id", input.reviewRecordId),
    candidateVersionId: uuid("candidate_version_id", input.candidateVersionId),
    artifactId: uuid("artifact_id", input.artifactId),
    draftId: uuid("draft_id", input.draftId),
    draftVersion: input.draftVersion,
    migrationId: uuid("migration_id", input.migrationId),
  };
}

function assertReadinessMatchesInput(readiness: AirshipPublishReadinessRecord, refs: AirshipGovernedDryRunRefs): void {
  if (readiness.id !== refs.readinessPackageId) throw new Error("airship_governed_dry_run_readiness_package_mismatch");
  if (readiness.migrationId !== refs.migrationId) throw new Error("airship_governed_dry_run_migration_mismatch");
  if (readiness.reviewRecordId !== refs.reviewRecordId) throw new Error("airship_governed_dry_run_review_record_mismatch");
  if (readiness.reviewedCandidateSiteVersionId !== refs.candidateVersionId) throw new Error("airship_governed_dry_run_candidate_version_mismatch");
  if (readiness.reviewedArtifactId !== refs.artifactId) throw new Error("airship_governed_dry_run_artifact_mismatch");
  if (readiness.draftId !== refs.draftId || readiness.draftVersion !== refs.draftVersion) throw new Error("airship_governed_dry_run_draft_mismatch");
  if (readiness.readinessStatus !== "complete") throw new Error("airship_governed_dry_run_readiness_incomplete");
  if (readiness.reviewStatus !== "approved" || readiness.reviewDecision !== "approved_for_publish_readiness") {
    throw new Error("airship_governed_dry_run_readiness_unapproved");
  }
  if (readiness.noPublishConfirmation.publishes !== false || readiness.noPublishConfirmation.shadowPublish !== false || readiness.noPublishConfirmation.activePointerChanged !== false) {
    throw new Error("airship_governed_dry_run_readiness_no_publish_confirmation_invalid");
  }
  if (!samePointer(readiness.currentLiveActivePointerBefore, readiness.currentLiveActivePointerAfter)) {
    throw new Error("airship_governed_dry_run_readiness_pointer_changed");
  }
}

function assertRuntimeStillSafe(input: {
  readiness: AirshipPublishReadinessRecord;
  candidateVersion: CanonicalSiteVersionSnapshot | null;
  artifact: RuntimeArtifact | null;
  activePointer: { siteVersionId: string; artifactId: string } | null;
}): void {
  if (!input.candidateVersion) throw new Error("airship_governed_dry_run_candidate_version_missing");
  if (!input.artifact) throw new Error("airship_governed_dry_run_artifact_missing");
  if (input.candidateVersion.state !== "DRAFT") throw new Error("airship_governed_dry_run_candidate_not_draft");
  if (input.artifact.siteVersionId !== input.candidateVersion.id) throw new Error("airship_governed_dry_run_candidate_artifact_mismatch");
  if (input.artifact.publishStage === "production") throw new Error("airship_governed_dry_run_artifact_production_stage");
  if (!samePointer(input.readiness.currentLiveActivePointerAfter, input.activePointer)) throw new Error("airship_governed_dry_run_active_pointer_stale");
  if (input.activePointer?.siteVersionId === input.candidateVersion.id || input.activePointer?.artifactId === input.artifact.id) {
    throw new Error("airship_governed_dry_run_candidate_is_live");
  }
}

function outputFromReadback(input: {
  status: "created" | "reused";
  refs: AirshipGovernedDryRunRefs;
  readiness: AirshipPublishReadinessRecord;
  readback: AirshipGovernedDryRunReadback;
  dryRunResult: SingleSitePublishOperatorDryRunSafeResult | null;
  dryRunAttemptExecuted: boolean;
}): AirshipGovernedDryRunOutput {
  return {
    status: input.status,
    serviceVersion: AIRSHIP_GOVERNED_DRY_RUN_SERVICE_VERSION,
    refs: input.refs,
    readiness: {
      id: input.readiness.id,
      readinessStatus: input.readiness.readinessStatus,
      nextStep: input.readiness.nextStep,
      currentLiveActivePointerBefore: input.readiness.currentLiveActivePointerBefore,
      currentLiveActivePointerAfter: input.readiness.currentLiveActivePointerAfter,
      siteClientSourceLabels: input.readiness.siteClientSourceLabels,
      limitationsWarnings: input.readiness.limitationsWarnings,
      noPublishConfirmation: input.readiness.noPublishConfirmation,
    },
    result: input.readback,
    dryRunResult: input.dryRunResult,
    nextStep: input.readback.ok ? "eligible for separately approved shadow-publish task" : "resolve listed blockers",
    mutationFlags: {
      dryRunRecordMutation: input.status === "created",
      dryRunAttemptExecuted: input.dryRunAttemptExecuted,
      dryRun: true,
      publishes: false,
      shadowPublish: false,
      runtimeMutation: false,
      activePointerChanged: false,
      liveSiteMutated: false,
      sourceCapture: false,
      providerCall: false,
    },
  };
}

export async function runAirshipGovernedDryRun(
  input: RunAirshipGovernedDryRunInput,
  dependencies: Partial<AirshipGovernedDryRunDependencies> = {},
): Promise<AirshipGovernedDryRunOutput> {
  const deps: AirshipGovernedDryRunDependencies = {
    readinessRepository: dependencies.readinessRepository ?? new PostgresAirshipPublishReadinessRepository(),
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    auditService: dependencies.auditService ?? createSingleSitePublishOperatorActionAuditService(),
    publishSingleSiteApprovedCandidateShadow: dependencies.publishSingleSiteApprovedCandidateShadow ?? publishSingleSiteApprovedCandidateShadow,
  };
  const refs = refsFromInput(input);
  if (!Number.isInteger(refs.draftVersion) || refs.draftVersion < 1) throw new Error("airship_governed_dry_run_draft_version_invalid");
  const readiness = await readAirshipPublishReadinessById(refs.readinessPackageId, deps.readinessRepository);
  if (!readiness) throw new Error("airship_governed_dry_run_readiness_package_missing");
  assertReadinessMatchesInput(readiness, refs);

  const candidateVersion = await deps.getSiteVersion(refs.candidateVersionId);
  const artifact = await deps.getArtifactById(refs.artifactId);
  const activePointer = candidateVersion ? await deps.getActivePointerForSite(candidateVersion.siteId) : null;
  assertRuntimeStillSafe({ readiness, candidateVersion, artifact, activePointer });

  const requestedIdempotencyKey = text(input.idempotencyKey);
  const idempotencyKey = requestedIdempotencyKey ?? airshipGovernedDryRunIdempotencyKey(refs);
  const existing =
    await deps.auditService.readActionByIdempotencyKey(idempotencyKey) ??
    (requestedIdempotencyKey ? null : await deps.auditService.readActionByIdempotencyKey(legacyMigrationScopedIdempotencyKey(refs)));
  if (existing?.status === "dry_run_completed" || existing?.status === "preflight_failed") {
    return outputFromReadback({
      status: "reused",
      refs,
      readiness,
      readback: airshipGovernedDryRunReadbackFromAuditRow(existing),
      dryRunResult: null,
      dryRunAttemptExecuted: false,
    });
  }

  const correlationId = text(input.correlationId) ?? `airship-governed-dry-run:${sha256(refs)}`;
  const request = baseRequest({ readiness, refs, idempotencyKey, correlationId });
  const actor = auditActor(required("actor_id", input.actorId));
  const audit = await deps.auditService.createOrReuseAction(
    buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest({
      request,
      actor,
      routeActionSource: ROUTE_ACTION_SOURCE,
    }),
  );
  await deps.auditService.markDryRunStarted({
    actionId: audit.action.id,
    actor,
    correlationId,
    idempotencyKey,
  });
  const wrapperResult = await deps.publishSingleSiteApprovedCandidateShadow(wrapperInputFromAirshipRequest(request, readiness, actor));
  const dryRunResult = projectSingleSitePublishOperatorDryRunResult({ request, wrapperResult });
  const completed = await deps.auditService.markDryRunCompleted({
    actionId: audit.action.id,
    actor,
    correlationId,
    idempotencyKey,
    result: dryRunResult,
  });
  return outputFromReadback({
    status: audit.reusedExisting ? "reused" : "created",
    refs,
    readiness,
    readback: readbackFromSafeResult({
      actionId: completed.id,
      actionStatus: completed.status,
      result: dryRunResult,
      createdAt: text(completed.created_at),
      completedAt: text(completed.completed_at),
    }),
    dryRunResult,
    dryRunAttemptExecuted: true,
  });
}

export async function readAirshipGovernedDryRunForReadiness(
  readiness: AirshipPublishReadinessRecord,
  auditService: Pick<SingleSitePublishOperatorActionAuditService, "readActionByIdempotencyKey"> = createSingleSitePublishOperatorActionAuditService(),
): Promise<AirshipGovernedDryRunReadback | null> {
  const idempotencyKey = airshipGovernedDryRunIdempotencyKey({
    readinessPackageId: readiness.id,
    reviewRecordId: readiness.reviewRecordId,
    candidateVersionId: readiness.reviewedCandidateSiteVersionId,
    artifactId: readiness.reviewedArtifactId,
    draftId: readiness.draftId,
    draftVersion: readiness.draftVersion,
  });
  const row = await auditService.readActionByIdempotencyKey(idempotencyKey);
  if (row) return airshipGovernedDryRunReadbackFromAuditRow(row);
  const legacyRow = await auditService.readActionByIdempotencyKey(legacyMigrationScopedIdempotencyKey({
    readinessPackageId: readiness.id,
    reviewRecordId: readiness.reviewRecordId,
    candidateVersionId: readiness.reviewedCandidateSiteVersionId,
    artifactId: readiness.reviewedArtifactId,
    draftId: readiness.draftId,
    draftVersion: readiness.draftVersion,
    migrationId: readiness.migrationId,
  }));
  return legacyRow ? airshipGovernedDryRunReadbackFromAuditRow(legacyRow) : null;
}
