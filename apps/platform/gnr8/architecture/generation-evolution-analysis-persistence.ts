/**
 * Phase MVP-2.0-M Generation Evolution Analysis artifact persistence.
 *
 * Stores validated evolution analyses in the existing site-version
 * import-provenance boundary. It adds no schema, UI/API, workers, compliance
 * recomputation, reports, improvement plans, provider payloads, regeneration,
 * approval, publishing, deployment, DNS mutation, or production mutation.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { GENERATION_EVOLUTION_ANALYSIS_RUNTIME_VERSION } from "./generation-evolution-analysis-builder";
import {
  validateGenerationEvolutionAnalysis,
  type GenerationEvolutionAnalysisArtifact,
  type GenerationEvolutionStatus,
  type GenerationEvolutionValidationResult,
} from "./generation-evolution-analysis-contract";

export const GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND = "generation_evolution_analysis" as const;

export type GenerationEvolutionAnalysisPersistableStatus =
  Exclude<GenerationEvolutionStatus, "invalid" | "stale">;

export type GenerationEvolutionAnalysisArtifactRecord = {
  kind: typeof GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND;
  artifactKind: typeof GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  generationEvolutionAnalysisId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  previousIteration: number;
  currentIteration: number;
  status: GenerationEvolutionAnalysisPersistableStatus;
  overallAssessment: GenerationEvolutionAnalysisArtifact["overallAssessment"];
  recommendedNextAction: GenerationEvolutionAnalysisArtifact["recommendedNextAction"];
  improvedCategoryCount: number;
  regressedCategoryCount: number;
  unchangedCategoryCount: number;
  unresolvedCategoryCount: number;
  regressionCount: number;
  contractVersion: string;
  runtimeVersion: typeof GENERATION_EVOLUTION_ANALYSIS_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: GenerationEvolutionAnalysisArtifact;
  validation: GenerationEvolutionValidationResult;
  diagnostics: string[];
};

export type GenerationEvolutionAnalysisArtifactReference =
  Omit<GenerationEvolutionAnalysisArtifactRecord, "artifact">;

export type GenerationEvolutionAnalysisProvenanceSummary = RuntimeImportProvenanceSummary & {
  generationEvolutionAnalysisArtifacts?: GenerationEvolutionAnalysisArtifactRecord[];
  latestGenerationEvolutionAnalysisArtifact?: GenerationEvolutionAnalysisArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type GenerationEvolutionAnalysisPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class GenerationEvolutionAnalysisPersistenceValidationError extends Error {
  readonly validation: GenerationEvolutionValidationResult;

  constructor(validation: GenerationEvolutionValidationResult) {
    super("GenerationEvolutionAnalysisArtifact is invalid and was not persisted.");
    this.name = "GenerationEvolutionAnalysisPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function transitionCount(
  artifact: GenerationEvolutionAnalysisArtifact,
  transitions: GenerationEvolutionAnalysisArtifact["categoryEvolution"][number]["transition"][],
): number {
  return artifact.categoryEvolution.filter((category) => transitions.includes(category.transition)).length;
}

function mergeValidation(input: {
  validation: GenerationEvolutionValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationEvolutionAnalysisArtifact;
}): GenerationEvolutionValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Generation Evolution Analysis artifact status must not be invalid or stale for persistence");
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
  if (input.artifact.previousComplianceArtifactId !== input.artifact.lineage.previousComplianceArtifactId) {
    errors.push("artifact.previousComplianceArtifactId must match artifact.lineage.previousComplianceArtifactId");
  }
  if (input.artifact.currentComplianceArtifactId !== input.artifact.lineage.currentComplianceArtifactId) {
    errors.push("artifact.currentComplianceArtifactId must match artifact.lineage.currentComplianceArtifactId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(
  artifact: GenerationEvolutionAnalysisArtifact,
): Omit<GenerationEvolutionAnalysisArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: GenerationEvolutionAnalysisArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: GENERATION_EVOLUTION_ANALYSIS_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: GenerationEvolutionAnalysisArtifact;
  persistedAt: string;
}): string {
  return `generation_evolution_analysis_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: GENERATION_EVOLUTION_ANALYSIS_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  record: GenerationEvolutionAnalysisArtifactRecord,
): GenerationEvolutionAnalysisArtifactReference {
  const { artifact: _artifact, ...reference } = record;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is GenerationEvolutionAnalysisArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<GenerationEvolutionAnalysisArtifactRecord>;
  if (record.kind !== GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND) return false;
  if (record.artifactKind !== GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "improved" &&
    record.status !== "unchanged" &&
    record.status !== "regressed" &&
    record.status !== "mixed" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateGenerationEvolutionAnalysis(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.generationEvolutionAnalysisId !== record.generationEvolutionAnalysisId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.previousComplianceArtifactId !== record.previousComplianceArtifactId) return false;
  if (record.artifact.currentComplianceArtifactId !== record.currentComplianceArtifactId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): GenerationEvolutionAnalysisArtifactRecord[] {
  const provenance = summary as GenerationEvolutionAnalysisProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationEvolutionAnalysisArtifacts)
    ? provenance.generationEvolutionAnalysisArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const provenance = summary as GenerationEvolutionAnalysisProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generationEvolutionAnalysisArtifacts)
    ? provenance.generationEvolutionAnalysisArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: GenerationEvolutionAnalysisArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): GenerationEvolutionAnalysisArtifactRecord | null {
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

export async function persistGenerationEvolutionAnalysis(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: GenerationEvolutionAnalysisArtifact;
  options?: GenerationEvolutionAnalysisPersistenceOptions;
}): Promise<GenerationEvolutionAnalysisArtifactReference> {
  const validation = mergeValidation({
    validation: validateGenerationEvolutionAnalysis(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new GenerationEvolutionAnalysisPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Generation Evolution Analysis persistence: ${input.siteVersionId}`);
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
  const artifactRecord: GenerationEvolutionAnalysisArtifactRecord = {
    kind: GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND,
    artifactKind: GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    generationEvolutionAnalysisId: input.artifact.generationEvolutionAnalysisId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    previousComplianceArtifactId: input.artifact.previousComplianceArtifactId,
    currentComplianceArtifactId: input.artifact.currentComplianceArtifactId,
    previousIteration: input.artifact.previousIteration.iteration,
    currentIteration: input.artifact.currentIteration.iteration,
    status: input.artifact.status as GenerationEvolutionAnalysisPersistableStatus,
    overallAssessment: input.artifact.overallAssessment,
    recommendedNextAction: input.artifact.recommendedNextAction,
    improvedCategoryCount: transitionCount(input.artifact, ["improved", "newly_compliant", "evidence_improved"]),
    regressedCategoryCount: transitionCount(input.artifact, ["regressed", "newly_non_compliant"]),
    unchangedCategoryCount: input.artifact.unchangedAreas.length,
    unresolvedCategoryCount: input.artifact.unresolvedAreas.length,
    regressionCount: input.artifact.regressions.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: GENERATION_EVOLUTION_ANALYSIS_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: GenerationEvolutionAnalysisProvenanceSummary = {
    ...existingSummary,
    generationEvolutionAnalysisArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as GenerationEvolutionAnalysisArtifactRecord[],
    latestGenerationEvolutionAnalysisArtifact: artifactRecord,
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
    throw new Error(`Generation Evolution Analysis persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestGenerationEvolutionAnalysis(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: GenerationEvolutionAnalysisPersistenceOptions;
}): Promise<GenerationEvolutionAnalysisArtifactRecord | null> {
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

export async function loadGenerationEvolutionAnalysisById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: GenerationEvolutionAnalysisPersistenceOptions;
}): Promise<GenerationEvolutionAnalysisArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
