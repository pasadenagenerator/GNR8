/**
 * Phase MVP-1K-5 Generation Contract Compliance Report runtime contract.
 *
 * Explains a persisted GenerationContractComplianceArtifact in deterministic,
 * human-readable form. It does not recompute compliance, approve business
 * changes, grant publishing permission, call providers, execute AI, add UI/API
 * behavior, or mutate canonical business truth.
 */

import {
  GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION,
  GENERATION_CONTRACT_COMPLIANCE_STATUSES,
  COMPLIANCE_CATEGORIES,
  type ComplianceCategory,
  type GenerationContractComplianceArtifact,
  type GenerationContractComplianceStatus,
} from "./generation-contract-compliance-contract";

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION = "MVP-1K-5" as const;

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES = [
  "draft",
  "partial",
  "ready",
  "blocked",
  "invalid",
  "stale",
] as const;
export type GenerationContractComplianceReportStatus =
  (typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES)[number];

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_RECOMMENDATIONS = [
  "proceed_to_approval",
  "regenerate",
  "improve_wgp",
  "repeat_business_alignment",
  "insufficient_evidence",
  "human_review_required",
] as const;
export type GenerationContractComplianceReportRecommendationKind =
  (typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_RECOMMENDATIONS)[number];

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_READINESS_STATUSES = [
  "ready",
  "ready_with_limitations",
  "requires_regeneration",
  "requires_alignment",
  "blocked",
] as const;
export type GenerationContractComplianceReportReadinessStatus =
  (typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_READINESS_STATUSES)[number];

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_SECTION_KINDS = [
  "executive_summary",
  "overall_compliance",
  "business_compliance",
  "experience_compliance",
  "implementation_observability",
  "category_results",
  "deviations",
  "missing_requirements",
  "constraint_violations",
  "business_risks",
  "recommendation",
  "generation_readiness",
  "limitations",
  "evidence_summary",
  "lineage",
  "diagnostics",
] as const;
export type GenerationContractComplianceReportSectionKind =
  (typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_SECTION_KINDS)[number];

export type GenerationContractComplianceReportItemStatus =
  | "pass"
  | "partial"
  | "fail"
  | "info"
  | "blocked"
  | "not_observable";

export type GenerationContractComplianceReportItem = {
  itemId: string;
  label: string;
  status: GenerationContractComplianceReportItemStatus;
  summary: string;
  sourceIds: string[];
  evidenceIds: string[];
  diagnostics: string[];
};

export type GenerationContractComplianceReportSection = {
  sectionId: string;
  kind: GenerationContractComplianceReportSectionKind;
  title: string;
  status: GenerationContractComplianceReportStatus;
  summary: string;
  items: GenerationContractComplianceReportItem[];
  diagnostics: string[];
};

export type GenerationContractComplianceReportOverallCompliance = {
  sourceComplianceStatus: GenerationContractComplianceStatus;
  reportStatus: GenerationContractComplianceReportStatus;
  fulfilledFindingCount: number;
  partialFindingCount: number;
  deviationFindingCount: number;
  deviationCount: number;
  limitationCount: number;
  evidenceCount: number;
  categoryStatusCounts: Record<GenerationContractComplianceStatus, number>;
  summary: string;
};

export type GenerationContractComplianceReportCategoryResult = {
  category: ComplianceCategory;
  sourceStatus: GenerationContractComplianceStatus;
  reportItemStatus: GenerationContractComplianceReportItemStatus;
  sourceRequirementIds: string[];
  findingIds: string[];
  deviationIds: string[];
  limitationIds: string[];
  evidenceIds: string[];
  summary: string;
  diagnostics: string[];
};

export type GenerationContractComplianceReportDeviation = {
  deviationId: string;
  category: ComplianceCategory;
  sourceRequirementId: string;
  severity: "required" | "recommended" | "limitation";
  description: string;
  businessImpact: string;
  evidenceIds: string[];
  diagnostics: string[];
};

export type GenerationContractComplianceReportMissingRequirement = {
  requirementId: string;
  category: ComplianceCategory;
  findingId: string;
  result: "partial" | "deviation";
  summary: string;
  evidenceIds: string[];
  diagnostics: string[];
};

