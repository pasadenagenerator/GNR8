/**
 * Phase MVP-2.0-F Generation Improvement Plan runtime contract.
 *
 * Translates a persisted GenerationContractComplianceReportArtifact into
 * provider-neutral regeneration instructions. It does not regenerate a
 * website, mutate WGP/compliance/report artifacts, create provider payloads,
 * call providers, execute AI, approve, publish, deploy, or add UI/API/workers.
 */

import {
  GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION,
  GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES,
  type GenerationContractComplianceReportArtifact,
  type GenerationContractComplianceReportStatus,
} from "./generation-contract-compliance-report-contract";

export const GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION = "MVP-2.0-F" as const;

export const GENERATION_IMPROVEMENT_STATUSES = [
  "draft",
  "ready",
  "blocked",
  "invalid",
  "stale",
] as const;
export type GenerationImprovementStatus = (typeof GENERATION_IMPROVEMENT_STATUSES)[number];

export const GENERATION_IMPROVEMENT_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;
export type GenerationImprovementPriority = (typeof GENERATION_IMPROVEMENT_PRIORITIES)[number];

export const GENERATION_IMPROVEMENT_CATEGORIES = [
  "Business Positioning",
  "Audience",
  "Navigation",
  "Messages",
  "Sections",
  "Trust",
  "Assets",
  "Accessibility",
  "SEO",
  "Constraints",
  "Other",
] as const;
export type GenerationImprovementCategory = (typeof GENERATION_IMPROVEMENT_CATEGORIES)[number];

export const GENERATION_IMPROVEMENT_RECOMMENDED_NEXT_ACTIONS = [
  "regenerate",
  "collect_more_information",
  "human_review",
  "stop",
] as const;
export type GenerationImprovementRecommendedNextAction =
  (typeof GENERATION_IMPROVEMENT_RECOMMENDED_NEXT_ACTIONS)[number];

export const GENERATION_IMPROVEMENT_REGENERATION_READINESS = [
  "ready",
  "needs_information",
  "human_review_required",
  "blocked",
] as const;
export type GenerationImprovementRegenerationReadiness =
  (typeof GENERATION_IMPROVEMENT_REGENERATION_READINESS)[number];

export type GenerationImprovementEvidenceReference = {
  evidenceId: string;
  source: "compliance_report";
};

export type GenerationImprovementAction = {
  actionId: string;
  category: GenerationImprovementCategory;
  priority: GenerationImprovementPriority;
  businessExplanation: string;
  originatingDeviationIds: string[];
  originatingRequirementIds: string[];
  expectedImprovementOutcome: string;
  evidenceReferences: GenerationImprovementEvidenceReference[];
  diagnostics: string[];
};

export type GenerationImprovementPriorityCounts = Record<GenerationImprovementPriority, number>;
export type GenerationImprovementCategorySummary = Partial<Record<GenerationImprovementCategory, number>>;

export type GenerationImprovementPlanSummary = {
  summary: string;
  improvementCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categorySummary: GenerationImprovementCategorySummary;
  estimatedRegenerationReadiness: GenerationImprovementRegenerationReadiness;
  recommendedNextAction: GenerationImprovementRecommendedNextAction;
};

export type GenerationImprovementLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceGenerationContractComplianceReportId: string;
  sourceGenerationContractComplianceReportStatus: GenerationContractComplianceReportStatus;
  sourceGenerationContractComplianceReportContractVersion: typeof GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION;
  sourceGenerationContractComplianceId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  upstreamArtifactRefIds: string[];
};

export type GenerationImprovementPlanArtifact = {
  generationImprovementPlanId: string;
  status: GenerationImprovementStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceGenerationContractComplianceReportId: string;
  sourceGenerationContractComplianceId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  createdAt: string;
  contractVersion: typeof GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION;
  summary: GenerationImprovementPlanSummary;
  actions: GenerationImprovementAction[];
  lineage: GenerationImprovementLineage;
  sourceReportIntegrity: {
    valid: boolean;
    status: GenerationContractComplianceReportStatus;
    recommendation: GenerationContractComplianceReportArtifact["recommendation"]["recommendation"];
    generationReadiness: GenerationContractComplianceReportArtifact["generationReadiness"]["status"];
    deviationCount: number;
    missingRequirementCount: number;
    businessRiskCount: number;
    evidenceCount: number;
    limitationCount: number;
  };
  diagnostics: string[];
};

