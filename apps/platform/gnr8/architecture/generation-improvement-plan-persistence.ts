/**
 * Phase MVP-2.0-F Generation Improvement Plan artifact persistence.
 *
 * Stores validated improvement plans in the existing site-version
 * import-provenance boundary. It adds no schema, UI/API, workers, provider
 * payloads, provider calls, AI execution, regeneration, approval, or publishing.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION } from "./generation-improvement-plan-builder";
import {
  validateGenerationImprovementPlan,
  type GenerationImprovementPlanArtifact,
  type GenerationImprovementStatus,
  type GenerationImprovementValidationResult,
} from "./generation-improvement-plan-contract";

export const GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND = "generation_improvement_plan" as const;

export type GenerationImprovementPlanPersistableStatus = Exclude<GenerationImprovementStatus, "invalid" | "stale">;

export type GenerationImprovementPlanArtifactRecord = {
  kind: typeof GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND;
  artifactKind: typeof GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  generationImprovementPlanId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceGenerationContractComplianceReportId: string;
  sourceGenerationContractComplianceId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  status: GenerationImprovementPlanPersistableStatus;
  recommendedNextAction: GenerationImprovementPlanArtifact["summary"]["recommendedNextAction"];
  estimatedRegenerationReadiness: GenerationImprovementPlanArtifact["summary"]["estimatedRegenerationReadiness"];
  improvementCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categorySummary: GenerationImprovementPlanArtifact["summary"]["categorySummary"];
  contractVersion: string;
  runtimeVersion: typeof GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: GenerationImprovementPlanArtifact;
  validation: GenerationImprovementValidationResult;
  diagnostics: string[];
};

export type GenerationImprovementPlanArtifactReference =
  Omit<GenerationImprovementPlanArtifactRecord, "artifact">;

export type GenerationImprovementPlanProvenanceSummary = RuntimeImportProvenanceSummary & {
  generationImprovementPlanArtifacts?: GenerationImprovementPlanArtifactRecord[];
  latestGenerationImprovementPlanArtifact?: GenerationImprovementPlanArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type GenerationImprovementPlanPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class GenerationImprovementPlanPersistenceValidationError extends Error {
  readonly validation: GenerationImprovementValidationResult;

  constructor(validation: GenerationImprovementValidationResult) {
    super("GenerationImprovementPlanArtifact is invalid and was not persisted.");
    this.name = "GenerationImprovementPlanPersistenceValidationError";
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
  validation: GenerationImprovementValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationImprovementPlanArtifact;
}): GenerationImprovementValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Generation Improvement Plan artifact status must not be invalid or stale for persistence");
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
  if (input.artifact.sourceGenerationContractComplianceReportId !== input.artifact.lineage.sourceGenerationContractComplianceReportId) {
    errors.push("artifact.sourceGenerationContractComplianceReportId must match artifact.lineage.sourceGenerationContractComplianceReportId");
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
  artifact: GenerationImprovementPlanArtifact,
): Omit<GenerationImprovementPlanArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: GenerationImprovementPlanArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: GenerationImprovementPlanArtifact;
  persistedAt: string;
}): string {
  return `generation_improvement_plan_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  record: GenerationImprovementPlanArtifactRecord,
): GenerationImprovementPlanArtifactReference {
  const { artifact: _artifact, ...reference } = record;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is GenerationImprovementPlanArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<GenerationImprovementPlanArtifactRecord>;
  if (record.kind !== GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND) return false;
  if (record.artifactKind !== GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (record.status !== "draft" && record.status !== "ready" && record.status !== "blocked") return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateGenerationImprovementPlan(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.generationImprovementPlanId !== record.generationImprovementPlanId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceGenerationContractComplianceReportId !== record.sourceGenerationContractComplianceReportId) return false;
  if (record.artifact.sourceGenerationContractComplianceId !== record.sourceGenerationContractComplianceId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.sourceObservedWebsiteModelId !== record.sourceObservedWebsiteModelId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): GenerationImprovementPlanArtifactRecord[] {
  const provenance = summary as GenerationImprovementPlanProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationImprovementPlanArtifacts)
    ? provenance.generationImprovementPlanArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const provenance = summary as GenerationImprovementPlanProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationImprovementPlanArtifacts)
    ? provenance.generationImprovementPlanArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: GenerationImprovementPlanArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): GenerationImprovementPlanArtifactRecord | null {
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

export async function persistGenerationImprovementPlan(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationImprovementPlanArtifact;
  options?: GenerationImprovementPlanPersistenceOptions;
}): Promise<GenerationImprovementPlanArtifactReference> {
  const validation = mergeValidation({
    validation: validateGenerationImprovementPlan(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new GenerationImprovementPlanPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Generation Improvement Plan persistence: ${input.siteVersionId}`);
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
  const artifactRecord: GenerationImprovementPlanArtifactRecord = {
    kind: GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND,
    artifactKind: GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    generationImprovementPlanId: input.artifact.generationImprovementPlanId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceGenerationContractComplianceReportId: input.artifact.sourceGenerationContractComplianceReportId,
    sourceGenerationContractComplianceId: input.artifact.sourceGenerationContractComplianceId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    sourceObservedWebsiteModelId: input.artifact.sourceObservedWebsiteModelId,
    status: input.artifact.status as GenerationImprovementPlanPersistableStatus,
    recommendedNextAction: input.artifact.summary.recommendedNextAction,
    estimatedRegenerationReadiness: input.artifact.summary.estimatedRegenerationReadiness,
    improvementCount: input.artifact.summary.improvementCount,
    criticalCount: input.artifact.summary.criticalCount,
    highCount: input.artifact.summary.highCount,
    mediumCount: input.artifact.summary.mediumCount,
    lowCount: input.artifact.summary.lowCount,
    categorySummary: cloneJson(input.artifact.summary.categorySummary),
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["GENERATION_IMPROVEMENT_PLAN_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: GenerationImprovementPlanProvenanceSummary = {
    ...existingSummary,
    generationImprovementPlanArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as GenerationImprovementPlanArtifactRecord[],
    latestGenerationImprovementPlanArtifact: artifactRecord,
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
    throw new Error(`Generation Improvement Plan persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestGenerationImprovementPlan(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: GenerationImprovementPlanPersistenceOptions;
}): Promise<GenerationImprovementPlanArtifactRecord | null> {
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

export async function loadGenerationImprovementPlanById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: GenerationImprovementPlanPersistenceOptions;
}): Promise<GenerationImprovementPlanArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
