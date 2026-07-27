import "server-only";

import { createHash } from "node:crypto";

import type { AafApprovalScope, AafPrivacyLabel, AafRetentionClass } from "@gnr8/runtime-contracts";

import {
  buildPublishActivationSubjectWatermark,
  PUBLISH_ACTIVATION_DRY_RUN_SCOPE,
  PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE,
  PUBLISH_ACTIVATION_REQUIRED_EVIDENCE_TYPE,
  type PublishActivationCanonicalSourceRef,
  type PublishActivationCanonicalSourceRefs,
  type PublishActivationContentOverrideState,
  type PublishActivationDomainReadinessStatus,
  type PublishActivationGateDryRunInput,
} from "./aaf-publish-activation-gate-adapter";
import {
  AafWriterRepository,
  type AafActorType,
  type AafEvidenceFreshnessResult,
  type AafJsonObject,
  type AafRecord,
  type AafTenantScopeInput,
  type EvidencePackageTransactionInput,
  type EvidencePackageTransactionResult,
} from "./aaf-writer-repository";

export type PublishActivationEvidenceSourceKey =
  | "siteVersion"
  | "runtimeArtifact"
  | "activePointer"
  | "publishTarget"
  | "domainReadiness"
  | "contentOverridePublishedState"
  | "launchSignoff"
  | "publishActivationApproval";

export type PublishActivationEvidenceFreshnessStatus = AafEvidenceFreshnessResult;
export type PublishActivationWatermarkStrategy = "canonical_field" | "stable_hash";

export type PublishActivationWatermarkMetadata = {
  strategy: PublishActivationWatermarkStrategy;
  field?: string | null;
  hashFields?: readonly string[];
  hashAlgorithm?: "sha256";
  hashInput?: unknown;
  limitations?: readonly string[];
};

export type PublishActivationCanonicalSourceSnapshot = {
  sourceSystem?: string | null;
  sourceTable: string;
  sourceRecordId: string;
  sourceRef?: string | null;
  sourceVersion?: string | null;
  canonicalFields: Record<string, unknown>;
  canonicalWatermark?: string | null;
  canonicalWatermarkField?: string | null;
  hashFields?: readonly string[] | null;
  snapshotRef?: string | null;
  queryRef?: string | null;
  capturedAt?: string | null;
  freshness?: PublishActivationEvidenceFreshnessStatus;
  staleReason?: string | null;
  expiresAt?: string | null;
  limitations?: readonly string[];
};

export type PublishActivationDomainReadinessSnapshot = PublishActivationCanonicalSourceSnapshot & {
  readinessStatus: PublishActivationDomainReadinessStatus;
  blockers?: readonly string[];
  warnings?: readonly string[];
  stale?: boolean;
};

export type PublishActivationContentOverrideSnapshot = PublishActivationCanonicalSourceSnapshot & {
  status: PublishActivationContentOverrideState;
};

export type PublishActivationApprovalSnapshot = PublishActivationCanonicalSourceSnapshot & {
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  scope?: AafApprovalScope | null;
  requiredByPolicy?: boolean | null;
};

export type PublishActivationSourceReaderResult = {
  siteVersion?: PublishActivationCanonicalSourceSnapshot | null;
  runtimeArtifact?: PublishActivationCanonicalSourceSnapshot | null;
  activePointer?: (PublishActivationCanonicalSourceSnapshot & { activeSiteVersionId?: string | null; activeArtifactId?: string | null }) | null;
  publishTarget?: PublishActivationCanonicalSourceSnapshot | null;
  domainReadiness?: PublishActivationDomainReadinessSnapshot | null;
  contentOverridePublishedState?: PublishActivationContentOverrideSnapshot | null;
  launchSignoff?: PublishActivationApprovalSnapshot | null;
  publishActivationApproval?: PublishActivationApprovalSnapshot | null;
  warnings?: readonly string[];
  limitations?: readonly string[];
};

