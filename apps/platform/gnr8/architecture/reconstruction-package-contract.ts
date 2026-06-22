/**
 * Phase 8E-1 Reconstruction Package contract.
 *
 * A Reconstruction Package is an immutable, metadata-only handoff from one
 * exact Candidate Review Package artifact. It does not plan, generate,
 * execute, reconstruct, persist, or publish anything.
 */

import {
  CANDIDATE_CONFIDENCE_LEVELS,
  CANDIDATE_TYPES,
  type CandidateConfidence,
  type CandidateType,
} from "./candidate-discovery-contract";

export const RECONSTRUCTION_PACKAGE_CONTRACT_VERSION = "8E-1" as const;

export const RECONSTRUCTION_PACKAGE_STATUSES = [
  "planned",
  "valid",
  "invalid",
  "blocked",
  "stale",
] as const;
export type ReconstructionPackageStatus = (typeof RECONSTRUCTION_PACKAGE_STATUSES)[number];

export type ReconstructionPackageLineage = {
  readonly candidateReviewPackageArtifactId: string;
  readonly candidateReviewPackageId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
};

export type ReconstructionPackageCandidateRef = {
  readonly candidateId: string;
  readonly candidateType: CandidateType;
  readonly routePath?: string;
  readonly decisionReviewEventId: string;
  readonly decision: "approved";
  readonly confidence?: CandidateConfidence;
  readonly sourceCandidateRefs?: readonly string[];
  readonly evidenceRefs?: readonly string[];
};

export type ReconstructionPackageEligibilitySummary = {
  readonly approvedCount: number;
  readonly rejectedCount: number;
  readonly deferredCount: number;
  readonly unreviewedCount: number;
  readonly includedCount: number;
  readonly excludedCount: number;
};

export type ReconstructionPackage = {
  readonly reconstructionPackageId: string;
  readonly reconstructionPackageStatus: ReconstructionPackageStatus;
  readonly candidateReviewPackageArtifactId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly contractVersion: typeof RECONSTRUCTION_PACKAGE_CONTRACT_VERSION;
  readonly createdAt: string;
  readonly lineage: ReconstructionPackageLineage;
  readonly approvedCandidateRefs: readonly ReconstructionPackageCandidateRef[];
  readonly eligibilitySummary: ReconstructionPackageEligibilitySummary;
  readonly limitations: readonly any[];
  readonly diagnostics: readonly string[];

  /** @deprecated Phase 7F compatibility only; not part of the 8E contract. */
  readonly packageStatus?: any;
  /** @deprecated Phase 7F compatibility only; not part of the 8E contract. */
  readonly executionReadiness?: any;
  /** @deprecated Phase 7F compatibility only; not part of the 8E contract. */
  readonly routeScope?: any;
};

export type ReconstructionPackageValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

export type CreateBlockedReconstructionPackageInput = {
  readonly candidateReviewPackageArtifactId: string;
  readonly candidateReviewPackageId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly createdAt: string;
  readonly rejectedCount?: number;
  readonly deferredCount?: number;
  readonly unreviewedCount?: number;
  readonly limitations?: readonly string[];
  readonly diagnostics?: readonly string[];
};

export const RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS = [
  "reactOutput",
  "generatedOutputs",
  "generatedBlocks",
  "generatedContent",
  "designTokens",
  "aiOutputs",
  "structurePlan",
  "reconstructionPlan",
  "publishingArtifacts",
  "deploymentArtifacts",
  "executionArtifacts",
] as const;

/** @deprecated Retained only so pre-8E dry-run types continue to compile. */
export type ReconstructionPackageLimitationSeverity = "note" | "warning" | "blocker";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateStringArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") errors.push(`${path}[${index}] must be a string`);
  }
}

function validateOptionalStringArray(value: unknown, path: string, errors: string[]): void {
  if (value !== undefined) validateStringArray(value, path, errors);
}

