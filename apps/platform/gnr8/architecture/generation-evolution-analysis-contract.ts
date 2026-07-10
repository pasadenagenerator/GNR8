/**
 * Phase MVP-2.0-M Generation Evolution Analysis runtime contract.
 *
 * Compares two persisted GenerationContractComplianceArtifact records from
 * different iterations of the same Website Generation Package. It does not
 * recompute compliance, create reports or improvement plans, call providers,
 * execute AI, approve, publish, deploy, mutate DNS/production/runtime state,
 * or update canonical business truth.
 */

import {
  COMPLIANCE_CATEGORIES,
  GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION,
  GENERATION_CONTRACT_COMPLIANCE_STATUSES,
  validateGenerationContractCompliance,
  type ComplianceCategory,
  type GenerationContractComplianceArtifact,
  type GenerationContractComplianceStatus,
} from "./generation-contract-compliance-contract";

export const GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION = "MVP-2.0-M" as const;

export const GENERATION_EVOLUTION_STATUSES = [
  "improved",
  "unchanged",
  "regressed",
  "mixed",
  "blocked",
  "invalid",
  "stale",
] as const;
export type GenerationEvolutionStatus = (typeof GENERATION_EVOLUTION_STATUSES)[number];

export const GENERATION_CATEGORY_EVOLUTION_TRANSITIONS = [
  "improved",
  "unchanged",
  "regressed",
  "newly_compliant",
  "newly_non_compliant",
  "evidence_improved",
  "still_partial",
  "still_non_compliant",
  "not_comparable",
] as const;
export type GenerationCategoryEvolutionTransition =
  (typeof GENERATION_CATEGORY_EVOLUTION_TRANSITIONS)[number];

export const GENERATION_EVOLUTION_OVERALL_ASSESSMENTS = [
  "meaningful_improvement",
  "limited_improvement",
  "no_demonstrated_improvement",
  "regression",
  "mixed_result",
  "insufficient_evidence",
] as const;
export type GenerationEvolutionOverallAssessment =
  (typeof GENERATION_EVOLUTION_OVERALL_ASSESSMENTS)[number];

export const GENERATION_EVOLUTION_RECOMMENDED_NEXT_ACTIONS = [
  "create_compliance_report_v2",
  "create_improvement_plan_v2",
  "regenerate_again",
  "human_review",
  "collect_more_evidence",
  "stop",
] as const;
export type GenerationEvolutionRecommendedNextAction =
  (typeof GENERATION_EVOLUTION_RECOMMENDED_NEXT_ACTIONS)[number];

export const GENERATION_IMPROVEMENT_OUTCOMES = [
  "observed_improvement",
  "no_demonstrated_improvement",
  "regression",
  "insufficient_evidence",
] as const;
export type GenerationImprovementOutcomeStatus =
  (typeof GENERATION_IMPROVEMENT_OUTCOMES)[number];

export type GenerationIterationReference = {
  iteration: number;
  complianceArtifactId: string;
  generationContractComplianceId: string;
  status: GenerationContractComplianceStatus;
  sourceObservedWebsiteModelId: string;
  createdAt: string;
  categoryCount: number;
};

export type GenerationEvolutionAnalysisLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  previousGenerationContractComplianceId: string;
  currentGenerationContractComplianceId: string;
  previousObservedWebsiteModelId: string;
  currentObservedWebsiteModelId: string;
  previousIteration: number;
  currentIteration: number;
  sourceGenerationImprovementPlanArtifactId?: string;
  sourceGenerationImprovementPlanId?: string;
  sourceComplianceContractVersion: typeof GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION;
  upstreamArtifactRefIds: string[];
};

export type GenerationCategoryEvolution = {
  category: ComplianceCategory;
  transition: GenerationCategoryEvolutionTransition;
  previousStatus: GenerationContractComplianceStatus;
  currentStatus: GenerationContractComplianceStatus;
  previousFindingCount: number;
  currentFindingCount: number;
  previousDeviationCount: number;
  currentDeviationCount: number;
  previousEvidenceCount: number;
  currentEvidenceCount: number;
  previousLimitationCount: number;
  currentLimitationCount: number;
  previousFindingIds: string[];
  currentFindingIds: string[];
  previousDeviationIds: string[];
  currentDeviationIds: string[];
  previousEvidenceIds: string[];
  currentEvidenceIds: string[];
  previousLimitationIds: string[];
  currentLimitationIds: string[];
  diagnostics: string[];
};