export type PublishActivationEvidenceSourceReader = {
  readPublishActivationSources(input: PublishActivationEvidenceReaderInput): Promise<PublishActivationSourceReaderResult>;
};

export type PublishActivationEvidenceReaderInput = AafTenantScopeInput & {
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId?: string | null;
  intendedPublishTarget: string;
  trustedPublishEnvironment?: string | null;
  intendedPublishStage?: string | null;
  intendedDomain?: string | null;
  contentOverrideStateRequired?: boolean;
  launchSignoffRequiredByPolicy?: boolean;
  publishActivationApprovalRef?: {
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    scope?: AafApprovalScope | null;
  } | null;
};

export type BuildPublishActivationEvidencePackageInput = PublishActivationEvidenceReaderInput & {
  actorType: AafActorType;
  actorId: string;
  actorRole: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  policyId?: string | null;
  policyVersion: string;
  privacyLabel?: AafPrivacyLabel;
  retentionClass?: AafRetentionClass;
  sourceReader: PublishActivationEvidenceSourceReader;
  writer?: PublishActivationEvidenceWriter;
};

export type BuildPublishActivationGateDryRunInputInput = Omit<
  BuildPublishActivationEvidencePackageInput,
  "writer"
>;

export type PublishActivationBuiltSourceRef = {
  key: PublishActivationEvidenceSourceKey;
  ref: PublishActivationCanonicalSourceRef | null;
  freshnessStatus: PublishActivationEvidenceFreshnessStatus;
  watermarkMetadata: PublishActivationWatermarkMetadata | null;
  missing: boolean;
  required: boolean;
  staleReason: string | null;
  limitations: string[];
};

export type PublishActivationEvidenceBuilderResult = {
  dryRunInput: PublishActivationGateDryRunInput;
  evidencePackageId: string;
  sourceRefs: PublishActivationCanonicalSourceRefs;
  sourceWatermarks: Record<PublishActivationEvidenceSourceKey, string | null>;
  watermarkMetadata: Record<PublishActivationEvidenceSourceKey, PublishActivationWatermarkMetadata | null>;
  missingSourceTruth: string[];
  freshnessStatus: Record<PublishActivationEvidenceSourceKey, PublishActivationEvidenceFreshnessStatus>;
  limitations: string[];
  warnings: string[];
  correlationId: string;
  idempotencyKey: string;
};

export type PublishActivationEvidenceWriter = {
  createEvidencePackageTransaction(input: EvidencePackageTransactionInput): Promise<EvidencePackageTransactionResult>;
};

type AssembledPublishActivationEvidence = Omit<PublishActivationEvidenceBuilderResult, "evidencePackageId"> & {
  packageInput: EvidencePackageTransactionInput;
};

const REQUIRED_SOURCE_KEYS = [
  "siteVersion",
  "runtimeArtifact",
  "activePointer",
  "publishTarget",
  "domainReadiness",
] as const;

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function stablePublishActivationJson(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

function stableJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry) => stableJsonValue(entry));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

export function hashPublishActivationStableValue(value: unknown): string {
  return createHash("sha256").update(stablePublishActivationJson(value)).digest("hex");
}

function selectHashInput(
  snapshot: PublishActivationCanonicalSourceSnapshot,
): { value: Record<string, unknown>; fields: string[] } {
  const canonical = snapshot.canonicalFields ?? {};
  const requestedFields = snapshot.hashFields?.map(String).filter(Boolean) ?? [];
  const fields = requestedFields.length > 0 ? requestedFields : Object.keys(canonical).sort((left, right) => left.localeCompare(right));
  return {
    fields,
    value: Object.fromEntries(fields.map((field) => [field, canonical[field] ?? null])),
  };
}

