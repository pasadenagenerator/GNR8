/**
 * Phase MVP-1K-4 Generation Contract Compliance artifact persistence.
 *
 * Stores validated compliance artifacts in the existing site-version
 * import-provenance boundary. It adds no schema, report generation, approval,
 * publishing, provider calls, UI, API, workers, or runtime mutation behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION } from "./generation-contract-compliance-builder";
import {
  validateGenerationContractCompliance,
  type ComplianceValidationResult,
  type GenerationContractComplianceArtifact,
  type GenerationContractComplianceStatus,
} from "./generation-contract-compliance-contract";

export const GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND = "generation_contract_compliance" as const;

export type GenerationContractComplianceArtifactRecord = {
  kind: typeof GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND;
  artifactKind: typeof GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  generationContractComplianceId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  status: Exclude<GenerationContractComplianceStatus, "invalid" | "stale">;
  categoryCount: number;
  findingCount: number;
  deviationCount: number;
  evidenceCount: number;
  limitationCount: number;
  contractVersion: string;
  runtimeVersion: typeof GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: GenerationContractComplianceArtifact;
  validation: ComplianceValidationResult;
  diagnostics: string[];
};

export type GenerationContractComplianceArtifactReference = Omit<GenerationContractComplianceArtifactRecord, "artifact">;

export type GenerationContractComplianceProvenanceSummary = RuntimeImportProvenanceSummary & {
  generationContractComplianceArtifacts?: GenerationContractComplianceArtifactRecord[];
  latestGenerationContractComplianceArtifact?: GenerationContractComplianceArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type GenerationContractCompliancePersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class GenerationContractCompliancePersistenceValidationError extends Error {
  readonly validation: ComplianceValidationResult;

  constructor(validation: ComplianceValidationResult) {
    super("GenerationContractComplianceArtifact is invalid and was not persisted.");
    this.name = "GenerationContractCompliancePersistenceValidationError";
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
  validation: ComplianceValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationContractComplianceArtifact;
}): ComplianceValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Generation Contract Compliance artifact status must not be invalid or stale for persistence");
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
  if (input.artifact.sourceWebsiteGenerationPackageId !== input.artifact.lineage.sourceWebsiteGenerationPackageId) {
    errors.push("artifact.sourceWebsiteGenerationPackageId must match artifact.lineage.sourceWebsiteGenerationPackageId");
  }
  if (input.artifact.sourceObservedWebsiteModelId !== input.artifact.lineage.sourceObservedWebsiteModelId) {
    errors.push("artifact.sourceObservedWebsiteModelId must match artifact.lineage.sourceObservedWebsiteModelId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(
  artifact: GenerationContractComplianceArtifact,
): Omit<GenerationContractComplianceArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: GenerationContractComplianceArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: GenerationContractComplianceArtifact;
  persistedAt: string;
}): string {
  return `generation_contract_compliance_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  record: GenerationContractComplianceArtifactRecord,
): GenerationContractComplianceArtifactReference {
  const { artifact: _artifact, ...reference } = record;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is GenerationContractComplianceArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<GenerationContractComplianceArtifactRecord>;
  if (record.kind !== GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND) return false;
  if (record.artifactKind !== GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "incomplete" &&
    record.status !== "partial" &&
    record.status !== "compliant" &&
    record.status !== "non_compliant" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateGenerationContractCompliance(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.generationContractComplianceId !== record.generationContractComplianceId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.sourceObservedWebsiteModelId !== record.sourceObservedWebsiteModelId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): GenerationContractComplianceArtifactRecord[] {
  const provenance = summary as GenerationContractComplianceProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationContractComplianceArtifacts)
    ? provenance.generationContractComplianceArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const provenance = summary as GenerationContractComplianceProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationContractComplianceArtifacts)
    ? provenance.generationContractComplianceArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: GenerationContractComplianceArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): GenerationContractComplianceArtifactRecord | null {
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

export async function persistGenerationContractCompliance(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationContractComplianceArtifact;
  options?: GenerationContractCompliancePersistenceOptions;
}): Promise<GenerationContractComplianceArtifactReference> {
  const validation = mergeValidation({
    validation: validateGenerationContractCompliance(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new GenerationContractCompliancePersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Generation Contract Compliance persistence: ${input.siteVersionId}`);
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
  const artifactRecord: GenerationContractComplianceArtifactRecord = {
    kind: GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND,
    artifactKind: GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    generationContractComplianceId: input.artifact.generationContractComplianceId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    sourceObservedWebsiteModelId: input.artifact.sourceObservedWebsiteModelId,
    status: input.artifact.status as GenerationContractComplianceArtifactRecord["status"],
    categoryCount: input.artifact.categoryResults.length,
    findingCount: input.artifact.findings.length,
    deviationCount: input.artifact.deviations.length,
    evidenceCount: input.artifact.evidence.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: GenerationContractComplianceProvenanceSummary = {
    ...existingSummary,
    generationContractComplianceArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as GenerationContractComplianceArtifactRecord[],
    latestGenerationContractComplianceArtifact: artifactRecord,
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
    throw new Error(`Generation Contract Compliance persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestGenerationContractCompliance(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: GenerationContractCompliancePersistenceOptions;
}): Promise<GenerationContractComplianceArtifactRecord | null> {
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

export async function loadGenerationContractComplianceById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: GenerationContractCompliancePersistenceOptions;
}): Promise<GenerationContractComplianceArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
