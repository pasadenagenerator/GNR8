/**
 * Phase 8E-6 Reconstruction Package persistence.
 *
 * Stores validated, metadata-only Reconstruction Packages in the existing
 * site-version import-provenance boundary. It does not plan, generate,
 * execute, reconstruct, call AI systems, dispatch workers, or publish.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { validateCandidateDiscoveryResult } from "./candidate-discovery-contract";
import { validateCandidateReviewPackage } from "./candidate-review-contract";
import {
  validateReconstructionPackage,
  type ReconstructionPackage,
  type ReconstructionPackageValidationResult,
} from "./reconstruction-package-contract";

export const RECONSTRUCTION_PACKAGE_ARTIFACT_KIND =
  "reconstruction_package" as const;

export type ReconstructionPackageArtifactRecord = {
  kind: typeof RECONSTRUCTION_PACKAGE_ARTIFACT_KIND;
  artifactKind: typeof RECONSTRUCTION_PACKAGE_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  reconstructionPackageId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  status: "valid" | "blocked";
  includedCount: number;
  excludedCount: number;
  approvedCount: number;
  contractVersion: string;
  createdAt: string;
  persistedAt: string;
  package: ReconstructionPackage;
  validation: ReconstructionPackageValidationResult;
  diagnostics: string[];
};

export type ReconstructionPackageArtifactReference = Omit<
  ReconstructionPackageArtifactRecord,
  "package"
>;

export type ReconstructionPackageProvenanceSummary = RuntimeImportProvenanceSummary & {
  reconstructionPackageArtifacts?: ReconstructionPackageArtifactRecord[];
  latestReconstructionPackageArtifact?: ReconstructionPackageArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type ReconstructionPackagePersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class ReconstructionPackagePersistenceValidationError extends Error {
  readonly validation: ReconstructionPackageValidationResult;

  constructor(validation: ReconstructionPackageValidationResult) {
    super("ReconstructionPackage is invalid and was not persisted.");
    this.name = "ReconstructionPackagePersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
  collectionKey: "candidateReviewPackageArtifacts" | "candidateDiscoveryResultArtifacts",
  latestKey: "latestCandidateReviewPackageArtifact" | "latestCandidateDiscoveryResultArtifact",
): unknown[] {
  const provenance = summary as Record<string, unknown> | null | undefined;
  const values: unknown[] = [];
  if (Array.isArray(provenance?.[collectionKey])) values.push(...provenance[collectionKey]);
  if (provenance?.[latestKey] !== undefined) values.push(provenance[latestKey]);
  return values;
}

function readCandidateReviewArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  artifactId: string;
}): Record<string, unknown> | null {
  return readArtifactValues(
    input.summary,
    "candidateReviewPackageArtifacts",
    "latestCandidateReviewPackageArtifact",
  ).find((value) =>
    isRecord(value) &&
    value.artifactId === input.artifactId &&
    value.kind === "candidate_review_package" &&
    value.artifactKind === "candidate_review_package"
  ) as Record<string, unknown> | undefined ?? null;
}

function readCandidateDiscoveryArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  artifactId: string;
}): Record<string, unknown> | null {
  return readArtifactValues(
    input.summary,
    "candidateDiscoveryResultArtifacts",
    "latestCandidateDiscoveryResultArtifact",
  ).find((value) =>
    isRecord(value) &&
    value.artifactId === input.artifactId &&
    value.kind === "candidate_discovery_result" &&
    value.artifactKind === "candidate_discovery_result"
  ) as Record<string, unknown> | undefined ?? null;
}

function readLatestCandidateReviewArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  dryRunId: string;
  candidateDiscoveryArtifactId: string;
}): Record<string, unknown> | null {
  const provenance = input.summary as Record<string, unknown> | null | undefined;
  const pointer = provenance?.latestCandidateReviewPackageArtifact;
  if (
    isRecord(pointer) &&
    pointer.kind === "candidate_review_package" &&
    pointer.artifactKind === "candidate_review_package" &&
    pointer.siteVersionId === input.siteVersionId &&
    pointer.dryRunId === input.dryRunId &&
    pointer.candidateDiscoveryArtifactId === input.candidateDiscoveryArtifactId
  ) {
    return pointer;
  }

  return readArtifactValues(
    input.summary,
    "candidateReviewPackageArtifacts",
    "latestCandidateReviewPackageArtifact",
  )
    .filter((value): value is Record<string, unknown> =>
      isRecord(value) &&
      value.kind === "candidate_review_package" &&
      value.artifactKind === "candidate_review_package" &&
      value.siteVersionId === input.siteVersionId &&
      value.dryRunId === input.dryRunId &&
      value.candidateDiscoveryArtifactId === input.candidateDiscoveryArtifactId)
    .sort((left, right) =>
      String(left.persistedAt ?? "").localeCompare(String(right.persistedAt ?? "")) ||
      String(left.artifactId ?? "").localeCompare(String(right.artifactId ?? "")))
    .at(-1) ?? null;
}

function mergeValidation(input: {
  validation: ReconstructionPackageValidationResult;
  siteVersionId: string;
  dryRunId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  reconstructionPackage: ReconstructionPackage;
  contractVersion: string;
  candidateReviewArtifact: Record<string, unknown> | null;
  latestCandidateReviewArtifact: Record<string, unknown> | null;
  candidateDiscoveryArtifact: Record<string, unknown> | null;
}): ReconstructionPackageValidationResult {
  const errors = [...input.validation.errors];
  const packageValue = input.reconstructionPackage;

  if (packageValue.reconstructionPackageStatus !== "valid" && packageValue.reconstructionPackageStatus !== "blocked") {
    errors.push("reconstructionPackageStatus must be valid or blocked for persistence");
  }
  if (packageValue.siteVersionId !== input.siteVersionId) {
    errors.push("package.siteVersionId must match persisted siteVersionId");
  }
  if (packageValue.dryRunId !== input.dryRunId) {
    errors.push("package.dryRunId must match persisted dryRunId");
  }
  if (packageValue.candidateReviewPackageArtifactId !== input.candidateReviewPackageArtifactId) {
    errors.push("package.candidateReviewPackageArtifactId must match persisted candidateReviewPackageArtifactId");
  }
  if (packageValue.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId) {
    errors.push("package.candidateDiscoveryArtifactId must match persisted candidateDiscoveryArtifactId");
  }
  if (packageValue.contractVersion !== input.contractVersion) {
    errors.push("package.contractVersion must match persisted contractVersion");
  }
  if (
    packageValue.reconstructionPackageId !==
    `reconstruction-package:${input.candidateReviewPackageArtifactId}:${input.contractVersion}`
  ) {
    errors.push("package.reconstructionPackageId must use the canonical Reconstruction Package identity");
  }

  const reviewArtifact = input.candidateReviewArtifact;
  const reviewPackage = reviewArtifact?.package;
  if (!reviewArtifact || !isRecord(reviewPackage) || !validateCandidateReviewPackage(reviewPackage).valid) {
    errors.push("candidateReviewPackageArtifactId must reference a valid persisted Candidate Review artifact");
  } else {
    if (reviewArtifact.siteVersionId !== input.siteVersionId || reviewPackage.siteVersionId !== input.siteVersionId) {
      errors.push("Candidate Review artifact siteVersionId must match persisted siteVersionId");
    }
    if (reviewArtifact.dryRunId !== input.dryRunId || reviewPackage.dryRunId !== input.dryRunId) {
      errors.push("Candidate Review artifact dryRunId must match persisted dryRunId");
    }
    if (
      reviewArtifact.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId ||
      reviewPackage.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId
    ) {
      errors.push("Candidate Review artifact candidateDiscoveryArtifactId must match persisted candidateDiscoveryArtifactId");
    }
    if (packageValue.lineage.candidateReviewPackageId !== reviewPackage.reviewPackageId) {
      errors.push("package.lineage.candidateReviewPackageId must match the Candidate Review package");
    }
  }

  if (input.latestCandidateReviewArtifact?.artifactId !== input.candidateReviewPackageArtifactId) {
    errors.push("candidateReviewPackageArtifactId must match the latest Candidate Review artifact for this lineage");
  }

  const discoveryArtifact = input.candidateDiscoveryArtifact;
  const discoveryResult = discoveryArtifact?.result;
  if (!discoveryArtifact || !isRecord(discoveryResult) || !validateCandidateDiscoveryResult(discoveryResult).valid) {
    errors.push("candidateDiscoveryArtifactId must reference a valid persisted Candidate Discovery artifact");
  } else {
    if (discoveryArtifact.siteVersionId !== input.siteVersionId || discoveryResult.siteVersionId !== input.siteVersionId) {
      errors.push("Candidate Discovery artifact siteVersionId must match persisted siteVersionId");
    }
    if (discoveryArtifact.dryRunId !== input.dryRunId || discoveryResult.dryRunId !== input.dryRunId) {
      errors.push("Candidate Discovery artifact dryRunId must match persisted dryRunId");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticPackage(
  reconstructionPackage: ReconstructionPackage,
): Omit<ReconstructionPackage, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = reconstructionPackage;
  return semantic;
}

function semanticFingerprint(input: {
  reconstructionPackage: ReconstructionPackage;
  contractVersion: string;
}): string {
  return sha256Hex(stableStringify({
    package: semanticPackage(input.reconstructionPackage),
    contractVersion: input.contractVersion,
  }));
}

function createArtifactId(input: {
  reconstructionPackage: ReconstructionPackage;
  contractVersion: string;
  persistedAt: string;
}): string {
  return `reconstruction_package_${sha256Hex(stableStringify(input)).slice(0, 32)}`;
}

function toArtifactReference(
  artifact: ReconstructionPackageArtifactRecord,
): ReconstructionPackageArtifactReference {
  const { package: _package, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is ReconstructionPackageArtifactRecord {
  if (!isRecord(value)) return false;
  const artifact = value as Partial<ReconstructionPackageArtifactRecord>;
  return artifact.kind === RECONSTRUCTION_PACKAGE_ARTIFACT_KIND &&
    artifact.artifactKind === RECONSTRUCTION_PACKAGE_ARTIFACT_KIND &&
    artifact.artifactVersion === 1 &&
    (artifact.status === "valid" || artifact.status === "blocked") &&
    artifact.validation?.valid === true &&
    artifact.package !== undefined &&
    validateReconstructionPackage(artifact.package).valid &&
    artifact.reconstructionPackageId === artifact.package.reconstructionPackageId &&
    artifact.candidateReviewPackageArtifactId === artifact.package.candidateReviewPackageArtifactId &&
    artifact.candidateDiscoveryArtifactId === artifact.package.candidateDiscoveryArtifactId &&
    artifact.siteVersionId === artifact.package.siteVersionId &&
    artifact.dryRunId === artifact.package.dryRunId &&
    artifact.status === artifact.package.reconstructionPackageStatus;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): ReconstructionPackageArtifactRecord[] {
  const provenance = summary as ReconstructionPackageProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.reconstructionPackageArtifacts)
    ? provenance.reconstructionPackageArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as ReconstructionPackageProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.reconstructionPackageArtifacts)
    ? provenance.reconstructionPackageArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: ReconstructionPackageArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): ReconstructionPackageArtifactRecord | null {
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

function readLatestPointer(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  dryRunId?: string;
}): ReconstructionPackageArtifactRecord | null {
  const provenance = input.summary as ReconstructionPackageProvenanceSummary | null | undefined;
  const artifact = provenance?.latestReconstructionPackageArtifact;
  if (!isValidArtifact(artifact) || artifact.siteVersionId !== input.siteVersionId) return null;
  if (input.dryRunId !== undefined && artifact.dryRunId !== input.dryRunId) return null;
  return artifact;
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

export async function persistReconstructionPackage(input: {
  siteVersionId: string;
  dryRunId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  package: ReconstructionPackage;
  contractVersion: string;
  options?: ReconstructionPackagePersistenceOptions;
}): Promise<ReconstructionPackageArtifactReference> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Reconstruction Package persistence: ${input.siteVersionId}`);
  }

  const validation = mergeValidation({
    validation: validateReconstructionPackage(input.package),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    reconstructionPackage: input.package,
    contractVersion: input.contractVersion,
    candidateReviewArtifact: readCandidateReviewArtifact({
      summary: siteVersion.importProvenanceSummary,
      artifactId: input.candidateReviewPackageArtifactId,
    }),
    latestCandidateReviewArtifact: readLatestCandidateReviewArtifact({
      summary: siteVersion.importProvenanceSummary,
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
      candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    }),
    candidateDiscoveryArtifact: readCandidateDiscoveryArtifact({
      summary: siteVersion.importProvenanceSummary,
      artifactId: input.candidateDiscoveryArtifactId,
    }),
  });
  if (!validation.valid) throw new ReconstructionPackagePersistenceValidationError(validation);

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latestForDryRun = readLatestPointer({
    summary: existingSummary,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  }) ?? selectLatestArtifact({
      artifacts: previousArtifacts,
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    });
  const fingerprint = semanticFingerprint({
    reconstructionPackage: input.package,
    contractVersion: input.contractVersion,
  });
  if (
    latestForDryRun &&
    latestForDryRun.candidateReviewPackageArtifactId === input.candidateReviewPackageArtifactId &&
    latestForDryRun.reconstructionPackageId === input.package.reconstructionPackageId &&
    latestForDryRun.contractVersion === input.contractVersion &&
    semanticFingerprint({
      reconstructionPackage: latestForDryRun.package,
      contractVersion: latestForDryRun.contractVersion,
    }) === fingerprint
  ) {
    return toArtifactReference(latestForDryRun);
  }

  const status = input.package.reconstructionPackageStatus;
  if (status !== "valid" && status !== "blocked") {
    throw new ReconstructionPackagePersistenceValidationError(validation);
  }

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifact: ReconstructionPackageArtifactRecord = {
    kind: RECONSTRUCTION_PACKAGE_ARTIFACT_KIND,
    artifactKind: RECONSTRUCTION_PACKAGE_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({
      reconstructionPackage: input.package,
      contractVersion: input.contractVersion,
      persistedAt,
    }),
    reconstructionPackageId: input.package.reconstructionPackageId,
    candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    status,
    includedCount: input.package.eligibilitySummary.includedCount,
    excludedCount: input.package.eligibilitySummary.excludedCount,
    approvedCount: input.package.eligibilitySummary.approvedCount,
    contractVersion: input.contractVersion,
    createdAt: input.package.createdAt,
    persistedAt,
    package: cloneJson(input.package),
    validation: cloneJson(validation),
    diagnostics: ["RECONSTRUCTION_PACKAGE_VALIDATION_PASSED"],
  };
  const nextSummary: ReconstructionPackageProvenanceSummary = {
    ...existingSummary,
    reconstructionPackageArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifact,
    ] as ReconstructionPackageArtifactRecord[],
    latestReconstructionPackageArtifact: artifact,
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
    throw new Error(`Reconstruction Package persistence affected 0 rows for site version ${input.siteVersionId}`);
  }
  return toArtifactReference(artifact);
}

export async function loadLatestReconstructionPackage(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: ReconstructionPackagePersistenceOptions;
}): Promise<ReconstructionPackageArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readLatestPointer({
    summary: siteVersion.importProvenanceSummary,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  }) ?? selectLatestArtifact({
      artifacts: readArtifacts(siteVersion.importProvenanceSummary),
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    });
  return artifact ? cloneJson(artifact) : null;
}

export async function loadReconstructionPackageById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: ReconstructionPackagePersistenceOptions;
}): Promise<ReconstructionPackageArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
