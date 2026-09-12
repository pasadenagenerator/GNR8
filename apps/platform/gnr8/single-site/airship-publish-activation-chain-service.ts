import "server-only";

import { createHash } from "node:crypto";

import { AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE } from "@gnr8/runtime-contracts";

import { AafWriterRepository, type EvidencePackageTransactionInput } from "../aaf/aaf-writer-repository";
import { getActivePointerForSite, getArtifactById, getSiteVersion } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "../runtime/types";
import {
  buildPublishActivationDecisionReadModel,
  type PublishActivationDecisionReadRef,
} from "./publish-activation-decision-read-model";
import {
  PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION,
  SingleSitePublishActivationDecisionService,
} from "./publish-activation-decision-service";
import {
  PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
  SingleSitePublishActivationGateEvaluator,
} from "./publish-activation-gate-evaluator";
import { buildPublishActivationGateHandoff } from "./publish-activation-gate-handoff";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
  SingleSitePublishActivationRequestBridge,
  type PublishActivationRequestSourceRef,
} from "./publish-activation-request-bridge";
import {
  PostgresAirshipPublishReadinessRepository,
  readAirshipPublishReadinessById,
  type AirshipPublishReadinessRecord,
  type AirshipPublishReadinessRepository,
} from "./airship-single-site-publish-readiness-service";

export const AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION = "airship-24-publish-activation-chain:v1" as const;

export type AirshipPublishActivationChainRefs = {
  readinessPackageId: string;
  reviewRecordId: string;
  candidateVersionId: string;
  artifactId: string;
  draftId: string;
  draftVersion: number;
};

export type AirshipPublishActivationChainRecord = {
  serviceVersion: typeof AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION;
  readinessPackageId: string;
  reviewRecordId: string;
  candidateVersionId: string;
  artifactId: string;
  draftId: string;
  draftVersion: number;
  activationEvidencePackage: {
    id: string;
    ref: string;
    status: string;
    sourceWatermark: string;
  };
  activationRequest: {
    id: string;
    ref: string;
    status: string;
  };
  activationDecision: {
    id: string;
    ref: string;
    status: string;
  };
  gateAttempt: {
    id: string;
    ref: string;
    status: string;
    gateResult: string;
  };
  gateInputWatermark: string;
  handoffWatermark: string;
  evidenceSourceRefs: {
    readinessPackageRef: PublishActivationDecisionReadRef;
    reviewRecordRef: PublishActivationDecisionReadRef;
    candidateSourceRef: PublishActivationDecisionReadRef;
    artifactSourceRef: PublishActivationDecisionReadRef;
    draftSourceRef: PublishActivationDecisionReadRef;
  };
  publishTargetRef: PublishActivationDecisionReadRef;
  activePointerBefore: { siteVersionId: string | null; artifactId: string | null };
  activePointerAfter: { siteVersionId: string | null; artifactId: string | null };
  nextStep: "governed dry-run, not publish";
  idempotencyKey: string;
  correlationId: string;
  createdAt: string | null;
  mutationFlags: {
    activationMetadataMutation: boolean;
    createsApprovalRequest: true;
    createsApprovalDecision: true;
    createsGateAttempt: true;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
    sourceCapture: false;
    activePointerChanged: false;
    runtimeMutation: false;
    liveSiteMutated: false;
    providerCall: false;
  };
};

export type CreateAirshipPublishActivationChainInput = AirshipPublishActivationChainRefs & {
  migrationId: string;
  actorId: string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type RefreshAirshipPublishActivationHandoffWatermarkInput = {
  readinessPackageId: string;
};

type ActivationEvidenceWriter = Pick<AafWriterRepository, "createEvidencePackageTransaction">;

export type AirshipPublishActivationChainDependencies = {
  readinessRepository: AirshipPublishReadinessRepository;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  evidenceWriter: ActivationEvidenceWriter;
  requestBridge: Pick<SingleSitePublishActivationRequestBridge, "preparePublishActivationRequestFromLaunchReadiness">;
  decisionService: Pick<SingleSitePublishActivationDecisionService, "recordPublishActivationDecision">;
  gateEvaluator: Pick<SingleSitePublishActivationGateEvaluator, "evaluatePublishActivationGateFromHandoff">;
  buildDecisionReadModel: typeof buildPublishActivationDecisionReadModel;
};

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUTE_ACTION_SOURCE = "api/gnr8/admin/airship/single-site/publish-activation-chain";

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`airship_publish_activation_chain_${field}_required`);
  return normalized;
}

function uuid(field: string, value: unknown): string {
  const normalized = required(field, value);
  if (!UUIDISH.test(normalized)) throw new Error(`airship_publish_activation_chain_${field}_invalid`);
  return normalized;
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
  return [];
}

function rowText(row: unknown, ...keys: string[]): string | null {
  const object = jsonObject(row);
  for (const key of keys) {
    const value = text(object[key]);
    if (value) return value;
  }
  return null;
}

