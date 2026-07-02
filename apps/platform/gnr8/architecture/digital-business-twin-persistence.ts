/**
 * Phase MVP-1B Digital Business Twin artifact persistence.
 *
 * Stores validated DBT artifacts in the existing site-version
 * import-provenance boundary. It does not add schema, call providers, generate,
 * approve, deploy, publish, expose UI, or expose API behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { DIGITAL_BUSINESS_TWIN_BUILDER_VERSION } from "./digital-business-twin-builder";
import {
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinStatus,
  type DigitalBusinessTwinValidationResult,
} from "./digital-business-twin-contract";

export const DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND = "digital_business_twin" as const;

export type DigitalBusinessTwinArtifactRecord = {
  kind: typeof DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND;
  artifactKind: typeof DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  digitalBusinessTwinId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceBusinessDiscoveryArtifactId: string;
  status: Exclude<DigitalBusinessTwinStatus, "invalid" | "stale">;
  domainCount: number;
  knowledgeItemCount: number;
  missingKnowledgeCount: number;
  limitationCount: number;
  contractVersion: string;
  builderVersion: typeof DIGITAL_BUSINESS_TWIN_BUILDER_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: DigitalBusinessTwinArtifact;
  validation: DigitalBusinessTwinValidationResult;
  diagnostics: string[];
};

export type DigitalBusinessTwinArtifactReference = Omit<DigitalBusinessTwinArtifactRecord, "artifact">;

export type DigitalBusinessTwinProvenanceSummary = RuntimeImportProvenanceSummary & {
  digitalBusinessTwinArtifacts?: DigitalBusinessTwinArtifactRecord[];
  latestDigitalBusinessTwinArtifact?: DigitalBusinessTwinArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type DigitalBusinessTwinPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class DigitalBusinessTwinPersistenceValidationError extends Error {
  readonly validation: DigitalBusinessTwinValidationResult;

  constructor(validation: DigitalBusinessTwinValidationResult) {
    super("DigitalBusinessTwinArtifact is invalid and was not persisted.");
    this.name = "DigitalBusinessTwinPersistenceValidationError";
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
  validation: DigitalBusinessTwinValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: DigitalBusinessTwinArtifact;
}): DigitalBusinessTwinValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Digital Business Twin artifact status must not be invalid or stale for persistence");
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

function semanticArtifact(artifact: DigitalBusinessTwinArtifact): Omit<DigitalBusinessTwinArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: DigitalBusinessTwinArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    builderVersion: DIGITAL_BUSINESS_TWIN_BUILDER_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: DigitalBusinessTwinArtifact;
  persistedAt: string;
}): string {
  return `digital_business_twin_${sha256Hex(stableStringify({
    artifact: input.artifact,
    builderVersion: DIGITAL_BUSINESS_TWIN_BUILDER_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  artifact: DigitalBusinessTwinArtifactRecord,
): DigitalBusinessTwinArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is DigitalBusinessTwinArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<DigitalBusinessTwinArtifactRecord>;
  if (record.kind !== DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND) return false;
  if (record.artifactKind !== DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "observed" &&
    record.status !== "partial" &&
    record.status !== "aligned" &&
    record.status !== "confirmed" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateDigitalBusinessTwinArtifact(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.digitalBusinessTwinId !== record.digitalBusinessTwinId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceBusinessDiscoveryArtifactId !== record.sourceBusinessDiscoveryArtifactId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): DigitalBusinessTwinArtifactRecord[] {
  const provenance = summary as DigitalBusinessTwinProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.digitalBusinessTwinArtifacts)
    ? provenance.digitalBusinessTwinArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as DigitalBusinessTwinProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.digitalBusinessTwinArtifacts)
    ? provenance.digitalBusinessTwinArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: DigitalBusinessTwinArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): DigitalBusinessTwinArtifactRecord | null {
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

export async function persistDigitalBusinessTwinArtifact(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: DigitalBusinessTwinArtifact;
  options?: DigitalBusinessTwinPersistenceOptions;
}): Promise<DigitalBusinessTwinArtifactReference> {
  const validation = mergeValidation({
    validation: validateDigitalBusinessTwinArtifact(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new DigitalBusinessTwinPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Digital Business Twin persistence: ${input.siteVersionId}`);
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
  const artifactRecord: DigitalBusinessTwinArtifactRecord = {
    kind: DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND,
    artifactKind: DIGITAL_BUSINESS_TWIN_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    digitalBusinessTwinId: input.artifact.digitalBusinessTwinId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceBusinessDiscoveryArtifactId: input.artifact.sourceBusinessDiscoveryArtifactId,
    status: input.artifact.status as DigitalBusinessTwinArtifactRecord["status"],
    domainCount: input.artifact.domains.length,
    knowledgeItemCount: input.artifact.knowledgeItems.length,
    missingKnowledgeCount: input.artifact.missingKnowledge.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    builderVersion: DIGITAL_BUSINESS_TWIN_BUILDER_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["DIGITAL_BUSINESS_TWIN_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: DigitalBusinessTwinProvenanceSummary = {
    ...existingSummary,
    digitalBusinessTwinArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as DigitalBusinessTwinArtifactRecord[],
    latestDigitalBusinessTwinArtifact: artifactRecord,
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
    throw new Error(`Digital Business Twin persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestDigitalBusinessTwinArtifact(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: DigitalBusinessTwinPersistenceOptions;
}): Promise<DigitalBusinessTwinArtifactRecord | null> {
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

export async function loadDigitalBusinessTwinArtifactById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: DigitalBusinessTwinPersistenceOptions;
}): Promise<DigitalBusinessTwinArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
