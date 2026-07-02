/**
 * Phase MVP-1C Business Understanding Report runtime contract.
 *
 * The Business Understanding Report is the first human-readable projection of
 * a persisted Digital Business Twin. MVP-1C is deterministic and does not
 * create Business Alignment, Website Design Brief, Website Generation Package,
 * provider payloads, AI output, generated content, approval, or publishing
 * artifacts.
 */

import type {
  DigitalBusinessTwinConfidence,
  DigitalBusinessTwinEvidenceRef,
  DigitalBusinessTwinStatus,
} from "./digital-business-twin-contract";

export const BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION = "MVP-1C" as const;

export const BUSINESS_UNDERSTANDING_REPORT_STATUSES = [
  "draft",
  "partial",
  "valid",
  "invalid",
  "blocked",
  "stale",
] as const;
export type BusinessUnderstandingReportStatus = (typeof BUSINESS_UNDERSTANDING_REPORT_STATUSES)[number];

export const BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES = [
  "executive_summary",
  "business_overview",
  "products_and_services",
  "target_audience",
  "business_goals",
  "brand_identity",
  "current_digital_presence",
  "trust_signals",
  "missing_knowledge",
  "confidence_overview",
  "recommendations",
  "limitations",
  "evidence_summary",
  "diagnostics",
] as const;
export type BusinessUnderstandingReportSectionType = (typeof BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES)[number];

export const BUSINESS_UNDERSTANDING_REPORT_RECOMMENDATION_TYPES = [
  "clarify_positioning",
  "improve_messaging",
  "strengthen_trust",
  "improve_customer_journey",
  "expand_content",
  "improve_digital_presence",
  "resolve_missing_audience",
  "resolve_missing_offerings",
] as const;
export type BusinessUnderstandingReportRecommendationType =
  (typeof BUSINESS_UNDERSTANDING_REPORT_RECOMMENDATION_TYPES)[number];

export type BusinessUnderstandingReportConfidence = DigitalBusinessTwinConfidence;

export type BusinessUnderstandingReportLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceDigitalBusinessTwinArtifactId: string;
  sourceDigitalBusinessTwinId: string;
  sourceDigitalBusinessTwinStatus: DigitalBusinessTwinStatus;
  sourceDigitalBusinessTwinContractVersion: string;
  sourceBusinessDiscoveryArtifactId: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
};

export type BusinessUnderstandingReportSection = {
  sectionId: string;
  type: BusinessUnderstandingReportSectionType;
  title: string;
  status: Extract<BusinessUnderstandingReportStatus, "draft" | "partial" | "valid" | "blocked">;
  content: string[];
  knowledgeItemIds: string[];
  missingKnowledgeIds: string[];
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  confidence: BusinessUnderstandingReportConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type BusinessUnderstandingReportRecommendation = {
  recommendationId: string;
  type: BusinessUnderstandingReportRecommendationType;
  title: string;
  rationale: string;
  sourceSectionIds: string[];
  missingKnowledgeIds: string[];
  confidence: BusinessUnderstandingReportConfidence;
  diagnostics: string[];
};

export type BusinessUnderstandingReportArtifact = {
  businessUnderstandingReportId: string;
  status: BusinessUnderstandingReportStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceDigitalBusinessTwinArtifactId: string;
  createdAt: string;
  contractVersion: typeof BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION;
  lineage: BusinessUnderstandingReportLineage;
  sections: BusinessUnderstandingReportSection[];
  recommendations: BusinessUnderstandingReportRecommendation[];
  confidence: BusinessUnderstandingReportConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type BusinessUnderstandingReportValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const BUSINESS_UNDERSTANDING_REPORT_FORBIDDEN_FIELDS = [
  "businessAlignment",
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "providerPayload",
  "prompt",
  "aiOutput",
  "generatedContent",
  "generatedHtml",
  "generatedReact",
  "generatedComponents",
  "generatedBlocks",
  "publishingArtifact",
  "deploymentArtifact",
  "executionArtifact",
] as const;

const BUSINESS_UNDERSTANDING_REPORT_FORBIDDEN_RECOMMENDATION_TERMS = [
  "react",
  "html",
  "component",
  "components",
  "layout",
  "layouts",
  "prompt",
  "prompts",
  "provider",
  "providers",
  "publishing",
  "publish",
  "deployment",
  "deploy",
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
    if (BUSINESS_UNDERSTANDING_REPORT_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Business Understanding Report artifacts`);
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
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinArtifactId)) {
    errors.push("lineage.sourceDigitalBusinessTwinArtifactId is required");
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
  if (!isNonEmptyString(value.sourceBusinessDiscoveryArtifactId)) {
    errors.push("lineage.sourceBusinessDiscoveryArtifactId is required");
  }
  if (value.siteVersionId !== artifact.siteVersionId) {
    errors.push("lineage.siteVersionId must match siteVersionId");
  }
  if (value.dryRunId !== artifact.dryRunId) {
    errors.push("lineage.dryRunId must match dryRunId");
  }
  if (value.sourceDigitalBusinessTwinArtifactId !== artifact.sourceDigitalBusinessTwinArtifactId) {
    errors.push("lineage.sourceDigitalBusinessTwinArtifactId must match sourceDigitalBusinessTwinArtifactId");
  }
  validateEvidenceRefs(value.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(value.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateSection(
  value: unknown,
  path: string,
  errors: string[],
): BusinessUnderstandingReportSection | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.sectionId)) errors.push(`${path}.sectionId is required`);
  if (!BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES.includes(value.type as never)) {
    errors.push(`${path}.type is not an allowed Business Understanding Report section type`);
  }
  if (!isNonEmptyString(value.title)) errors.push(`${path}.title is required`);
  if (
    value.status !== "draft" &&
    value.status !== "partial" &&
    value.status !== "valid" &&
    value.status !== "blocked"
  ) {
    errors.push(`${path}.status must be draft, partial, valid, or blocked`);
  }
  const content = validateStringArray(value.content, `${path}.content`, errors);
  if (content.length === 0) errors.push(`${path}.content must include at least one human-readable entry`);
  validateStringArray(value.knowledgeItemIds, `${path}.knowledgeItemIds`, errors);
  validateStringArray(value.missingKnowledgeIds, `${path}.missingKnowledgeIds`, errors);
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as BusinessUnderstandingReportSection;
}

function containsForbiddenRecommendationTerm(value: string): string | null {
  const normalized = value.toLowerCase();
  for (const term of BUSINESS_UNDERSTANDING_REPORT_FORBIDDEN_RECOMMENDATION_TERMS) {
    if (new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`).test(normalized)) return term;
  }
  return null;
}

