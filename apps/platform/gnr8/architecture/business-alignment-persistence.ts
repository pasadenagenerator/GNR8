/**
 * Phase MVP-1D Business Alignment artifact persistence.
 *
 * Stores validated Business Alignment artifacts in the existing site-version
 * import-provenance boundary. It does not add schema, call providers,
 * generate, approve, deploy, publish, expose UI, or expose API behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  validateBusinessAlignment,
  type BusinessAlignmentArtifact,
  type BusinessAlignmentStatus,
  type BusinessAlignmentValidationResult,
} from "./business-alignment-contract";
import { BUSINESS_ALIGNMENT_RUNTIME_VERSION } from "./business-alignment-runtime";

export const BUSINESS_ALIGNMENT_ARTIFACT_KIND = "business_alignment" as const;

export type BusinessAlignmentArtifactRecord = {
  kind: typeof BUSINESS_ALIGNMENT_ARTIFACT_KIND;
  artifactKind: typeof BUSINESS_ALIGNMENT_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  businessAlignmentId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceBusinessUnderstandingReportId: string;
  sourceDigitalBusinessTwinId: string;
  outputDigitalBusinessTwinId: string;
  status: Exclude<BusinessAlignmentStatus, "invalid" | "stale">;
  decisionCount: number;
  correctionCount: number;
  limitationCount: number;
  contractVersion: string;
  runtimeVersion: typeof BUSINESS_ALIGNMENT_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: BusinessAlignmentArtifact;
  validation: BusinessAlignmentValidationResult;
  diagnostics: string[];
};

export type BusinessAlignmentArtifactReference = Omit<BusinessAlignmentArtifactRecord, "artifact">;

export type BusinessAlignmentProvenanceSummary = RuntimeImportProvenanceSummary & {
  businessAlignmentArtifacts?: BusinessAlignmentArtifactRecord[];
  latestBusinessAlignmentArtifact?: BusinessAlignmentArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type BusinessAlignmentPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class BusinessAlignmentPersistenceValidationError extends Error {
  readonly validation: BusinessAlignmentValidationResult;

  constructor(validation: BusinessAlignmentValidationResult) {
    super("BusinessAlignmentArtifact is invalid and was not persisted.");
    this.name = "BusinessAlignmentPersistenceValidationError";
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
  validation: BusinessAlignmentValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: BusinessAlignmentArtifact;
}): BusinessAlignmentValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Business Alignment artifact status must not be invalid or stale for persistence");
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
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(artifact: BusinessAlignmentArtifact): Omit<BusinessAlignmentArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: BusinessAlignmentArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: BUSINESS_ALIGNMENT_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: BusinessAlignmentArtifact;
  persistedAt: string;
}): string {
  return `business_alignment_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: BUSINESS_ALIGNMENT_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(artifact: BusinessAlignmentArtifactRecord): BusinessAlignmentArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is BusinessAlignmentArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<BusinessAlignmentArtifactRecord>;
  if (record.kind !== BUSINESS_ALIGNMENT_ARTIFACT_KIND) return false;
  if (record.artifactKind !== BUSINESS_ALIGNMENT_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "draft" &&
    record.status !== "reviewed" &&
    record.status !== "applied" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateBusinessAlignment(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.businessAlignmentId !== record.businessAlignmentId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceBusinessUnderstandingReportId !== record.sourceBusinessUnderstandingReportId) return false;
  if (record.artifact.sourceDigitalBusinessTwinId !== record.sourceDigitalBusinessTwinId) return false;
  if (record.artifact.lineage.outputDigitalBusinessTwinId !== record.outputDigitalBusinessTwinId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): BusinessAlignmentArtifactRecord[] {
  const provenance = summary as BusinessAlignmentProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.businessAlignmentArtifacts)
    ? provenance.businessAlignmentArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as BusinessAlignmentProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.businessAlignmentArtifacts)
    ? provenance.businessAlignmentArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: BusinessAlignmentArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): BusinessAlignmentArtifactRecord | null {
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

export async function persistBusinessAlignment(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: BusinessAlignmentArtifact;
  options?: BusinessAlignmentPersistenceOptions;
}): Promise<BusinessAlignmentArtifactReference> {
  const validation = mergeValidation({
    validation: validateBusinessAlignment(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new BusinessAlignmentPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Business Alignment persistence: ${input.siteVersionId}`);
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
  const artifactRecord: BusinessAlignmentArtifactRecord = {
    kind: BUSINESS_ALIGNMENT_ARTIFACT_KIND,
    artifactKind: BUSINESS_ALIGNMENT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    businessAlignmentId: input.artifact.businessAlignmentId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceBusinessUnderstandingReportId: input.artifact.sourceBusinessUnderstandingReportId,
    sourceDigitalBusinessTwinId: input.artifact.sourceDigitalBusinessTwinId,
    outputDigitalBusinessTwinId: input.artifact.lineage.outputDigitalBusinessTwinId,
    status: input.artifact.status as BusinessAlignmentArtifactRecord["status"],
    decisionCount: input.artifact.decisions.length,
    correctionCount: input.artifact.corrections.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: BUSINESS_ALIGNMENT_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["BUSINESS_ALIGNMENT_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: BusinessAlignmentProvenanceSummary = {
    ...existingSummary,
    businessAlignmentArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as BusinessAlignmentArtifactRecord[],
    latestBusinessAlignmentArtifact: artifactRecord,
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
    throw new Error(`Business Alignment persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestBusinessAlignment(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: BusinessAlignmentPersistenceOptions;
}): Promise<BusinessAlignmentArtifactRecord | null> {
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

export async function loadBusinessAlignmentById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: BusinessAlignmentPersistenceOptions;
}): Promise<BusinessAlignmentArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
