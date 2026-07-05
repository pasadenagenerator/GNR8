/**
 * Phase MVP-1K-4 Generation Contract Compliance runtime contract.
 *
 * Compares an Observed Website Model against a Website Generation Package.
 * It does not generate reports, approve business changes, publish, call
 * providers, execute AI, mutate runtime, or update canonical business truth.
 */

import {
  WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION,
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
} from "./website-generation-package-contract";
import {
  OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION,
  validateObservedWebsiteModel,
  type ObservedEvidence,
  type ObservedWebsiteModelArtifact,
} from "./observed-website-model-contract";

export const GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION = "MVP-1K-4" as const;

export const GENERATION_CONTRACT_COMPLIANCE_STATUSES = [
  "incomplete",
  "partial",
  "compliant",
  "non_compliant",
  "blocked",
  "invalid",
  "stale",
] as const;
export type GenerationContractComplianceStatus = (typeof GENERATION_CONTRACT_COMPLIANCE_STATUSES)[number];

export const COMPLIANCE_CATEGORIES = [
  "objectives_represented",
  "navigation_obligations",
  "page_obligations",
  "section_obligations",
  "message_coverage",
  "asset_presence",
  "trust_signal_presence",
  "constraints_preserved",
  "accessibility_expectations_observable",
  "seo_expectations_observable",
] as const;
export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number];

export type ComplianceConfidence = {
  level: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
};

export type ComplianceEvidence = {
  complianceEvidenceId: string;
  category: ComplianceCategory;
  sourceKind:
    | "website_generation_package"
    | "observed_website_model"
    | "observed_page"
    | "observed_navigation"
    | "observed_section"
    | "observed_message"
    | "observed_asset"
    | "observed_constraint"
    | "observed_technical_signal"
    | "observed_evidence";
  sourceId: string;
  observedEvidenceRefIds: string[];
  description: string;
  observedText?: string;
};

export type ComplianceFinding = {
  findingId: string;
  category: ComplianceCategory;
  sourceRequirementId: string;
  result: "fulfilled" | "partial" | "deviation";
  statement: string;
  evidenceIds: string[];
  diagnostics: string[];
};

export type ComplianceDeviation = {
  deviationId: string;
  category: ComplianceCategory;
  findingId: string;
  sourceRequirementId: string;
  severity: "required" | "recommended" | "limitation";
  description: string;
  evidenceIds: string[];
};

export type ComplianceLimitation = {
  limitationId: string;
  category: ComplianceCategory;
  sourceRequirementId?: string;
  severity: "info" | "warning" | "blocked";
  message: string;
};

export type ComplianceCategoryResult = {
  category: ComplianceCategory;
  status: GenerationContractComplianceStatus;
  sourceRequirementIds: string[];
  findingIds: string[];
  deviationIds: string[];
  limitationIds: string[];
  confidence: ComplianceConfidence;
  diagnostics: string[];
};

export type GenerationContractComplianceLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageStatus: WebsiteGenerationPackageArtifact["status"];
  sourceWebsiteGenerationPackageContractVersion: typeof WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION;
  sourceObservedWebsiteModelId: string;
  sourceObservedWebsiteModelStatus: ObservedWebsiteModelArtifact["status"];
  sourceObservedWebsiteModelContractVersion: typeof OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION;
  upstreamArtifactRefs: ObservedEvidence[];
};

export type GenerationContractComplianceArtifact = {
  generationContractComplianceId: string;
  status: GenerationContractComplianceStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceObservedWebsiteModelId: string;
  createdAt: string;
  contractVersion: typeof GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION;
  lineage: GenerationContractComplianceLineage;
  categoryResults: ComplianceCategoryResult[];
  findings: ComplianceFinding[];
  deviations: ComplianceDeviation[];
  evidence: ComplianceEvidence[];
  limitations: ComplianceLimitation[];
  confidence: ComplianceConfidence;
  diagnostics: string[];
};

export type ComplianceValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type GenerationContractComplianceValidationInput = {
  artifact: unknown;
  sourceWebsiteGenerationPackage?: WebsiteGenerationPackageArtifact;
  sourceObservedWebsiteModel?: ObservedWebsiteModelArtifact;
};