export type GenerationMetricDelta = {
  metric:
    | "compliant_category_count"
    | "partial_category_count"
    | "non_compliant_category_count"
    | "finding_count"
    | "deviation_count"
    | "evidence_record_count"
    | "limitation_count"
    | "confidence";
  previous: number | null;
  current: number | null;
  delta: number | null;
  comparable: boolean;
  diagnostics: string[];
};

export type GenerationImprovementOutcome = {
  sourceGenerationImprovementPlanArtifactId?: string;
  sourceGenerationImprovementPlanId?: string;
  category: string;
  outcome: GenerationImprovementOutcomeStatus;
  actionCount: number;
  actionIds: string[];
  originatingDeviationIds: string[];
  relatedComplianceCategory?: ComplianceCategory;
  relatedCategoryTransition?: GenerationCategoryEvolutionTransition;
  diagnostics: string[];
};

export type GenerationRegression = {
  regressionId: string;
  category: ComplianceCategory;
  previousStatus: GenerationContractComplianceStatus;
  currentStatus: GenerationContractComplianceStatus;
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  severity: "category_status" | "deviation_increase" | "limitation_increase";
  evidenceIds: string[];
  diagnostics: string[];
};

export type GenerationEvolutionConfidence = {
  level: "LOW" | "MEDIUM" | "HIGH";
  comparable: boolean;
  reasons: string[];
};

export type GenerationEvolutionAnalysisArtifact = {
  generationEvolutionAnalysisId: string;
  status: GenerationEvolutionStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  previousIteration: GenerationIterationReference;
  currentIteration: GenerationIterationReference;
  createdAt: string;
  contractVersion: typeof GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION;
  lineage: GenerationEvolutionAnalysisLineage;
  categoryEvolution: GenerationCategoryEvolution[];
  metricDeltas: GenerationMetricDelta[];
  improvements: GenerationImprovementOutcome[];
  regressions: GenerationRegression[];
  unchangedAreas: ComplianceCategory[];
  unresolvedAreas: ComplianceCategory[];
  overallAssessment: GenerationEvolutionOverallAssessment;
  recommendedNextAction: GenerationEvolutionRecommendedNextAction;
  confidence: GenerationEvolutionConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type GenerationEvolutionValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type GenerationEvolutionAnalysisValidationInput = {
  artifact: unknown;
  previousCompliance?: GenerationContractComplianceArtifact;
  currentCompliance?: GenerationContractComplianceArtifact;
  previousComplianceArtifactId?: string;
  currentComplianceArtifactId?: string;
};

export const GENERATION_EVOLUTION_FORBIDDEN_FIELDS = [
  "complianceRecomputation",
  "complianceReportV2",
  "improvementPlanV2",
  "providerPayloadV3",
  "generatedWebsite",
  "providerExecution",
  "aiOutput",
  "businessApproval",
  "publishingArtifact",
  "deploymentArtifact",
  "dnsMutation",
  "productionMutation",
  "runtimeMutation",
  "canonicalTruthUpdate",
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
    if (GENERATION_EVOLUTION_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Generation Evolution Analysis artifacts`);
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

function validateIterationReference(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!Number.isInteger(value.iteration) || Number(value.iteration) < 1) {
    errors.push(`${path}.iteration must be a positive integer`);
  }
  for (const key of ["complianceArtifactId", "generationContractComplianceId", "sourceObservedWebsiteModelId"]) {
    if (!isNonEmptyString(value[key])) errors.push(`${path}.${key} is required`);
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(value.status as never)) {
    errors.push(`${path}.status is not allowed`);
  }
  if (!isTimestamp(value.createdAt)) errors.push(`${path}.createdAt must be a valid timestamp`);
  if (!Number.isInteger(value.categoryCount) || Number(value.categoryCount) < 0) {
    errors.push(`${path}.categoryCount must be a non-negative integer`);
  }
}

function validateLineage(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("lineage must be an object");
    return;
  }
  for (const key of [
    "siteVersionId",
    "dryRunId",
    "sourceWebsiteGenerationPackageId",
    "previousComplianceArtifactId",
    "currentComplianceArtifactId",
    "previousGenerationContractComplianceId",
    "currentGenerationContractComplianceId",
    "previousObservedWebsiteModelId",
    "currentObservedWebsiteModelId",
  ]) {
    if (!isNonEmptyString(value[key])) errors.push(`lineage.${key} is required`);
  }
  if (value.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (value.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (value.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (value.previousComplianceArtifactId !== artifact.previousComplianceArtifactId) {
    errors.push("lineage.previousComplianceArtifactId must match previousComplianceArtifactId");
  }
  if (value.currentComplianceArtifactId !== artifact.currentComplianceArtifactId) {
    errors.push("lineage.currentComplianceArtifactId must match currentComplianceArtifactId");
  }
  if (!Number.isInteger(value.previousIteration) || !Number.isInteger(value.currentIteration)) {
    errors.push("lineage iterations must be integers");
  } else if (Number(value.previousIteration) >= Number(value.currentIteration)) {
    errors.push("lineage.previousIteration must be less than lineage.currentIteration");
  }
  if (value.sourceComplianceContractVersion !== GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION) {
    errors.push(`lineage.sourceComplianceContractVersion must be ${GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION}`);
  }
  if (value.sourceGenerationImprovementPlanArtifactId !== undefined &&
    !isNonEmptyString(value.sourceGenerationImprovementPlanArtifactId)) {
    errors.push("lineage.sourceGenerationImprovementPlanArtifactId must be non-empty when present");
  }
  if (value.sourceGenerationImprovementPlanId !== undefined && !isNonEmptyString(value.sourceGenerationImprovementPlanId)) {
    errors.push("lineage.sourceGenerationImprovementPlanId must be non-empty when present");
  }
  validateStringArray(value.upstreamArtifactRefIds, "lineage.upstreamArtifactRefIds", errors);
}

function validateCategoryEvolution(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("categoryEvolution must be an array");
    return;
  }
  const categories = new Set<string>();
  for (const [index, item] of value.entries()) {
    const path = `categoryEvolution[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    else categories.add(item.category as string);
    if (!GENERATION_CATEGORY_EVOLUTION_TRANSITIONS.includes(item.transition as never)) {
      errors.push(`${path}.transition is not allowed`);
    }
    if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(item.previousStatus as never)) {
      errors.push(`${path}.previousStatus is not allowed`);
    }
    if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(item.currentStatus as never)) {
      errors.push(`${path}.currentStatus is not allowed`);
    }
    for (const key of [
      "previousFindingCount",
      "currentFindingCount",
      "previousDeviationCount",
      "currentDeviationCount",
      "previousEvidenceCount",
      "currentEvidenceCount",
      "previousLimitationCount",
      "currentLimitationCount",
    ]) {
      if (!Number.isInteger(item[key]) || Number(item[key]) < 0) {
        errors.push(`${path}.${key} must be a non-negative integer`);
      }
    }
    for (const key of [
      "previousFindingIds",
      "currentFindingIds",
      "previousDeviationIds",
      "currentDeviationIds",
      "previousEvidenceIds",
      "currentEvidenceIds",
      "previousLimitationIds",
      "currentLimitationIds",
      "diagnostics",
    ]) {
      validateStringArray(item[key], `${path}.${key}`, errors);
    }
  }
  for (const category of COMPLIANCE_CATEGORIES) {
    if (!categories.has(category)) errors.push(`categoryEvolution must include ${category}`);
  }
  if (categories.size !== COMPLIANCE_CATEGORIES.length) {
    errors.push("categoryEvolution must not introduce new compliance categories");
  }
}

