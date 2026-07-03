/**
 * Phase MVP-1D Business Alignment runtime contract.
 *
 * Business Alignment is the governed evolution of the Digital Business Twin
 * through explicit human business corrections. It does not edit Business
 * Understanding Reports, create Website Design Briefs, create Website
 * Generation Packages, call providers, interpret with AI, generate output,
 * approve, publish, expose UI, or expose API behavior.
 */

import {
  DIGITAL_BUSINESS_TWIN_DOMAINS,
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinConfidence,
  type DigitalBusinessTwinDomain,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinStatus,
} from "./digital-business-twin-contract";
import {
  validateBusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportStatus,
} from "./business-understanding-report-contract";

export const BUSINESS_ALIGNMENT_CONTRACT_VERSION = "MVP-1D" as const;

export const BUSINESS_ALIGNMENT_STATUSES = [
  "draft",
  "reviewed",
  "applied",
  "blocked",
  "invalid",
  "stale",
] as const;
export type BusinessAlignmentStatus = (typeof BUSINESS_ALIGNMENT_STATUSES)[number];

export const BUSINESS_ALIGNMENT_DOMAINS = DIGITAL_BUSINESS_TWIN_DOMAINS;
export type BusinessAlignmentDomain = DigitalBusinessTwinDomain;

export const BUSINESS_ALIGNMENT_CORRECTION_TYPES = [
  "confirm",
  "correct",
  "remove",
  "add_missing",
  "unresolved",
] as const;
export type BusinessAlignmentCorrectionType = (typeof BUSINESS_ALIGNMENT_CORRECTION_TYPES)[number];

export type BusinessAlignmentConfidence = DigitalBusinessTwinConfidence;

export type BusinessAlignmentLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceBusinessUnderstandingReportId: string;
  sourceBusinessUnderstandingReportStatus: BusinessUnderstandingReportStatus;
  sourceBusinessUnderstandingReportContractVersion: string;
  sourceDigitalBusinessTwinId: string;
  sourceDigitalBusinessTwinStatus: DigitalBusinessTwinStatus;
  sourceDigitalBusinessTwinContractVersion: string;
  outputDigitalBusinessTwinId: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
};

export type BusinessAlignmentDecision = {
  decisionId: string;
  status: Exclude<BusinessAlignmentStatus, "invalid" | "stale">;
  correctionIds: string[];
  summary: string;
  decidedAt?: string;
  diagnostics: string[];
};

