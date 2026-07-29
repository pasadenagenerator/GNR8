import "server-only";

import { createHash } from "node:crypto";

import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "../runtime/types";
import { buildDeterministicArtifactBundle } from "../runtime/artifact-builder";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getArtifactById,
  getSiteVersion,
} from "../runtime/runtime-store";

import {
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  type SingleSiteJsonObject,
} from "./single-site-state-contracts";
import type {
  SingleSiteCloneExecutor,
  SingleSiteCloneExecutorInput,
  SingleSiteCloneExecutorResult,
  SingleSiteCloneStartRef,
} from "./single-site-clone-start-orchestrator";

export const SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION = "mvp-12-single-site-real-clone-executor:v1" as const;

type CloneProvenance = {
  executorVersion: typeof SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION;
  operationKey: string;
  idempotencyKey: string;
  semanticOutputWatermark: string;
  migrationRef: string;
  runtimeSiteRef: string;
  cloneSiteVersionRef: string;
  sourceSiteVersionRef: string;
  sourceEvidenceReviewRef: string;
  sourceRuntimeArtifactRef: string | null;
};

type SingleSiteCloneRuntimePrimitiveDeps = {
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration;
  buildDeterministicArtifactBundle: typeof buildDeterministicArtifactBundle;
  createArtifact: typeof createArtifact;
  bindArtifactToVersion: typeof bindArtifactToVersion;
};

export type SingleSiteRealCloneExecutorDependencies = Partial<SingleSiteCloneRuntimePrimitiveDeps>;