export type GenerationContractComplianceReportBusinessRisk = {
  riskId: string;
  category: ComplianceCategory;
  severity: "low" | "medium" | "high" | "blocked";
  summary: string;
  sourceIds: string[];
  evidenceIds: string[];
};

export type GenerationContractComplianceReportRecommendation = {
  recommendation: GenerationContractComplianceReportRecommendationKind;
  rationale: string;
  sourceComplianceStatus: GenerationContractComplianceStatus;
  relatedDeviationIds: string[];
  relatedLimitationIds: string[];
  diagnostics: string[];
};

export type GenerationContractComplianceReportReadiness = {
  status: GenerationContractComplianceReportReadinessStatus;
  rationale: string;
  blockers: string[];
  deviationIds: string[];
  limitationIds: string[];
  diagnostics: string[];
};

export type GenerationContractComplianceReportEvidenceSummary = {
  evidenceCount: number;
  evidenceIds: string[];
  observedEvidenceRefIds: string[];
  summary: string;
};

export type GenerationContractComplianceReportLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceGenerationContractComplianceId: string;
  sourceGenerationContractComplianceStatus: GenerationContractComplianceStatus;
  sourceGenerationContractComplianceContractVersion: typeof GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  upstreamArtifactRefIds: string[];
};

export type GenerationContractComplianceReportArtifact = {
  generationContractComplianceReportId: string;
  status: GenerationContractComplianceReportStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceGenerationContractComplianceId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  createdAt: string;
  contractVersion: typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION;
  executiveSummary: GenerationContractComplianceReportSection;
  overallCompliance: GenerationContractComplianceReportOverallCompliance;
  businessCompliance: GenerationContractComplianceReportSection;
  experienceCompliance: GenerationContractComplianceReportSection;
  implementationObservability: GenerationContractComplianceReportSection;
  categoryResults: GenerationContractComplianceReportCategoryResult[];
  deviations: GenerationContractComplianceReportDeviation[];
  missingRequirements: GenerationContractComplianceReportMissingRequirement[];
  constraintViolations: GenerationContractComplianceReportDeviation[];
  businessRisks: GenerationContractComplianceReportBusinessRisk[];
  recommendation: GenerationContractComplianceReportRecommendation;
  generationReadiness: GenerationContractComplianceReportReadiness;
  limitations: GenerationContractComplianceReportSection;
  evidenceSummary: GenerationContractComplianceReportEvidenceSummary;
  lineage: GenerationContractComplianceReportLineage;
  diagnostics: string[];
};

export type GenerationContractComplianceReportValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type GenerationContractComplianceReportValidationInput = {
  artifact: unknown;
  sourceGenerationContractCompliance?: GenerationContractComplianceArtifact;
};

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_FORBIDDEN_FIELDS = [
  "businessApproval",
  "publishingArtifact",
  "publishingPermission",
  "deploymentArtifact",
  "dnsMutation",
  "productionMutation",
  "runtimeMutation",
  "providerCall",
  "providerExecutionResult",
  "aiExecution",
  "canonicalTruthUpdate",
  "digitalBusinessTwinMutation",
  "websiteGenerationPackageMutation",
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
    if (GENERATION_CONTRACT_COMPLIANCE_REPORT_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Generation Contract Compliance Report artifacts`);
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
    if (!isNonEmptyString(item)) errors.push(`${path}[${index}] must be a non-empty string`);
    else values.push(item);
  }
  return values;
}

function validateSection(value: unknown, path: string, kind: GenerationContractComplianceReportSectionKind, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!isNonEmptyString(value.sectionId)) errors.push(`${path}.sectionId is required`);
  if (value.kind !== kind) errors.push(`${path}.kind must be ${kind}`);
  if (!isNonEmptyString(value.title)) errors.push(`${path}.title is required`);
  if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES.includes(value.status as never)) {
    errors.push(`${path}.status is not allowed`);
  }
  if (!isNonEmptyString(value.summary)) errors.push(`${path}.summary is required`);
  if (!Array.isArray(value.items)) {
    errors.push(`${path}.items must be an array`);
  } else {
    for (const [index, item] of value.items.entries()) {
      const itemPath = `${path}.items[${index}]`;
      if (!isObject(item)) {
        errors.push(`${itemPath} must be an object`);
        continue;
      }
      if (!isNonEmptyString(item.itemId)) errors.push(`${itemPath}.itemId is required`);
      if (!isNonEmptyString(item.label)) errors.push(`${itemPath}.label is required`);
      if (
        item.status !== "pass" &&
        item.status !== "partial" &&
        item.status !== "fail" &&
        item.status !== "info" &&
        item.status !== "blocked" &&
        item.status !== "not_observable"
      ) errors.push(`${itemPath}.status is not allowed`);
      if (!isNonEmptyString(item.summary)) errors.push(`${itemPath}.summary is required`);
      validateStringArray(item.sourceIds, `${itemPath}.sourceIds`, errors);
      validateStringArray(item.evidenceIds, `${itemPath}.evidenceIds`, errors);
      validateStringArray(item.diagnostics, `${itemPath}.diagnostics`, errors);
    }
  }
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
}

function validateOverallCompliance(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("overallCompliance must be an object");
    return;
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(value.sourceComplianceStatus as never)) {
    errors.push("overallCompliance.sourceComplianceStatus is not allowed");
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES.includes(value.reportStatus as never)) {
    errors.push("overallCompliance.reportStatus is not allowed");
  }
  for (const key of [
    "fulfilledFindingCount",
    "partialFindingCount",
    "deviationFindingCount",
    "deviationCount",
    "limitationCount",
    "evidenceCount",
  ]) {
    if (!Number.isInteger(value[key]) || Number(value[key]) < 0) {
      errors.push(`overallCompliance.${key} must be a non-negative integer`);
    }
  }
  if (!isObject(value.categoryStatusCounts)) {
    errors.push("overallCompliance.categoryStatusCounts must be an object");
  } else {
    for (const status of GENERATION_CONTRACT_COMPLIANCE_STATUSES) {
      if (!Number.isInteger(value.categoryStatusCounts[status]) || Number(value.categoryStatusCounts[status]) < 0) {
        errors.push(`overallCompliance.categoryStatusCounts.${status} must be a non-negative integer`);
      }
    }
  }
  if (!isNonEmptyString(value.summary)) errors.push("overallCompliance.summary is required");
}

function validateCategoryResults(value: unknown, errors: string[]): Set<string> {
  const categoryNames = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push("categoryResults must be an array");
    return categoryNames;
  }
  for (const [index, item] of value.entries()) {
    const path = `categoryResults[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    else categoryNames.add(item.category as string);
    if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(item.sourceStatus as never)) {
      errors.push(`${path}.sourceStatus is not allowed`);
    }
    validateStringArray(item.sourceRequirementIds, `${path}.sourceRequirementIds`, errors);
    validateStringArray(item.findingIds, `${path}.findingIds`, errors);
    validateStringArray(item.deviationIds, `${path}.deviationIds`, errors);
    validateStringArray(item.limitationIds, `${path}.limitationIds`, errors);
    validateStringArray(item.evidenceIds, `${path}.evidenceIds`, errors);
    if (!isNonEmptyString(item.summary)) errors.push(`${path}.summary is required`);
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
  for (const category of COMPLIANCE_CATEGORIES) {
    if (!categoryNames.has(category)) errors.push(`categoryResults must include ${category}`);
  }
  return categoryNames;
}

function validateDeviations(value: unknown, path: string, errors: string[]): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return ids;
  }
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isObject(item)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.deviationId)) errors.push(`${itemPath}.deviationId is required`);
    else ids.add(item.deviationId);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${itemPath}.category is not allowed`);
    if (!isNonEmptyString(item.sourceRequirementId)) errors.push(`${itemPath}.sourceRequirementId is required`);
    if (item.severity !== "required" && item.severity !== "recommended" && item.severity !== "limitation") {
      errors.push(`${itemPath}.severity is not allowed`);
    }
    if (!isNonEmptyString(item.description)) errors.push(`${itemPath}.description is required`);
    if (!isNonEmptyString(item.businessImpact)) errors.push(`${itemPath}.businessImpact is required`);
    validateStringArray(item.evidenceIds, `${itemPath}.evidenceIds`, errors);
    validateStringArray(item.diagnostics, `${itemPath}.diagnostics`, errors);
  }
  return ids;
}

function validateMissingRequirements(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("missingRequirements must be an array");
    return;
  }
  for (const [index, item] of value.entries()) {
    const path = `missingRequirements[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.requirementId)) errors.push(`${path}.requirementId is required`);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (!isNonEmptyString(item.findingId)) errors.push(`${path}.findingId is required`);
    if (item.result !== "partial" && item.result !== "deviation") errors.push(`${path}.result is not allowed`);
    if (!isNonEmptyString(item.summary)) errors.push(`${path}.summary is required`);
    validateStringArray(item.evidenceIds, `${path}.evidenceIds`, errors);
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
}