export type BusinessAlignmentCorrection = {
  correctionId: string;
  domain: BusinessAlignmentDomain;
  type: BusinessAlignmentCorrectionType;
  targetKnowledgeItemId?: string;
  targetMissingKnowledgeId?: string;
  statement?: string;
  reason?: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  confidence?: BusinessAlignmentConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type BusinessAlignmentArtifact = {
  businessAlignmentId: string;
  status: BusinessAlignmentStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceBusinessUnderstandingReportId: string;
  sourceDigitalBusinessTwinId: string;
  createdAt: string;
  contractVersion: typeof BUSINESS_ALIGNMENT_CONTRACT_VERSION;
  lineage: BusinessAlignmentLineage;
  decisions: BusinessAlignmentDecision[];
  corrections: BusinessAlignmentCorrection[];
  confidence: BusinessAlignmentConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type BusinessAlignmentValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type BusinessAlignmentValidationInput = {
  artifact: unknown;
  sourceDigitalBusinessTwin?: DigitalBusinessTwinArtifact;
  sourceBusinessUnderstandingReport?: BusinessUnderstandingReportArtifact;
};

export const BUSINESS_ALIGNMENT_FORBIDDEN_FIELDS = [
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "providerPayload",
  "prompt",
  "generatedContent",
  "generatedReact",
  "generatedHtml",
  "generatedComponents",
  "generatedBlocks",
  "AIOutput",
  "aiOutput",
  "publishingArtifact",
  "deploymentArtifact",
  "executionArtifact",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTraversable(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if (!isTraversable(value) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (BUSINESS_ALIGNMENT_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Business Alignment artifacts`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateStringArray(value: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const values: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") errors.push(`${path}[${index}] must be a string`);
    else values.push(item);
  }
  return values;
}

function validateConfidence(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (value.level !== "LOW" && value.level !== "MEDIUM" && value.level !== "HIGH") {
    errors.push(`${path}.level must be LOW, MEDIUM, or HIGH`);
  }
  validateStringArray(value.reasons, `${path}.reasons`, errors);
}

function validateEvidenceRefs(
  value: unknown,
  path: string,
  errors: string[],
): DigitalBusinessTwinEvidenceRef[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const refs: DigitalBusinessTwinEvidenceRef[] = [];
  for (const [index, ref] of value.entries()) {
    const refPath = `${path}[${index}]`;
    if (!isObject(ref)) {
      errors.push(`${refPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(ref.refId)) errors.push(`${refPath}.refId is required`);
    if (!isNonEmptyString(ref.sourceKind)) errors.push(`${refPath}.sourceKind is required`);
    if (ref.routePath !== undefined && !isNonEmptyString(ref.routePath)) {
      errors.push(`${refPath}.routePath must be a non-empty string when present`);
    }
    if (ref.description !== undefined && !isNonEmptyString(ref.description)) {
      errors.push(`${refPath}.description must be a non-empty string when present`);
    }
    refs.push(ref as DigitalBusinessTwinEvidenceRef);
  }
  return refs;
}

function validateLineage(
  value: unknown,
  artifact: Record<string, unknown>,
  errors: string[],
): void {
  if (!isObject(value)) {
    errors.push("lineage is required");
    return;
  }
  if (!isNonEmptyString(value.siteVersionId)) errors.push("lineage.siteVersionId is required");
  if (!isNonEmptyString(value.dryRunId)) errors.push("lineage.dryRunId is required");
  if (!isNonEmptyString(value.sourceBusinessUnderstandingReportId)) {
    errors.push("lineage.sourceBusinessUnderstandingReportId is required");
  }
  if (!isNonEmptyString(value.sourceBusinessUnderstandingReportStatus)) {
    errors.push("lineage.sourceBusinessUnderstandingReportStatus is required");
  }
  if (!isNonEmptyString(value.sourceBusinessUnderstandingReportContractVersion)) {
    errors.push("lineage.sourceBusinessUnderstandingReportContractVersion is required");
  }
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinId)) {
    errors.push("lineage.sourceDigitalBusinessTwinId is required");
  }
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinStatus)) {
    errors.push("lineage.sourceDigitalBusinessTwinStatus is required");
  }
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinContractVersion)) {
    errors.push("lineage.sourceDigitalBusinessTwinContractVersion is required");
  }
  if (!isNonEmptyString(value.outputDigitalBusinessTwinId)) {
    errors.push("lineage.outputDigitalBusinessTwinId is required");
  }
  if (value.siteVersionId !== artifact.siteVersionId) {
    errors.push("lineage.siteVersionId must match siteVersionId");
  }
  if (value.dryRunId !== artifact.dryRunId) {
    errors.push("lineage.dryRunId must match dryRunId");
  }
  if (value.sourceBusinessUnderstandingReportId !== artifact.sourceBusinessUnderstandingReportId) {
    errors.push("lineage.sourceBusinessUnderstandingReportId must match sourceBusinessUnderstandingReportId");
  }
  if (value.sourceDigitalBusinessTwinId !== artifact.sourceDigitalBusinessTwinId) {
    errors.push("lineage.sourceDigitalBusinessTwinId must match sourceDigitalBusinessTwinId");
  }
  validateEvidenceRefs(value.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(value.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateDecision(
  value: unknown,
  path: string,
  correctionIds: Set<string>,
  errors: string[],
): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!isNonEmptyString(value.decisionId)) errors.push(`${path}.decisionId is required`);
  if (
    value.status !== "draft" &&
    value.status !== "reviewed" &&
    value.status !== "applied" &&
    value.status !== "blocked"
  ) {
    errors.push(`${path}.status must be draft, reviewed, applied, or blocked`);
  }
  const ids = validateStringArray(value.correctionIds, `${path}.correctionIds`, errors);
  for (const [index, correctionId] of ids.entries()) {
    if (!correctionIds.has(correctionId)) {
      errors.push(`${path}.correctionIds[${index}] must reference an existing correction`);
    }
  }
  if (!isNonEmptyString(value.summary)) errors.push(`${path}.summary is required`);
  if (value.decidedAt !== undefined && !isTimestamp(value.decidedAt)) {
    errors.push(`${path}.decidedAt must be a valid timestamp when present`);
  }
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
}