export const GENERATION_CONTRACT_COMPLIANCE_FORBIDDEN_FIELDS = [
  "businessApproval",
  "publishingArtifact",
  "deploymentArtifact",
  "dnsMutation",
  "productionMutation",
  "runtimeMutation",
  "providerExecutionResult",
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
    if (GENERATION_CONTRACT_COMPLIANCE_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Generation Contract Compliance artifacts`);
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

function validateEvidence(value: unknown, errors: string[]): Set<string> {
  const evidenceIds = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push("evidence must be an array");
    return evidenceIds;
  }
  for (const [index, item] of value.entries()) {
    const path = `evidence[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.complianceEvidenceId)) errors.push(`${path}.complianceEvidenceId is required`);
    else if (evidenceIds.has(item.complianceEvidenceId)) errors.push(`${path}.complianceEvidenceId must be unique`);
    else evidenceIds.add(item.complianceEvidenceId);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (!isNonEmptyString(item.sourceKind)) errors.push(`${path}.sourceKind is required`);
    if (!isNonEmptyString(item.sourceId)) errors.push(`${path}.sourceId is required`);
    validateStringArray(item.observedEvidenceRefIds, `${path}.observedEvidenceRefIds`, errors);
    if (!isNonEmptyString(item.description)) errors.push(`${path}.description is required`);
    if (item.observedText !== undefined && !isNonEmptyString(item.observedText)) {
      errors.push(`${path}.observedText must be non-empty when present`);
    }
  }
  return evidenceIds;
}

function validateFindings(value: unknown, evidenceIds: Set<string>, errors: string[]): Set<string> {
  const findingIds = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push("findings must be an array");
    return findingIds;
  }
  for (const [index, item] of value.entries()) {
    const path = `findings[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.findingId)) errors.push(`${path}.findingId is required`);
    else if (findingIds.has(item.findingId)) errors.push(`${path}.findingId must be unique`);
    else findingIds.add(item.findingId);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (!isNonEmptyString(item.sourceRequirementId)) errors.push(`${path}.sourceRequirementId is required`);
    if (item.result !== "fulfilled" && item.result !== "partial" && item.result !== "deviation") {
      errors.push(`${path}.result is not allowed`);
    }
    if (!isNonEmptyString(item.statement)) errors.push(`${path}.statement is required`);
    const ids = validateStringArray(item.evidenceIds, `${path}.evidenceIds`, errors);
    if (ids.length === 0) errors.push(`${path}.evidenceIds must contain observable evidence`);
    for (const id of ids) {
      if (!evidenceIds.has(id)) errors.push(`${path}.evidenceIds references missing evidence ${id}`);
    }
    validateStringArray(item.diagnostics, `${path}.diagnostics`, errors);
  }
  return findingIds;
}

function validateDeviations(
  value: unknown,
  findingIds: Set<string>,
  evidenceIds: Set<string>,
  errors: string[],
): Set<string> {
  const deviationIds = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push("deviations must be an array");
    return deviationIds;
  }
  for (const [index, item] of value.entries()) {
    const path = `deviations[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.deviationId)) errors.push(`${path}.deviationId is required`);
    else if (deviationIds.has(item.deviationId)) errors.push(`${path}.deviationId must be unique`);
    else deviationIds.add(item.deviationId);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (!isNonEmptyString(item.findingId)) errors.push(`${path}.findingId is required`);
    else if (!findingIds.has(item.findingId)) errors.push(`${path}.findingId references missing finding`);
    if (!isNonEmptyString(item.sourceRequirementId)) errors.push(`${path}.sourceRequirementId is required`);
    if (item.severity !== "required" && item.severity !== "recommended" && item.severity !== "limitation") {
      errors.push(`${path}.severity is not allowed`);
    }
    if (!isNonEmptyString(item.description)) errors.push(`${path}.description is required`);
    for (const id of validateStringArray(item.evidenceIds, `${path}.evidenceIds`, errors)) {
      if (!evidenceIds.has(id)) errors.push(`${path}.evidenceIds references missing evidence ${id}`);
    }
  }
  return deviationIds;
}

