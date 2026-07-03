/**
 * Phase MVP-1E Website Design Brief runtime contract.
 *
 * The Website Design Brief is the first experience projection of an aligned
 * Digital Business Twin. It describes website intent only. It does not create
 * Website Generation Packages, provider payloads, prompts, code, generated
 * websites, approval, publishing, API, UI, or schema behavior.
 */

import {
  validateBusinessAlignment,
  type BusinessAlignmentArtifact,
  type BusinessAlignmentStatus,
} from "./business-alignment-contract";
import {
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinConfidence,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinStatus,
} from "./digital-business-twin-contract";

export const WEBSITE_DESIGN_BRIEF_CONTRACT_VERSION = "MVP-1E" as const;

export const WEBSITE_DESIGN_BRIEF_STATUSES = [
  "draft",
  "partial",
  "valid",
  "blocked",
  "invalid",
  "stale",
] as const;
export type WebsiteDesignBriefStatus = (typeof WEBSITE_DESIGN_BRIEF_STATUSES)[number];

export const WEBSITE_DESIGN_BRIEF_SECTION_IDS = [
  "executive_summary",
  "website_purpose",
  "website_objectives",
  "target_audience",
  "core_messages",
  "brand_expression",
  "information_priorities",
  "website_journey",
  "trust_strategy",
  "accessibility_goals",
  "seo_intent",
  "experience_constraints",
  "missing_knowledge",
  "recommendations",
  "confidence",
  "limitations",
  "diagnostics",
] as const;
export type WebsiteDesignBriefSectionId = (typeof WEBSITE_DESIGN_BRIEF_SECTION_IDS)[number];

export type WebsiteDesignBriefConfidence = DigitalBusinessTwinConfidence;

export type WebsiteDesignBriefLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceDigitalBusinessTwinId: string;
  sourceDigitalBusinessTwinStatus: DigitalBusinessTwinStatus;
  sourceDigitalBusinessTwinContractVersion: string;
  sourceBusinessAlignmentId: string;
  sourceBusinessAlignmentStatus: BusinessAlignmentStatus;
  sourceBusinessAlignmentContractVersion: string;
  businessAlignmentOutputDigitalBusinessTwinId: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
};

type WebsiteDesignBriefSourceRefs = {
  sourceKnowledgeItemIds: string[];
  sourceMissingKnowledgeIds: string[];
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
};

