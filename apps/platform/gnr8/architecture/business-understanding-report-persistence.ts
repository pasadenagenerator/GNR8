/**
 * Phase MVP-1C Business Understanding Report artifact persistence.
 *
 * Stores validated BUR artifacts in the existing site-version import
 * provenance boundary. It does not add schema, call providers, generate,
 * approve, deploy, publish, expose UI, or expose API behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION } from "./business-understanding-report-builder";
import {
  validateBusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportStatus,
  type BusinessUnderstandingReportValidationResult,
} from "./business-understanding-report-contract";

export const BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND = "business_understanding_report" as const;

export type BusinessUnderstandingReportArtifactRecord = {
  kind: typeof BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND;
  artifactKind: typeof BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  businessUnderstandingReportId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceDigitalBusinessTwinArtifactId: string;
  status: Exclude<BusinessUnderstandingReportStatus, "invalid" | "stale">;
  sectionCount: number;
  recommendationCount: number;
  limitationCount: number;
  contractVersion: string;
  builderVersion: typeof BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: BusinessUnderstandingReportArtifact;
  validation: BusinessUnderstandingReportValidationResult;
  diagnostics: string[];
};

export type BusinessUnderstandingReportArtifactReference = Omit<BusinessUnderstandingReportArtifactRecord, "artifact">;

export type BusinessUnderstandingReportProvenanceSummary = RuntimeImportProvenanceSummary & {
  businessUnderstandingReportArtifacts?: BusinessUnderstandingReportArtifactRecord[];
  latestBusinessUnderstandingReportArtifact?: BusinessUnderstandingReportArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type BusinessUnderstandingReportPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class BusinessUnderstandingReportPersistenceValidationError extends Error {
  readonly validation: BusinessUnderstandingReportValidationResult;

  constructor(validation: BusinessUnderstandingReportValidationResult) {
    super("BusinessUnderstandingReportArtifact is invalid and was not persisted.");
    this.name = "BusinessUnderstandingReportPersistenceValidationError";
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
  validation: BusinessUnderstandingReportValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: BusinessUnderstandingReportArtifact;
}): BusinessUnderstandingReportValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Business Understanding Report artifact status must not be invalid or stale for persistence");
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

function semanticArtifact(
  artifact: BusinessUnderstandingReportArtifact,
): Omit<BusinessUnderstandingReportArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: BusinessUnderstandingReportArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    builderVersion: BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: BusinessUnderstandingReportArtifact;
  persistedAt: string;
}): string {
  return `business_understanding_report_${sha256Hex(stableStringify({
    artifact: input.artifact,
    builderVersion: BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  artifact: BusinessUnderstandingReportArtifactRecord,
): BusinessUnderstandingReportArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is BusinessUnderstandingReportArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<BusinessUnderstandingReportArtifactRecord>;
  if (record.kind !== BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND) return false;
  if (record.artifactKind !== BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "draft" &&
    record.status !== "partial" &&
    record.status !== "valid" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateBusinessUnderstandingReportArtifact(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.businessUnderstandingReportId !== record.businessUnderstandingReportId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceDigitalBusinessTwinArtifactId !== record.sourceDigitalBusinessTwinArtifactId) {
    return false;
  }
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): BusinessUnderstandingReportArtifactRecord[] {
  const provenance = summary as BusinessUnderstandingReportProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.businessUnderstandingReportArtifacts)
    ? provenance.businessUnderstandingReportArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as BusinessUnderstandingReportProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.businessUnderstandingReportArtifacts)
    ? provenance.businessUnderstandingReportArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: BusinessUnderstandingReportArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): BusinessUnderstandingReportArtifactRecord | null {
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

export async function persistBusinessUnderstandingReportArtifact(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: BusinessUnderstandingReportArtifact;
  options?: BusinessUnderstandingReportPersistenceOptions;
}): Promise<BusinessUnderstandingReportArtifactReference> {
  const validation = mergeValidation({
    validation: validateBusinessUnderstandingReportArtifact(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new BusinessUnderstandingReportPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Business Understanding Report persistence: ${input.siteVersionId}`);
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
  const artifactRecord: BusinessUnderstandingReportArtifactRecord = {
    kind: BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND,
    artifactKind: BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    businessUnderstandingReportId: input.artifact.businessUnderstandingReportId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceDigitalBusinessTwinArtifactId: input.artifact.sourceDigitalBusinessTwinArtifactId,
    status: input.artifact.status as BusinessUnderstandingReportArtifactRecord["status"],
    sectionCount: input.artifact.sections.length,
    recommendationCount: input.artifact.recommendations.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    builderVersion: BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: BusinessUnderstandingReportProvenanceSummary = {
    ...existingSummary,
    businessUnderstandingReportArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as BusinessUnderstandingReportArtifactRecord[],
    latestBusinessUnderstandingReportArtifact: artifactRecord,
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
    throw new Error(`Business Understanding Report persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestBusinessUnderstandingReportArtifact(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: BusinessUnderstandingReportPersistenceOptions;
}): Promise<BusinessUnderstandingReportArtifactRecord | null> {
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

export async function loadBusinessUnderstandingReportArtifactById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: BusinessUnderstandingReportPersistenceOptions;
}): Promise<BusinessUnderstandingReportArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