export function buildPublishActivationSourceWatermark(
  snapshot: PublishActivationCanonicalSourceSnapshot,
): { watermark: string; metadata: PublishActivationWatermarkMetadata } {
  const canonicalWatermark = text(snapshot.canonicalWatermark);
  if (canonicalWatermark) {
    return {
      watermark: canonicalWatermark,
      metadata: {
        strategy: "canonical_field",
        field: text(snapshot.canonicalWatermarkField) ?? "canonicalWatermark",
        limitations: snapshot.limitations ?? [],
      },
    };
  }

  const hashInput = selectHashInput(snapshot);
  return {
    watermark: `sha256:${hashPublishActivationStableValue(hashInput.value)}`,
    metadata: {
      strategy: "stable_hash",
      hashAlgorithm: "sha256",
      hashFields: hashInput.fields,
      hashInput: hashInput.value,
      limitations: snapshot.limitations ?? [],
    },
  };
}

function placeholderMissingRef(
  key: PublishActivationEvidenceSourceKey,
  sourceRecordId: string,
): PublishActivationCanonicalSourceRef {
  return {
    sourceSystem: "gnr8",
    sourceTable: `missing_source_truth:${key}`,
    sourceRecordId,
    sourceRef: null,
    sourceVersion: null,
    currentWatermark: null,
    evidenceWatermark: null,
  };
}

function buildRef(
  snapshot: PublishActivationCanonicalSourceSnapshot,
  watermark: string,
): PublishActivationCanonicalSourceRef {
  return {
    sourceSystem: text(snapshot.sourceSystem) ?? "gnr8",
    sourceTable: snapshot.sourceTable,
    sourceRecordId: snapshot.sourceRecordId,
    sourceRef: text(snapshot.sourceRef) ?? `${snapshot.sourceTable}:${snapshot.sourceRecordId}`,
    sourceVersion: text(snapshot.sourceVersion),
    currentWatermark: watermark,
    evidenceWatermark: watermark,
  };
}

function sourceRefHash(ref: PublishActivationCanonicalSourceRef, metadata: PublishActivationWatermarkMetadata): string {
  return hashPublishActivationStableValue({
    sourceSystem: ref.sourceSystem ?? "gnr8",
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceVersion: ref.sourceVersion ?? null,
    sourceRef: ref.sourceRef ?? null,
    watermark: ref.evidenceWatermark ?? null,
    watermarkMetadata: metadata,
  });
}

function isSourceRequired(key: PublishActivationEvidenceSourceKey, input: BuildPublishActivationEvidencePackageInput): boolean {
  if ((REQUIRED_SOURCE_KEYS as readonly string[]).includes(key)) return true;
  if (key === "contentOverridePublishedState") return input.contentOverrideStateRequired === true;
  if (key === "launchSignoff") return input.launchSignoffRequiredByPolicy === true;
  if (key === "publishActivationApproval") return Boolean(input.publishActivationApprovalRef?.approvalDecisionId);
  return false;
}

function snapshotForKey(
  key: PublishActivationEvidenceSourceKey,
  sources: PublishActivationSourceReaderResult,
): PublishActivationCanonicalSourceSnapshot | null {
  return (sources[key] as PublishActivationCanonicalSourceSnapshot | null | undefined) ?? null;
}

function expectedRecordId(key: PublishActivationEvidenceSourceKey, input: BuildPublishActivationEvidencePackageInput): string {
  if (key === "siteVersion" || key === "contentOverridePublishedState" || key === "launchSignoff" || key === "publishActivationApproval") {
    return input.siteVersionId;
  }
  if (key === "runtimeArtifact") return text(input.runtimeArtifactId) ?? "missing_runtime_artifact";
  if (key === "activePointer") return input.siteId;
  if (key === "publishTarget") return input.intendedPublishTarget;
  if (key === "domainReadiness") return input.siteId;
  return input.siteId;
}

