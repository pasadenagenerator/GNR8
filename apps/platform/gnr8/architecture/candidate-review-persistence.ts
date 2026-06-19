/**
 * Phase 8D-3 Candidate Review package persistence.
 *
 * Stores validated, non-executable Candidate Review packages in the existing
 * site-version import-provenance boundary. It does not perform review,
 * discovery, reconstruction, generation, execution, or publishing.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { validateCandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  validateCandidateReviewPackage,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
  type CandidateReviewValidationResult,
} from "./candidate-review-contract";

export const CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND =
  "candidate_review_package" as const;

export type CandidateReviewPackageArtifactRecord = {
  kind: typeof CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND;
  artifactKind: typeof CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  reviewPackageId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  reviewedCandidateCount: number;
  approvedCount: number;
  rejectedCount: number;
  deferredCount: number;
  contractVersion: string;
  createdAt: string;
  persistedAt: string;
  validationStatus: "valid";
  package: CandidateReviewPackage;
  validation: CandidateReviewValidationResult;
  diagnostics: string[];
};

export type CandidateReviewPackageArtifactReference = Omit<
  CandidateReviewPackageArtifactRecord,
  "package"
>;

export type CandidateReviewPackageProvenanceSummary = RuntimeImportProvenanceSummary & {
  candidateReviewPackageArtifacts?: CandidateReviewPackageArtifactRecord[];
  latestCandidateReviewPackageArtifact?: CandidateReviewPackageArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type CandidateReviewPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
  compareAndSetSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
    expectedImportProvenanceSummary: RuntimeImportProvenanceSummary | null;
    expectedLatestCandidateReviewPackageArtifactId: string | null;
  }) => Promise<{ affectedRows: number }>;
};

export class CandidateReviewPersistenceValidationError extends Error {
  readonly validation: CandidateReviewValidationResult;

  constructor(validation: CandidateReviewValidationResult) {
    super("CandidateReviewPackage is invalid and was not persisted.");
    this.name = "CandidateReviewPersistenceValidationError";
    this.validation = validation;
  }
}

export class CandidateReviewPersistenceConflictError extends Error {
  readonly diagnostics: string[];

  constructor(diagnostics: string[]) {
    super("CandidateReviewPackage history conflicts with the latest persisted artifact.");
    this.name = "CandidateReviewPersistenceConflictError";
    this.diagnostics = diagnostics;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readDiscoveryArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  artifactId: string;
}): Record<string, unknown> | null {
  const summary = input.summary as Record<string, unknown> | null | undefined;
  const values: unknown[] = [];
  if (Array.isArray(summary?.candidateDiscoveryResultArtifacts)) {
    values.push(...summary.candidateDiscoveryResultArtifacts);
  }
  if (summary?.latestCandidateDiscoveryResultArtifact !== undefined) {
    values.push(summary.latestCandidateDiscoveryResultArtifact);
  }
  return values.find((value) =>
    isRecord(value) &&
    value.artifactId === input.artifactId &&
    value.kind === "candidate_discovery_result" &&
    value.artifactKind === "candidate_discovery_result"
  ) as Record<string, unknown> | undefined ?? null;
}

function mergeValidation(input: {
  validation: CandidateReviewValidationResult;
  siteVersionId: string;
  candidateDiscoveryArtifactId: string;
  reviewPackage: CandidateReviewPackage;
  contractVersion: string;
  discoveryArtifact: Record<string, unknown> | null;
}): CandidateReviewValidationResult {
  const errors = [...input.validation.errors];
  if (input.reviewPackage.siteVersionId !== input.siteVersionId) {
    errors.push("reviewPackage.siteVersionId must match persisted siteVersionId");
  }
  if (input.reviewPackage.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId) {
    errors.push("reviewPackage.candidateDiscoveryArtifactId must match persisted candidateDiscoveryArtifactId");
  }
  if (input.reviewPackage.reviewPackageId !== `candidate-review:${input.candidateDiscoveryArtifactId}`) {
    errors.push("reviewPackage.reviewPackageId must use the canonical Candidate Review package identity");
  }
  if (!input.contractVersion) errors.push("contractVersion is required");

  const discovery = input.discoveryArtifact;
  const result = discovery?.result;
  if (!discovery || !isRecord(result) || !validateCandidateDiscoveryResult(result).valid) {
    errors.push("candidateDiscoveryArtifactId must reference a valid persisted Candidate Discovery artifact");
  } else {
    if (discovery.siteVersionId !== input.siteVersionId || result.siteVersionId !== input.siteVersionId) {
      errors.push("Candidate Discovery artifact siteVersionId must match persisted siteVersionId");
    }
    if (discovery.dryRunId !== input.reviewPackage.dryRunId || result.dryRunId !== input.reviewPackage.dryRunId) {
      errors.push("Candidate Discovery artifact dryRunId must match reviewPackage.dryRunId");
    }
    const candidateIds = new Set(
      Array.isArray(result.candidates)
        ? result.candidates
          .filter(isRecord)
          .map((candidate) => candidate.candidateId)
          .filter((candidateId): candidateId is string => typeof candidateId === "string")
        : [],
    );
    for (const [index, event] of input.reviewPackage.reviewEvents.entries()) {
      if (!candidateIds.has(event.candidateId)) {
        errors.push(`reviewPackage.reviewEvents[${index}].candidateId must exist in the Candidate Discovery artifact`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticPackage(reviewPackage: CandidateReviewPackage): Omit<CandidateReviewPackage, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = reviewPackage;
  return semantic;
}

function semanticFingerprint(input: {
  reviewPackage: CandidateReviewPackage;
  contractVersion: string;
}): string {
  return sha256Hex(stableStringify({
    package: semanticPackage(input.reviewPackage),
    contractVersion: input.contractVersion,
  }));
}

function createArtifactId(input: {
  reviewPackage: CandidateReviewPackage;
  contractVersion: string;
  persistedAt: string;
}): string {
  return `candidate_review_package_${sha256Hex(stableStringify(input)).slice(0, 32)}`;
}

function toArtifactReference(
  artifact: CandidateReviewPackageArtifactRecord,
): CandidateReviewPackageArtifactReference {
  const { package: _package, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is CandidateReviewPackageArtifactRecord {
  if (!isRecord(value)) return false;
  const artifact = value as Partial<CandidateReviewPackageArtifactRecord>;
  return artifact.kind === CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND &&
    artifact.artifactKind === CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND &&
    artifact.artifactVersion === 1 &&
    artifact.validationStatus === "valid" &&
    artifact.validation?.valid === true &&
    artifact.package !== undefined &&
    validateCandidateReviewPackage(artifact.package).valid &&
    artifact.reviewPackageId === artifact.package.reviewPackageId &&
    artifact.candidateDiscoveryArtifactId === artifact.package.candidateDiscoveryArtifactId &&
    artifact.siteVersionId === artifact.package.siteVersionId &&
    artifact.dryRunId === artifact.package.dryRunId;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): CandidateReviewPackageArtifactRecord[] {
  const provenance = summary as CandidateReviewPackageProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.candidateReviewPackageArtifacts)
    ? provenance.candidateReviewPackageArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as CandidateReviewPackageProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.candidateReviewPackageArtifacts)
    ? provenance.candidateReviewPackageArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: CandidateReviewPackageArtifactRecord[];
  siteVersionId: string;
  candidateDiscoveryArtifactId?: string;
}): CandidateReviewPackageArtifactRecord | null {
  return input.artifacts
    .filter((artifact) =>
      artifact.siteVersionId === input.siteVersionId &&
      (input.candidateDiscoveryArtifactId === undefined ||
        artifact.candidateDiscoveryArtifactId === input.candidateDiscoveryArtifactId))
    .slice()
    .sort((left, right) =>
      left.persistedAt.localeCompare(right.persistedAt) ||
      left.artifactId.localeCompare(right.artifactId))
    .at(-1) ?? null;
}

function readLatestPointer(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  candidateDiscoveryArtifactId?: string;
}): CandidateReviewPackageArtifactRecord | null {
  const provenance = input.summary as CandidateReviewPackageProvenanceSummary | null | undefined;
  const artifact = provenance?.latestCandidateReviewPackageArtifact;
  if (!isValidArtifact(artifact) || artifact.siteVersionId !== input.siteVersionId) return null;
  if (
    input.candidateDiscoveryArtifactId !== undefined &&
    artifact.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId
  ) return null;
  return artifact;
}

function eventFingerprint(event: CandidateReviewEvent): string {
  return stableStringify(event);
}

function assertHistoryExtension(
  previous: Pick<CandidateReviewPackage, "reviewEvents" | "latestDecisions">,
  next: CandidateReviewPackage,
  allowSameLength = false,
): void {
  const diagnostics: string[] = [];
  if (next.reviewEvents.length < previous.reviewEvents.length) {
    diagnostics.push("CANDIDATE_REVIEW_HISTORY_OMITTED");
  }
  for (const [index, previousEvent] of previous.reviewEvents.entries()) {
    const nextEvent = next.reviewEvents[index];
    if (!nextEvent || eventFingerprint(previousEvent) !== eventFingerprint(nextEvent)) {
      diagnostics.push("CANDIDATE_REVIEW_HISTORY_REWRITTEN_OR_REORDERED");
      break;
    }
  }

  const currentHeads = new Map(previous.latestDecisions.map((event) => [event.candidateId, event.reviewEventId]));
  const knownCandidates = new Set(previous.reviewEvents.map((event) => event.candidateId));
  for (const event of next.reviewEvents.slice(previous.reviewEvents.length)) {
    const currentHead = currentHeads.get(event.candidateId);
    if (knownCandidates.has(event.candidateId) && event.supersedesReviewEventId !== currentHead) {
      diagnostics.push("CANDIDATE_REVIEW_STALE_OR_BRANCHING_SUPERSESSION");
      break;
    }
    if (!knownCandidates.has(event.candidateId) && event.supersedesReviewEventId !== null) {
      diagnostics.push("CANDIDATE_REVIEW_NEW_CANDIDATE_SUPERSESSION_INVALID");
      break;
    }
    knownCandidates.add(event.candidateId);
    currentHeads.set(event.candidateId, event.reviewEventId);
  }

  if (!allowSameLength && next.reviewEvents.length === previous.reviewEvents.length) {
    diagnostics.push("CANDIDATE_REVIEW_HISTORY_NOT_EXTENDED");
  }

  if (diagnostics.length > 0) {
    throw new CandidateReviewPersistenceConflictError([...new Set(diagnostics)]);
  }
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

async function defaultCompareAndSetSiteVersionImportProvenanceSummary(
  input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
    expectedImportProvenanceSummary: RuntimeImportProvenanceSummary | null;
    expectedLatestCandidateReviewPackageArtifactId: string | null;
  },
  options: RuntimeStoreDbOptions,
): Promise<{ affectedRows: number }> {
  const { compareAndSetSiteVersionImportProvenanceSummary } = await import("../runtime/runtime-store");
  return compareAndSetSiteVersionImportProvenanceSummary(input, options);
}

export async function persistCandidateReviewPackage(input: {
  siteVersionId: string;
  candidateDiscoveryArtifactId: string;
  reviewPackage: CandidateReviewPackage;
  contractVersion: string;
  expectedLatestArtifactId?: string | null;
  options?: CandidateReviewPersistenceOptions;
}): Promise<CandidateReviewPackageArtifactReference> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Candidate Review persistence: ${input.siteVersionId}`);
  }

  const validation = mergeValidation({
    validation: validateCandidateReviewPackage(input.reviewPackage),
    siteVersionId: input.siteVersionId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    reviewPackage: input.reviewPackage,
    contractVersion: input.contractVersion,
    discoveryArtifact: readDiscoveryArtifact({
      summary: siteVersion.importProvenanceSummary,
      artifactId: input.candidateDiscoveryArtifactId,
    }),
  });
  if (!validation.valid) throw new CandidateReviewPersistenceValidationError(validation);

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latest = readLatestPointer({
    summary: existingSummary,
    siteVersionId: input.siteVersionId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
  }) ?? selectLatestArtifact({
      artifacts: previousArtifacts,
      siteVersionId: input.siteVersionId,
      candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    });

  if (
    input.expectedLatestArtifactId !== undefined &&
    latest?.artifactId !== input.expectedLatestArtifactId
  ) {
    throw new CandidateReviewPersistenceConflictError(["CANDIDATE_REVIEW_PACKAGE_STALE"]);
  }

  if (latest && semanticFingerprint({
    reviewPackage: latest.package,
    contractVersion: latest.contractVersion,
  }) === semanticFingerprint({
    reviewPackage: input.reviewPackage,
    contractVersion: input.contractVersion,
  })) {
    return toArtifactReference(latest);
  }
  assertHistoryExtension(
    latest?.package ?? { reviewEvents: [], latestDecisions: [] },
    input.reviewPackage,
    latest === null || latest.contractVersion !== input.contractVersion,
  );

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifact: CandidateReviewPackageArtifactRecord = {
    kind: CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND,
    artifactKind: CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({
      reviewPackage: input.reviewPackage,
      contractVersion: input.contractVersion,
      persistedAt,
    }),
    reviewPackageId: input.reviewPackage.reviewPackageId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.reviewPackage.dryRunId,
    reviewedCandidateCount: input.reviewPackage.reviewedCandidateCount,
    approvedCount: input.reviewPackage.approvedCount,
    rejectedCount: input.reviewPackage.rejectedCount,
    deferredCount: input.reviewPackage.deferredCount,
    contractVersion: input.contractVersion,
    createdAt: input.reviewPackage.createdAt,
    persistedAt,
    validationStatus: "valid",
    package: cloneJson(input.reviewPackage),
    validation: cloneJson(validation),
    diagnostics: ["CANDIDATE_REVIEW_PACKAGE_VALIDATION_PASSED"],
  };
  const nextSummary: CandidateReviewPackageProvenanceSummary = {
    ...existingSummary,
    candidateReviewPackageArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifact,
    ] as CandidateReviewPackageArtifactRecord[],
    latestCandidateReviewPackageArtifact: artifact,
  };

  const write = input.expectedLatestArtifactId !== undefined
    ? options.compareAndSetSiteVersionImportProvenanceSummary
      ? await options.compareAndSetSiteVersionImportProvenanceSummary({
          siteVersionId: input.siteVersionId,
          importProvenanceSummary: nextSummary,
          expectedImportProvenanceSummary: siteVersion.importProvenanceSummary ?? null,
          expectedLatestCandidateReviewPackageArtifactId: input.expectedLatestArtifactId,
        })
      : await defaultCompareAndSetSiteVersionImportProvenanceSummary({
          siteVersionId: input.siteVersionId,
          importProvenanceSummary: nextSummary,
          expectedImportProvenanceSummary: siteVersion.importProvenanceSummary ?? null,
          expectedLatestCandidateReviewPackageArtifactId: input.expectedLatestArtifactId,
        }, options)
    : options.setSiteVersionImportProvenanceSummary
    ? await options.setSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      })
    : await defaultSetSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      }, options);
  if (write.affectedRows <= 0 && input.expectedLatestArtifactId !== undefined) {
    throw new CandidateReviewPersistenceConflictError(["CANDIDATE_REVIEW_PACKAGE_STALE"]);
  }
  if (write.affectedRows <= 0) {
    throw new Error(`Candidate Review persistence affected 0 rows for site version ${input.siteVersionId}`);
  }
  return toArtifactReference(artifact);
}

export async function loadLatestCandidateReviewPackage(input: {
  siteVersionId: string;
  candidateDiscoveryArtifactId?: string;
  options?: CandidateReviewPersistenceOptions;
}): Promise<CandidateReviewPackageArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readLatestPointer({
    summary: siteVersion.importProvenanceSummary,
    siteVersionId: input.siteVersionId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
  }) ?? selectLatestArtifact({
      artifacts: readArtifacts(siteVersion.importProvenanceSummary),
      siteVersionId: input.siteVersionId,
      candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    });
  return artifact ? cloneJson(artifact) : null;
}

export async function loadCandidateReviewPackageById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: CandidateReviewPersistenceOptions;
}): Promise<CandidateReviewPackageArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}

export async function loadCandidateReviewPackageByReviewEventId(input: {
  siteVersionId: string;
  candidateDiscoveryArtifactId: string;
  reviewEventId: string;
  options?: CandidateReviewPersistenceOptions;
}): Promise<CandidateReviewPackageArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary)
    .filter((candidate) =>
      candidate.siteVersionId === input.siteVersionId &&
      candidate.candidateDiscoveryArtifactId === input.candidateDiscoveryArtifactId &&
      candidate.package.reviewEvents.some((event) => event.reviewEventId === input.reviewEventId))
    .sort((left, right) =>
      left.package.reviewEvents.length - right.package.reviewEvents.length ||
      left.persistedAt.localeCompare(right.persistedAt) ||
      left.artifactId.localeCompare(right.artifactId))[0] ?? null;
  return artifact ? cloneJson(artifact) : null;
}
