/**
 * Phase MVP-1F Website Generation Package runtime contract.
 *
 * The Website Generation Package is a deterministic, provider-neutral
 * generation contract projected from a Website Design Brief. It says what an
 * external generation system must create. It is not a prompt, provider
 * payload, generated website, implementation plan, UI, API, worker, schema, or
 * publishing artifact.
 */

import {
  validateWebsiteDesignBrief,
  type WebsiteDesignBriefArtifact,
  type WebsiteDesignBriefConfidence,
  type WebsiteDesignBriefSectionId,
  type WebsiteDesignBriefStatus,
} from "./website-design-brief-contract";
import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";

export const WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION = "MVP-1F" as const;

export const WEBSITE_GENERATION_PACKAGE_STATUSES = [
  "draft",
  "partial",
  "valid",
  "blocked",
  "invalid",
  "stale",
] as const;
export type WebsiteGenerationPackageStatus = (typeof WEBSITE_GENERATION_PACKAGE_STATUSES)[number];

export const WEBSITE_GENERATION_VALIDATION_AREAS = [
  "business_positioning",
  "audience_representation",
  "message_coverage",
  "brand_consistency",
  "navigation_completeness",
  "journey_completeness",
  "trust_signal_coverage",
  "accessibility_expectations",
  "seo_intent",
  "constraint_preservation",
] as const;
export type WebsiteGenerationValidationArea = (typeof WEBSITE_GENERATION_VALIDATION_AREAS)[number];

export type WebsiteGenerationConfidence = WebsiteDesignBriefConfidence;

export type WebsiteGenerationPackageLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteDesignBriefId: string;
  sourceWebsiteDesignBriefStatus: WebsiteDesignBriefStatus;
  sourceWebsiteDesignBriefContractVersion: string;
  sourceDigitalBusinessTwinId: string;
  sourceBusinessAlignmentId: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
};

export type WebsiteGenerationSourceRefs = {
  sourceWebsiteDesignBriefSectionIds: WebsiteDesignBriefSectionId[];
  sourceWebsiteDesignBriefItemIds: string[];
  sourceKnowledgeItemIds: string[];
  sourceMissingKnowledgeIds: string[];
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
};