function buildSourceEntry(
  key: PublishActivationEvidenceSourceKey,
  input: BuildPublishActivationEvidencePackageInput,
  sources: PublishActivationSourceReaderResult,
): PublishActivationBuiltSourceRef {
  const required = isSourceRequired(key, input);
  const snapshot = snapshotForKey(key, sources);
  const limitations = [...(snapshot?.limitations ?? [])];

  if (!snapshot) {
    return {
      key,
      ref: required ? placeholderMissingRef(key, expectedRecordId(key, input)) : null,
      freshnessStatus: required ? "failed" : "fresh",
      watermarkMetadata: null,
      missing: required,
      required,
      staleReason: required ? `${key}_source_truth_missing` : null,
      limitations: required ? [`missing_source_truth:${key}`] : limitations,
    };
  }

  const { watermark, metadata } = buildPublishActivationSourceWatermark(snapshot);
  const freshnessStatus = snapshot.freshness ?? "fresh";
  return {
    key,
    ref: buildRef(snapshot, watermark),
    freshnessStatus,
    watermarkMetadata: metadata,
    missing: false,
    required,
    staleReason: text(snapshot.staleReason),
    limitations,
  };
}

function freshnessResultForEntries(entries: readonly PublishActivationBuiltSourceRef[]): AafEvidenceFreshnessResult {
  if (entries.some((entry) => entry.freshnessStatus === "failed" || entry.missing)) return "failed";
  if (entries.some((entry) => entry.freshnessStatus === "stale")) return "stale";
  if (entries.some((entry) => entry.freshnessStatus === "partial_timeline")) return "partial_timeline";
  return "fresh";
}

function sourceRefsFromEntries(entries: readonly PublishActivationBuiltSourceRef[]): PublishActivationCanonicalSourceRefs {
  const byKey = Object.fromEntries(entries.map((entry) => [entry.key, entry.ref])) as Record<
    PublishActivationEvidenceSourceKey,
    PublishActivationCanonicalSourceRef | null
  >;
  return {
    siteVersion: byKey.siteVersion ?? placeholderMissingRef("siteVersion", "missing_site_version"),
    runtimeArtifact: byKey.runtimeArtifact ?? placeholderMissingRef("runtimeArtifact", "missing_runtime_artifact"),
    activePointer: byKey.activePointer ?? placeholderMissingRef("activePointer", "missing_active_pointer"),
    publishTarget: byKey.publishTarget ?? placeholderMissingRef("publishTarget", "missing_publish_target"),
    domainReadiness: byKey.domainReadiness ?? placeholderMissingRef("domainReadiness", "missing_domain_readiness"),
    contentOverridePublishedState: byKey.contentOverridePublishedState ?? null,
  };
}

function buildEvidenceContent(input: {
  dryRunInput: PublishActivationGateDryRunInput;
  entries: readonly PublishActivationBuiltSourceRef[];
  missingSourceTruth: readonly string[];
  limitations: readonly string[];
  warnings: readonly string[];
}): AafJsonObject {
  return {
    packageType: PUBLISH_ACTIVATION_REQUIRED_EVIDENCE_TYPE,
    dryRunOnly: true,
    nonExecuting: true,
    subjectType: PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE,
    subjectId: input.dryRunInput.siteVersionId,
    sourceRefs: input.dryRunInput.sourceRefs as unknown as AafJsonObject,
    currentActivePointer: input.dryRunInput.currentActivePointer,
    intendedPublishTarget: input.dryRunInput.intendedPublishTarget,
    domainReadiness: input.dryRunInput.domainReadiness,
    contentOverridePublishedState: input.dryRunInput.contentOverridePublishedState ?? null,
    launchSignoffApproval: input.dryRunInput.launchSignoffApproval ?? null,
    publishActivationApproval: input.dryRunInput.publishActivationApproval ?? null,
    sourceWatermarkMetadata: Object.fromEntries(input.entries.map((entry) => [entry.key, entry.watermarkMetadata])),
    missingSourceTruth: input.missingSourceTruth,
    limitations: input.limitations,
    warnings: input.warnings,
  };
}