function validateCount(value: unknown, path: string, errors: string[]): void {
  if (!Number.isInteger(value) || (value as number) < 0) {
    errors.push(`${path} must be a non-negative integer`);
  }
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if ((!isObject(value) && !Array.isArray(value)) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Reconstruction Packages`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateLineage(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("lineage is required");
    return;
  }
  for (const field of [
    "candidateReviewPackageArtifactId",
    "candidateReviewPackageId",
    "candidateDiscoveryArtifactId",
    "siteVersionId",
    "dryRunId",
  ] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`lineage.${field} is required`);
  }
}

function validateConfidence(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!CANDIDATE_CONFIDENCE_LEVELS.includes(value.level as never)) {
    errors.push(`${path}.level must be LOW, MEDIUM, or HIGH`);
  }
  validateStringArray(value.reasons, `${path}.reasons`, errors);
}

function validateCandidateRef(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!isNonEmptyString(value.candidateId)) errors.push(`${path}.candidateId is required`);
  if (!CANDIDATE_TYPES.includes(value.candidateType as never)) {
    errors.push(`${path}.candidateType must be route, navigation, or section`);
  }
  if (value.routePath !== undefined && !isNonEmptyString(value.routePath)) {
    errors.push(`${path}.routePath must be a non-empty string when present`);
  }
  if (!isNonEmptyString(value.decisionReviewEventId)) {
    errors.push(`${path}.decisionReviewEventId is required`);
  }
  if (value.decision !== "approved") {
    errors.push(`${path}.decision must be approved`);
  }
  if (value.confidence !== undefined) validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateOptionalStringArray(value.sourceCandidateRefs, `${path}.sourceCandidateRefs`, errors);
  validateOptionalStringArray(value.evidenceRefs, `${path}.evidenceRefs`, errors);
}

export function validateReconstructionPackage(value: unknown): ReconstructionPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(value)) {
    return { valid: false, errors: ["Reconstruction Package must be an object"], warnings };
  }

  validateForbiddenFields(value, "", errors, new WeakSet<object>());
  for (const field of [
    "reconstructionPackageId",
    "candidateReviewPackageArtifactId",
    "candidateDiscoveryArtifactId",
    "siteVersionId",
    "dryRunId",
  ] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`${field} is required`);
  }
  if (!RECONSTRUCTION_PACKAGE_STATUSES.includes(value.reconstructionPackageStatus as never)) {
    errors.push("reconstructionPackageStatus must be planned, valid, invalid, blocked, or stale");
  }
  if (value.contractVersion !== RECONSTRUCTION_PACKAGE_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${RECONSTRUCTION_PACKAGE_CONTRACT_VERSION}`);
  }
  if (
    isNonEmptyString(value.candidateReviewPackageArtifactId) &&
    value.reconstructionPackageId !==
      `reconstruction-package:${value.candidateReviewPackageArtifactId}:${RECONSTRUCTION_PACKAGE_CONTRACT_VERSION}`
  ) {
    errors.push("reconstructionPackageId must be derived from the exact Review Package artifact and contract version");
  }
  if (!isTimestamp(value.createdAt)) errors.push("createdAt must be a valid timestamp");
  validateLineage(value.lineage, errors);
  validateStringArray(value.limitations, "limitations", errors);
  validateStringArray(value.diagnostics, "diagnostics", errors);

  if (isObject(value.lineage)) {
    for (const field of [
      "candidateReviewPackageArtifactId",
      "candidateDiscoveryArtifactId",
      "siteVersionId",
      "dryRunId",
    ] as const) {
      if (value.lineage[field] !== value[field]) errors.push(`lineage.${field} must match ${field}`);
    }
  }

  const approvedCandidateRefs = Array.isArray(value.approvedCandidateRefs)
    ? value.approvedCandidateRefs
    : [];
  if (!Array.isArray(value.approvedCandidateRefs)) {
    errors.push("approvedCandidateRefs must be an array");
  } else {
    const identities = new Set<string>();
    for (const [index, candidateRef] of approvedCandidateRefs.entries()) {
      validateCandidateRef(candidateRef, `approvedCandidateRefs[${index}]`, errors);
      if (isObject(candidateRef) && isNonEmptyString(candidateRef.candidateId)) {
        if (identities.has(candidateRef.candidateId)) {
          errors.push(`approvedCandidateRefs[${index}].candidateId must be unique`);
        }
        identities.add(candidateRef.candidateId);
      }
    }
  }

  if (!isObject(value.eligibilitySummary)) {
    errors.push("eligibilitySummary is required");
  } else {
    const summary = value.eligibilitySummary;
    for (const field of [
      "approvedCount",
      "rejectedCount",
      "deferredCount",
      "unreviewedCount",
      "includedCount",
      "excludedCount",
    ] as const) {
      validateCount(summary[field], `eligibilitySummary.${field}`, errors);
    }
    if (summary.approvedCount !== approvedCandidateRefs.length) {
      errors.push(`eligibilitySummary.approvedCount must equal ${approvedCandidateRefs.length}`);
    }
    if (summary.includedCount !== approvedCandidateRefs.length) {
      errors.push(`eligibilitySummary.includedCount must equal ${approvedCandidateRefs.length}`);
    }
    if (
      typeof summary.rejectedCount === "number" &&
      typeof summary.deferredCount === "number" &&
      typeof summary.unreviewedCount === "number" &&
      summary.excludedCount !== summary.rejectedCount + summary.deferredCount + summary.unreviewedCount
    ) {
      errors.push("eligibilitySummary.excludedCount must equal rejectedCount + deferredCount + unreviewedCount");
    }
  }

  if (value.reconstructionPackageStatus === "stale") {
    warnings.push("Stale Reconstruction Packages are historical metadata and are not eligible for new work");
  }
  if (value.reconstructionPackageStatus === "blocked" && approvedCandidateRefs.length > 0) {
    errors.push("A blocked Reconstruction Package must not include approved candidates");
  }
  if (
    value.reconstructionPackageStatus !== "blocked" &&
    value.reconstructionPackageStatus !== "invalid" &&
    approvedCandidateRefs.length === 0
  ) {
    errors.push("A non-blocked Reconstruction Package must include at least one approved candidate");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function createBlockedReconstructionPackage(
  input: CreateBlockedReconstructionPackageInput,
): ReconstructionPackage {
  const rejectedCount = input.rejectedCount ?? 0;
  const deferredCount = input.deferredCount ?? 0;
  const unreviewedCount = input.unreviewedCount ?? 0;
  return {
    reconstructionPackageId: `reconstruction-package:${input.candidateReviewPackageArtifactId}:${RECONSTRUCTION_PACKAGE_CONTRACT_VERSION}`,
    reconstructionPackageStatus: "blocked",
    candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    contractVersion: RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
    createdAt: input.createdAt,
    lineage: {
      candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
      candidateReviewPackageId: input.candidateReviewPackageId,
      candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    },
    approvedCandidateRefs: [],
    eligibilitySummary: {
      approvedCount: 0,
      rejectedCount,
      deferredCount,
      unreviewedCount,
      includedCount: 0,
      excludedCount: rejectedCount + deferredCount + unreviewedCount,
    },
    limitations: [...(input.limitations ?? ["No approved candidates are eligible for inclusion."])],
    diagnostics: [...(input.diagnostics ?? [])],
  };
}