function validateCorrection(value: unknown, path: string, errors: string[]): BusinessAlignmentCorrection | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.correctionId)) errors.push(`${path}.correctionId is required`);
  if (!BUSINESS_ALIGNMENT_DOMAINS.includes(value.domain as never)) {
    errors.push(`${path}.domain is not an allowed Business Alignment domain`);
  }
  if (!BUSINESS_ALIGNMENT_CORRECTION_TYPES.includes(value.type as never)) {
    errors.push(`${path}.type is not an allowed Business Alignment correction type`);
  }
  if (value.targetKnowledgeItemId !== undefined && !isNonEmptyString(value.targetKnowledgeItemId)) {
    errors.push(`${path}.targetKnowledgeItemId must be a non-empty string when present`);
  }
  if (value.targetMissingKnowledgeId !== undefined && !isNonEmptyString(value.targetMissingKnowledgeId)) {
    errors.push(`${path}.targetMissingKnowledgeId must be a non-empty string when present`);
  }
  if (value.statement !== undefined && !isNonEmptyString(value.statement)) {
    errors.push(`${path}.statement must be a non-empty string when present`);
  }
  if (value.reason !== undefined && !isNonEmptyString(value.reason)) {
    errors.push(`${path}.reason must be a non-empty string when present`);
  }
  if ((value.type === "confirm" || value.type === "correct" || value.type === "remove") &&
    !isNonEmptyString(value.targetKnowledgeItemId)) {
    errors.push(`${path}.targetKnowledgeItemId is required for ${value.type} corrections`);
  }
  if ((value.type === "correct" || value.type === "add_missing") && !isNonEmptyString(value.statement)) {
    errors.push(`${path}.statement is required for ${value.type} corrections`);
  }
  if ((value.type === "remove" || value.type === "unresolved") && !isNonEmptyString(value.reason)) {
    errors.push(`${path}.reason is required for ${value.type} corrections`);
  }
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  if (value.confidence !== undefined) validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as BusinessAlignmentCorrection;
}

function validateSourceArtifacts(input: {
  artifact: Record<string, unknown>;
  sourceDigitalBusinessTwin?: DigitalBusinessTwinArtifact;
  sourceBusinessUnderstandingReport?: BusinessUnderstandingReportArtifact;
  errors: string[];
  warnings: string[];
}): void {
  if (input.sourceDigitalBusinessTwin) {
    const dbtValidation = validateDigitalBusinessTwinArtifact(input.sourceDigitalBusinessTwin);
    input.errors.push(...dbtValidation.errors.map((error) => `sourceDigitalBusinessTwin.${error}`));
    input.warnings.push(...dbtValidation.warnings.map((warning) => `sourceDigitalBusinessTwin.${warning}`));
    if (input.sourceDigitalBusinessTwin.digitalBusinessTwinId !== input.artifact.sourceDigitalBusinessTwinId) {
      input.errors.push("sourceDigitalBusinessTwin.digitalBusinessTwinId must match sourceDigitalBusinessTwinId");
    }
    if (input.sourceDigitalBusinessTwin.siteVersionId !== input.artifact.siteVersionId) {
      input.errors.push("sourceDigitalBusinessTwin.siteVersionId must match siteVersionId");
    }
    if (input.sourceDigitalBusinessTwin.dryRunId !== input.artifact.dryRunId) {
      input.errors.push("sourceDigitalBusinessTwin.dryRunId must match dryRunId");
    }
  }

  if (input.sourceBusinessUnderstandingReport) {
    const burValidation = validateBusinessUnderstandingReportArtifact(input.sourceBusinessUnderstandingReport);
    input.errors.push(...burValidation.errors.map((error) => `sourceBusinessUnderstandingReport.${error}`));
    input.warnings.push(...burValidation.warnings.map((warning) => `sourceBusinessUnderstandingReport.${warning}`));
    if (
      input.sourceBusinessUnderstandingReport.businessUnderstandingReportId !==
      input.artifact.sourceBusinessUnderstandingReportId
    ) {
      input.errors.push("sourceBusinessUnderstandingReport.businessUnderstandingReportId must match sourceBusinessUnderstandingReportId");
    }
    if (input.sourceBusinessUnderstandingReport.siteVersionId !== input.artifact.siteVersionId) {
      input.errors.push("sourceBusinessUnderstandingReport.siteVersionId must match siteVersionId");
    }
    if (input.sourceBusinessUnderstandingReport.dryRunId !== input.artifact.dryRunId) {
      input.errors.push("sourceBusinessUnderstandingReport.dryRunId must match dryRunId");
    }
    if (
      input.sourceBusinessUnderstandingReport.lineage.sourceDigitalBusinessTwinId !==
      input.artifact.sourceDigitalBusinessTwinId
    ) {
      input.errors.push("sourceBusinessUnderstandingReport lineage must reference sourceDigitalBusinessTwinId");
    }
  }
}

