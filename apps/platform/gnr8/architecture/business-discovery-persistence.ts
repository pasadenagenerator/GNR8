/**
 * Phase MVP-1A Business Discovery artifact persistence.
 *
 * Stores validated Business Discovery artifacts in the existing site-version
 * import-provenance boundary. It does not build DBTs, generate output, call
 * providers, dispatch work, approve, deploy, or publish.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { BUSINESS_DISCOVERY_BUILDER_VERSION } from "./business-discovery-builder";
import {
  validateBusinessDiscoveryArtifact,
  type BusinessDiscoveryArtifact,
  type BusinessDiscoveryStatus,
  type BusinessDiscoveryValidationResult,
} from "./business-discovery-contract";

export const BUSINESS_DISCOVERY_ARTIFACT_KIND = "business_discovery" as const;

export type BusinessDiscoveryArtifactRecord = {
  kind: typeof BUSINESS_DISCOVERY_ARTIFACT_KIND;
  artifactKind: typeof BUSINESS_DISCOVERY_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  businessDiscoveryId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceSiteId?: string;
  sourceUrl?: string;
  status: Exclude<BusinessDiscoveryStatus, "invalid" | "stale">;
  findingCount: number;
  limitationCount: number;
  blockerCount: number;
  domainCount: number;
  contractVersion: string;
  builderVersion: typeof BUSINESS_DISCOVERY_BUILDER_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: BusinessDiscoveryArtifact;
  validation: BusinessDiscoveryValidationResult;
  diagnostics: string[];
};

export type BusinessDiscoveryArtifactReference = Omit<BusinessDiscoveryArtifactRecord, "artifact">;

export type BusinessDiscoveryProvenanceSummary = RuntimeImportProvenanceSummary & {
  businessDiscoveryArtifacts?: BusinessDiscoveryArtifactRecord[];
  latestBusinessDiscoveryArtifact?: BusinessDiscoveryArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type BusinessDiscoveryPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class BusinessDiscoveryPersistenceValidationError extends Error {
  readonly validation: BusinessDiscoveryValidationResult;

  constructor(validation: BusinessDiscoveryValidationResult) {
    super("BusinessDiscoveryArtifact is invalid and was not persisted.");
    this.name = "BusinessDiscoveryPersistenceValidationError";
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
  validation: BusinessDiscoveryValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: BusinessDiscoveryArtifact;
}): BusinessDiscoveryValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Business Discovery artifact status must not be invalid or stale for persistence");
  }
  if (input.artifact.siteVersionId !== input.siteVersionId) {
    errors.push("artifact.siteVersionId must match persisted siteVersionId");
  }
  if (input.artifact.dryRunId !== input.dryRunId) {
    errors.push("artifact.dryRunId must match persisted dryRunId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(artifact: BusinessDiscoveryArtifact): Omit<BusinessDiscoveryArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: BusinessDiscoveryArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    builderVersion: BUSINESS_DISCOVERY_BUILDER_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: BusinessDiscoveryArtifact;
  persistedAt: string;
}): string {
  return `business_discovery_${sha256Hex(stableStringify({
    artifact: input.artifact,
    builderVersion: BUSINESS_DISCOVERY_BUILDER_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  artifact: BusinessDiscoveryArtifactRecord,
): BusinessDiscoveryArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is BusinessDiscoveryArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<BusinessDiscoveryArtifactRecord>;
  if (record.kind !== BUSINESS_DISCOVERY_ARTIFACT_KIND) return false;
  if (record.artifactKind !== BUSINESS_DISCOVERY_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "observed" &&
    record.status !== "partial" &&
    record.status !== "valid" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateBusinessDiscoveryArtifact(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.businessDiscoveryId !== record.businessDiscoveryId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): BusinessDiscoveryArtifactRecord[] {
  const provenance = summary as BusinessDiscoveryProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.businessDiscoveryArtifacts)
    ? provenance.businessDiscoveryArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as BusinessDiscoveryProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.businessDiscoveryArtifacts)
    ? provenance.businessDiscoveryArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: BusinessDiscoveryArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): BusinessDiscoveryArtifactRecord | null {
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

export async function persistBusinessDiscoveryArtifact(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: BusinessDiscoveryArtifact;
  options?: BusinessDiscoveryPersistenceOptions;
}): Promise<BusinessDiscoveryArtifactReference> {
  const validation = mergeValidation({
    validation: validateBusinessDiscoveryArtifact(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new BusinessDiscoveryPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Business Discovery persistence: ${input.siteVersionId}`);
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
  const artifactRecord: BusinessDiscoveryArtifactRecord = {
    kind: BUSINESS_DISCOVERY_ARTIFACT_KIND,
    artifactKind: BUSINESS_DISCOVERY_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    businessDiscoveryId: input.artifact.businessDiscoveryId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    ...(input.artifact.sourceSiteId ? { sourceSiteId: input.artifact.sourceSiteId } : {}),
    ...(input.artifact.sourceUrl ? { sourceUrl: input.artifact.sourceUrl } : {}),
    status: input.artifact.status as BusinessDiscoveryArtifactRecord["status"],
    findingCount: input.artifact.findings.length,
    limitationCount: input.artifact.limitations.length,
    blockerCount: input.artifact.limitations.filter((item) => item.severity === "blocker").length,
    domainCount: input.artifact.domainSummaries.length,
    contractVersion: input.artifact.contractVersion,
    builderVersion: BUSINESS_DISCOVERY_BUILDER_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["BUSINESS_DISCOVERY_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: BusinessDiscoveryProvenanceSummary = {
    ...existingSummary,
    businessDiscoveryArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as BusinessDiscoveryArtifactRecord[],
    latestBusinessDiscoveryArtifact: artifactRecord,
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
    throw new Error(`Business Discovery persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestBusinessDiscoveryArtifact(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: BusinessDiscoveryPersistenceOptions;
}): Promise<BusinessDiscoveryArtifactRecord | null> {
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

export async function loadBusinessDiscoveryArtifactById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: BusinessDiscoveryPersistenceOptions;
}): Promise<BusinessDiscoveryArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