export function airshipPublishActivationChainIdempotencyKey(input: AirshipPublishActivationChainRefs): string {
  return `airship-publish-activation-chain:${sha256({
    readinessPackageId: input.readinessPackageId,
    reviewRecordId: input.reviewRecordId,
    candidateVersionId: input.candidateVersionId,
    artifactId: input.artifactId,
    draftId: input.draftId,
    draftVersion: input.draftVersion,
  })}`;
}

function chainFromMetadata(metadata: Record<string, unknown>): AirshipPublishActivationChainRecord | null {
  const chain = jsonObject(metadata.airshipPublishActivationChain);
  return text(chain.serviceVersion) === AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION
    ? chain as AirshipPublishActivationChainRecord
    : null;
}

export function airshipPublishActivationChainFromReadiness(
  readiness: AirshipPublishReadinessRecord | null | undefined,
): AirshipPublishActivationChainRecord | null {
  return readiness ? chainFromMetadata(jsonObject(readiness.metadata)) : null;
}

function samePointer(
  left: { siteVersionId: string | null; artifactId: string | null } | null,
  right: { siteVersionId: string | null; artifactId: string | null } | null,
): boolean {
  return (left?.siteVersionId ?? null) === (right?.siteVersionId ?? null) && (left?.artifactId ?? null) === (right?.artifactId ?? null);
}

function pointerSnapshot(pointer: { siteVersionId: string | null; artifactId: string | null } | null) {
  return {
    siteVersionId: pointer?.siteVersionId ?? null,
    artifactId: pointer?.artifactId ?? null,
  };
}

function assertReadinessMatchesInput(readiness: AirshipPublishReadinessRecord, refs: AirshipPublishActivationChainRefs & { migrationId: string }): void {
  if (readiness.id !== refs.readinessPackageId) throw new Error("airship_publish_activation_chain_readiness_package_mismatch");
  if (readiness.migrationId !== refs.migrationId) throw new Error("airship_publish_activation_chain_migration_mismatch");
  if (readiness.reviewRecordId !== refs.reviewRecordId) throw new Error("airship_publish_activation_chain_review_record_mismatch");
  if (readiness.reviewedCandidateSiteVersionId !== refs.candidateVersionId) throw new Error("airship_publish_activation_chain_candidate_version_mismatch");
  if (readiness.reviewedArtifactId !== refs.artifactId) throw new Error("airship_publish_activation_chain_artifact_mismatch");
  if (readiness.draftId !== refs.draftId || readiness.draftVersion !== refs.draftVersion) {
    throw new Error("airship_publish_activation_chain_draft_mismatch");
  }
  if (readiness.readinessStatus !== "complete") throw new Error("airship_publish_activation_chain_readiness_incomplete");
  if (readiness.reviewStatus !== "approved" || readiness.reviewDecision !== "approved_for_publish_readiness") {
    throw new Error("airship_publish_activation_chain_readiness_unapproved");
  }
  if (!samePointer(readiness.currentLiveActivePointerBefore, readiness.currentLiveActivePointerAfter)) {
    throw new Error("airship_publish_activation_chain_readiness_pointer_changed");
  }
  if (
    readiness.noPublishConfirmation.publishes !== false ||
    readiness.noPublishConfirmation.dryRun !== false ||
    readiness.noPublishConfirmation.shadowPublish !== false ||
    readiness.noPublishConfirmation.activePointerChanged !== false
  ) {
    throw new Error("airship_publish_activation_chain_no_publish_confirmation_invalid");
  }
}

function assertRuntimeStillSafe(input: {
  readiness: AirshipPublishReadinessRecord;
  candidateVersion: CanonicalSiteVersionSnapshot | null;
  artifact: RuntimeArtifact | null;
  activePointer: { siteVersionId: string; artifactId: string } | null;
}): void {
  if (!input.candidateVersion) throw new Error("airship_publish_activation_chain_candidate_version_missing");
  if (!input.artifact) throw new Error("airship_publish_activation_chain_artifact_missing");
  if (input.candidateVersion.state !== "DRAFT") throw new Error("airship_publish_activation_chain_candidate_not_draft");
  if (input.artifact.siteVersionId !== input.candidateVersion.id) throw new Error("airship_publish_activation_chain_candidate_artifact_mismatch");
  if (input.artifact.publishStage === "production") throw new Error("airship_publish_activation_chain_artifact_production_stage");
  if (!samePointer(input.readiness.currentLiveActivePointerAfter, input.activePointer)) {
    throw new Error("airship_publish_activation_chain_active_pointer_stale");
  }
  if (input.activePointer?.siteVersionId === input.candidateVersion.id || input.activePointer?.artifactId === input.artifact.id) {
    throw new Error("airship_publish_activation_chain_candidate_is_live");
  }
}