export type WebsiteGenerationBusinessContext = WebsiteGenerationSourceRefs & {
  contextId: string;
  statement: string;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationObjective = WebsiteGenerationSourceRefs & {
  objectiveId: string;
  statement: string;
  acceptanceIntent: string;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationAudience = WebsiteGenerationSourceRefs & {
  audienceId: string;
  audienceStatement: string;
  experienceRequirement: string;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationMessage = WebsiteGenerationSourceRefs & {
  messageId: string;
  role: "primary" | "supporting" | "trust" | "brand";
  statement: string;
  requiredCoverage: string;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationNavigationContract = {
  navigationContractId: string;
  purpose: string;
  requiredDestinations: {
    destinationId: string;
    label: string;
    intent: string;
    sourceJourneyStepIds: string[];
    sourceWebsiteDesignBriefSectionIds: WebsiteDesignBriefSectionId[];
  }[];
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationPageContract = WebsiteGenerationSourceRefs & {
  pageContractId: string;
  pageRole: "entry" | "offer" | "trust" | "action" | "supporting";
  title: string;
  intent: string;
  requiredSectionContractIds: string[];
  sourceJourneyStepIds: string[];
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationSectionContract = WebsiteGenerationSourceRefs & {
  sectionContractId: string;
  pageContractId: string;
  role: "positioning" | "audience" | "message" | "brand" | "information" | "journey" | "trust" | "accessibility" | "seo" | "constraint" | "limitation";
  intent: string;
  requiredContentRequirementIds: string[];
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationContentRequirement = WebsiteGenerationSourceRefs & {
  contentRequirementId: string;
  requirementType: "business_context" | "objective" | "audience" | "message" | "brand" | "information" | "journey" | "trust" | "accessibility" | "seo" | "constraint" | "missing_knowledge" | "limitation";
  statement: string;
  coverageExpectation: string;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationConstraint = WebsiteGenerationSourceRefs & {
  constraintId: string;
  severity: "required" | "recommended" | "limitation";
  statement: string;
  preservationExpectation: string;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationValidationExpectation = {
  expectationId: string;
  area: WebsiteGenerationValidationArea;
  statement: string;
  sourceWebsiteDesignBriefSectionIds: WebsiteDesignBriefSectionId[];
  requiredEvidence: string[];
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationValidationContract = {
  validationContractId: string;
  expectations: WebsiteGenerationValidationExpectation[];
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationPackageArtifact = {
  websiteGenerationPackageId: string;
  status: WebsiteGenerationPackageStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteDesignBriefId: string;
  createdAt: string;
  contractVersion: typeof WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION;
  lineage: WebsiteGenerationPackageLineage;
  businessContext: WebsiteGenerationBusinessContext;
  generationObjectives: WebsiteGenerationObjective[];
  audience: WebsiteGenerationAudience[];
  messages: WebsiteGenerationMessage[];
  navigationContract: WebsiteGenerationNavigationContract;
  pageContracts: WebsiteGenerationPageContract[];
  sectionContracts: WebsiteGenerationSectionContract[];
  contentRequirements: WebsiteGenerationContentRequirement[];
  constraints: WebsiteGenerationConstraint[];
  validationContract: WebsiteGenerationValidationContract;
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteGenerationValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type WebsiteGenerationPackageValidationInput = {
  artifact: unknown;
  sourceWebsiteDesignBrief?: WebsiteDesignBriefArtifact;
};

export const WEBSITE_GENERATION_PACKAGE_FORBIDDEN_FIELDS = [
  "providerPayload",
  "prompt",
  "openAiPrompt",
  "claudePrompt",
  "geminiPrompt",
  "aiOutput",
  "generatedWebsite",
  "generatedContent",
  "generatedHtml",
  "generatedReact",
  "generatedComponents",
  "generatedBlocks",
  "code",
  "framework",
  "library",
  "deploymentArtifact",
  "publishingArtifact",
  "executionArtifact",
] as const;

const IMPLEMENTATION_INSTRUCTION_PATTERNS = [
  /\buse\s+(react|html|css|javascript|typescript|components?|blocks?|framework|library|code)\b/i,
  /\bbuild\s+(react|html|css|javascript|typescript|components?|blocks?|framework|library|code)\b/i,
  /\bimplement\s+(react|html|css|javascript|typescript|components?|blocks?|framework|library|code)\b/i,
  /\brender\s+(react|html|components?|blocks?)\b/i,
  /\bwrite\s+(code|html|css|javascript|typescript)\b/i,
  /\bdeploy\b/i,
  /\bpublish\b/i,
  /\bprovider adapter\b/i,
  /\bexternal ai prompt\b/i,
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

function validateImplementationLanguage(value: string, path: string, errors: string[]): void {
  if (IMPLEMENTATION_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(value))) {
    errors.push(`${path} must describe generation contract intent, not implementation instructions`);
  }
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
    if (WEBSITE_GENERATION_PACKAGE_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Website Generation Package artifacts`);
    }
    if (typeof nestedValue === "string") validateImplementationLanguage(nestedValue, nestedPath, errors);
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

function validateEvidenceRefs(value: unknown, path: string, errors: string[]): DigitalBusinessTwinEvidenceRef[] {
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

function validateSectionIdArray(value: unknown, path: string, errors: string[]): WebsiteDesignBriefSectionId[] {
  const values = validateStringArray(value, path, errors);
  return values as WebsiteDesignBriefSectionId[];
}

function validateSourceRefs(value: Record<string, unknown>, path: string, errors: string[]): void {
  validateSectionIdArray(value.sourceWebsiteDesignBriefSectionIds, `${path}.sourceWebsiteDesignBriefSectionIds`, errors);
  validateStringArray(value.sourceWebsiteDesignBriefItemIds, `${path}.sourceWebsiteDesignBriefItemIds`, errors);
  validateStringArray(value.sourceKnowledgeItemIds, `${path}.sourceKnowledgeItemIds`, errors);
  validateStringArray(value.sourceMissingKnowledgeIds, `${path}.sourceMissingKnowledgeIds`, errors);
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
}

function validateLineage(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("lineage is required");
    return;
  }
  if (!isNonEmptyString(value.siteVersionId)) errors.push("lineage.siteVersionId is required");
  if (!isNonEmptyString(value.dryRunId)) errors.push("lineage.dryRunId is required");
  if (!isNonEmptyString(value.sourceWebsiteDesignBriefId)) {
    errors.push("lineage.sourceWebsiteDesignBriefId is required");
  }
  if (!isNonEmptyString(value.sourceWebsiteDesignBriefStatus)) {
    errors.push("lineage.sourceWebsiteDesignBriefStatus is required");
  }
  if (!isNonEmptyString(value.sourceWebsiteDesignBriefContractVersion)) {
    errors.push("lineage.sourceWebsiteDesignBriefContractVersion is required");
  }
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinId)) {
    errors.push("lineage.sourceDigitalBusinessTwinId is required");
  }
  if (!isNonEmptyString(value.sourceBusinessAlignmentId)) {
    errors.push("lineage.sourceBusinessAlignmentId is required");
  }
  if (value.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (value.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (value.sourceWebsiteDesignBriefId !== artifact.sourceWebsiteDesignBriefId) {
    errors.push("lineage.sourceWebsiteDesignBriefId must match sourceWebsiteDesignBriefId");
  }
  validateEvidenceRefs(value.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(value.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateBusinessContext(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("businessContext is required");
    return;
  }
  if (!isNonEmptyString(value.contextId)) errors.push("businessContext.contextId is required");
  if (!isNonEmptyString(value.statement)) errors.push("businessContext.statement is required");
  validateSourceRefs(value, "businessContext", errors);
  validateConfidence(value.confidence, "businessContext.confidence", errors);
  validateStringArray(value.limitations, "businessContext.limitations", errors);
  validateStringArray(value.diagnostics, "businessContext.diagnostics", errors);
}

function validateGenerationObjective(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.objectiveId)) errors.push(`${path}.objectiveId is required`);
  if (!isNonEmptyString(value.statement)) errors.push(`${path}.statement is required`);
  if (!isNonEmptyString(value.acceptanceIntent)) errors.push(`${path}.acceptanceIntent is required`);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.objectiveId) ? value.objectiveId : null;
}

function validateAudience(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.audienceId)) errors.push(`${path}.audienceId is required`);
  if (!isNonEmptyString(value.audienceStatement)) errors.push(`${path}.audienceStatement is required`);
  if (!isNonEmptyString(value.experienceRequirement)) errors.push(`${path}.experienceRequirement is required`);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.audienceId) ? value.audienceId : null;
}

function validateMessage(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.messageId)) errors.push(`${path}.messageId is required`);
  if (value.role !== "primary" && value.role !== "supporting" && value.role !== "trust" && value.role !== "brand") {
    errors.push(`${path}.role is not allowed`);
  }
  if (!isNonEmptyString(value.statement)) errors.push(`${path}.statement is required`);
  if (!isNonEmptyString(value.requiredCoverage)) errors.push(`${path}.requiredCoverage is required`);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.messageId) ? value.messageId : null;
}

function validateNavigationContract(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("navigationContract is required");
    return;
  }
  if (!isNonEmptyString(value.navigationContractId)) errors.push("navigationContract.navigationContractId is required");
  if (!isNonEmptyString(value.purpose)) errors.push("navigationContract.purpose is required");
  if (!Array.isArray(value.requiredDestinations) || value.requiredDestinations.length === 0) {
    errors.push("navigationContract.requiredDestinations must be a non-empty array");
  } else {
    const ids = new Set<string>();
    for (const [index, destination] of value.requiredDestinations.entries()) {
      const path = `navigationContract.requiredDestinations[${index}]`;
      if (!isObject(destination)) {
        errors.push(`${path} must be an object`);
        continue;
      }
      if (!isNonEmptyString(destination.destinationId)) errors.push(`${path}.destinationId is required`);
      else if (ids.has(destination.destinationId)) errors.push(`${path}.destinationId must be unique`);
      else ids.add(destination.destinationId);
      if (!isNonEmptyString(destination.label)) errors.push(`${path}.label is required`);
      if (!isNonEmptyString(destination.intent)) errors.push(`${path}.intent is required`);
      validateStringArray(destination.sourceJourneyStepIds, `${path}.sourceJourneyStepIds`, errors);
      validateSectionIdArray(destination.sourceWebsiteDesignBriefSectionIds, `${path}.sourceWebsiteDesignBriefSectionIds`, errors);
    }
  }
  validateConfidence(value.confidence, "navigationContract.confidence", errors);
  validateStringArray(value.limitations, "navigationContract.limitations", errors);
  validateStringArray(value.diagnostics, "navigationContract.diagnostics", errors);
}

function validatePageContract(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.pageContractId)) errors.push(`${path}.pageContractId is required`);
  if (
    value.pageRole !== "entry" &&
    value.pageRole !== "offer" &&
    value.pageRole !== "trust" &&
    value.pageRole !== "action" &&
    value.pageRole !== "supporting"
  ) errors.push(`${path}.pageRole is not allowed`);
  if (!isNonEmptyString(value.title)) errors.push(`${path}.title is required`);
  if (!isNonEmptyString(value.intent)) errors.push(`${path}.intent is required`);
  validateStringArray(value.requiredSectionContractIds, `${path}.requiredSectionContractIds`, errors);
  validateStringArray(value.sourceJourneyStepIds, `${path}.sourceJourneyStepIds`, errors);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.pageContractId) ? value.pageContractId : null;
}

function validateSectionContract(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.sectionContractId)) errors.push(`${path}.sectionContractId is required`);
  if (!isNonEmptyString(value.pageContractId)) errors.push(`${path}.pageContractId is required`);
  if (!isNonEmptyString(value.role)) errors.push(`${path}.role is required`);
  if (!isNonEmptyString(value.intent)) errors.push(`${path}.intent is required`);
  validateStringArray(value.requiredContentRequirementIds, `${path}.requiredContentRequirementIds`, errors);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.sectionContractId) ? value.sectionContractId : null;
}

function validateContentRequirement(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.contentRequirementId)) errors.push(`${path}.contentRequirementId is required`);
  if (!isNonEmptyString(value.requirementType)) errors.push(`${path}.requirementType is required`);
  if (!isNonEmptyString(value.statement)) errors.push(`${path}.statement is required`);
  if (!isNonEmptyString(value.coverageExpectation)) errors.push(`${path}.coverageExpectation is required`);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.contentRequirementId) ? value.contentRequirementId : null;
}

function validateConstraint(value: unknown, path: string, errors: string[]): string | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.constraintId)) errors.push(`${path}.constraintId is required`);
  if (value.severity !== "required" && value.severity !== "recommended" && value.severity !== "limitation") {
    errors.push(`${path}.severity is not allowed`);
  }
  if (!isNonEmptyString(value.statement)) errors.push(`${path}.statement is required`);
  if (!isNonEmptyString(value.preservationExpectation)) errors.push(`${path}.preservationExpectation is required`);
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return isNonEmptyString(value.constraintId) ? value.constraintId : null;
}

function validateValidationContract(value: unknown, errors: string[]): void {
  if (!isObject(value)) {
    errors.push("validationContract is required");
    return;
  }
  if (!isNonEmptyString(value.validationContractId)) errors.push("validationContract.validationContractId is required");
  if (!Array.isArray(value.expectations) || value.expectations.length === 0) {
    errors.push("validationContract.expectations must be a non-empty array");
  } else {
    const expectationIds = new Set<string>();
    const areas = new Set<string>();
    for (const [index, expectation] of value.expectations.entries()) {
      const path = `validationContract.expectations[${index}]`;
      if (!isObject(expectation)) {
        errors.push(`${path} must be an object`);
        continue;
      }
      if (!isNonEmptyString(expectation.expectationId)) errors.push(`${path}.expectationId is required`);
      else if (expectationIds.has(expectation.expectationId)) errors.push(`${path}.expectationId must be unique`);
      else expectationIds.add(expectation.expectationId);
      if (!WEBSITE_GENERATION_VALIDATION_AREAS.includes(expectation.area as never)) {
        errors.push(`${path}.area is not an allowed validation area`);
      } else {
        areas.add(expectation.area as string);
      }
      if (!isNonEmptyString(expectation.statement)) errors.push(`${path}.statement is required`);
      validateSectionIdArray(expectation.sourceWebsiteDesignBriefSectionIds, `${path}.sourceWebsiteDesignBriefSectionIds`, errors);
      validateStringArray(expectation.requiredEvidence, `${path}.requiredEvidence`, errors);
      validateConfidence(expectation.confidence, `${path}.confidence`, errors);
      validateStringArray(expectation.limitations, `${path}.limitations`, errors);
      validateStringArray(expectation.diagnostics, `${path}.diagnostics`, errors);
    }
    for (const area of WEBSITE_GENERATION_VALIDATION_AREAS) {
      if (!areas.has(area)) errors.push(`validationContract.expectations must include ${area}`);
    }
  }
  validateStringArray(value.limitations, "validationContract.limitations", errors);
  validateStringArray(value.diagnostics, "validationContract.diagnostics", errors);
}

function validateUniqueArray(input: {
  value: unknown;
  path: string;
  errors: string[];
  idValidator: (value: unknown, path: string, errors: string[]) => string | null;
}): void {
  if (!Array.isArray(input.value)) {
    input.errors.push(`${input.path} must be an array`);
    return;
  }
  const ids = new Set<string>();
  for (const [index, item] of input.value.entries()) {
    const id = input.idValidator(item, `${input.path}[${index}]`, input.errors);
    if (!id) continue;
    if (ids.has(id)) input.errors.push(`${input.path}[${index}] id must be unique`);
    ids.add(id);
  }
}

function validateSourceArtifact(input: {
  artifact: Record<string, unknown>;
  sourceWebsiteDesignBrief?: WebsiteDesignBriefArtifact;
  errors: string[];
  warnings: string[];
}): void {
  if (!input.sourceWebsiteDesignBrief) return;
  const sourceValidation = validateWebsiteDesignBrief(input.sourceWebsiteDesignBrief);
  input.errors.push(...sourceValidation.errors.map((error) => `sourceWebsiteDesignBrief.${error}`));
  input.warnings.push(...sourceValidation.warnings.map((warning) => `sourceWebsiteDesignBrief.${warning}`));
  if (input.sourceWebsiteDesignBrief.websiteDesignBriefId !== input.artifact.sourceWebsiteDesignBriefId) {
    input.errors.push("sourceWebsiteDesignBrief.websiteDesignBriefId must match sourceWebsiteDesignBriefId");
  }
  if (input.sourceWebsiteDesignBrief.siteVersionId !== input.artifact.siteVersionId) {
    input.errors.push("sourceWebsiteDesignBrief.siteVersionId must match siteVersionId");
  }
  if (input.sourceWebsiteDesignBrief.dryRunId !== input.artifact.dryRunId) {
    input.errors.push("sourceWebsiteDesignBrief.dryRunId must match dryRunId");
  }
  if (
    input.sourceWebsiteDesignBrief.status !== "draft" &&
    input.sourceWebsiteDesignBrief.status !== "partial" &&
    input.sourceWebsiteDesignBrief.status !== "valid" &&
    input.sourceWebsiteDesignBrief.status !== "blocked"
  ) {
    input.errors.push("sourceWebsiteDesignBrief.status must be draft, partial, valid, or blocked for Website Generation Package");
  }
}

export function validateWebsiteGenerationPackage(
  validationInput: WebsiteGenerationPackageValidationInput | WebsiteGenerationPackageArtifact,
): WebsiteGenerationValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as WebsiteGenerationPackageValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Website Generation Package artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.websiteGenerationPackageId)) errors.push("websiteGenerationPackageId is required");
  if (!WEBSITE_GENERATION_PACKAGE_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Website Generation Package status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceWebsiteDesignBriefId)) errors.push("sourceWebsiteDesignBriefId is required");
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${WEBSITE_GENERATION_PACKAGE_CONTRACT_VERSION}`);
  }

  validateLineage(artifact.lineage, artifact, errors);
  validateBusinessContext(artifact.businessContext, errors);
  validateUniqueArray({
    value: artifact.generationObjectives,
    path: "generationObjectives",
    errors,
    idValidator: validateGenerationObjective,
  });
  validateUniqueArray({
    value: artifact.audience,
    path: "audience",
    errors,
    idValidator: validateAudience,
  });
  validateUniqueArray({
    value: artifact.messages,
    path: "messages",
    errors,
    idValidator: validateMessage,
  });
  validateNavigationContract(artifact.navigationContract, errors);
  validateUniqueArray({
    value: artifact.pageContracts,
    path: "pageContracts",
    errors,
    idValidator: validatePageContract,
  });
  validateUniqueArray({
    value: artifact.sectionContracts,
    path: "sectionContracts",
    errors,
    idValidator: validateSectionContract,
  });
  validateUniqueArray({
    value: artifact.contentRequirements,
    path: "contentRequirements",
    errors,
    idValidator: validateContentRequirement,
  });
  validateUniqueArray({
    value: artifact.constraints,
    path: "constraints",
    errors,
    idValidator: validateConstraint,
  });
  validateValidationContract(artifact.validationContract, errors);
  validateConfidence(artifact.confidence, "confidence", errors);
  validateStringArray(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSourceArtifact({
    artifact,
    sourceWebsiteDesignBrief: input.sourceWebsiteDesignBrief,
    errors,
    warnings,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