function validateLimitations(value: unknown, errors: string[]): Set<string> {
  const limitationIds = new Set<string>();
  if (!Array.isArray(value)) {
    errors.push("limitations must be an array");
    return limitationIds;
  }
  for (const [index, item] of value.entries()) {
    const path = `limitations[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.limitationId)) errors.push(`${path}.limitationId is required`);
    else if (limitationIds.has(item.limitationId)) errors.push(`${path}.limitationId must be unique`);
    else limitationIds.add(item.limitationId);
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) errors.push(`${path}.category is not allowed`);
    if (item.sourceRequirementId !== undefined && !isNonEmptyString(item.sourceRequirementId)) {
      errors.push(`${path}.sourceRequirementId must be non-empty when present`);
    }
    if (item.severity !== "info" && item.severity !== "warning" && item.severity !== "blocked") {
      errors.push(`${path}.severity is not allowed`);
    }
    if (!isNonEmptyString(item.message)) errors.push(`${path}.message is required`);
  }
  return limitationIds;
}

function validateCategoryResults(input: {
  value: unknown;
  findingIds: Set<string>;
  deviationIds: Set<string>;
  limitationIds: Set<string>;
  errors: string[];
}): void {
  if (!Array.isArray(input.value)) {
    input.errors.push("categoryResults must be an array");
    return;
  }
  const categories = new Set<string>();
  for (const [index, item] of input.value.entries()) {
    const path = `categoryResults[${index}]`;
    if (!isObject(item)) {
      input.errors.push(`${path} must be an object`);
      continue;
    }
    if (!COMPLIANCE_CATEGORIES.includes(item.category as never)) input.errors.push(`${path}.category is not allowed`);
    else categories.add(item.category as string);
    if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(item.status as never)) {
      input.errors.push(`${path}.status is not allowed`);
    }
    validateStringArray(item.sourceRequirementIds, `${path}.sourceRequirementIds`, input.errors);
    for (const id of validateStringArray(item.findingIds, `${path}.findingIds`, input.errors)) {
      if (!input.findingIds.has(id)) input.errors.push(`${path}.findingIds references missing finding ${id}`);
    }
    for (const id of validateStringArray(item.deviationIds, `${path}.deviationIds`, input.errors)) {
      if (!input.deviationIds.has(id)) input.errors.push(`${path}.deviationIds references missing deviation ${id}`);
    }
    for (const id of validateStringArray(item.limitationIds, `${path}.limitationIds`, input.errors)) {
      if (!input.limitationIds.has(id)) input.errors.push(`${path}.limitationIds references missing limitation ${id}`);
    }
    validateConfidence(item.confidence, `${path}.confidence`, input.errors);
    validateStringArray(item.diagnostics, `${path}.diagnostics`, input.errors);
  }
  for (const category of COMPLIANCE_CATEGORIES) {
    if (!categories.has(category)) input.errors.push(`categoryResults must include ${category}`);
  }
}

function validateLineage(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("lineage is required");
    return;
  }
  for (const key of [
    "siteVersionId",
    "dryRunId",
    "sourceWebsiteGenerationPackageId",
    "sourceWebsiteGenerationPackageStatus",
    "sourceWebsiteGenerationPackageContractVersion",
    "sourceObservedWebsiteModelId",
    "sourceObservedWebsiteModelStatus",
    "sourceObservedWebsiteModelContractVersion",
  ]) {
    if (!isNonEmptyString(value[key])) errors.push(`lineage.${key} is required`);
  }
  if (value.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (value.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (value.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (value.sourceObservedWebsiteModelId !== artifact.sourceObservedWebsiteModelId) {
    errors.push("lineage.sourceObservedWebsiteModelId must match sourceObservedWebsiteModelId");
  }
  if (!Array.isArray(value.upstreamArtifactRefs)) errors.push("lineage.upstreamArtifactRefs must be an array");
}

function validateSources(input: {
  artifact: Record<string, unknown>;
  sourceWebsiteGenerationPackage?: WebsiteGenerationPackageArtifact;
  sourceObservedWebsiteModel?: ObservedWebsiteModelArtifact;
  errors: string[];
  warnings: string[];
}): void {
  if (input.sourceWebsiteGenerationPackage) {
    const validation = validateWebsiteGenerationPackage(input.sourceWebsiteGenerationPackage);
    input.errors.push(...validation.errors.map((error) => `sourceWebsiteGenerationPackage.${error}`));
    input.warnings.push(...validation.warnings.map((warning) => `sourceWebsiteGenerationPackage.${warning}`));
    if (input.sourceWebsiteGenerationPackage.websiteGenerationPackageId !== input.artifact.sourceWebsiteGenerationPackageId) {
      input.errors.push("sourceWebsiteGenerationPackage.websiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
    }
    if (input.sourceWebsiteGenerationPackage.siteVersionId !== input.artifact.siteVersionId) {
      input.errors.push("sourceWebsiteGenerationPackage.siteVersionId must match siteVersionId");
    }
    if (input.sourceWebsiteGenerationPackage.dryRunId !== input.artifact.dryRunId) {
      input.errors.push("sourceWebsiteGenerationPackage.dryRunId must match dryRunId");
    }
  }
  if (input.sourceObservedWebsiteModel) {
    const validation = validateObservedWebsiteModel(input.sourceObservedWebsiteModel);
    input.errors.push(...validation.errors.map((error) => `sourceObservedWebsiteModel.${error}`));
    input.warnings.push(...validation.warnings.map((warning) => `sourceObservedWebsiteModel.${warning}`));
    if (input.sourceObservedWebsiteModel.observedWebsiteModelId !== input.artifact.sourceObservedWebsiteModelId) {
      input.errors.push("sourceObservedWebsiteModel.observedWebsiteModelId must match sourceObservedWebsiteModelId");
    }
    if (input.sourceObservedWebsiteModel.siteVersionId !== input.artifact.siteVersionId) {
      input.errors.push("sourceObservedWebsiteModel.siteVersionId must match siteVersionId");
    }
    if (input.sourceObservedWebsiteModel.dryRunId !== input.artifact.dryRunId) {
      input.errors.push("sourceObservedWebsiteModel.dryRunId must match dryRunId");
    }
    if (input.sourceObservedWebsiteModel.sourceWebsiteGenerationPackageId !== input.artifact.sourceWebsiteGenerationPackageId) {
      input.errors.push("sourceObservedWebsiteModel.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
    }
  }
}

export function validateGenerationContractCompliance(
  validationInput: GenerationContractComplianceValidationInput | GenerationContractComplianceArtifact,
): ComplianceValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as GenerationContractComplianceValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Generation Contract Compliance artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());
  if (!isNonEmptyString(artifact.generationContractComplianceId)) {
    errors.push("generationContractComplianceId is required");
  }
  if (!GENERATION_CONTRACT_COMPLIANCE_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Generation Contract Compliance status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceWebsiteGenerationPackageId)) {
    errors.push("sourceWebsiteGenerationPackageId is required");
  }
  if (!isNonEmptyString(artifact.sourceObservedWebsiteModelId)) {
    errors.push("sourceObservedWebsiteModelId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${GENERATION_CONTRACT_COMPLIANCE_CONTRACT_VERSION}`);
  }

  validateLineage(artifact.lineage, artifact, errors);
  const evidenceIds = validateEvidence(artifact.evidence, errors);
  const findingIds = validateFindings(artifact.findings, evidenceIds, errors);
  const deviationIds = validateDeviations(artifact.deviations, findingIds, evidenceIds, errors);
  const limitationIds = validateLimitations(artifact.limitations, errors);
  validateCategoryResults({
    value: artifact.categoryResults,
    findingIds,
    deviationIds,
    limitationIds,
    errors,
  });
  validateConfidence(artifact.confidence, "confidence", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSources({
    artifact,
    sourceWebsiteGenerationPackage: input.sourceWebsiteGenerationPackage,
    sourceObservedWebsiteModel: input.sourceObservedWebsiteModel,
    errors,
    warnings,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