export type GenerationImprovementValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type GenerationImprovementPlanValidationInput = {
  artifact: unknown;
  sourceGenerationContractComplianceReport?: GenerationContractComplianceReportArtifact;
};

export const GENERATION_IMPROVEMENT_PLAN_FORBIDDEN_FIELDS = [
  "providerPrompt",
  "prompt",
  "html",
  "react",
  "css",
  "framework",
  "implementationInstructions",
  "providerPayload",
  "providerPayloadV2",
  "providerCall",
  "providerExecution",
  "aiExecution",
  "regeneratedWebsite",
  "businessApproval",
  "publishingArtifact",
  "publishingPermission",
  "deploymentArtifact",
  "dnsMutation",
  "productionMutation",
  "websiteGenerationPackageMutation",
  "generationContractComplianceMutation",
  "generationContractComplianceReportMutation",
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
    if (GENERATION_IMPROVEMENT_PLAN_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Generation Improvement Plan artifacts`);
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

function validateEvidenceReferences(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isObject(item)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.evidenceId)) errors.push(`${itemPath}.evidenceId is required`);
    if (item.source !== "compliance_report") errors.push(`${itemPath}.source must be compliance_report`);
  }
}

function validateSummary(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("summary must be an object");
    return;
  }
  if (!isNonEmptyString(value.summary)) errors.push("summary.summary is required");
  for (const key of ["improvementCount", "criticalCount", "highCount", "mediumCount", "lowCount"]) {
    if (!Number.isInteger(value[key]) || Number(value[key]) < 0) {
      errors.push(`summary.${key} must be a non-negative integer`);
    }
  }
  if (!isObject(value.categorySummary)) errors.push("summary.categorySummary must be an object");
  else {
    for (const [category, count] of Object.entries(value.categorySummary)) {
      if (!GENERATION_IMPROVEMENT_CATEGORIES.includes(category as never)) {
        errors.push(`summary.categorySummary.${category} is not an allowed improvement category`);
      }
      if (!Number.isInteger(count) || Number(count) < 0) {
        errors.push(`summary.categorySummary.${category} must be a non-negative integer`);
      }
    }
  }
  if (!GENERATION_IMPROVEMENT_REGENERATION_READINESS.includes(value.estimatedRegenerationReadiness as never)) {
    errors.push("summary.estimatedRegenerationReadiness is not allowed");
  }
  if (!GENERATION_IMPROVEMENT_RECOMMENDED_NEXT_ACTIONS.includes(value.recommendedNextAction as never)) {
    errors.push("summary.recommendedNextAction is not allowed");
  }
  const total =
    Number(value.criticalCount ?? 0) +
    Number(value.highCount ?? 0) +
    Number(value.mediumCount ?? 0) +
    Number(value.lowCount ?? 0);
  if (Number.isInteger(value.improvementCount) && total !== value.improvementCount) {
    errors.push("summary priority counts must equal improvementCount");
  }
}

function validateActions(value: unknown, errors: string[]): Set<string> {
  const actionIds = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push("actions must be an array");
    return actionIds;
  }
  for (const [index, item] of value.entries()) {
    const path = `actions[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.actionId)) errors.push(`${path}.actionId is required`);
    else if (actionIds.has(item.actionId)) errors.push(`${path}.actionId must be unique`);
    else actionIds.add(item.actionId);
    if (!GENERATION_IMPROVEMENT_CATEGORIES.includes(item.category as never)) {
      errors.push(`${path}.category is not allowed`);
    }
    if (!GENERATION_IMPROVEMENT_PRIORITIES.includes(item.priority as never)) {
      errors.push(`${path}.priority is not allowed`);
    }
    if (!isNonEmptyString(item.businessExplanation)) errors.push(`${path}.businessExplanation is required`);
    validateStringArray(item.originatingDeviationIds, `${path}.originatingDeviationIds`, errors);
    validateStringArray(item.originatingRequirementIds, `${path}.originatingRequirementIds`, errors);
    if (!isNonEmptyString(item.expectedImprovementOutcome)) errors.push(`${path}.expectedImprovementOutcome is required`);
    validateEvidenceReferences(item.evidenceReferences, `${path}.evidenceReferences`, errors);
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
  return actionIds;
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
    "sourceGenerationContractComplianceReportId",
    "sourceGenerationContractComplianceReportStatus",
    "sourceGenerationContractComplianceReportContractVersion",
    "sourceGenerationContractComplianceId",
    "sourceWebsiteGenerationPackageId",
    "sourceObservedWebsiteModelId",
  ]) {
    if (!isNonEmptyString(value[key])) errors.push(`lineage.${key} is required`);
  }
  if (value.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (value.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (value.sourceGenerationContractComplianceReportId !== artifact.sourceGenerationContractComplianceReportId) {
    errors.push("lineage.sourceGenerationContractComplianceReportId must match sourceGenerationContractComplianceReportId");
  }
  if (value.sourceGenerationContractComplianceId !== artifact.sourceGenerationContractComplianceId) {
    errors.push("lineage.sourceGenerationContractComplianceId must match sourceGenerationContractComplianceId");
  }
  if (value.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (value.sourceObservedWebsiteModelId !== artifact.sourceObservedWebsiteModelId) {
    errors.push("lineage.sourceObservedWebsiteModelId must match sourceObservedWebsiteModelId");
  }
  if (value.sourceGenerationContractComplianceReportContractVersion !== GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION) {
    errors.push(`lineage.sourceGenerationContractComplianceReportContractVersion must be ${GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION}`);
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES.includes(value.sourceGenerationContractComplianceReportStatus as never)) {
    errors.push("lineage.sourceGenerationContractComplianceReportStatus is not allowed");
  }
  validateStringArray(value.upstreamArtifactRefIds, "lineage.upstreamArtifactRefIds", errors);
}

function validateSourceReport(
  artifact: Record<string, unknown>,
  source: GenerationContractComplianceReportArtifact | undefined,
  errors: string[],
): void {
  if (!source) return;
  if (source.generationContractComplianceReportId !== artifact.sourceGenerationContractComplianceReportId) {
    errors.push("sourceGenerationContractComplianceReport.generationContractComplianceReportId must match sourceGenerationContractComplianceReportId");
  }
  if (source.siteVersionId !== artifact.siteVersionId) {
    errors.push("sourceGenerationContractComplianceReport.siteVersionId must match siteVersionId");
  }
  if (source.dryRunId !== artifact.dryRunId) {
    errors.push("sourceGenerationContractComplianceReport.dryRunId must match dryRunId");
  }
  if (source.sourceGenerationContractComplianceId !== artifact.sourceGenerationContractComplianceId) {
    errors.push("sourceGenerationContractComplianceReport.sourceGenerationContractComplianceId must match sourceGenerationContractComplianceId");
  }
  if (source.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("sourceGenerationContractComplianceReport.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (source.sourceObservedWebsiteModelId !== artifact.sourceObservedWebsiteModelId) {
    errors.push("sourceGenerationContractComplianceReport.sourceObservedWebsiteModelId must match sourceObservedWebsiteModelId");
  }
}

export function validateGenerationImprovementPlan(
  validationInput: GenerationImprovementPlanValidationInput | GenerationImprovementPlanArtifact,
): GenerationImprovementValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as GenerationImprovementPlanValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Generation Improvement Plan artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());
  if (!isNonEmptyString(artifact.generationImprovementPlanId)) {
    errors.push("generationImprovementPlanId is required");
  }
  if (!GENERATION_IMPROVEMENT_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Generation Improvement Plan status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceGenerationContractComplianceReportId)) {
    errors.push("sourceGenerationContractComplianceReportId is required");
  }
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
  if (artifact.contractVersion !== GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION}`);
  }
  validateSummary(artifact.summary, errors);
  const actionIds = validateActions(artifact.actions, errors);
  validateLineage(artifact.lineage, artifact, errors);
  if (!isObject(artifact.sourceReportIntegrity)) {
    errors.push("sourceReportIntegrity must be an object");
  } else {
    if (artifact.sourceReportIntegrity.valid !== true) errors.push("sourceReportIntegrity.valid must be true");
    if (!GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUSES.includes(artifact.sourceReportIntegrity.status as never)) {
      errors.push("sourceReportIntegrity.status is not allowed");
    }
    for (const key of ["deviationCount", "missingRequirementCount", "businessRiskCount", "evidenceCount", "limitationCount"]) {
      if (!Number.isInteger(artifact.sourceReportIntegrity[key]) || Number(artifact.sourceReportIntegrity[key]) < 0) {
        errors.push(`sourceReportIntegrity.${key} must be a non-negative integer`);
      }
    }
  }
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSourceReport(artifact, input.sourceGenerationContractComplianceReport, errors);
  if (isObject(artifact.summary) && Number.isInteger(artifact.summary.improvementCount)) {
    if (actionIds.size !== artifact.summary.improvementCount) {
      errors.push("actions length must equal summary.improvementCount");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