function sourceRef(input: {
  role: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | number | null;
  sourceWatermark: string;
  metadataJson?: Record<string, unknown>;
}): PublishActivationDecisionReadRef {
  return {
    role: input.role,
    sourceSystem: "gnr8",
    sourceTable: input.sourceTable,
    sourceRecordId: input.sourceRecordId,
    sourceRef: `gnr8:${input.sourceTable}:${input.sourceRecordId}`,
    sourceVersion: text(input.sourceVersion),
    sourceWatermark: input.sourceWatermark,
    metadataJson: input.metadataJson ?? {},
  };
}

function sourceRefForRequest(ref: PublishActivationDecisionReadRef): PublishActivationRequestSourceRef {
  return {
    sourceSystem: ref.sourceSystem,
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceRef: ref.sourceRef,
    sourceVersion: ref.sourceVersion,
    sourceWatermark: ref.sourceWatermark,
    metadataJson: jsonObject(ref.metadataJson),
  };
}

function chainRefs(input: { readiness: AirshipPublishReadinessRecord; artifact: RuntimeArtifact }): {
  readinessPackageRef: PublishActivationDecisionReadRef;
  reviewRecordRef: PublishActivationDecisionReadRef;
  candidateSourceRef: PublishActivationDecisionReadRef;
  artifactSourceRef: PublishActivationDecisionReadRef;
  draftSourceRef: PublishActivationDecisionReadRef;
  publishTargetRef: PublishActivationDecisionReadRef;
} {
  const base = {
    readinessPackageId: input.readiness.id,
    reviewRecordId: input.readiness.reviewRecordId,
    candidateVersionId: input.readiness.reviewedCandidateSiteVersionId,
    artifactId: input.readiness.reviewedArtifactId,
    draftId: input.readiness.draftId,
    draftVersion: input.readiness.draftVersion,
  };
  return {
    readinessPackageRef: sourceRef({
      role: "airship_readiness_package",
      sourceTable: "gnr8_airship_publish_readiness_packages",
      sourceRecordId: input.readiness.id,
      sourceVersion: input.readiness.serviceVersion,
      sourceWatermark: `airship-publish-readiness:${sha256(base)}`,
      metadataJson: { refRole: "airship_readiness_package", sourceBoundary: "airship_publish_readiness_package" },
    }),
    reviewRecordRef: sourceRef({
      role: "airship_review_record",
      sourceTable: "gnr8_airship_internal_preview_candidate_reviews",
      sourceRecordId: input.readiness.reviewRecordId,
      sourceVersion: input.readiness.reviewedAt,
      sourceWatermark: `airship-review:${input.readiness.reviewRecordId}:candidate:${input.readiness.reviewedCandidateSiteVersionId}`,
      metadataJson: { refRole: "airship_review_record" },
    }),
    candidateSourceRef: sourceRef({
      role: "improved_candidate_site_version",
      sourceTable: "gnr8_runtime_site_versions",
      sourceRecordId: input.readiness.reviewedCandidateSiteVersionId,
      sourceVersion: `airship-draft:${input.readiness.draftVersion}`,
      sourceWatermark: `airship-candidate:${input.readiness.reviewedCandidateSiteVersionId}:readiness:${input.readiness.id}`,
      metadataJson: { refRole: "improved_candidate_site_version", canonical: true },
    }),
    artifactSourceRef: sourceRef({
      role: "improved_runtime_artifact",
      sourceTable: "gnr8_runtime_artifacts",
      sourceRecordId: input.readiness.reviewedArtifactId,
      sourceVersion: `airship-draft:${input.readiness.draftVersion}`,
      sourceWatermark: `airship-artifact:${input.readiness.reviewedArtifactId}:bundle:${input.artifact.bundleSha256}`,
      metadataJson: { refRole: "improved_runtime_artifact", canonical: true },
    }),
    draftSourceRef: sourceRef({
      role: "airship_draft",
      sourceTable: "gnr8_airship_single_site_editor_drafts",
      sourceRecordId: input.readiness.draftId,
      sourceVersion: input.readiness.draftVersion,
      sourceWatermark: `airship-draft:${input.readiness.draftId}:v${input.readiness.draftVersion}`,
      metadataJson: { refRole: "airship_draft" },
    }),
    publishTargetRef: sourceRef({
      role: "publish_target",
      sourceTable: "gnr8_publish_targets",
      sourceRecordId: "production",
      sourceVersion: "ptt-1",
      sourceWatermark: "ptt-1:gnr8_publish_targets:production",
      metadataJson: { refRole: "publish_target", environment: "production", publishStage: "production", status: "active" },
    }),
  };
}