export type WebsiteObjective = WebsiteDesignBriefSourceRefs & {
  itemType: "website_objective";
  objectiveId: string;
  statement: string;
  rationale: string;
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type AudienceExperience = WebsiteDesignBriefSourceRefs & {
  itemType: "audience_experience";
  audienceExperienceId: string;
  audienceStatement: string;
  experienceIntent: string;
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteMessage = WebsiteDesignBriefSourceRefs & {
  itemType: "website_message";
  messageId: string;
  role: "primary" | "supporting" | "trust" | "brand";
  statement: string;
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteJourney = WebsiteDesignBriefSourceRefs & {
  itemType: "website_journey";
  journeyId: string;
  steps: {
    journeyStepId: string;
    sequence: number;
    intent: string;
    sourceKnowledgeItemIds: string[];
  }[];
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteConstraint = WebsiteDesignBriefSourceRefs & {
  itemType: "website_constraint";
  constraintId: string;
  severity: "required" | "recommended" | "limitation";
  statement: string;
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteDesignBriefTextItem = WebsiteDesignBriefSourceRefs & {
  itemType: "text";
  textItemId: string;
  statement: string;
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteDesignBriefSectionItem =
  | WebsiteObjective
  | AudienceExperience
  | WebsiteMessage
  | WebsiteJourney
  | WebsiteConstraint
  | WebsiteDesignBriefTextItem;

export type WebsiteDesignBriefSection = {
  sectionId: WebsiteDesignBriefSectionId;
  title: string;
  intent: string;
  items: WebsiteDesignBriefSectionItem[];
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteDesignBriefArtifact = {
  websiteDesignBriefId: string;
  status: WebsiteDesignBriefStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceDigitalBusinessTwinId: string;
  sourceBusinessAlignmentId: string;
  createdAt: string;
  contractVersion: typeof WEBSITE_DESIGN_BRIEF_CONTRACT_VERSION;
  lineage: WebsiteDesignBriefLineage;
  sections: WebsiteDesignBriefSection[];
  confidence: WebsiteDesignBriefConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type WebsiteDesignBriefValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type WebsiteDesignBriefValidationInput = {
  artifact: unknown;
  sourceDigitalBusinessTwin?: DigitalBusinessTwinArtifact;
  sourceBusinessAlignment?: BusinessAlignmentArtifact;
};

export const WEBSITE_DESIGN_BRIEF_FORBIDDEN_FIELDS = [
  "providerPayload",
  "prompt",
  "generatedWebsite",
  "generatedHTML",
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
  /\bdeploy\b/i,
  /\bpublish\b/i,
  /\bprovider adapter\b/i,
  /\bexternal ai\b/i,
  /\bprompt\b/i,
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
    if (WEBSITE_DESIGN_BRIEF_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Website Design Brief artifacts`);
    }
    if (typeof nestedValue === "string") validateImplementationLanguage(nestedValue, nestedPath, errors);
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateImplementationLanguage(value: string, path: string, errors: string[]): void {
  if (IMPLEMENTATION_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(value))) {
    errors.push(`${path} must describe website intent, not implementation instructions`);
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
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinId)) {
    errors.push("lineage.sourceDigitalBusinessTwinId is required");
  }
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinStatus)) {
    errors.push("lineage.sourceDigitalBusinessTwinStatus is required");
  }
  if (!isNonEmptyString(value.sourceDigitalBusinessTwinContractVersion)) {
    errors.push("lineage.sourceDigitalBusinessTwinContractVersion is required");
  }
  if (!isNonEmptyString(value.sourceBusinessAlignmentId)) {
    errors.push("lineage.sourceBusinessAlignmentId is required");
  }
  if (!isNonEmptyString(value.sourceBusinessAlignmentStatus)) {
    errors.push("lineage.sourceBusinessAlignmentStatus is required");
  }
  if (!isNonEmptyString(value.sourceBusinessAlignmentContractVersion)) {
    errors.push("lineage.sourceBusinessAlignmentContractVersion is required");
  }
  if (!isNonEmptyString(value.businessAlignmentOutputDigitalBusinessTwinId)) {
    errors.push("lineage.businessAlignmentOutputDigitalBusinessTwinId is required");
  }
  if (value.siteVersionId !== artifact.siteVersionId) {
    errors.push("lineage.siteVersionId must match siteVersionId");
  }
  if (value.dryRunId !== artifact.dryRunId) {
    errors.push("lineage.dryRunId must match dryRunId");
  }
  if (value.sourceDigitalBusinessTwinId !== artifact.sourceDigitalBusinessTwinId) {
    errors.push("lineage.sourceDigitalBusinessTwinId must match sourceDigitalBusinessTwinId");
  }
  if (value.sourceBusinessAlignmentId !== artifact.sourceBusinessAlignmentId) {
    errors.push("lineage.sourceBusinessAlignmentId must match sourceBusinessAlignmentId");
  }
  if (value.businessAlignmentOutputDigitalBusinessTwinId !== artifact.sourceDigitalBusinessTwinId) {
    errors.push("lineage.businessAlignmentOutputDigitalBusinessTwinId must match sourceDigitalBusinessTwinId");
  }
  validateEvidenceRefs(value.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(value.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateSourceRefs(value: Record<string, unknown>, path: string, errors: string[]): void {
  validateStringArray(value.sourceKnowledgeItemIds, `${path}.sourceKnowledgeItemIds`, errors);
  validateStringArray(value.sourceMissingKnowledgeIds, `${path}.sourceMissingKnowledgeIds`, errors);
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
}

function validateItem(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const itemType = value.itemType;
  if (
    itemType !== "text" &&
    itemType !== "website_objective" &&
    itemType !== "audience_experience" &&
    itemType !== "website_message" &&
    itemType !== "website_journey" &&
    itemType !== "website_constraint"
  ) {
    errors.push(`${path}.itemType is not allowed`);
  }
  if (itemType === "text" && !isNonEmptyString(value.textItemId)) errors.push(`${path}.textItemId is required`);
  if (itemType === "website_objective" && !isNonEmptyString(value.objectiveId)) {
    errors.push(`${path}.objectiveId is required`);
  }
  if (itemType === "audience_experience" && !isNonEmptyString(value.audienceExperienceId)) {
    errors.push(`${path}.audienceExperienceId is required`);
  }
  if (itemType === "website_message" && !isNonEmptyString(value.messageId)) {
    errors.push(`${path}.messageId is required`);
  }
  if (itemType === "website_journey" && !isNonEmptyString(value.journeyId)) {
    errors.push(`${path}.journeyId is required`);
  }
  if (itemType === "website_constraint" && !isNonEmptyString(value.constraintId)) {
    errors.push(`${path}.constraintId is required`);
  }
  if (itemType === "website_message" &&
    value.role !== "primary" &&
    value.role !== "supporting" &&
    value.role !== "trust" &&
    value.role !== "brand") {
    errors.push(`${path}.role is not allowed`);
  }
  if (itemType === "website_constraint" &&
    value.severity !== "required" &&
    value.severity !== "recommended" &&
    value.severity !== "limitation") {
    errors.push(`${path}.severity is not allowed`);
  }
  if (itemType === "audience_experience") {
    if (!isNonEmptyString(value.audienceStatement)) errors.push(`${path}.audienceStatement is required`);
    if (!isNonEmptyString(value.experienceIntent)) errors.push(`${path}.experienceIntent is required`);
  } else if (itemType === "website_journey") {
    if (!Array.isArray(value.steps) || value.steps.length === 0) {
      errors.push(`${path}.steps must be a non-empty array`);
    } else {
      const stepIds = new Set<string>();
      for (const [index, step] of value.steps.entries()) {
        const stepPath = `${path}.steps[${index}]`;
        if (!isObject(step)) {
          errors.push(`${stepPath} must be an object`);
          continue;
        }
        if (!isNonEmptyString(step.journeyStepId)) errors.push(`${stepPath}.journeyStepId is required`);
        else if (stepIds.has(step.journeyStepId)) errors.push(`${stepPath}.journeyStepId must be unique`);
        else stepIds.add(step.journeyStepId);
        if (typeof step.sequence !== "number" || !Number.isInteger(step.sequence) || step.sequence < 1) {
          errors.push(`${stepPath}.sequence must be a positive integer`);
        }
        if (!isNonEmptyString(step.intent)) errors.push(`${stepPath}.intent is required`);
        validateStringArray(step.sourceKnowledgeItemIds, `${stepPath}.sourceKnowledgeItemIds`, errors);
      }
    }
  } else if (!isNonEmptyString(value.statement)) {
    errors.push(`${path}.statement is required`);
  }
  if (value.rationale !== undefined && !isNonEmptyString(value.rationale)) {
    errors.push(`${path}.rationale must be a non-empty string when present`);
  }
  validateSourceRefs(value, path, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
}

function validateSection(value: unknown, path: string, errors: string[]): WebsiteDesignBriefSection | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!WEBSITE_DESIGN_BRIEF_SECTION_IDS.includes(value.sectionId as never)) {
    errors.push(`${path}.sectionId is not an allowed Website Design Brief section`);
  }
  if (!isNonEmptyString(value.title)) errors.push(`${path}.title is required`);
  if (!isNonEmptyString(value.intent)) errors.push(`${path}.intent is required`);
  if (!Array.isArray(value.items)) {
    errors.push(`${path}.items must be an array`);
  } else {
    for (const [index, item] of value.items.entries()) {
      validateItem(item, `${path}.items[${index}]`, errors);
    }
  }
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as WebsiteDesignBriefSection;
}

function validateSourceArtifacts(input: {
  artifact: Record<string, unknown>;
  sourceDigitalBusinessTwin?: DigitalBusinessTwinArtifact;
  sourceBusinessAlignment?: BusinessAlignmentArtifact;
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
    if (
      input.sourceDigitalBusinessTwin.status !== "aligned" &&
      input.sourceDigitalBusinessTwin.status !== "confirmed" &&
      input.sourceDigitalBusinessTwin.status !== "blocked"
    ) {
      input.errors.push("sourceDigitalBusinessTwin.status must be aligned, confirmed, or blocked for Website Design Brief");
    }
  }

  if (input.sourceBusinessAlignment) {
    const alignmentValidation = validateBusinessAlignment(input.sourceBusinessAlignment);
    input.errors.push(...alignmentValidation.errors.map((error) => `sourceBusinessAlignment.${error}`));
    input.warnings.push(...alignmentValidation.warnings.map((warning) => `sourceBusinessAlignment.${warning}`));
    if (input.sourceBusinessAlignment.businessAlignmentId !== input.artifact.sourceBusinessAlignmentId) {
      input.errors.push("sourceBusinessAlignment.businessAlignmentId must match sourceBusinessAlignmentId");
    }
    if (input.sourceBusinessAlignment.siteVersionId !== input.artifact.siteVersionId) {
      input.errors.push("sourceBusinessAlignment.siteVersionId must match siteVersionId");
    }
    if (input.sourceBusinessAlignment.dryRunId !== input.artifact.dryRunId) {
      input.errors.push("sourceBusinessAlignment.dryRunId must match dryRunId");
    }
    if (
      input.sourceBusinessAlignment.lineage.outputDigitalBusinessTwinId !==
      input.artifact.sourceDigitalBusinessTwinId
    ) {
      input.errors.push("sourceBusinessAlignment lineage must output sourceDigitalBusinessTwinId");
    }
  }
}

export function validateWebsiteDesignBrief(
  validationInput: WebsiteDesignBriefValidationInput | WebsiteDesignBriefArtifact,
): WebsiteDesignBriefValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as WebsiteDesignBriefValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Website Design Brief artifact must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.websiteDesignBriefId)) errors.push("websiteDesignBriefId is required");
  if (!WEBSITE_DESIGN_BRIEF_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Website Design Brief status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceDigitalBusinessTwinId)) {
    errors.push("sourceDigitalBusinessTwinId is required");
  }
  if (!isNonEmptyString(artifact.sourceBusinessAlignmentId)) {
    errors.push("sourceBusinessAlignmentId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== WEBSITE_DESIGN_BRIEF_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${WEBSITE_DESIGN_BRIEF_CONTRACT_VERSION}`);
  }
  validateLineage(artifact.lineage, artifact, errors);

  if (!Array.isArray(artifact.sections)) {
    errors.push("sections must be an array");
  } else {
    const sectionIds = new Set<string>();
    for (const [index, section] of artifact.sections.entries()) {
      const validSection = validateSection(section, `sections[${index}]`, errors);
      if (!validSection) continue;
      if (sectionIds.has(validSection.sectionId)) {
        errors.push(`sections[${index}].sectionId must be unique`);
      }
      sectionIds.add(validSection.sectionId);
    }
    for (const sectionId of WEBSITE_DESIGN_BRIEF_SECTION_IDS) {
      if (!sectionIds.has(sectionId)) errors.push(`sections must include ${sectionId}`);
    }
  }

  validateConfidence(artifact.confidence, "confidence", errors);
  validateStringArray(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateSourceArtifacts({
    artifact,
    sourceDigitalBusinessTwin: input.sourceDigitalBusinessTwin,
    sourceBusinessAlignment: input.sourceBusinessAlignment,
    errors,
    warnings,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