function validateRecommendation(
  value: unknown,
  path: string,
  sectionIds: Set<string>,
  errors: string[],
): BusinessUnderstandingReportRecommendation | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.recommendationId)) errors.push(`${path}.recommendationId is required`);
  if (!BUSINESS_UNDERSTANDING_REPORT_RECOMMENDATION_TYPES.includes(value.type as never)) {
    errors.push(`${path}.type is not an allowed business-oriented recommendation type`);
  }
  if (!isNonEmptyString(value.title)) errors.push(`${path}.title is required`);
  if (!isNonEmptyString(value.rationale)) errors.push(`${path}.rationale is required`);
  for (const field of ["title", "rationale"] as const) {
    const forbiddenTerm = typeof value[field] === "string" ? containsForbiddenRecommendationTerm(value[field]) : null;
    if (forbiddenTerm) errors.push(`${path}.${field} must not prescribe ${forbiddenTerm}`);
  }
  const sourceSectionIds = validateStringArray(value.sourceSectionIds, `${path}.sourceSectionIds`, errors);
  for (const [index, sectionId] of sourceSectionIds.entries()) {
    if (!sectionIds.has(sectionId)) {
      errors.push(`${path}.sourceSectionIds[${index}] must reference an existing section`);
    }
  }
  validateStringArray(value.missingKnowledgeIds, `${path}.missingKnowledgeIds`, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as BusinessUnderstandingReportRecommendation;
}

export function validateBusinessUnderstandingReportArtifact(
  artifact: unknown,
): BusinessUnderstandingReportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(artifact)) {
    return {
      valid: false,
      errors: ["Business Understanding Report artifact must be an object"],
      warnings,
    };
  }

  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.businessUnderstandingReportId)) {
    errors.push("businessUnderstandingReportId is required");
  }
  if (!BUSINESS_UNDERSTANDING_REPORT_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Business Understanding Report status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceDigitalBusinessTwinArtifactId)) {
    errors.push("sourceDigitalBusinessTwinArtifactId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION}`);
  }
  validateLineage(artifact.lineage, artifact, errors);

  const sections: BusinessUnderstandingReportSection[] = [];
  if (!Array.isArray(artifact.sections)) {
    errors.push("sections must be an array");
  } else {
    const ids = new Set<string>();
    const types = new Set<string>();
    for (const [index, section] of artifact.sections.entries()) {
      const validSection = validateSection(section, `sections[${index}]`, errors);
      if (!validSection) continue;
      if (ids.has(validSection.sectionId)) {
        errors.push(`sections[${index}].sectionId must be unique`);
      }
      if (types.has(validSection.type)) {
        errors.push(`sections[${index}].type must be unique`);
      }
      ids.add(validSection.sectionId);
      types.add(validSection.type);
      sections.push(validSection);
    }
    for (const sectionType of BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES) {
      if (!types.has(sectionType)) errors.push(`sections must include ${sectionType}`);
    }
  }

  const sectionIds = new Set(sections.map((section) => section.sectionId));
  const recommendations: BusinessUnderstandingReportRecommendation[] = [];
  if (!Array.isArray(artifact.recommendations)) {
    errors.push("recommendations must be an array");
  } else {
    const ids = new Set<string>();
    for (const [index, recommendation] of artifact.recommendations.entries()) {
      const validRecommendation = validateRecommendation(
        recommendation,
        `recommendations[${index}]`,
        sectionIds,
        errors,
      );
      if (!validRecommendation) continue;
      if (ids.has(validRecommendation.recommendationId)) {
        errors.push(`recommendations[${index}].recommendationId must be unique`);
      }
      ids.add(validRecommendation.recommendationId);
      recommendations.push(validRecommendation);
    }
  }

  validateConfidence(artifact.confidence, "confidence", errors);
  validateStringArray(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