function evidencePayload(input: {
  readiness: AirshipPublishReadinessRecord;
  refs: ReturnType<typeof chainRefs>;
}): Record<string, unknown> {
  const limitations = input.readiness.limitationsWarnings.map((warning) => ({
    source: "airship_publish_readiness_package",
    status: "accepted_limitation",
    severity: "p3_note",
    detail: warning,
  }));
  return {
    packageHeader: {
      packageType: AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE,
      subjectType: "single_site_launch_readiness_package",
      subjectId: input.readiness.id,
      actionContext: "airship_publish_activation_chain_metadata_only",
      builderVersion: AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION,
      policyVersion: PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
    },
    identity: {
      tenantId: input.readiness.siteClientSourceLabels.tenantId,
      clientId: input.readiness.siteClientSourceLabels.clientId,
      siteId: input.readiness.siteClientSourceLabels.siteId,
      migrationId: input.readiness.migrationId,
      launchReadinessRecordId: input.readiness.id,
    },
    readinessStatus: limitations.length > 0 ? "ready_with_limitations" : "ready",
    dimensionStatuses: {
      airship_publish_readiness_package: {
        status: "ready_with_limitations",
        freshnessStatus: "fresh",
      },
    },
    requiredDimensions: ["airship_publish_readiness_package"],
    optionalDimensions: [],
    freshness: [
      {
        key: "launch_readiness_record",
        required: true,
        status: "ready_with_limitations",
        freshnessStatus: "fresh",
        sourceWatermark: input.refs.readinessPackageRef.sourceWatermark,
        acceptedLimitation: false,
        staleReason: null,
        missingReason: null,
      },
      {
        key: "airship_publish_readiness_package",
        required: true,
        status: "ready_with_limitations",
        freshnessStatus: "fresh",
        sourceWatermark: input.refs.readinessPackageRef.sourceWatermark,
        acceptedLimitation: false,
        staleReason: null,
        missingReason: null,
      },
    ],
    missingDimensions: [],
    staleDimensions: [],
    blockedDimensions: [],
    acceptedLimitations: limitations,
    unresolvedNonP0Blockers: [],
    sourceRefs: {
      airship_readiness_package: [input.refs.readinessPackageRef],
      airship_review_record: [input.refs.reviewRecordRef],
      improved_candidate_site_version: [input.refs.candidateSourceRef],
      improved_runtime_artifact: [input.refs.artifactSourceRef],
      airship_draft: [input.refs.draftSourceRef],
      publish_target: [input.refs.publishTargetRef],
    },
    sourceWatermarks: {
      airship_readiness_package: input.refs.readinessPackageRef.sourceWatermark,
      airship_review_record: input.refs.reviewRecordRef.sourceWatermark,
      improved_candidate_site_version: input.refs.candidateSourceRef.sourceWatermark,
      improved_runtime_artifact: input.refs.artifactSourceRef.sourceWatermark,
      airship_draft: input.refs.draftSourceRef.sourceWatermark,
      publish_target: input.refs.publishTargetRef.sourceWatermark,
    },
    readinessCloseout: {
      finalStatus: "ready_with_limitations",
      finalLimitations: limitations,
      finalBlockers: [],
      metadata: {
        sourceTruth: "gnr8_airship_publish_readiness_packages",
        noPublish: true,
        noDryRun: true,
        noShadowPublish: true,
        activePointerChanged: false,
      },
    },
    publishActivationHandoffRefs: [],
    explicitNonApprovalNonPublishFlags: {
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      activePointerMutation: false,
      providerCalls: false,
    },
  };
}

function evidencePackageInput(input: {
  readiness: AirshipPublishReadinessRecord;
  refs: ReturnType<typeof chainRefs>;
  actorId: string;
  correlationId: string;
  idempotencyKey: string;
}): EvidencePackageTransactionInput {
  const payload = evidencePayload(input);
  const contentHash = sha256(payload);
  const sourceWatermark = `airship-publish-activation-evidence:${contentHash}`;
  const sourceRefs = [
    input.refs.readinessPackageRef,
    input.refs.reviewRecordRef,
    input.refs.candidateSourceRef,
    input.refs.artifactSourceRef,
    input.refs.draftSourceRef,
    input.refs.publishTargetRef,
  ];
  return {
    evidencePackage: {
      tenantId: required("tenant_id", input.readiness.siteClientSourceLabels.tenantId),
      clientId: required("client_id", input.readiness.siteClientSourceLabels.clientId),
      siteId: required("site_id", input.readiness.siteClientSourceLabels.siteId),
      siteVersionId: input.readiness.reviewedCandidateSiteVersionId,
      correlationId: input.correlationId,
      causationId: input.readiness.id,
      idempotencyKey: `${input.idempotencyKey}:evidence`,
      requestId: null,
      packageType: AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE,
      subjectType: "single_site_launch_readiness_package",
      subjectId: input.readiness.id,
      status: "created",
      createdByActorType: "human",
      createdByActorId: input.actorId,
      sourceWatermark,
      freshnessLabel: "fresh",
      contentHash,
      limitationsJson: payload,
      privacyLabel: "client_confidential",
      redactionLabel: "none",
      retentionClass: "compliance_long",
    },
    sourceRefs: sourceRefs.map((ref) => ({
      sourceSystem: ref.sourceSystem ?? "gnr8",
      sourceTable: ref.sourceTable,
      sourceRecordId: ref.sourceRecordId,
      sourceVersion: text(ref.sourceVersion),
      sourceWatermark: ref.sourceWatermark,
      hash: sha256(ref),
      snapshotRef: ref.sourceRef,
      metadataJson: {
        ...jsonObject(ref.metadataJson),
        refRole: ref.role,
        sourceTruth: ref.role === "airship_readiness_package",
        noPublish: true,
      },
    })),
    items: [
      {
        itemType: "airship_publish_activation_evidence_payload",
        itemRef: `aaf:airship_publish_activation_evidence:${contentHash}`,
        itemHash: contentHash,
        mediaType: "application/json",
        sizeBytes: JSON.stringify(payload).length,
        sourceTable: "gnr8_airship_publish_readiness_packages",
        sourceRecordId: input.readiness.id,
        displayName: "Airship publish activation chain evidence payload",
        limitationsJson: { inlineInEvidencePackageLimitationsJson: true, metadataOnly: true, nonPublish: true },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
      },
    ],
    freshnessCheck: {
      policyVersion: PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
      result: "fresh",
      checkedByActorType: "human",
      checkedByActorId: input.actorId,
      staleReason: null,
      expiresAt: null,
      currentSourceWatermark: sourceWatermark,
      idempotencyKey: `${input.idempotencyKey}:evidence:freshness`,
    },
  };
}

