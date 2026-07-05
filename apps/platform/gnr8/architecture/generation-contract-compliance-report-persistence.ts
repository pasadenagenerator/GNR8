/**
 * Phase MVP-1K-5 Generation Contract Compliance Report artifact persistence.
 *
 * Stores validated report artifacts in the existing site-version
 * import-provenance boundary. It adds no schema, UI/API, workers, provider
 * calls, AI execution, Business Approval, publishing, or runtime mutation.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION } from "./generation-contract-compliance-report-builder";
import {
  validateGenerationContractComplianceReport,
  type GenerationContractComplianceReportArtifact,
  type GenerationContractComplianceReportStatus,
  type GenerationContractComplianceReportValidationResult,
} from "./generation-contract-compliance-report-contract";

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND = "generation_contract_compliance_report" as const;

export type GenerationContractComplianceReportArtifactRecord = {
  kind: typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND;
  artifactKind: typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  generationContractComplianceReportId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceGenerationContractComplianceId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  status: GenerationContractComplianceReportStatus;
  recommendation: GenerationContractComplianceReportArtifact["recommendation"]["recommendation"];
  readiness: GenerationContractComplianceReportArtifact["generationReadiness"]["status"];
  categoryCount: number;
  deviationCount: number;
  missingRequirementCount: number;
  businessRiskCount: number;
  limitationCount: number;
  evidenceCount: number;
  contractVersion: string;
  runtimeVersion: typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: GenerationContractComplianceReportArtifact;
  validation: GenerationContractComplianceReportValidationResult;
  diagnostics: string[];
};

export type GenerationContractComplianceReportArtifactReference =
  Omit<GenerationContractComplianceReportArtifactRecord, "artifact">;

export type GenerationContractComplianceReportProvenanceSummary = RuntimeImportProvenanceSummary & {
  generationContractComplianceReportArtifacts?: GenerationContractComplianceReportArtifactRecord[];
  latestGenerationContractComplianceReportArtifact?: GenerationContractComplianceReportArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type GenerationContractComplianceReportPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class GenerationContractComplianceReportPersistenceValidationError extends Error {
  readonly validation: GenerationContractComplianceReportValidationResult;

  constructor(validation: GenerationContractComplianceReportValidationResult) {
    super("GenerationContractComplianceReportArtifact is invalid and was not persisted.");
    this.name = "GenerationContractComplianceReportPersistenceValidationError";
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
  validation: GenerationContractComplianceReportValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationContractComplianceReportArtifact;
}): GenerationContractComplianceReportValidationResult {
  const errors = [...input.validation.errors];
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
  if (input.artifact.sourceGenerationContractComplianceId !== input.artifact.lineage.sourceGenerationContractComplianceId) {
    errors.push("artifact.sourceGenerationContractComplianceId must match artifact.lineage.sourceGenerationContractComplianceId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(
  artifact: GenerationContractComplianceReportArtifact,
): Omit<GenerationContractComplianceReportArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: GenerationContractComplianceReportArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: GenerationContractComplianceReportArtifact;
  persistedAt: string;
}): string {
  return `generation_contract_compliance_report_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  record: GenerationContractComplianceReportArtifactRecord,
): GenerationContractComplianceReportArtifactReference {
  const { artifact: _artifact, ...reference } = record;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is GenerationContractComplianceReportArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<GenerationContractComplianceReportArtifactRecord>;
  if (record.kind !== GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND) return false;
  if (record.artifactKind !== GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "draft" &&
    record.status !== "partial" &&
    record.status !== "ready" &&
    record.status !== "blocked" &&
    record.status !== "invalid" &&
    record.status !== "stale"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateGenerationContractComplianceReport(record.artifact).valid) return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.generationContractComplianceReportId !== record.generationContractComplianceReportId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceGenerationContractComplianceId !== record.sourceGenerationContractComplianceId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.sourceObservedWebsiteModelId !== record.sourceObservedWebsiteModelId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): GenerationContractComplianceReportArtifactRecord[] {
  const provenance = summary as GenerationContractComplianceReportProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationContractComplianceReportArtifacts)
    ? provenance.generationContractComplianceReportArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const provenance = summary as GenerationContractComplianceReportProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationContractComplianceReportArtifacts)
    ? provenance.generationContractComplianceReportArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: GenerationContractComplianceReportArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): GenerationContractComplianceReportArtifactRecord | null {
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

export async function persistGenerationContractComplianceReport(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationContractComplianceReportArtifact;
  options?: GenerationContractComplianceReportPersistenceOptions;
}): Promise<GenerationContractComplianceReportArtifactReference> {
  const validation = mergeValidation({
    validation: validateGenerationContractComplianceReport(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new GenerationContractComplianceReportPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Generation Contract Compliance Report persistence: ${input.siteVersionId}`);
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
  const artifactRecord: GenerationContractComplianceReportArtifactRecord = {
    kind: GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND,
    artifactKind: GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    generationContractComplianceReportId: input.artifact.generationContractComplianceReportId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceGenerationContractComplianceId: input.artifact.sourceGenerationContractComplianceId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    sourceObservedWebsiteModelId: input.artifact.sourceObservedWebsiteModelId,
    status: input.artifact.status,
    recommendation: input.artifact.recommendation.recommendation,
    readiness: input.artifact.generationReadiness.status,
    categoryCount: input.artifact.categoryResults.length,
    deviationCount: input.artifact.deviations.length,
    missingRequirementCount: input.artifact.missingRequirements.length,
    businessRiskCount: input.artifact.businessRisks.length,
    limitationCount: input.artifact.limitations.items.length,
    evidenceCount: input.artifact.evidenceSummary.evidenceCount,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: GenerationContractComplianceReportProvenanceSummary = {
    ...existingSummary,
    generationContractComplianceReportArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as GenerationContractComplianceReportArtifactRecord[],
    latestGenerationContractComplianceReportArtifact: artifactRecord,
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
    throw new Error(`Generation Contract Compliance Report persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestGenerationContractComplianceReport(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: GenerationContractComplianceReportPersistenceOptions;
}): Promise<GenerationContractComplianceReportArtifactRecord | null> {
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

export async function loadGenerationContractComplianceReportById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: GenerationContractComplianceReportPersistenceOptions;
}): Promise<GenerationContractComplianceReportArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
