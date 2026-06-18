/**
 * Phase 8C-7 Candidate Discovery result persistence.
 *
 * Stores validated, non-executable Candidate Discovery results in the existing
 * site-version import-provenance boundary. It does not run discovery or review,
 * generate output, reconstruct, dispatch work, or publish anything.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  validateCandidateDiscoveryResult,
  type CandidateDiscoveryResult,
  type CandidateDiscoveryValidationResult,
  type CandidateType,
} from "./candidate-discovery-contract";

export const CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND =
  "candidate_discovery_result" as const;

export type CandidateDiscoveryResultArtifactRecord = {
  kind: typeof CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND;
  artifactKind: typeof CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  siteVersionId: string;
  dryRunId: string;
  discoveryId: string;
  candidateCount: number;
  candidateTypesPresent: CandidateType[];
  validationStatus: "valid";
  limitationCount: number;
  blockerCount: number;
  contractVersion: string;
  builderVersion: string;
  createdAt: string;
  persistedAt: string;
  result: CandidateDiscoveryResult;
  validation: CandidateDiscoveryValidationResult;
  diagnostics: string[];
};

export type CandidateDiscoveryResultArtifactReference = Omit<
  CandidateDiscoveryResultArtifactRecord,
  "result"
>;

export type CandidateDiscoveryResultProvenanceSummary = RuntimeImportProvenanceSummary & {
  candidateDiscoveryResultArtifacts?: CandidateDiscoveryResultArtifactRecord[];
  latestCandidateDiscoveryResultArtifact?: CandidateDiscoveryResultArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type CandidateDiscoveryPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class CandidateDiscoveryPersistenceValidationError extends Error {
  readonly validation: CandidateDiscoveryValidationResult;

  constructor(validation: CandidateDiscoveryValidationResult) {
    super("CandidateDiscoveryResult is invalid and was not persisted.");
    this.name = "CandidateDiscoveryPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeLineageValidation(input: {
  validation: CandidateDiscoveryValidationResult;
  siteVersionId: string;
  dryRunId: string;
  result: CandidateDiscoveryResult;
  builderVersion: string;
  contractVersion: string;
}): CandidateDiscoveryValidationResult {
  const errors = [...input.validation.errors];
  if (input.result.siteVersionId !== input.siteVersionId) {
    errors.push("result.siteVersionId must match persisted siteVersionId");
  }
  if (input.result.dryRunId !== input.dryRunId) {
    errors.push("result.dryRunId must match persisted dryRunId");
  }
  if (!input.builderVersion) errors.push("builderVersion is required");
  if (!input.contractVersion) errors.push("contractVersion is required");
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticResult(result: CandidateDiscoveryResult): Omit<CandidateDiscoveryResult, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = result;
  return semantic;
}

function semanticFingerprint(input: {
  result: CandidateDiscoveryResult;
  builderVersion: string;
  contractVersion: string;
}): string {
  return sha256Hex(stableStringify({
    result: semanticResult(input.result),
    builderVersion: input.builderVersion,
    contractVersion: input.contractVersion,
  }));
}

function createArtifactId(input: {
  result: CandidateDiscoveryResult;
  builderVersion: string;
  contractVersion: string;
  persistedAt: string;
}): string {
  const hash = sha256Hex(stableStringify(input)).slice(0, 32);
  return `candidate_discovery_result_${hash}`;
}

function toArtifactReference(
  artifact: CandidateDiscoveryResultArtifactRecord,
): CandidateDiscoveryResultArtifactReference {
  const { result: _result, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(artifact: unknown): artifact is CandidateDiscoveryResultArtifactRecord {
  if (!artifact || typeof artifact !== "object") return false;
  const record = artifact as Partial<CandidateDiscoveryResultArtifactRecord>;
  if (record.kind !== CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND) return false;
  if (record.artifactKind !== CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1 || record.validationStatus !== "valid") return false;
  if (!record.result || record.validation?.valid !== true) return false;
  if (!validateCandidateDiscoveryResult(record.result).valid) return false;
  if (record.result.siteVersionId !== record.siteVersionId) return false;
  if (record.result.dryRunId !== record.dryRunId) return false;
  if (record.result.discoveryId !== record.discoveryId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): CandidateDiscoveryResultArtifactRecord[] {
  const provenance = summary as CandidateDiscoveryResultProvenanceSummary | null | undefined;
  if (!Array.isArray(provenance?.candidateDiscoveryResultArtifacts)) return [];
  return provenance.candidateDiscoveryResultArtifacts.filter(isValidArtifact);
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as CandidateDiscoveryResultProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.candidateDiscoveryResultArtifacts)
    ? provenance.candidateDiscoveryResultArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: CandidateDiscoveryResultArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): CandidateDiscoveryResultArtifactRecord | null {
  const matches = input.artifacts.filter((artifact) =>
    artifact.siteVersionId === input.siteVersionId &&
    (input.dryRunId === undefined || artifact.dryRunId === input.dryRunId));
  return matches
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

export async function persistCandidateDiscoveryResult(input: {
  siteVersionId: string;
  dryRunId: string;
  result: CandidateDiscoveryResult;
  builderVersion: string;
  contractVersion: string;
  options?: CandidateDiscoveryPersistenceOptions;
}): Promise<CandidateDiscoveryResultArtifactReference> {
  const validation = mergeLineageValidation({
    validation: validateCandidateDiscoveryResult(input.result),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    result: input.result,
    builderVersion: input.builderVersion,
    contractVersion: input.contractVersion,
  });
  if (!validation.valid) throw new CandidateDiscoveryPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Candidate Discovery persistence: ${input.siteVersionId}`);
  }

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latestForDryRun = selectLatestArtifact({
    artifacts: previousArtifacts,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });
  const fingerprint = semanticFingerprint(input);
  if (latestForDryRun && semanticFingerprint(latestForDryRun) === fingerprint) {
    return toArtifactReference(latestForDryRun);
  }

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifact: CandidateDiscoveryResultArtifactRecord = {
    kind: CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
    artifactKind: CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({
      result: input.result,
      builderVersion: input.builderVersion,
      contractVersion: input.contractVersion,
      persistedAt,
    }),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    discoveryId: input.result.discoveryId,
    candidateCount: input.result.candidateCount,
    candidateTypesPresent: [...input.result.candidateTypesPresent],
    validationStatus: "valid",
    limitationCount: input.result.limitations.length,
    blockerCount: input.result.limitations.filter((item) => item.severity === "blocker").length,
    contractVersion: input.contractVersion,
    builderVersion: input.builderVersion,
    createdAt: input.result.createdAt,
    persistedAt,
    result: cloneJson(input.result),
    validation: cloneJson(validation),
    diagnostics: ["CANDIDATE_DISCOVERY_RESULT_VALIDATION_PASSED"],
  };
  const nextSummary: CandidateDiscoveryResultProvenanceSummary = {
    ...existingSummary,
    // Preserve append-only history even when malformed legacy entries are
    // excluded from latest selection and readback.
    candidateDiscoveryResultArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifact,
    ] as CandidateDiscoveryResultArtifactRecord[],
    latestCandidateDiscoveryResultArtifact: artifact,
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
    throw new Error(`Candidate Discovery persistence affected 0 rows for site version ${input.siteVersionId}`);
  }
  return toArtifactReference(artifact);
}

export async function loadLatestCandidateDiscoveryResult(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: CandidateDiscoveryPersistenceOptions;
}): Promise<CandidateDiscoveryResultArtifactRecord | null> {
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

export async function loadCandidateDiscoveryResultById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: CandidateDiscoveryPersistenceOptions;
}): Promise<CandidateDiscoveryResultArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