const defaultPrimitiveDeps: SingleSiteCloneRuntimePrimitiveDeps = {
  getSiteVersion,
  getArtifactById,
  createSiteVersionFromMigration,
  buildDeterministicArtifactBundle,
  createArtifact,
  bindArtifactToVersion,
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function deterministicUuid(namespace: string, value: unknown): string {
  const digest = Buffer.from(sha256({ namespace, value }), "hex");
  const bytes = Uint8Array.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new SingleSiteTransitionError(`${field} is required`, [field]);
  return normalized;
}

function ref(input: {
  sourceRecordId: string;
  refType: string;
  sourceTable?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  metadataJson?: SingleSiteJsonObject;
}): SingleSiteCloneStartRef {
  return {
    sourceRecordId: input.sourceRecordId,
    refType: input.refType,
    sourceSystem: "gnr8",
    sourceTable: input.sourceTable,
    sourceWatermark: input.sourceWatermark,
    payloadHash: input.payloadHash,
    metadataJson: input.metadataJson,
  };
}

function metadataString(input: SingleSiteCloneExecutorInput, key: string): string | null {
  const fromMetadata = text(record(input.metadataJson)[key]);
  if (fromMetadata) return fromMetadata;
  return text(record(input.sourceEvidencePackageRef?.metadataJson)[key]);
}

function resolveSourceSiteVersionId(input: SingleSiteCloneExecutorInput): string {
  return required(
    "source_runtime_site_version_id",
    metadataString(input, "sourceRuntimeSiteVersionId") ??
      metadataString(input, "sourceSiteVersionId") ??
      metadataString(input, "runtimeSiteVersionId"),
  );
}

function resolveSourceUrl(input: SingleSiteCloneExecutorInput, sourceVersion: CanonicalSiteVersionSnapshot): string {
  return (
    metadataString(input, "sourceUrl") ??
    metadataString(input, "canonicalSourceUrl") ??
    `gnr8:single_site_migration:${input.migrationId}:source_site_version:${sourceVersion.id}`
  );
}

function cloneProvenanceFrom(summary: unknown): CloneProvenance | null {
  const candidate = record(summary).singleSiteCloneExecutor;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const value = candidate as Partial<CloneProvenance>;
  if (value.executorVersion !== SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION) return null;
  if (!text(value.operationKey) || !text(value.semanticOutputWatermark)) return null;
  return value as CloneProvenance;
}

function buildSemanticInput(input: {
  executorInput: SingleSiteCloneExecutorInput;
  sourceSiteVersion: CanonicalSiteVersionSnapshot;
  sourceArtifact: RuntimeArtifact | null;
  targetSiteVersionId: string;
}): SingleSiteJsonObject {
  return {
    executorVersion: SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION,
    migrationId: input.executorInput.migrationId,
    clientId: input.executorInput.clientId,
    siteId: input.executorInput.siteId,
    sourceEvidenceReviewId: input.executorInput.sourceEvidenceReviewId,
    acceptedWithLimitations: input.executorInput.acceptedWithLimitations,
    limitations: input.executorInput.limitations,
    sourceWatermark: input.executorInput.sourceWatermark,
    payloadHash: input.executorInput.payloadHash,
    sourceEvidencePackageRef: input.executorInput.sourceEvidencePackageRef ?? null,
    runtimeSiteId: input.sourceSiteVersion.siteId,
    sourceSiteVersionId: input.sourceSiteVersion.id,
    sourceSiteVersionArtifactId: input.sourceSiteVersion.artifactId,
    sourceArtifactId: input.sourceArtifact?.id ?? null,
    sourceArtifactBundleSha256: input.sourceArtifact?.bundleSha256 ?? null,
    sourcePageRefs: input.sourceSiteVersion.pages.map((page) => ({
      pageId: page.pageId,
      path: page.path,
      title: page.title,
      structureHash: sha256(page.structureModel),
      contentHash: sha256(page.contentModel),
      styleHash: sha256(page.styleTokens),
      assetHash: sha256(page.assetGraph),
      semanticHash: sha256(page.semanticSignals),
    })),
    targetSiteVersionId: input.targetSiteVersionId,
  };
}

function buildCloneProvenance(input: {
  operationKey: string;
  idempotencyKey: string;
  semanticOutputWatermark: string;
  executorInput: SingleSiteCloneExecutorInput;
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceArtifactId: string | null;
  targetSiteVersionId: string;
}): CloneProvenance {
  return {
    executorVersion: SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION,
    operationKey: input.operationKey,
    idempotencyKey: input.idempotencyKey,
    semanticOutputWatermark: input.semanticOutputWatermark,
    migrationRef: `gnr8:single_site_migration:${input.executorInput.migrationId}`,
    runtimeSiteRef: `gnr8:runtime_site:${input.runtimeSiteId}`,
    cloneSiteVersionRef: `gnr8:site_version:${input.targetSiteVersionId}`,
    sourceSiteVersionRef: `gnr8:site_version:${input.sourceSiteVersionId}`,
    sourceEvidenceReviewRef: `gnr8:source_evidence_review:${input.executorInput.sourceEvidenceReviewId}`,
    sourceRuntimeArtifactRef: input.sourceArtifactId ? `gnr8:runtime_artifact:${input.sourceArtifactId}` : null,
  };
}

function assertRequiredIdentity(input: SingleSiteCloneExecutorInput): void {
  required("migration_id", input.migrationId);
  required("client_id", input.clientId);
  required("site_id", input.siteId);
  required("source_evidence_review_id", input.sourceEvidenceReviewId);
  required("correlation_id", input.correlationId);
  required("idempotency_key", input.idempotencyKey);
  required("actor_type", input.actor?.actorType);
  required("actor_id", input.actor?.actorId);
  required("actor_role", input.actor?.actorRole);
}

function clonePages(sourceVersion: CanonicalSiteVersionSnapshot, actor: string) {
  return sourceVersion.pages.map((page) => ({
    pageId: page.pageId,
    path: page.path,
    title: page.title,
    structureModel: page.structureModel,
    contentModel: page.contentModel,
    styleTokens: page.styleTokens,
    assetGraph: page.assetGraph,
    semanticSignals: page.semanticSignals,
    migrationGovernance: page.migrationGovernance ?? null,
    source: "migration" as const,
    actor,
  }));
}

function result(input: {
  executorInput: SingleSiteCloneExecutorInput;
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  siteVersionId: string;
  artifactId: string;
  sourceArtifactId: string | null;
  operationKey: string;
  semanticOutputWatermark: string;
  reusedExisting: boolean;
  warnings: string[];
  limitations: unknown[];
}): SingleSiteCloneExecutorResult {
  const commonMetadata: SingleSiteJsonObject = {
    executorVersion: SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION,
    operationKey: input.operationKey,
    semanticOutputWatermark: input.semanticOutputWatermark,
    reusedExisting: input.reusedExisting,
  };
  return {
    status: input.warnings.length > 0 ? "completed_with_warnings" : "completed",
    siteVersionRef: ref({
      sourceRecordId: input.siteVersionId,
      refType: "runtime_site_version_clone",
      sourceTable: "gnr8_runtime_site_versions",
      sourceWatermark: input.semanticOutputWatermark,
      payloadHash: input.executorInput.payloadHash,
      metadataJson: {
        ...commonMetadata,
        canonicalRef: `gnr8:site_version:${input.siteVersionId}`,
        sourceSiteVersionRef: `gnr8:site_version:${input.sourceSiteVersionId}`,
      },
    }),
    runtimeArtifactRef: ref({
      sourceRecordId: input.artifactId,
      refType: "runtime_artifact_clone",
      sourceTable: "gnr8_runtime_artifacts",
      sourceWatermark: input.semanticOutputWatermark,
      payloadHash: input.executorInput.payloadHash,
      metadataJson: {
        ...commonMetadata,
        canonicalRef: `gnr8:runtime_artifact:${input.artifactId}`,
      },
    }),
    evidenceRefs: [
      ref({
        sourceRecordId: input.executorInput.sourceEvidenceReviewId,
        refType: "source_evidence_review",
        sourceTable: "gnr8_single_site_source_evidence_reviews",
        sourceWatermark: input.executorInput.sourceWatermark,
        payloadHash: input.executorInput.payloadHash,
        metadataJson: { canonicalRef: `gnr8:source_evidence_review:${input.executorInput.sourceEvidenceReviewId}` },
      }),
    ],
    sourceRefs: [
      ref({
        sourceRecordId: input.sourceSiteVersionId,
        refType: "runtime_site_version_source_import",
        sourceTable: "gnr8_runtime_site_versions",
        sourceWatermark: input.executorInput.sourceWatermark,
        payloadHash: input.executorInput.payloadHash,
        metadataJson: {
          canonicalRef: `gnr8:site_version:${input.sourceSiteVersionId}`,
          sourceRuntimeArtifactRef: input.sourceArtifactId ? `gnr8:runtime_artifact:${input.sourceArtifactId}` : null,
        },
      }),
    ],
    targetRefs: {
      runtimeSiteId: input.runtimeSiteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.artifactId,
    },
    limitations: input.limitations,
    warnings: input.warnings,
    watermarks: {
      operationKey: input.operationKey,
      semanticOutputWatermark: input.semanticOutputWatermark,
      executorVersion: SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION,
      migrationRef: `gnr8:single_site_migration:${input.executorInput.migrationId}`,
      runtimeSiteRef: `gnr8:runtime_site:${input.runtimeSiteId}`,
      siteVersionRef: `gnr8:site_version:${input.siteVersionId}`,
      runtimeArtifactRef: `gnr8:runtime_artifact:${input.artifactId}`,
      sourceEvidenceReviewRef: `gnr8:source_evidence_review:${input.executorInput.sourceEvidenceReviewId}`,
      reusedExisting: input.reusedExisting,
    },
    idempotencyKey: input.executorInput.idempotencyKey,
    operationKey: input.operationKey,
    semanticOutputWatermark: input.semanticOutputWatermark,
    reusedExisting: input.reusedExisting,
  };
}

export function createSingleSiteRealCloneExecutor(
  dependencies: SingleSiteRealCloneExecutorDependencies = {},
): SingleSiteCloneExecutor {
  const deps: SingleSiteCloneRuntimePrimitiveDeps = { ...defaultPrimitiveDeps, ...dependencies };

  return {
    async execute(input: SingleSiteCloneExecutorInput): Promise<SingleSiteCloneExecutorResult> {
      assertRequiredIdentity(input);

      const sourceSiteVersionId = resolveSourceSiteVersionId(input);
      const sourceVersion = await deps.getSiteVersion(sourceSiteVersionId);
      if (!sourceVersion) throw new SingleSiteTransitionError(`source runtime site version ${sourceSiteVersionId} was not found`, ["source_runtime_site_version"]);
      if (input.targetRefs.runtimeSiteId && input.targetRefs.runtimeSiteId !== sourceVersion.siteId) {
        throw new SingleSiteTransitionError("runtime_site_id does not match source runtime site version", ["runtime_site_id"]);
      }

      const sourceArtifact = sourceVersion.artifactId ? await deps.getArtifactById(sourceVersion.artifactId) : null;
      if (sourceVersion.artifactId && !sourceArtifact) {
        throw new SingleSiteTransitionError(`source runtime artifact ${sourceVersion.artifactId} was not found`, ["source_runtime_artifact"]);
      }

      const operationKey = `single-site-real-clone:${input.idempotencyKey}`;
      const targetSiteVersionId =
        text(input.targetRefs.siteVersionId) ??
        metadataString(input, "targetRuntimeSiteVersionId") ??
        metadataString(input, "targetSiteVersionId") ??
        deterministicUuid("single-site-clone-site-version", {
          operationKey,
          migrationId: input.migrationId,
          sourceEvidenceReviewId: input.sourceEvidenceReviewId,
          sourceSiteVersionId,
        });
      if (targetSiteVersionId === sourceSiteVersionId) {
        throw new SingleSiteTransitionError("clone target site version must be distinct from source site version", ["target_site_version_id"]);
      }

      const semanticOutputWatermark = `sha256:${sha256(buildSemanticInput({ executorInput: input, sourceSiteVersion: sourceVersion, sourceArtifact, targetSiteVersionId }))}`;
      const existingTarget = await deps.getSiteVersion(targetSiteVersionId);
      const existingProvenance = cloneProvenanceFrom(existingTarget?.importProvenanceSummary);
      if (existingTarget && !existingProvenance) {
        throw new SingleSiteIdempotencyConflictError("gnr8_runtime_site_versions", input.idempotencyKey, ["singleSiteCloneExecutor"]);
      }
      if (existingProvenance && existingProvenance.semanticOutputWatermark !== semanticOutputWatermark) {
        throw new SingleSiteIdempotencyConflictError("gnr8_runtime_site_versions", input.idempotencyKey, ["semanticOutputWatermark"]);
      }

      const cloneProvenance = buildCloneProvenance({
        operationKey,
        idempotencyKey: input.idempotencyKey,
        semanticOutputWatermark,
        executorInput: input,
        runtimeSiteId: sourceVersion.siteId,
        sourceSiteVersionId,
        sourceArtifactId: sourceArtifact?.id ?? null,
        targetSiteVersionId,
      });
      const warnings = input.acceptedWithLimitations
        ? ["source evidence accepted with limitations; clone output carries limitation context"]
        : [];
      const limitations = [...input.limitations];

      const cloneVersion = existingTarget
        ? { siteId: existingTarget.siteId, siteVersionId: existingTarget.id, versionNo: existingTarget.versionNo }
        : await deps.createSiteVersionFromMigration({
            siteId: sourceVersion.siteId,
            sourceUrl: resolveSourceUrl(input, sourceVersion),
            actor: `${input.actor.actorType}:${input.actor.actorId}:single-site-clone`,
            rendererCompatibilityVersion: sourceVersion.rendererCompatibilityVersion,
            importProvenanceSummary: {
              ...(sourceVersion.importProvenanceSummary ?? {}),
              singleSiteCloneExecutor: cloneProvenance,
              sourceImportProvenanceSummaryHash: sha256(sourceVersion.importProvenanceSummary ?? {}),
            } as CanonicalSiteVersionSnapshot["importProvenanceSummary"],
            pages: clonePages(sourceVersion, `${input.actor.actorType}:${input.actor.actorId}:single-site-clone`),
            siteVersionId: targetSiteVersionId,
          });

      const cloneVersionAfterWrite = existingTarget ?? await deps.getSiteVersion(cloneVersion.siteVersionId);
      if (!cloneVersionAfterWrite) {
        throw new SingleSiteTransitionError(`clone runtime site version ${cloneVersion.siteVersionId} could not be verified`, ["clone_runtime_site_version"]);
      }
      const cloneVersionProvenance = cloneProvenanceFrom(cloneVersionAfterWrite.importProvenanceSummary);
      if (!cloneVersionProvenance || cloneVersionProvenance.semanticOutputWatermark !== semanticOutputWatermark) {
        throw new SingleSiteIdempotencyConflictError("gnr8_runtime_site_versions", input.idempotencyKey, ["semanticOutputWatermark"]);
      }

      const artifactBundle = deps.buildDeterministicArtifactBundle({
        siteVersion: cloneVersionAfterWrite,
        renderMode: "PREVIEW",
      });
      const artifact = await deps.createArtifact({
        siteId: artifactBundle.siteId,
        siteVersionId: artifactBundle.siteVersionId,
        rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
        bundleSha256: artifactBundle.bundleSha256,
        htmlByPath: artifactBundle.htmlByPath,
        compiledTokenStyles: artifactBundle.compiledTokenStyles,
        assetFingerprintMap: artifactBundle.assetFingerprintMap,
        manifest: {
          ...artifactBundle.manifest,
          sourceKind: "single_site_real_clone_executor",
          singleSiteCloneExecutor: cloneProvenance,
        },
        publishStage: "shadow",
        shadowRestricted: false,
        artifactGovernance: {
          pageGateState: ["SINGLE_SITE_CLONE_READY_FOR_REVIEW"],
          pageRolloutPolicyState: ["SINGLE_SITE_CLONE_REVIEW_REQUIRED"],
          pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
          siteGateState: "SINGLE_SITE_CLONE_READY_FOR_REVIEW",
          siteRolloutPolicyState: "SINGLE_SITE_CLONE_REVIEW_REQUIRED",
          siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
          publishStage: "shadow",
        },
      });
      await deps.bindArtifactToVersion({
        siteVersionId: cloneVersion.siteVersionId,
        artifactId: artifact.artifactId,
        rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
      });

      return result({
        executorInput: input,
        runtimeSiteId: cloneVersion.siteId,
        sourceSiteVersionId,
        siteVersionId: cloneVersion.siteVersionId,
        artifactId: artifact.artifactId,
        sourceArtifactId: sourceArtifact?.id ?? null,
        operationKey,
        semanticOutputWatermark,
        reusedExisting: Boolean(existingTarget),
        warnings,
        limitations,
      });
    },
  };
}

export const singleSiteRealCloneExecutor = createSingleSiteRealCloneExecutor();