export function validateBusinessAlignment(
  validationInput: BusinessAlignmentValidationInput | BusinessAlignmentArtifact,
): BusinessAlignmentValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as BusinessAlignmentValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Business Alignment artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.businessAlignmentId)) errors.push("businessAlignmentId is required");
  if (!BUSINESS_ALIGNMENT_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Business Alignment status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceBusinessUnderstandingReportId)) {
    errors.push("sourceBusinessUnderstandingReportId is required");
  }
  if (!isNonEmptyString(artifact.sourceDigitalBusinessTwinId)) {
    errors.push("sourceDigitalBusinessTwinId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== BUSINESS_ALIGNMENT_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${BUSINESS_ALIGNMENT_CONTRACT_VERSION}`);
  }
  validateLineage(artifact.lineage, artifact, errors);

  const corrections: BusinessAlignmentCorrection[] = [];
  if (!Array.isArray(artifact.corrections)) {
    errors.push("corrections must be an array");
  } else {
    const correctionIds = new Set<string>();
    const correctionFingerprints = new Set<string>();
    for (const [index, correction] of artifact.corrections.entries()) {
      const validCorrection = validateCorrection(correction, `corrections[${index}]`, errors);
      if (!validCorrection) continue;
      if (correctionIds.has(validCorrection.correctionId)) {
        errors.push(`corrections[${index}].correctionId must be unique`);
      }
      correctionIds.add(validCorrection.correctionId);
      const fingerprint = [
        validCorrection.type,
        validCorrection.domain,
        validCorrection.targetKnowledgeItemId ?? "",
        validCorrection.targetMissingKnowledgeId ?? "",
        validCorrection.statement ?? "",
        validCorrection.reason ?? "",
      ].join("|");
      if (correctionFingerprints.has(fingerprint)) {
        errors.push(`corrections[${index}] duplicates another correction target and payload`);
      }
      correctionFingerprints.add(fingerprint);
      corrections.push(validCorrection);
    }
  }

  const correctionIds = new Set(corrections.map((correction) => correction.correctionId));
  if (!Array.isArray(artifact.decisions)) {
    errors.push("decisions must be an array");
  } else {
    const decisionIds = new Set<string>();
    for (const [index, decision] of artifact.decisions.entries()) {
      validateDecision(decision, `decisions[${index}]`, correctionIds, errors);
      if (isObject(decision) && isNonEmptyString(decision.decisionId)) {
        if (decisionIds.has(decision.decisionId)) {
          errors.push(`decisions[${index}].decisionId must be unique`);
        }
        decisionIds.add(decision.decisionId);
      }
    }
  }

  validateConfidence(artifact.confidence, "confidence", errors);
  validateStringArray(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSourceArtifacts({
    artifact,
    sourceDigitalBusinessTwin: input.sourceDigitalBusinessTwin,
    sourceBusinessUnderstandingReport: input.sourceBusinessUnderstandingReport,
    errors,
    warnings,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
