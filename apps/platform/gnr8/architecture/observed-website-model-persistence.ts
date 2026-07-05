/**
 * Phase MVP-1K-3 Observed Website Model artifact persistence.
 *
 * Stores validated observation artifacts in the existing site-version
 * import-provenance boundary. It adds no schema, provider calls, AI execution,
 * generated code execution, rendering, compliance, approval, publishing, UI,
 * API, worker, DNS, deployment, or production mutation behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION } from "./observed-website-model-builder";
import {
  validateObservedWebsiteModel,
  type ObservedWebsiteModelArtifact,
  type ObservedWebsiteStatus,
  type ObservedWebsiteValidationResult,
} from "./observed-website-model-contract";

export const OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND = "observed_website_model" as const;

export type ObservedWebsiteModelArtifactRecord = {
  kind: typeof OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND;
  artifactKind: typeof OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  observedWebsiteModelId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceGeneratedWebsiteProposalId: string;
  sourceGeneratedWebsiteProposalArtifactId?: string;
  sourceProviderGenerationPayloadId: string;
  sourceWebsiteGenerationPackageId: string;
  outputBundleId: string;
  status: Exclude<ObservedWebsiteStatus, "invalid" | "stale">;
  pageCount: number;
  navigationCount: number;
  sectionCount: number;
  messageCount: number;
  assetCount: number;
  constraintCount: number;
  technicalSignalCount: number;
  limitationCount: number;
  contractVersion: string;
  runtimeVersion: typeof OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: ObservedWebsiteModelArtifact;
  validation: ObservedWebsiteValidationResult;
  diagnostics: string[];
};

export type ObservedWebsiteModelArtifactReference = Omit<ObservedWebsiteModelArtifactRecord, "artifact">;

export type ObservedWebsiteModelProvenanceSummary = RuntimeImportProvenanceSummary & {
  observedWebsiteModelArtifacts?: ObservedWebsiteModelArtifactRecord[];
  latestObservedWebsiteModelArtifact?: ObservedWebsiteModelArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type ObservedWebsiteModelPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class ObservedWebsiteModelPersistenceValidationError extends Error {
  readonly validation: ObservedWebsiteValidationResult;

  constructor(validation: ObservedWebsiteValidationResult) {
    super("ObservedWebsiteModelArtifact is invalid and was not persisted.");
    this.name = "ObservedWebsiteModelPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeValidation(input: {
  validation: ObservedWebsiteValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: ObservedWebsiteModelArtifact;
}): ObservedWebsiteValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Observed Website Model status must not be invalid or stale for persistence");
  }
  if (input.artifact.siteVersionId !== input.siteVersionId) {
    errors.push("artifact.siteVersionId must match persisted siteVersionId");
  }
  if (input.artifact.dryRunId !== input.dryRunId) {
    errors.push("artifact.dryRunId must match persisted dryRunId");
  }
  if (input.artifact.lineage.siteVersionId !== input.siteVersionId) {
    errors.push("artifact.lineage.siteVersionId must match persisted siteVersionId");
  }
  if (input.artifact.lineage.dryRunId !== input.dryRunId) {
    errors.push("artifact.lineage.dryRunId must match persisted dryRunId");
  }
  if (input.artifact.sourceGeneratedWebsiteProposalId !== input.artifact.lineage.sourceGeneratedWebsiteProposalId) {
    errors.push("artifact.sourceGeneratedWebsiteProposalId must match artifact.lineage.sourceGeneratedWebsiteProposalId");
  }
  if (input.artifact.sourceProviderGenerationPayloadId !== input.artifact.lineage.sourceProviderGenerationPayloadId) {
    errors.push("artifact.sourceProviderGenerationPayloadId must match artifact.lineage.sourceProviderGenerationPayloadId");
  }
  if (input.artifact.sourceWebsiteGenerationPackageId !== input.artifact.lineage.sourceWebsiteGenerationPackageId) {
    errors.push("artifact.sourceWebsiteGenerationPackageId must match artifact.lineage.sourceWebsiteGenerationPackageId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(
  artifact: ObservedWebsiteModelArtifact,
): Omit<ObservedWebsiteModelArtifact, "createdAt" | "lineage"> & {
  lineage: Omit<ObservedWebsiteModelArtifact["lineage"], "observedAt">;
} {
  const { createdAt: _createdAt, lineage, ...semantic } = artifact;
  const { observedAt: _observedAt, ...semanticLineage } = lineage;
  return {
    ...semantic,
    lineage: semanticLineage,
  };
}

function semanticFingerprint(artifact: ObservedWebsiteModelArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: ObservedWebsiteModelArtifact;
  persistedAt: string;
}): string {
  return `observed_website_model_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(artifact: ObservedWebsiteModelArtifactRecord): ObservedWebsiteModelArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is ObservedWebsiteModelArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<ObservedWebsiteModelArtifactRecord>;
  if (record.kind !== OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND) return false;
  if (record.artifactKind !== OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "not_observable" &&
    record.status !== "partially_observable" &&
    record.status !== "observable" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateObservedWebsiteModel(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.observedWebsiteModelId !== record.observedWebsiteModelId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceGeneratedWebsiteProposalId !== record.sourceGeneratedWebsiteProposalId) return false;
  if (record.artifact.lineage.sourceGeneratedWebsiteProposalArtifactId !== record.sourceGeneratedWebsiteProposalArtifactId) {
    return false;
  }
  if (record.artifact.sourceProviderGenerationPayloadId !== record.sourceProviderGenerationPayloadId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.lineage.outputBundleId !== record.outputBundleId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): ObservedWebsiteModelArtifactRecord[] {
  const provenance = summary as ObservedWebsiteModelProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.observedWebsiteModelArtifacts)
    ? provenance.observedWebsiteModelArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as ObservedWebsiteModelProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.observedWebsiteModelArtifacts)
    ? provenance.observedWebsiteModelArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: ObservedWebsiteModelArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): ObservedWebsiteModelArtifactRecord | null {
  return input.artifacts
    .filter((artifact) =>
      artifact.siteVersionId === input.siteVersionId &&
      (input.dryRunId === undefined || artifact.dryRunId === input.dryRunId))
    .slice()
    .sort((left, right) =>
      left.persistedAt.localeCompare(right.persistedAt) ||
      left.artifactId.localeCompare(right.artifactId))
    .at(-1) ?? null;
}

async function defaultGetSiteVersion(
  siteVersionId: string,
  options: RuntimeStoreDbOptions,
): Promise<PersistenceSiteVersion | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultSetSiteVersionImportProvenanceSummary(
  input: { siteVersionId: string; importProvenanceSummary: RuntimeImportProvenanceSummary },
  options: RuntimeStoreDbOptions,
): Promise<{ affectedRows: number }> {
  const { setSiteVersionImportProvenanceSummary } = await import("../runtime/runtime-store");
  return setSiteVersionImportProvenanceSummary(input, options);
}

export async function persistObservedWebsiteModel(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: ObservedWebsiteModelArtifact;
  options?: ObservedWebsiteModelPersistenceOptions;
}): Promise<ObservedWebsiteModelArtifactReference> {
  const validation = mergeValidation({
    validation: validateObservedWebsiteModel(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new ObservedWebsiteModelPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Observed Website Model persistence: ${input.siteVersionId}`);
  }

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latest = selectLatestArtifact({
    artifacts: previousArtifacts,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });
  const fingerprint = semanticFingerprint(input.artifact);
  if (latest && semanticFingerprint(latest.artifact) === fingerprint) {
    return toArtifactReference(latest);
  }

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifactRecord: ObservedWebsiteModelArtifactRecord = {
    kind: OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND,
    artifactKind: OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    observedWebsiteModelId: input.artifact.observedWebsiteModelId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceGeneratedWebsiteProposalId: input.artifact.sourceGeneratedWebsiteProposalId,
    sourceGeneratedWebsiteProposalArtifactId: input.artifact.lineage.sourceGeneratedWebsiteProposalArtifactId,
    sourceProviderGenerationPayloadId: input.artifact.sourceProviderGenerationPayloadId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    outputBundleId: input.artifact.lineage.outputBundleId,
    status: input.artifact.status as ObservedWebsiteModelArtifactRecord["status"],
    pageCount: input.artifact.pages.length,
    navigationCount: input.artifact.navigation.length,
    sectionCount: input.artifact.sections.length,
    messageCount: input.artifact.messages.length,
    assetCount: input.artifact.assets.length,
    constraintCount: input.artifact.constraints.length,
    technicalSignalCount: input.artifact.technicalSignals.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["OBSERVED_WEBSITE_MODEL_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: ObservedWebsiteModelProvenanceSummary = {
    ...existingSummary,
    observedWebsiteModelArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as ObservedWebsiteModelArtifactRecord[],
    latestObservedWebsiteModelArtifact: artifactRecord,
  };

  const write = options.setSiteVersionImportProvenanceSummary
    ? await options.setSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      })
    : await defaultSetSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      }, options);
  if (write.affectedRows <= 0) {
    throw new Error(`Observed Website Model persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestObservedWebsiteModel(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: ObservedWebsiteModelPersistenceOptions;
}): Promise<ObservedWebsiteModelArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = selectLatestArtifact({
    artifacts: readArtifacts(siteVersion.importProvenanceSummary),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });
  return artifact ? cloneJson(artifact) : null;
}

export async function loadObservedWebsiteModelById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: ObservedWebsiteModelPersistenceOptions;
}): Promise<ObservedWebsiteModelArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