function persistedChainMetadata(chain: AirshipPublishActivationChainRecord): Record<string, unknown> {
  return {
    expectedLaunchReadinessEvidenceRef: chain.activationEvidencePackage.id,
    expectedLaunchReadinessEvidenceDisplayRef: chain.activationEvidencePackage.ref,
    expectedLaunchReadinessEvidenceStatus: chain.activationEvidencePackage.status,
    expectedLaunchReadinessEvidenceWatermark: chain.activationEvidencePackage.sourceWatermark,
    expectedPublishActivationRequestRef: chain.activationRequest.id,
    expectedPublishActivationRequestDisplayRef: chain.activationRequest.ref,
    expectedPublishActivationRequestStatus: chain.activationRequest.status,
    expectedPublishActivationDecisionRef: chain.activationDecision.id,
    expectedPublishActivationDecisionDisplayRef: chain.activationDecision.ref,
    expectedPublishActivationDecisionStatus: chain.activationDecision.status,
    expectedGateAttemptResultRef: chain.gateAttempt.id,
    expectedGateAttemptResultDisplayRef: chain.gateAttempt.ref,
    expectedGateAttemptStatus: chain.gateAttempt.status,
    expectedGateInputWatermark: chain.gateInputWatermark,
    expectedHandoffWatermark: chain.handoffWatermark,
    airshipPublishActivationChain: chain,
  };
}

function refreshedHandoffWatermarkMetadata(
  chain: AirshipPublishActivationChainRecord,
  handoffWatermark: string,
): Record<string, unknown> {
  return {
    expectedHandoffWatermark: handoffWatermark,
    airshipPublishActivationChain: {
      ...chain,
      handoffWatermark,
    },
  };
}

function outputFromChain(status: "created" | "reused", chain: AirshipPublishActivationChainRecord): {
  status: "created" | "reused";
  chain: AirshipPublishActivationChainRecord;
} {
  return {
    status,
    chain: {
      ...chain,
      mutationFlags: {
        ...chain.mutationFlags,
        activationMetadataMutation: status === "created",
      },
    },
  };
}