function validateBusinessRisks(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("businessRisks must be an array");
    return;
  }
  for (const [index, item] of value.entries()) {
    const path = `businessRisks[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.riskId)) errors.push(`${path}.riskId is required`);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (item.severity !== "low" && item.severity !== "medium" && item.severity !== "high" && item.severity !== "blocked") {
      errors.push(`${path}.severity is not allowed`);
    }
    if (!isNonEmptyString(item.summary)) errors.push(`${path}.summary is required`);
    validateStringArray(item.sourceIds, `${path}.sourceIds`, errors);
    validateStringArray(item.evidenceIds, `${path}.evidenceIds`, errors);
  }
}

function validateRecommendation(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("recommendation must be an object");
    return;
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_RECOMMENDATIONS.includes(value.recommendation as never)) {
    errors.push("recommendation.recommendation is not allowed");
  }
  if (!isNonEmptyString(value.rationale)) errors.push("recommendation.rationale is required");
  if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(value.sourceComplianceStatus as never)) {
    errors.push("recommendation.sourceComplianceStatus is not allowed");
  }
  validateStringArray(value.relatedDeviationIds, "recommendation.relatedDeviationIds", errors);
  validateStringArray(value.relatedLimitationIds, "recommendation.relatedLimitationIds", errors);
  validateStringArray(value.diagnostics, "recommendation.diagnostics", errors);
}

function validateReadiness(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("generationReadiness must be an object");
    return;
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_READINESS_STATUSES.includes(value.status as never)) {
    errors.push("generationReadiness.status is not allowed");
  }
  if (!isNonEmptyString(value.rationale)) errors.push("generationReadiness.rationale is required");
  validateStringArray(value.blockers, "generationReadiness.blockers", errors);
  validateStringArray(value.deviationIds, "generationReadiness.deviationIds", errors);
  validateStringArray(value.limitationIds, "generationReadiness.limitationIds", errors);
  validateStringArray(value.diagnostics, "generationReadiness.diagnostics", errors);
}

function validateEvidenceSummary(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("evidenceSummary must be an object");
    return;
  }
  if (!Number.isInteger(value.evidenceCount) || Number(value.evidenceCount) < 0) {
    errors.push("evidenceSummary.evidenceCount must be a non-negative integer");
  }
  validateStringArray(value.evidenceIds, "evidenceSummary.evidenceIds", errors);
  validateStringArray(value.observedEvidenceRefIds, "evidenceSummary.observedEvidenceRefIds", errors);
  if (!isNonEmptyString(value.summary)) errors.push("evidenceSummary.summary is required");
}

function validateLineage(
  value: unknown,
  artifact: Record<string, unknown>,
  errors: string[],
): void {
  if (!isObject(value)) {
    errors.push("lineage must be an object");
    return;
  }
  for (const key of [
    "siteVersionId",
    "dryRunId",
    "sourceGenerationContractComplianceId",
    "sourceGenerationContractComplianceStatus",
    "sourceGenerationContractComplianceContractVersion",
    "sourceWebsiteGenerationPackageId",
    "sourceObservedWebsiteModelId",
  ]) {
    if (!isNonEmptyString(value[key])) errors.push(`lineage.${key} is required`);
  }
  if (value.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (value.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (value.sourceGenerationContractComplianceId !== artifact.sourceGenerationContractComplianceId) {
    errors.push("lineage.sourceGenerationContractComplianceId must match sourceGenerationContractComplianceId");
  }
  if (value.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (value.sourceObservedWebsiteModelId !== artifact.sourceObservedWebsiteModelId) {
    errors.push("lineage.sourceObservedWebsiteModelId must match sourceObservedWebsiteModelId");
  }
  if (value.sourceGenerationContractComplianceContractVersion !== GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION) {
    errors.push(`lineage.sourceGenerationContractComplianceContractVersion must be ${GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION}`);
  }
  validateStringArray(value.upstreamArtifactRefIds, "lineage.upstreamArtifactRefIds", errors);
}

function validateSource(
  artifact: Record<string, unknown>,
  source: GenerationContractComplianceArtifact | undefined,
  errors: string[],
): void {
  if (!source) return;
  if (source.generationContractComplianceId !== artifact.sourceGenerationContractComplianceId) {
    errors.push("sourceGenerationContractCompliance.generationContractComplianceId must match sourceGenerationContractComplianceId");
  }
  if (source.siteVersionId !== artifact.siteVersionId) {
    errors.push("sourceGenerationContractCompliance.siteVersionId must match siteVersionId");
  }
  if (source.dryRunId !== artifact.dryRunId) {
    errors.push("sourceGenerationContractCompliance.dryRunId must match dryRunId");
  }
  if (source.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("sourceGenerationContractCompliance.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (source.sourceObservedWebsiteModelId !== artifact.sourceObservedWebsiteModelId) {
    errors.push("sourceGenerationContractCompliance.sourceObservedWebsiteModelId must match sourceObservedWebsiteModelId");
  }
}

export function validateGenerationContractComplianceReport(
  validationInput: GenerationContractComplianceReportValidationInput | GenerationContractComplianceReportArtifact,
): GenerationContractComplianceReportValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as GenerationContractComplianceReportValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Generation Contract Compliance Report artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());
  if (!isNonEmptyString(artifact.generationContractComplianceReportId)) {
    errors.push("generationContractComplianceReportId is required");
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Generation Contract Compliance Report status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceGenerationContractComplianceId)) {
    errors.push("sourceGenerationContractComplianceId is required");
  }
  if (!isNonEmptyString(artifact.sourceWebsiteGenerationPackageId)) {
    errors.push("sourceWebsiteGenerationPackageId is required");
  }
  if (!isNonEmptyString(artifact.sourceObservedWebsiteModelId)) {
    errors.push("sourceObservedWebsiteModelId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION}`);
  }

  validateSection(artifact.executiveSummary, "executiveSummary", "executive_summary", errors);
  validateOverallCompliance(artifact.overallCompliance, errors);
  validateSection(artifact.businessCompliance, "businessCompliance", "business_compliance", errors);
  validateSection(artifact.experienceCompliance, "experienceCompliance", "experience_compliance", errors);
  validateSection(artifact.implementationObservability, "implementationObservability", "implementation_observability", errors);
  validateCategoryResults(artifact.categoryResults, errors);
  const deviationIds = validateDeviations(artifact.deviations, "deviations", errors);
  validateMissingRequirements(artifact.missingRequirements, errors);
  const constraintViolationIds = validateDeviations(artifact.constraintViolations, "constraintViolations", errors);
  for (const id of constraintViolationIds) {
    if (!deviationIds.has(id)) errors.push(`constraintViolations references missing deviation ${id}`);
  }
  validateBusinessRisks(artifact.businessRisks, errors);
  validateRecommendation(artifact.recommendation, errors);
  validateReadiness(artifact.generationReadiness, errors);
  validateSection(artifact.limitations, "limitations", "limitations", errors);
  validateEvidenceSummary(artifact.evidenceSummary, errors);
  validateLineage(artifact.lineage, artifact, errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSource(artifact, input.sourceGenerationContractCompliance, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