function buildDryRunInput(
  input: BuildPublishActivationEvidencePackageInput,
  sources: PublishActivationSourceReaderResult,
  sourceRefs: PublishActivationCanonicalSourceRefs,
  evidencePackageId: string | null,
  entries: readonly PublishActivationBuiltSourceRef[],
): PublishActivationGateDryRunInput {
  const activePointer = sources.activePointer;
  const domainReadiness = sources.domainReadiness;
  const contentOverride = sources.contentOverridePublishedState;
  const launchSignoff = sources.launchSignoff;
  const publishApproval = sources.publishActivationApproval ?? null;
  const domainStale = domainReadiness?.stale === true || domainReadiness?.freshness === "stale";

  return {
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    siteId: input.siteId,
    batchId: input.batchId ?? null,
    jobId: input.jobId ?? null,
    siteVersionId: input.siteVersionId,
    domainId: input.domainId ?? null,
    costCenterId: input.costCenterId ?? null,
    runtimeArtifactId: text(input.runtimeArtifactId) ?? sourceRefs.runtimeArtifact.sourceRecordId,
    currentActivePointer: {
      siteVersionId: text(activePointer?.activeSiteVersionId ?? activePointer?.canonicalFields.activeSiteVersionId),
      artifactId: text(activePointer?.activeArtifactId ?? activePointer?.canonicalFields.activeArtifactId),
    },
    intendedPublishTarget: input.intendedPublishTarget,
    domainReadiness: {
      status: domainStale ? "blocked" : (domainReadiness?.readinessStatus ?? "blocked"),
      snapshotRef: text(domainReadiness?.snapshotRef ?? sourceRefs.domainReadiness.sourceRef),
      blockers: [
        ...(domainReadiness?.blockers ?? []),
        ...(domainStale ? ["domain_readiness_stale"] : []),
        ...entries.filter((entry) => entry.key === "domainReadiness" && entry.missing).map(() => "domain_readiness_source_truth_missing"),
      ],
    },
    contentOverridePublishedState: contentOverride
      ? {
          status: contentOverride.status,
          snapshotRef: text(contentOverride.snapshotRef ?? sourceRefs.contentOverridePublishedState?.sourceRef),
        }
      : input.contentOverrideStateRequired
        ? { status: "unknown", snapshotRef: null }
        : { status: "not_applicable", snapshotRef: null },
    launchSignoffApproval: {
      approvalDecisionId: text(launchSignoff?.approvalDecisionId),
      requiredByPolicy: input.launchSignoffRequiredByPolicy === true || launchSignoff?.requiredByPolicy === true,
    },
    publishActivationApproval: publishApproval
      ? {
          approvalRequestId: text(publishApproval.approvalRequestId),
          approvalDecisionId: text(publishApproval.approvalDecisionId),
          scope: publishApproval.scope ?? null,
        }
      : input.publishActivationApprovalRef
        ? {
            approvalRequestId: text(input.publishActivationApprovalRef.approvalRequestId),
            approvalDecisionId: text(input.publishActivationApprovalRef.approvalDecisionId),
            scope: input.publishActivationApprovalRef.scope ?? null,
          }
        : null,
    evidencePackageId,
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion,
    actorType: input.actorType,
    actorId: input.actorId,
    actorRole: input.actorRole,
    correlationId: input.correlationId,
    causationId: input.causationId ?? null,
    idempotencyKey: `${input.idempotencyKey}:dry-run`,
    requestId: input.requestId ?? null,
    sourceRefs,
    privacyLabel: input.privacyLabel,
    retentionClass: input.retentionClass,
  };
}