function validateMetricDeltas(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("metricDeltas must be an array");
    return;
  }
  const metrics = new Set<string>();
  for (const [index, item] of value.entries()) {
    const path = `metricDeltas[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.metric)) errors.push(`${path}.metric is required`);
    else metrics.add(item.metric);
    if (typeof item.comparable !== "boolean") errors.push(`${path}.comparable must be boolean`);
    for (const key of ["previous", "current", "delta"]) {
      if (item[key] !== null && typeof item[key] !== "number") errors.push(`${path}.${key} must be number or null`);
    }
    if (item.comparable === true &&
      typeof item.previous === "number" &&
      typeof item.current === "number" &&
      item.delta !== item.current - item.previous) {
      errors.push(`${path}.delta must equal current minus previous`);
    }
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
  for (const metric of [
    "compliant_category_count",
    "partial_category_count",
    "non_compliant_category_count",
    "finding_count",
    "deviation_count",
    "evidence_record_count",
    "limitation_count",
    "confidence",
  ]) {
    if (!metrics.has(metric)) errors.push(`metricDeltas must include ${metric}`);
  }
}

function validateImprovementOutcomes(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("improvements must be an array");
    return;
  }
  for (const [index, item] of value.entries()) {
    const path = `improvements[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.category)) errors.push(`${path}.category is required`);
    if (!GENERATION_IMPROVEMENT_OUTCOMES.includes(item.outcome as never)) errors.push(`${path}.outcome is not allowed`);
    if (!Number.isInteger(item.actionCount) || Number(item.actionCount) < 0) {
      errors.push(`${path}.actionCount must be a non-negative integer`);
    }
    validateStringArray(item.actionIds, `${path}.actionIds`, errors);
    validateStringArray(item.originatingDeviationIds, `${path}.originatingDeviationIds`, errors);
    if (item.relatedComplianceCategory !== undefined &&
      !COMPLIANCE_CATEGORIES.includes(item.relatedComplianceCategory as never)) {
      errors.push(`${path}.relatedComplianceCategory is not allowed`);
    }
    if (item.relatedCategoryTransition !== undefined &&
      !GENERATION_CATEGORY_EVOLUTION_TRANSITIONS.includes(item.relatedCategoryTransition as never)) {
      errors.push(`${path}.relatedCategoryTransition is not allowed`);
    }
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
}