export async function refreshAirshipPublishActivationHandoffWatermark(
  input: RefreshAirshipPublishActivationHandoffWatermarkInput,
  dependencies: Partial<Pick<
    AirshipPublishActivationChainDependencies,
    "readinessRepository" | "getSiteVersion" | "getArtifactById" | "getActivePointerForSite" | "buildDecisionReadModel"
  >> = {},
): Promise<{
  status: "refreshed";
  readinessPackageId: string;
  previousExpectedHandoffWatermark: string | null;
  previousChainHandoffWatermark: string | null;
  derivedHandoffWatermark: string;
  chain: AirshipPublishActivationChainRecord;
  mutationFlags: {
    activationMetadataMutation: true;
    createsApprovalRequest: false;
    createsApprovalDecision: false;
    createsGateAttempt: false;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
    sourceCapture: false;
    activePointerChanged: false;
    runtimeMutation: false;
    liveSiteMutated: false;
    providerCall: false;
  };
}> {
  const deps = {
    readinessRepository: dependencies.readinessRepository ?? new PostgresAirshipPublishReadinessRepository(),
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    buildDecisionReadModel: dependencies.buildDecisionReadModel ?? buildPublishActivationDecisionReadModel,
  };
  const readinessPackageId = uuid("readiness_package_id", input.readinessPackageId);
  const readiness = await readAirshipPublishReadinessById(readinessPackageId, deps.readinessRepository);
  if (!readiness) throw new Error("airship_publish_activation_chain_refresh_readiness_package_missing");

  const chain = airshipPublishActivationChainFromReadiness(readiness);
  if (!chain) throw new Error("airship_publish_activation_chain_refresh_chain_missing");
  assertReadinessMatchesInput(readiness, {
    readinessPackageId,
    reviewRecordId: chain.reviewRecordId,
    candidateVersionId: chain.candidateVersionId,
    artifactId: chain.artifactId,
    draftId: chain.draftId,
    draftVersion: chain.draftVersion,
    migrationId: readiness.migrationId,
  });

  const candidateVersion = await deps.getSiteVersion(chain.candidateVersionId);
  const artifact = await deps.getArtifactById(chain.artifactId);
  const activePointer = candidateVersion ? await deps.getActivePointerForSite(candidateVersion.siteId) : null;
  assertRuntimeStillSafe({ readiness, candidateVersion, artifact, activePointer });

  const readModel = await deps.buildDecisionReadModel({
    tenantId: required("tenant_id", readiness.siteClientSourceLabels.tenantId),
    clientId: required("client_id", readiness.siteClientSourceLabels.clientId),
    siteId: required("site_id", readiness.siteClientSourceLabels.siteId),
    migrationId: readiness.migrationId,
    publishActivationRequestId: chain.activationRequest.id,
    publishActivationDecisionId: chain.activationDecision.id,
    launchReadinessEvidencePackageId: chain.activationEvidencePackage.id,
    candidateSiteVersionId: chain.candidateVersionId,
    runtimeArtifactId: chain.artifactId,
    publishTargetId: chain.publishTargetRef.sourceRecordId,
    expectedLaunchReadinessEvidenceWatermark: chain.activationEvidencePackage.sourceWatermark,
    improvedCandidateSiteVersionRef: sourceRefForRequest(chain.evidenceSourceRefs.candidateSourceRef),
    improvedRuntimeArtifactRef: sourceRefForRequest(chain.evidenceSourceRefs.artifactSourceRef),
    publishTargetRef: sourceRefForRequest(chain.publishTargetRef),
  });
  const handoff = buildPublishActivationGateHandoff(readModel);
  if (handoff.status !== "handoff_ready") {
    throw new Error(`airship_publish_activation_chain_refresh_handoff_blocked:${handoff.blockerSummary.blockers.join(",")}`);
  }
  if (!deps.readinessRepository.attachActivationChainMetadata) {
    throw new Error("airship_publish_activation_chain_refresh_repository_attach_missing");
  }

  const previousExpectedHandoffWatermark = text(jsonObject(readiness.metadata).expectedHandoffWatermark);
  const refreshedChain = { ...chain, handoffWatermark: handoff.semanticHandoffWatermark };
  await deps.readinessRepository.attachActivationChainMetadata({
    readinessPackageId,
    metadata: refreshedHandoffWatermarkMetadata(chain, handoff.semanticHandoffWatermark),
  });

  return {
    status: "refreshed",
    readinessPackageId,
    previousExpectedHandoffWatermark,
    previousChainHandoffWatermark: text(chain.handoffWatermark),
    derivedHandoffWatermark: handoff.semanticHandoffWatermark,
    chain: refreshedChain,
    mutationFlags: {
      activationMetadataMutation: true,
      createsApprovalRequest: false,
      createsApprovalDecision: false,
      createsGateAttempt: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      activePointerChanged: false,
      runtimeMutation: false,
      liveSiteMutated: false,
      providerCall: false,
    },
  };
}