async function assemblePublishActivationEvidence(
  input: BuildPublishActivationEvidencePackageInput,
): Promise<AssembledPublishActivationEvidence> {
  const sources = await input.sourceReader.readPublishActivationSources(input);
  const keys: PublishActivationEvidenceSourceKey[] = [
    "siteVersion",
    "runtimeArtifact",
    "activePointer",
    "publishTarget",
    "domainReadiness",
    "contentOverridePublishedState",
    "launchSignoff",
    "publishActivationApproval",
  ];
  const entries = keys.map((key) => buildSourceEntry(key, input, sources));
  const sourceRefs = sourceRefsFromEntries(entries);
  const dryRunInputWithoutPackage = buildDryRunInput(input, sources, sourceRefs, null, entries);
  const subjectWatermark = buildPublishActivationSubjectWatermark(dryRunInputWithoutPackage);
  const missingSourceTruth = entries.filter((entry) => entry.missing).map((entry) => entry.key);
  const freshnessResult = freshnessResultForEntries(entries);
  const limitations = [
    ...(sources.limitations ?? []),
    ...entries.flatMap((entry) => entry.limitations),
    ...(subjectWatermark ? [] : ["aggregate_subject_watermark_incomplete"]),
    "non_executing_publish_activation_evidence_only",
  ].sort((left, right) => left.localeCompare(right));
  const warnings = [
    ...(sources.warnings ?? []),
    ...(missingSourceTruth.length > 0 ? ["missing_source_truth_present"] : []),
    ...(freshnessResult === "fresh" ? [] : [`freshness_${freshnessResult}`]),
  ].sort((left, right) => left.localeCompare(right));
  const packageSourceWatermark =
    subjectWatermark ??
    `incomplete_publish_activation_evidence:${hashPublishActivationStableValue({ missingSourceTruth, sourceRefs })}`;
  const dryRunInput = buildDryRunInput(input, sources, sourceRefs, null, entries);
  const evidenceContent = buildEvidenceContent({ dryRunInput, entries, missingSourceTruth, limitations, warnings });
  const contentHash = hashPublishActivationStableValue(evidenceContent);
  const packageInput: EvidencePackageTransactionInput = {
    evidencePackage: {
      tenantId: input.tenantId,
      clientId: input.clientId ?? null,
      siteId: input.siteId,
      batchId: input.batchId ?? null,
      jobId: input.jobId ?? null,
      siteVersionId: input.siteVersionId,
      domainId: input.domainId ?? null,
      costCenterId: input.costCenterId ?? null,
      correlationId: input.correlationId,
      causationId: input.causationId ?? null,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId ?? null,
      packageType: PUBLISH_ACTIVATION_REQUIRED_EVIDENCE_TYPE,
      subjectType: PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE,
      subjectId: input.siteVersionId,
      status: freshnessResult === "fresh" ? "created" : "invalid",
      createdByActorType: input.actorType,
      createdByActorId: input.actorId,
      sourceWatermark: packageSourceWatermark,
      freshnessLabel: freshnessResult,
      contentHash,
      limitationsJson: evidenceContent,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass ?? "compliance_long",
    },
    sourceRefs: entries
      .filter((entry): entry is PublishActivationBuiltSourceRef & { ref: PublishActivationCanonicalSourceRef; watermarkMetadata: PublishActivationWatermarkMetadata } =>
        Boolean(entry.ref?.currentWatermark && entry.ref.evidenceWatermark && entry.watermarkMetadata),
      )
      .map((entry) => ({
        sourceSystem: entry.ref.sourceSystem ?? "gnr8",
        sourceTable: entry.ref.sourceTable,
        sourceRecordId: entry.ref.sourceRecordId,
        sourceVersion: entry.ref.sourceVersion ?? null,
        sourceWatermark: entry.ref.evidenceWatermark ?? "",
        hash: sourceRefHash(entry.ref, entry.watermarkMetadata),
        queryRef: text(snapshotForKey(entry.key, sources)?.queryRef),
        snapshotRef: text(snapshotForKey(entry.key, sources)?.snapshotRef ?? entry.ref.sourceRef),
        capturedAt: text(snapshotForKey(entry.key, sources)?.capturedAt),
        metadataJson: {
          sourceKey: entry.key,
          freshnessStatus: entry.freshnessStatus,
          staleReason: entry.staleReason,
          watermarkMetadata: entry.watermarkMetadata,
        },
      })),
    items: [
      {
        itemType: "publish_activation_evidence_payload",
        itemRef: `aaf:publish_activation_evidence:${contentHash}`,
        itemHash: contentHash,
        mediaType: "application/json",
        sizeBytes: new TextEncoder().encode(stablePublishActivationJson(evidenceContent)).byteLength,
        sourceTable: "gnr8_aaf_evidence_packages",
        sourceRecordId: input.siteVersionId,
        displayName: "Publish activation evidence payload",
        limitationsJson: {
          inlineInEvidencePackageLimitationsJson: true,
          nonExecuting: true,
        },
      },
    ],
    freshnessCheck: {
      policyVersion: input.policyVersion,
      result: freshnessResult,
      checkedByActorType: input.actorType,
      checkedByActorId: input.actorId,
      staleReason:
        freshnessResult === "fresh"
          ? null
          : [...missingSourceTruth.map((key) => `${key}_source_truth_missing`), ...entries.map((entry) => entry.staleReason).filter(Boolean)]
              .join(",") || `freshness_${freshnessResult}`,
      expiresAt: null,
      currentSourceWatermark: packageSourceWatermark,
      idempotencyKey: `${input.idempotencyKey}:freshness`,
    },
  };
  return {
    dryRunInput,
    packageInput,
    sourceRefs,
    sourceWatermarks: Object.fromEntries(entries.map((entry) => [entry.key, entry.ref?.currentWatermark ?? null])) as Record<
      PublishActivationEvidenceSourceKey,
      string | null
    >,
    watermarkMetadata: Object.fromEntries(entries.map((entry) => [entry.key, entry.watermarkMetadata])) as Record<
      PublishActivationEvidenceSourceKey,
      PublishActivationWatermarkMetadata | null
    >,
    missingSourceTruth,
    freshnessStatus: Object.fromEntries(entries.map((entry) => [entry.key, entry.freshnessStatus])) as Record<
      PublishActivationEvidenceSourceKey,
      PublishActivationEvidenceFreshnessStatus
    >,
    limitations,
    warnings,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

export async function buildPublishActivationGateDryRunInput(
  input: BuildPublishActivationGateDryRunInputInput,
): Promise<Omit<PublishActivationEvidenceBuilderResult, "evidencePackageId">> {
  const assembled = await assemblePublishActivationEvidence(input);
  return {
    dryRunInput: assembled.dryRunInput,
    sourceRefs: assembled.sourceRefs,
    sourceWatermarks: assembled.sourceWatermarks,
    watermarkMetadata: assembled.watermarkMetadata,
    missingSourceTruth: assembled.missingSourceTruth,
    freshnessStatus: assembled.freshnessStatus,
    limitations: assembled.limitations,
    warnings: assembled.warnings,
    correlationId: assembled.correlationId,
    idempotencyKey: assembled.idempotencyKey,
  };
}

export async function buildPublishActivationEvidencePackage(
  input: BuildPublishActivationEvidencePackageInput,
): Promise<PublishActivationEvidenceBuilderResult> {
  const assembled = await assemblePublishActivationEvidence(input);
  const writer = input.writer ?? new AafWriterRepository();
  const written = await writer.createEvidencePackageTransaction(assembled.packageInput);
  const evidencePackageId = written.evidencePackage.id;
  return {
    dryRunInput: {
      ...assembled.dryRunInput,
      evidencePackageId,
    },
    evidencePackageId,
    sourceRefs: assembled.sourceRefs,
    sourceWatermarks: assembled.sourceWatermarks,
    watermarkMetadata: assembled.watermarkMetadata,
    missingSourceTruth: assembled.missingSourceTruth,
    freshnessStatus: assembled.freshnessStatus,
    limitations: assembled.limitations,
    warnings: assembled.warnings,
    correlationId: assembled.correlationId,
    idempotencyKey: assembled.idempotencyKey,
  };
}

export function isPublishActivationApprovalScope(scope: AafApprovalScope | null | undefined): boolean {
  return scope === PUBLISH_ACTIVATION_DRY_RUN_SCOPE;
}

export function evidencePackageRecordId(record: AafRecord | null | undefined): string | null {
  return text(record?.id);
}