function validateRegressions(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("regressions must be an array");
    return;
  }
  const regressionIds = new Set<string>();
  for (const [index, item] of value.entries()) {
    const path = `regressions[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.regressionId)) errors.push(`${path}.regressionId is required`);
    else if (regressionIds.has(item.regressionId)) errors.push(`${path}.regressionId must be unique`);
    else regressionIds.add(item.regressionId);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(item.previousStatus as never)) {
      errors.push(`${path}.previousStatus is not allowed`);
    }
    if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(item.currentStatus as never)) {
      errors.push(`${path}.currentStatus is not allowed`);
    }
    for (const key of ["previousComplianceArtifactId", "currentComplianceArtifactId"]) {
      if (!isNonEmptyString(item[key])) errors.push(`${path}.${key} is required`);
    }
    if (
      item.severity !== "category_status" &&
      item.severity !== "deviation_increase" &&
      item.severity !== "limitation_increase"
    ) errors.push(`${path}.severity is not allowed`);
    validateStringArray(item.evidenceIds, `${path}.evidenceIds`, errors);
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
}

function validateConfidence(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("confidence must be an object");
    return;
  }
  if (value.level !== "LOW" && value.level !== "MEDIUM" && value.level !== "HIGH") {
    errors.push("confidence.level must be LOW, MEDIUM, or HIGH");
  }
  if (typeof value.comparable !== "boolean") errors.push("confidence.comparable must be boolean");
  validateStringArray(value.reasons, "confidence.reasons", errors);
}

function validateSourceCompliance(input: {
  artifact: Record<string, unknown>;
  previousCompliance?: GenerationContractComplianceArtifact;
  currentCompliance?: GenerationContractComplianceArtifact;
  previousComplianceArtifactId?: string;
  currentComplianceArtifactId?: string;
  errors: string[];
  warnings: string[];
}): void {
  if (input.previousComplianceArtifactId && input.previousComplianceArtifactId !== input.artifact.previousComplianceArtifactId) {
    input.errors.push("previousComplianceArtifactId must match exact source reference");
  }
  if (input.currentComplianceArtifactId && input.currentComplianceArtifactId !== input.artifact.currentComplianceArtifactId) {
    input.errors.push("currentComplianceArtifactId must match exact source reference");
  }
  if (!input.previousCompliance || !input.currentCompliance) return;
  const previousValidation = validateGenerationContractCompliance(input.previousCompliance);
  const currentValidation = validateGenerationContractCompliance(input.currentCompliance);
  input.errors.push(...previousValidation.errors.map((error) => `previousCompliance.${error}`));
  input.errors.push(...currentValidation.errors.map((error) => `currentCompliance.${error}`));
  input.warnings.push(...previousValidation.warnings.map((warning) => `previousCompliance.${warning}`));
  input.warnings.push(...currentValidation.warnings.map((warning) => `currentCompliance.${warning}`));
  if (input.previousCompliance.siteVersionId !== input.artifact.siteVersionId) {
    input.errors.push("previousCompliance.siteVersionId must match siteVersionId");
  }
  if (input.currentCompliance.siteVersionId !== input.artifact.siteVersionId) {
    input.errors.push("currentCompliance.siteVersionId must match siteVersionId");
  }
  if (input.previousCompliance.dryRunId !== input.artifact.dryRunId) {
    input.errors.push("previousCompliance.dryRunId must match dryRunId");
  }
  if (input.currentCompliance.dryRunId !== input.artifact.dryRunId) {
    input.errors.push("currentCompliance.dryRunId must match dryRunId");
  }
  if (input.previousCompliance.sourceWebsiteGenerationPackageId !== input.currentCompliance.sourceWebsiteGenerationPackageId) {
    input.errors.push("source compliance artifacts must share the same canonical WGP");
  }
  if (input.previousCompliance.sourceWebsiteGenerationPackageId !== input.artifact.sourceWebsiteGenerationPackageId) {
    input.errors.push("previousCompliance.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (input.currentCompliance.sourceWebsiteGenerationPackageId !== input.artifact.sourceWebsiteGenerationPackageId) {
    input.errors.push("currentCompliance.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (!isObject(input.artifact.previousIteration)) {
    input.errors.push("previousIteration must be an object for source validation");
  } else if (
    input.previousCompliance.generationContractComplianceId !==
    input.artifact.previousIteration.generationContractComplianceId
  ) {
    input.errors.push("previousIteration.generationContractComplianceId must match previous source");
  }
  if (!isObject(input.artifact.currentIteration)) {
    input.errors.push("currentIteration must be an object for source validation");
  } else if (
    input.currentCompliance.generationContractComplianceId !==
    input.artifact.currentIteration.generationContractComplianceId
  ) {
    input.errors.push("currentIteration.generationContractComplianceId must match current source");
  }
}

export function validateGenerationEvolutionAnalysis(
  validationInput: GenerationEvolutionAnalysisValidationInput | GenerationEvolutionAnalysisArtifact,
): GenerationEvolutionValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as GenerationEvolutionAnalysisValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Generation Evolution Analysis artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());
  if (!isNonEmptyString(artifact.generationEvolutionAnalysisId)) {
    errors.push("generationEvolutionAnalysisId is required");
  }
  if (!GENERATION_EVOLUTION_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Generation Evolution Analysis status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceWebsiteGenerationPackageId)) {
    errors.push("sourceWebsiteGenerationPackageId is required");
  }
  if (!isNonEmptyString(artifact.previousComplianceArtifactId)) errors.push("previousComplianceArtifactId is required");
  if (!isNonEmptyString(artifact.currentComplianceArtifactId)) errors.push("currentComplianceArtifactId is required");
  if (artifact.previousComplianceArtifactId === artifact.currentComplianceArtifactId) {
    errors.push("previousComplianceArtifactId and currentComplianceArtifactId must be distinct");
  }
  validateIterationReference(artifact.previousIteration, "previousIteration", errors);
  validateIterationReference(artifact.currentIteration, "currentIteration", errors);
  if (isObject(artifact.previousIteration) && isObject(artifact.currentIteration) &&
    Number.isInteger(artifact.previousIteration.iteration) &&
    Number.isInteger(artifact.currentIteration.iteration) &&
    Number(artifact.previousIteration.iteration) >= Number(artifact.currentIteration.iteration)) {
    errors.push("previousIteration.iteration must be less than currentIteration.iteration");
  }
  if (isObject(artifact.previousIteration) &&
    artifact.previousIteration.complianceArtifactId !== artifact.previousComplianceArtifactId) {
    errors.push("previousIteration.complianceArtifactId must match previousComplianceArtifactId");
  }
  if (isObject(artifact.currentIteration) &&
    artifact.currentIteration.complianceArtifactId !== artifact.currentComplianceArtifactId) {
    errors.push("currentIteration.complianceArtifactId must match currentComplianceArtifactId");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION}`);
  }
  validateLineage(artifact.lineage, artifact, errors);
  validateCategoryEvolution(artifact.categoryEvolution, errors);
  validateMetricDeltas(artifact.metricDeltas, errors);
  validateImprovementOutcomes(artifact.improvements, errors);
  validateRegressions(artifact.regressions, errors);
  const unchangedAreas = validateStringArray(artifact.unchangedAreas, "unchangedAreas", errors);
  const unresolvedAreas = validateStringArray(artifact.unresolvedAreas, "unresolvedAreas", errors);
  for (const [path, areas] of [["unchangedAreas", unchangedAreas], ["unresolvedAreas", unresolvedAreas]] as const) {
    for (const area of areas) {
      if (!COMPLIANCE_CATEGORIES.includes(area as never)) errors.push(`${path} contains non-canonical category ${area}`);
    }
  }
  if (!GENERATION_EVOLUTION_OVERALL_ASSESSMENTS.includes(artifact.overallAssessment as never)) {
    errors.push("overallAssessment is not allowed");
  }
  if (!GENERATION_EVOLUTION_RECOMMENDED_NEXT_ACTIONS.includes(artifact.recommendedNextAction as never)) {
    errors.push("recommendedNextAction is not allowed");
  }
  validateConfidence(artifact.confidence, errors);
  validateStringArray(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSourceCompliance({
    artifact,
    previousCompliance: input.previousCompliance,
    currentCompliance: input.currentCompliance,
    previousComplianceArtifactId: input.previousComplianceArtifactId,
    currentComplianceArtifactId: input.currentComplianceArtifactId,
    errors,
    warnings,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