export async function createAirshipPublishActivationChain(
  input: CreateAirshipPublishActivationChainInput,
  dependencies: Partial<AirshipPublishActivationChainDependencies> = {},
): Promise<{ status: "created" | "reused"; chain: AirshipPublishActivationChainRecord }> {
  const defaultWriter =
    dependencies.evidenceWriter && dependencies.requestBridge && dependencies.decisionService
      ? null
      : new AafWriterRepository();
  const deps: AirshipPublishActivationChainDependencies = {
    readinessRepository: dependencies.readinessRepository ?? new PostgresAirshipPublishReadinessRepository(),
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    evidenceWriter: dependencies.evidenceWriter ?? defaultWriter!,
    requestBridge: dependencies.requestBridge ?? new SingleSitePublishActivationRequestBridge(defaultWriter!),
    decisionService: dependencies.decisionService ?? new SingleSitePublishActivationDecisionService(defaultWriter!),
    gateEvaluator: dependencies.gateEvaluator ?? new SingleSitePublishActivationGateEvaluator(),
    buildDecisionReadModel: dependencies.buildDecisionReadModel ?? buildPublishActivationDecisionReadModel,
  };
  const refs = {
    readinessPackageId: uuid("readiness_package_id", input.readinessPackageId),
    reviewRecordId: uuid("review_record_id", input.reviewRecordId),
    candidateVersionId: uuid("candidate_version_id", input.candidateVersionId),
    artifactId: uuid("artifact_id", input.artifactId),
    draftId: uuid("draft_id", input.draftId),
    draftVersion: input.draftVersion,
    migrationId: uuid("migration_id", input.migrationId),
  };
  if (!Number.isInteger(refs.draftVersion) || refs.draftVersion < 1) throw new Error("airship_publish_activation_chain_draft_version_invalid");
  const actorId = required("actor_id", input.actorId);
  const readiness = await readAirshipPublishReadinessById(refs.readinessPackageId, deps.readinessRepository);
  if (!readiness) throw new Error("airship_publish_activation_chain_readiness_package_missing");
  assertReadinessMatchesInput(readiness, refs);

  const existing = airshipPublishActivationChainFromReadiness(readiness);
  const idempotencyKey = text(input.idempotencyKey) ?? airshipPublishActivationChainIdempotencyKey(refs);
  if (existing?.idempotencyKey === idempotencyKey) return outputFromChain("reused", existing);

  const candidateVersion = await deps.getSiteVersion(refs.candidateVersionId);
  const artifact = await deps.getArtifactById(refs.artifactId);
  const activePointer = candidateVersion ? await deps.getActivePointerForSite(candidateVersion.siteId) : null;
  assertRuntimeStillSafe({ readiness, candidateVersion, artifact, activePointer });
  if (!artifact) throw new Error("airship_publish_activation_chain_artifact_missing");
  const correlationId = text(input.correlationId) ?? `airship-publish-activation-chain:${sha256(refs)}`;
  const canonicalRefs = chainRefs({ readiness, artifact });
  const actor = { actorType: "human" as const, actorId, actorRole: "platform_superadmin" };
  const evidence = await deps.evidenceWriter.createEvidencePackageTransaction(
    evidencePackageInput({ readiness, refs: canonicalRefs, actorId, correlationId, idempotencyKey }),
  );
  const evidencePackageId = required("evidence_package_id", evidence.evidencePackage.id);
  const evidenceSourceWatermark = required("evidence_source_watermark", rowText(evidence.evidencePackage, "sourceWatermark", "source_watermark"));
  const candidateSourceRef = sourceRefForRequest(canonicalRefs.candidateSourceRef);
  const artifactSourceRef = sourceRefForRequest(canonicalRefs.artifactSourceRef);
  const publishTargetRef = sourceRefForRequest(canonicalRefs.publishTargetRef);
  const request = await deps.requestBridge.preparePublishActivationRequestFromLaunchReadiness({
    tenantId: required("tenant_id", readiness.siteClientSourceLabels.tenantId),
    clientId: required("client_id", readiness.siteClientSourceLabels.clientId),
    siteId: required("site_id", readiness.siteClientSourceLabels.siteId),
    migrationId: refs.migrationId,
    launchReadinessRecordId: refs.readinessPackageId,
    launchReadinessEvidencePackageId: evidencePackageId,
    improvedCandidateSiteVersionRef: candidateSourceRef,
    improvedRuntimeArtifactRef: artifactSourceRef,
    publishTargetRef,
    actor,
    correlationId,
    idempotencyKey,
    policyVersion: PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
    expectedLaunchReadinessEvidenceWatermark: evidenceSourceWatermark,
    expectedLaunchReadinessStatus: jsonArray(readiness.limitationsWarnings).length > 0 ? "ready_with_limitations" : "ready",
    publishActivationSubjectRefs: [
      { role: "airship_readiness_package", ...sourceRefForRequest(canonicalRefs.readinessPackageRef) },
      { role: "airship_review_record", ...sourceRefForRequest(canonicalRefs.reviewRecordRef) },
      { role: "airship_draft", ...sourceRefForRequest(canonicalRefs.draftSourceRef) },
    ],
    operatorNotes: ["Airship metadata-only activation chain; no publish, no dry-run, no shadow-publish, no active pointer mutation."],
  });
  const decision = await deps.decisionService.recordPublishActivationDecision({
    tenantId: required("tenant_id", readiness.siteClientSourceLabels.tenantId),
    clientId: required("client_id", readiness.siteClientSourceLabels.clientId),
    siteId: required("site_id", readiness.siteClientSourceLabels.siteId),
    migrationId: refs.migrationId,
    publishActivationRequestId: request.requestId,
    launchReadinessRecordId: refs.readinessPackageId,
    launchReadinessEvidencePackageId: evidencePackageId,
    improvedCandidateSiteVersionRef: candidateSourceRef,
    improvedRuntimeArtifactRef: artifactSourceRef,
    publishTargetRef,
    decisionStatus: "granted_with_limitations",
    decisionActor: actor,
    decisionReason: "Approval decision recorded from approved Airship readiness package for metadata-only governed dry-run preparation.",
    decisionNotes: "No publish, dry-run, shadow-publish, rollback, source capture, provider call, active pointer mutation, or live-site mutation.",
    correlationId,
    causationId: request.requestId,
    idempotencyKey,
    limitations: readiness.limitationsWarnings,
    policyVersion: PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
    expectedRequestWatermark: request.semanticWatermark,
    expectedLaunchReadinessEvidenceWatermark: evidenceSourceWatermark,
  });
  const readModel = await deps.buildDecisionReadModel({
    tenantId: required("tenant_id", readiness.siteClientSourceLabels.tenantId),
    clientId: required("client_id", readiness.siteClientSourceLabels.clientId),
    siteId: required("site_id", readiness.siteClientSourceLabels.siteId),
    migrationId: refs.migrationId,
    publishActivationRequestId: request.requestId,
    publishActivationDecisionId: decision.decisionId,
    candidateSiteVersionId: refs.candidateVersionId,
    runtimeArtifactId: refs.artifactId,
    publishTargetId: "production",
    expectedRequestWatermark: request.semanticWatermark,
    expectedLaunchReadinessEvidenceWatermark: evidenceSourceWatermark,
    improvedCandidateSiteVersionRef: candidateSourceRef,
    improvedRuntimeArtifactRef: artifactSourceRef,
    publishTargetRef,
  });
  const handoff = buildPublishActivationGateHandoff(readModel);
  if (handoff.status !== "handoff_ready") {
    throw new Error(`airship_publish_activation_chain_handoff_blocked:${handoff.blockerSummary.blockers.join(",")}`);
  }
  const gate = await deps.gateEvaluator.evaluatePublishActivationGateFromHandoff({
    tenantId: required("tenant_id", readiness.siteClientSourceLabels.tenantId),
    clientId: required("client_id", readiness.siteClientSourceLabels.clientId),
    siteId: required("site_id", readiness.siteClientSourceLabels.siteId),
    migrationId: refs.migrationId,
    handoff,
    actor,
    correlationId,
    causationId: `${PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION}:${handoff.semanticHandoffWatermark}`,
    idempotencyKey: `${idempotencyKey}:gate`,
    policyVersion: PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
    expectedHandoffWatermark: handoff.semanticHandoffWatermark,
    expectedDecisionRef: decision.decisionId,
    expectedEvidencePackageRef: evidencePackageId,
    expectedPublishTargetRef: "production",
    privacyLabel: "client_confidential",
    retentionClass: "compliance_long",
  });
  if (!gate.gateAttemptId || gate.gateResult !== "allowed" || !gate.semanticGateInputWatermark) {
    throw new Error(`airship_publish_activation_chain_gate_blocked:${gate.blockerCodes.join(",")}`);
  }

  const chain: AirshipPublishActivationChainRecord = {
    serviceVersion: AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION,
    readinessPackageId: refs.readinessPackageId,
    reviewRecordId: refs.reviewRecordId,
    candidateVersionId: refs.candidateVersionId,
    artifactId: refs.artifactId,
    draftId: refs.draftId,
    draftVersion: refs.draftVersion,
    activationEvidencePackage: {
      id: evidencePackageId,
      ref: `aaf:evidence_package:${evidencePackageId}`,
      status: String(evidence.evidencePackage.status ?? "created"),
      sourceWatermark: evidenceSourceWatermark,
    },
    activationRequest: {
      id: request.requestId,
      ref: request.requestRef,
      status: request.status,
    },
    activationDecision: {
      id: decision.decisionId,
      ref: decision.decisionRef,
      status: decision.decisionStatus,
    },
    gateAttempt: {
      id: gate.gateAttemptId,
      ref: `aaf:action_gate_attempt:${gate.gateAttemptId}`,
      status: gate.evaluationStatus,
      gateResult: gate.gateResult,
    },
    gateInputWatermark: gate.semanticGateInputWatermark,
    handoffWatermark: handoff.semanticHandoffWatermark,
    evidenceSourceRefs: canonicalRefs,
    publishTargetRef: canonicalRefs.publishTargetRef,
    activePointerBefore: pointerSnapshot(readiness.currentLiveActivePointerBefore),
    activePointerAfter: pointerSnapshot(activePointer),
    nextStep: "governed dry-run, not publish",
    idempotencyKey,
    correlationId,
    createdAt: text(gate.sourceWatermarks?.semanticGateInput) ? new Date().toISOString() : null,
    mutationFlags: {
      activationMetadataMutation: true,
      createsApprovalRequest: true,
      createsApprovalDecision: true,
      createsGateAttempt: true,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      activePointerChanged: false,
      runtimeMutation: false,
      liveSiteMutated: false,
      providerCall: false,
    },
  };
  if (chain.activationRequest.id === refs.readinessPackageId || chain.activationDecision.id === refs.readinessPackageId || chain.gateAttempt.id === refs.readinessPackageId) {
    throw new Error("airship_publish_activation_chain_placeholder_ref_detected");
  }
  if (!deps.readinessRepository.attachActivationChainMetadata) {
    throw new Error("airship_publish_activation_chain_repository_attach_missing");
  }
  await deps.readinessRepository.attachActivationChainMetadata({
    readinessPackageId: refs.readinessPackageId,
    metadata: persistedChainMetadata(chain),
  });
  return outputFromChain("created", chain);
}
