/**
 * Phase 8C-1 Candidate Discovery output contract.
 *
 * This module defines and validates non-executable, evidence-backed candidate
 * metadata. It does not discover or review candidates, generate output,
 * reconstruct anything, persist data, or publish artifacts.
 */

export const CANDIDATE_TYPES = ["route", "navigation", "section"] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

export const CANDIDATE_STATUSES = ["discovered", "valid", "invalid", "blocked"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type CandidateConfidence = {
  level: (typeof CANDIDATE_CONFIDENCE_LEVELS)[number];
  reasons: string[];
};

export const CANDIDATE_EVIDENCE_SOURCE_KINDS = [
  "evidence_capture_baseline",
  "layout_geometry",
  "section_boundary",
  "navigation_evidence",
  "limited_dry_run_output",
  "limited_dry_run_route_model",
  "limited_dry_run_navigation_model",
  "limited_dry_run_section_model",
] as const;
export type CandidateEvidenceRef = {
  refId: string;
  sourceKind: (typeof CANDIDATE_EVIDENCE_SOURCE_KINDS)[number];
  routePath?: string;
};

export const CANDIDATE_LIMITATION_SEVERITIES = ["note", "warning", "blocker"] as const;
export type CandidateLimitation = {
  limitationId: string;
  severity: (typeof CANDIDATE_LIMITATION_SEVERITIES)[number];
  code: string;
  message: string;
  sourceRef?: string;
};

export type Candidate = {
  candidateId: string;
  candidateType: CandidateType;
  candidateStatus: CandidateStatus;
  confidence: CandidateConfidence;
  sourceEvidenceRefs: CandidateEvidenceRef[];
  sourceDryRunRefs: CandidateEvidenceRef[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
  routePath?: string;
};

export type CandidateDiscoveryResult = {
  discoveryId: string;
  siteVersionId: string;
  dryRunId: string;
  createdAt: string;
  candidateCount: number;
  candidateTypesPresent: CandidateType[];
  candidates: Candidate[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
};

export type CandidateDiscoveryValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS = [
  "reactOutput",
  "generatedOutputs",
  "generatedBlocks",
  "generatedContent",
  "designTokens",
  "publishingArtifacts",
  "reconstructionArtifacts",
] as const;

const EVIDENCE_SOURCE_KINDS = CANDIDATE_EVIDENCE_SOURCE_KINDS.slice(0, 4);
const DRY_RUN_SOURCE_KINDS = CANDIDATE_EVIDENCE_SOURCE_KINDS.slice(4);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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

function validateEvidenceRefs(
  value: unknown,
  path: string,
  allowedSourceKinds: readonly string[],
  errors: string[],
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  if (value.length === 0) errors.push(`${path} must contain at least one ref`);
  for (const [index, ref] of value.entries()) {
    const refPath = `${path}[${index}]`;
    if (!isObject(ref)) {
      errors.push(`${refPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(ref.refId)) errors.push(`${refPath}.refId is required`);
    if (!allowedSourceKinds.includes(String(ref.sourceKind))) {
      errors.push(`${refPath}.sourceKind is not allowed for ${path}`);
    }
    if (ref.routePath !== undefined && !isNonEmptyString(ref.routePath)) {
      errors.push(`${refPath}.routePath must be a non-empty string when present`);
    }
  }
}

function validateLimitation(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!isNonEmptyString(value.limitationId)) errors.push(`${path}.limitationId is required`);
  if (!CANDIDATE_LIMITATION_SEVERITIES.includes(value.severity as never)) {
    errors.push(`${path}.severity must be note, warning, or blocker`);
  }
  if (!isNonEmptyString(value.code)) errors.push(`${path}.code is required`);
  if (!isNonEmptyString(value.message)) errors.push(`${path}.message is required`);
  if (value.sourceRef !== undefined && !isNonEmptyString(value.sourceRef)) {
    errors.push(`${path}.sourceRef must be a non-empty string when present`);
  }
}

function validateLimitations(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, limitation] of value.entries()) {
    validateLimitation(limitation, `${path}[${index}]`, errors);
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

function validateCandidate(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!isNonEmptyString(value.candidateId)) errors.push(`${path}.candidateId is required`);
  if (!CANDIDATE_TYPES.includes(value.candidateType as never)) {
    errors.push(`${path}.candidateType must be route, navigation, or section`);
  }
  if (!CANDIDATE_STATUSES.includes(value.candidateStatus as never)) {
    errors.push(`${path}.candidateStatus must be discovered, valid, invalid, or blocked`);
  }
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateEvidenceRefs(value.sourceEvidenceRefs, `${path}.sourceEvidenceRefs`, EVIDENCE_SOURCE_KINDS, errors);
  validateEvidenceRefs(value.sourceDryRunRefs, `${path}.sourceDryRunRefs`, DRY_RUN_SOURCE_KINDS, errors);
  validateLimitations(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  if (value.routePath !== undefined && !isNonEmptyString(value.routePath)) {
    errors.push(`${path}.routePath must be a non-empty string when present`);
  }
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if (!isObject(value) && !Array.isArray(value)) return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Candidate Discovery results`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

export function validateCandidateDiscoveryResult(
  result: unknown,
): CandidateDiscoveryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(result)) {
    return { valid: false, errors: ["Candidate Discovery result must be an object"], warnings };
  }

  validateForbiddenFields(result, "", errors, new WeakSet<object>());
  if (!isNonEmptyString(result.discoveryId)) errors.push("discoveryId is required");
  if (!isNonEmptyString(result.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(result.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(result.createdAt)) errors.push("createdAt is required");

  if (!Array.isArray(result.candidates)) {
    errors.push("candidates must be an array");
  } else {
    for (const [index, candidate] of result.candidates.entries()) {
      validateCandidate(candidate, `candidates[${index}]`, errors);
    }
    if (result.candidateCount !== result.candidates.length) {
      errors.push("candidateCount must equal candidates.length");
    }
  }
  if (!Number.isInteger(result.candidateCount) || Number(result.candidateCount) < 0) {
    errors.push("candidateCount must be a non-negative integer");
  }

  if (!Array.isArray(result.candidateTypesPresent)) {
    errors.push("candidateTypesPresent must be an array");
  } else {
    for (const [index, candidateType] of result.candidateTypesPresent.entries()) {
      if (!CANDIDATE_TYPES.includes(candidateType as never)) {
        errors.push(`candidateTypesPresent[${index}] must be route, navigation, or section`);
      }
    }
    if (Array.isArray(result.candidates)) {
      const expected = CANDIDATE_TYPES.filter((candidateType) =>
        (result.candidates as unknown[]).some(
          (candidate) => isObject(candidate) && candidate.candidateType === candidateType,
        ),
      );
      if (JSON.stringify(result.candidateTypesPresent) !== JSON.stringify(expected)) {
        errors.push("candidateTypesPresent must exactly match candidate types in canonical order");
      }
    }
  }

  validateLimitations(result.limitations, "limitations", errors);
  validateStringArray(result.diagnostics, "diagnostics", errors);
  return { valid: errors.length === 0, errors, warnings };
}

export type CreateEmptyCandidateDiscoveryResultInput = Pick<
  CandidateDiscoveryResult,
  "discoveryId" | "siteVersionId" | "dryRunId" | "createdAt"
> & {
  limitations?: CandidateLimitation[];
  diagnostics?: string[];
};

export function createEmptyCandidateDiscoveryResult(
  input: CreateEmptyCandidateDiscoveryResultInput,
): CandidateDiscoveryResult {
  return {
    discoveryId: input.discoveryId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    createdAt: input.createdAt,
    candidateCount: 0,
    candidateTypesPresent: [],
    candidates: [],
    limitations: [...(input.limitations ?? [])],
    diagnostics: [...(input.diagnostics ?? [])],
  };
}
