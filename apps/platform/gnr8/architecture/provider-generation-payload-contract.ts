/**
 * Phase MVP-1H Provider Generation Payload runtime contract.
 *
 * A ProviderGenerationPayload is an exportable serialization of a persisted
 * Website Generation Package for a future provider run. It is not a prompt
 * execution, AI output, generated website, compliance artifact, approval,
 * publishing artifact, UI, API, schema, worker, or production mutation.
 */

import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationConfidence,
  type WebsiteGenerationConstraint,
  type WebsiteGenerationPackageArtifact,
  type WebsiteGenerationPackageStatus,
  type WebsiteGenerationValidationExpectation,
} from "./website-generation-package-contract";
import type { DigitalBusinessTwinEvidenceRef } from "./digital-business-twin-contract";

export const PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION = "MVP-1H" as const;

export const PROVIDER_GENERATION_PROVIDER_TYPES = ["codex"] as const;
export type ProviderGenerationProviderType = (typeof PROVIDER_GENERATION_PROVIDER_TYPES)[number];

export const PROVIDER_GENERATION_PAYLOAD_KINDS = ["codex_task"] as const;
export type ProviderGenerationPayloadKind = (typeof PROVIDER_GENERATION_PAYLOAD_KINDS)[number];

export const PROVIDER_GENERATION_PAYLOAD_STATUSES = [
  "draft",
  "ready",
  "valid",
  "invalid",
  "stale",
  "blocked",
] as const;
export type ProviderGenerationPayloadStatus = (typeof PROVIDER_GENERATION_PAYLOAD_STATUSES)[number];

export type ProviderAdapterIdentity = {
  adapterId: string;
  adapterName: string;
  adapterVersion: typeof PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION;
  adapterContractVersion: typeof PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION;
  providerType: ProviderGenerationProviderType;
  payloadKind: ProviderGenerationPayloadKind;
  sourceArtifactKind: "website_generation_package";
  serializationMode: "deterministic_export";
  diagnostics: string[];
};

export type ProviderGenerationPayloadLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  sourceWebsiteGenerationPackageStatus: WebsiteGenerationPackageStatus;
  sourceWebsiteGenerationPackageContractVersion: string;
  sourceGenerationImprovementPlanId?: string;
  sourceGenerationImprovementPlanArtifactId?: string;
  sourceGenerationImprovementPlanStatus?: string;
  sourceGenerationImprovementPlanContractVersion?: string;
  sourceWebsiteDesignBriefId: string;
  sourceDigitalBusinessTwinId: string;
  sourceBusinessAlignmentId: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
  adapterIdentity: ProviderAdapterIdentity;
};

export type CodexTaskEnvelope = {
  objective: string;
  sourcePackageSummary: {
    websiteGenerationPackageId: string;
    websiteGenerationPackageArtifactId: string;
    status: WebsiteGenerationPackageStatus;
    businessContext: string;
    objectiveStatements: string[];
    audienceStatements: string[];
    messageStatements: string[];
    limitationCount: number;
    diagnosticCount: number;
  };
  requiredWebsiteOutcomes: {
    generationObjectives: WebsiteGenerationPackageArtifact["generationObjectives"];
    audience: WebsiteGenerationPackageArtifact["audience"];
    messages: WebsiteGenerationPackageArtifact["messages"];
  };
  navigationPageSectionRequirements: {
    navigationContract: WebsiteGenerationPackageArtifact["navigationContract"];
    pageContracts: WebsiteGenerationPackageArtifact["pageContracts"];
    sectionContracts: WebsiteGenerationPackageArtifact["sectionContracts"];
  };
  contentRequirements: WebsiteGenerationPackageArtifact["contentRequirements"];
  constraints: WebsiteGenerationConstraint[];
  validationExpectations: WebsiteGenerationValidationExpectation[];
  forbiddenActions: string[];
  expectedOutputShape: {
    outputKind: "implementation_proposal_only";
    requiredSections: string[];
    prohibitedSections: string[];
  };
  stopConditions: string[];
};

export type ProviderGenerationPayloadSafetyClassification = {
  classification: "export_only_no_execution";
  providerExecutionAllowed: false;
  aiExecutionAllowed: false;
  generatedWebsiteAllowed: false;
  publishingAllowed: false;
  deploymentAllowed: false;
  dnsMutationAllowed: false;
  productionMutationAllowed: false;
  complianceExecutionAllowed: false;
  notes: string[];
};

export type ProviderGenerationPayloadImprovementGuidance = {
  originatingImprovementId: string;
  originatingDeviationIds: string[];
  originatingRequirementIds: string[];
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  expectedOutcome: string;
};

export type ProviderGenerationPayloadRegenerationGuidance = {
  preserve: string[];
  improve: ProviderGenerationPayloadImprovementGuidance[];
  do_not_change: string[];
  known_limitations: string[];
  critical_items: ProviderGenerationPayloadImprovementGuidance[];
};

export type ProviderGenerationPayloadDeltaSummary = {
  totalImprovements: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  affectedCategories: string[];
  recommendedRegenerationStrategy: string;
};

export type ProviderGenerationPayload = {
  providerGenerationPayloadId: string;
  status: ProviderGenerationPayloadStatus;
  providerType: ProviderGenerationProviderType;
  payloadKind: ProviderGenerationPayloadKind;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  sourceGenerationImprovementPlanId?: string;
  sourceGenerationImprovementPlanArtifactId?: string;
  siteVersionId: string;
  dryRunId: string;
  createdAt: string;
  contractVersion: typeof PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION;
  lineage: ProviderGenerationPayloadLineage;
  serializedWebsiteGenerationPackage: WebsiteGenerationPackageArtifact;
  codexTaskEnvelope: CodexTaskEnvelope;
  preservedConstraints: WebsiteGenerationConstraint[];
  validationExpectations: WebsiteGenerationValidationExpectation[];
  confidence: WebsiteGenerationConfidence;
  limitations: string[];
  diagnostics: string[];
  safetyClassification: ProviderGenerationPayloadSafetyClassification;
  regenerationGuidance?: ProviderGenerationPayloadRegenerationGuidance;
  deltaSummary?: ProviderGenerationPayloadDeltaSummary;
};

export type ProviderGenerationPayloadValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ProviderGenerationPayloadValidationInput = {
  payload: unknown;
  sourceWebsiteGenerationPackage?: WebsiteGenerationPackageArtifact;
};

export const PROVIDER_GENERATION_PAYLOAD_FORBIDDEN_FIELDS = [
  "openAiPrompt",
  "claudePrompt",
  "geminiPrompt",
  "aiOutput",
  "generatedWebsite",
  "generatedContent",
  "generatedHtml",
  "generatedReact",
  "html",
  "react",
  "css",
  "framework",
  "implementationInstructions",
  "generatedComponents",
  "generatedBlocks",
  "deploymentArtifact",
  "publishingArtifact",
  "executionArtifact",
  "providerResult",
  "runtimeMutation",
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
    if (PROVIDER_GENERATION_PAYLOAD_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Provider Generation Payload artifacts`);
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

function validateOptionalString(value: unknown, path: string, errors: string[]): void {
  if (value !== undefined && !isNonEmptyString(value)) errors.push(`${path} must be a non-empty string when present`);
}

function validateRequiredObject(value: unknown, path: string, errors: string[]): Record<string, unknown> | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  return value;
}

function validateEvidenceRefs(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, ref] of value.entries()) {
    const refPath = `${path}[${index}]`;
    if (!isObject(ref)) {
      errors.push(`${refPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(ref.refId)) errors.push(`${refPath}.refId is required`);
    if (!isNonEmptyString(ref.sourceKind)) errors.push(`${refPath}.sourceKind is required`);
  }
}

function validateAdapterIdentity(value: unknown, path: string, errors: string[]): void {
  const identity = validateRequiredObject(value, path, errors);
  if (!identity) return;
  if (!isNonEmptyString(identity.adapterId)) errors.push(`${path}.adapterId is required`);
  if (!isNonEmptyString(identity.adapterName)) errors.push(`${path}.adapterName is required`);
  if (identity.adapterVersion !== PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION) {
    errors.push(`${path}.adapterVersion must be ${PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION}`);
  }
  if (identity.adapterContractVersion !== PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION) {
    errors.push(`${path}.adapterContractVersion must be ${PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION}`);
  }
  if (identity.providerType !== "codex") errors.push(`${path}.providerType must be codex`);
  if (identity.payloadKind !== "codex_task") errors.push(`${path}.payloadKind must be codex_task`);
  if (identity.sourceArtifactKind !== "website_generation_package") {
    errors.push(`${path}.sourceArtifactKind must be website_generation_package`);
  }
  if (identity.serializationMode !== "deterministic_export") {
    errors.push(`${path}.serializationMode must be deterministic_export`);
  }
  validateStringArray(identity.diagnostics, `${path}.diagnostics`, errors);
}

function validateLineage(value: unknown, payload: Record<string, unknown>, errors: string[]): void {
  const lineage = validateRequiredObject(value, "lineage", errors);
  if (!lineage) return;
  if (!isNonEmptyString(lineage.siteVersionId)) errors.push("lineage.siteVersionId is required");
  if (!isNonEmptyString(lineage.dryRunId)) errors.push("lineage.dryRunId is required");
  if (!isNonEmptyString(lineage.sourceWebsiteGenerationPackageId)) {
    errors.push("lineage.sourceWebsiteGenerationPackageId is required");
  }
  if (!isNonEmptyString(lineage.sourceWebsiteGenerationPackageArtifactId)) {
    errors.push("lineage.sourceWebsiteGenerationPackageArtifactId is required");
  }
  if (!isNonEmptyString(lineage.sourceWebsiteGenerationPackageStatus)) {
    errors.push("lineage.sourceWebsiteGenerationPackageStatus is required");
  }
  if (!isNonEmptyString(lineage.sourceWebsiteGenerationPackageContractVersion)) {
    errors.push("lineage.sourceWebsiteGenerationPackageContractVersion is required");
  }
  validateOptionalString(lineage.sourceGenerationImprovementPlanId, "lineage.sourceGenerationImprovementPlanId", errors);
  validateOptionalString(
    lineage.sourceGenerationImprovementPlanArtifactId,
    "lineage.sourceGenerationImprovementPlanArtifactId",
    errors,
  );
  validateOptionalString(
    lineage.sourceGenerationImprovementPlanStatus,
    "lineage.sourceGenerationImprovementPlanStatus",
    errors,
  );
  validateOptionalString(
    lineage.sourceGenerationImprovementPlanContractVersion,
    "lineage.sourceGenerationImprovementPlanContractVersion",
    errors,
  );
  if (!isNonEmptyString(lineage.sourceWebsiteDesignBriefId)) {
    errors.push("lineage.sourceWebsiteDesignBriefId is required");
  }
  if (!isNonEmptyString(lineage.sourceDigitalBusinessTwinId)) {
    errors.push("lineage.sourceDigitalBusinessTwinId is required");
  }
  if (!isNonEmptyString(lineage.sourceBusinessAlignmentId)) {
    errors.push("lineage.sourceBusinessAlignmentId is required");
  }
  if (lineage.siteVersionId !== payload.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (lineage.dryRunId !== payload.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (lineage.sourceWebsiteGenerationPackageId !== payload.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (lineage.sourceWebsiteGenerationPackageArtifactId !== payload.sourceWebsiteGenerationPackageArtifactId) {
    errors.push("lineage.sourceWebsiteGenerationPackageArtifactId must match sourceWebsiteGenerationPackageArtifactId");
  }
  if (payload.sourceGenerationImprovementPlanId !== undefined &&
    lineage.sourceGenerationImprovementPlanId !== payload.sourceGenerationImprovementPlanId) {
    errors.push("lineage.sourceGenerationImprovementPlanId must match sourceGenerationImprovementPlanId");
  }
  if (payload.sourceGenerationImprovementPlanArtifactId !== undefined &&
    lineage.sourceGenerationImprovementPlanArtifactId !== payload.sourceGenerationImprovementPlanArtifactId) {
    errors.push("lineage.sourceGenerationImprovementPlanArtifactId must match sourceGenerationImprovementPlanArtifactId");
  }
  validateEvidenceRefs(lineage.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(lineage.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
  validateAdapterIdentity(lineage.adapterIdentity, "lineage.adapterIdentity", errors);
}

function validateEnvelope(value: unknown, errors: string[]): void {
  const envelope = validateRequiredObject(value, "codexTaskEnvelope", errors);
  if (!envelope) return;
  if (!isNonEmptyString(envelope.objective)) errors.push("codexTaskEnvelope.objective is required");
  for (const section of [
    "sourcePackageSummary",
    "requiredWebsiteOutcomes",
    "navigationPageSectionRequirements",
    "expectedOutputShape",
  ]) {
    validateRequiredObject(envelope[section], `codexTaskEnvelope.${section}`, errors);
  }
  if (!Array.isArray(envelope.contentRequirements) || envelope.contentRequirements.length === 0) {
    errors.push("codexTaskEnvelope.contentRequirements must be a non-empty array");
  }
  if (!Array.isArray(envelope.constraints)) errors.push("codexTaskEnvelope.constraints must be an array");
  if (!Array.isArray(envelope.validationExpectations) || envelope.validationExpectations.length === 0) {
    errors.push("codexTaskEnvelope.validationExpectations must be a non-empty array");
  }
  const forbiddenActions = validateStringArray(envelope.forbiddenActions, "codexTaskEnvelope.forbiddenActions", errors);
  for (const required of ["publishing", "deployment", "DNS", "production mutations"]) {
    if (!forbiddenActions.some((action) => action.includes(required))) {
      errors.push(`codexTaskEnvelope.forbiddenActions must include ${required}`);
    }
  }
  const stopConditions = validateStringArray(envelope.stopConditions, "codexTaskEnvelope.stopConditions", errors);
  if (!stopConditions.some((condition) => condition.includes("provider call"))) {
    errors.push("codexTaskEnvelope.stopConditions must stop before provider calls");
  }
  const expectedOutputShape = isObject(envelope.expectedOutputShape) ? envelope.expectedOutputShape : null;
  if (expectedOutputShape?.outputKind !== "implementation_proposal_only") {
    errors.push("codexTaskEnvelope.expectedOutputShape.outputKind must be implementation_proposal_only");
  }
}

function validateSafety(value: unknown, errors: string[]): void {
  const safety = validateRequiredObject(value, "safetyClassification", errors);
  if (!safety) return;
  if (safety.classification !== "export_only_no_execution") {
    errors.push("safetyClassification.classification must be export_only_no_execution");
  }
  for (const key of [
    "providerExecutionAllowed",
    "aiExecutionAllowed",
    "generatedWebsiteAllowed",
    "publishingAllowed",
    "deploymentAllowed",
    "dnsMutationAllowed",
    "productionMutationAllowed",
    "complianceExecutionAllowed",
  ]) {
    if (safety[key] !== false) errors.push(`safetyClassification.${key} must be false`);
  }
  validateStringArray(safety.notes, "safetyClassification.notes", errors);
}

function validateSourcePackage(input: {
  payload: Record<string, unknown>;
  sourceWebsiteGenerationPackage?: WebsiteGenerationPackageArtifact;
  errors: string[];
  warnings: string[];
}): void {
  const serialized = input.payload.serializedWebsiteGenerationPackage;
  const sourceValidation = validateWebsiteGenerationPackage(serialized as WebsiteGenerationPackageArtifact);
  input.errors.push(...sourceValidation.errors.map((error) => `serializedWebsiteGenerationPackage.${error}`));
  input.warnings.push(...sourceValidation.warnings.map((warning) => `serializedWebsiteGenerationPackage.${warning}`));
  if (!isObject(serialized)) return;

  if (serialized.websiteGenerationPackageId !== input.payload.sourceWebsiteGenerationPackageId) {
    input.errors.push("serializedWebsiteGenerationPackage.websiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  if (serialized.siteVersionId !== input.payload.siteVersionId) {
    input.errors.push("serializedWebsiteGenerationPackage.siteVersionId must match siteVersionId");
  }
  if (serialized.dryRunId !== input.payload.dryRunId) {
    input.errors.push("serializedWebsiteGenerationPackage.dryRunId must match dryRunId");
  }
  if (input.sourceWebsiteGenerationPackage) {
    if (input.sourceWebsiteGenerationPackage.websiteGenerationPackageId !== input.payload.sourceWebsiteGenerationPackageId) {
      input.errors.push("sourceWebsiteGenerationPackage.websiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
    }
    if (input.sourceWebsiteGenerationPackage.siteVersionId !== input.payload.siteVersionId) {
      input.errors.push("sourceWebsiteGenerationPackage.siteVersionId must match siteVersionId");
    }
    if (input.sourceWebsiteGenerationPackage.dryRunId !== input.payload.dryRunId) {
      input.errors.push("sourceWebsiteGenerationPackage.dryRunId must match dryRunId");
    }
  }
}

function validatePreservedArrays(payload: Record<string, unknown>, errors: string[]): void {
  const source = isObject(payload.serializedWebsiteGenerationPackage)
    ? payload.serializedWebsiteGenerationPackage as unknown as WebsiteGenerationPackageArtifact
    : null;
  if (!source) return;
  if (!Array.isArray(payload.preservedConstraints)) {
    errors.push("preservedConstraints must be an array");
  } else if (payload.preservedConstraints.length !== source.constraints.length) {
    errors.push("preservedConstraints must preserve all source WGP constraints");
  }
  if (!Array.isArray(payload.validationExpectations)) {
    errors.push("validationExpectations must be an array");
  } else if (payload.validationExpectations.length !== source.validationContract.expectations.length) {
    errors.push("validationExpectations must preserve all source WGP validation expectations");
  }
}

function validateImprovementGuidanceItem(value: unknown, path: string, errors: string[]): void {
  const item = validateRequiredObject(value, path, errors);
  if (!item) return;
  if (!isNonEmptyString(item.originatingImprovementId)) errors.push(`${path}.originatingImprovementId is required`);
  validateStringArray(item.originatingDeviationIds, `${path}.originatingDeviationIds`, errors);
  validateStringArray(item.originatingRequirementIds, `${path}.originatingRequirementIds`, errors);
  if (!isNonEmptyString(item.category)) errors.push(`${path}.category is required`);
  if (item.priority !== "critical" && item.priority !== "high" && item.priority !== "medium" && item.priority !== "low") {
    errors.push(`${path}.priority is not allowed`);
  }
  if (!isNonEmptyString(item.expectedOutcome)) errors.push(`${path}.expectedOutcome is required`);
}

function validateRegenerationGuidance(payload: Record<string, unknown>, errors: string[]): void {
  if (payload.regenerationGuidance === undefined && payload.deltaSummary === undefined) return;
  const guidance = validateRequiredObject(payload.regenerationGuidance, "regenerationGuidance", errors);
  if (guidance) {
    validateStringArray(guidance.preserve, "regenerationGuidance.preserve", errors);
    validateStringArray(guidance.do_not_change, "regenerationGuidance.do_not_change", errors);
    validateStringArray(guidance.known_limitations, "regenerationGuidance.known_limitations", errors);
    if (!Array.isArray(guidance.improve)) errors.push("regenerationGuidance.improve must be an array");
    else guidance.improve.forEach((item, index) =>
      validateImprovementGuidanceItem(item, `regenerationGuidance.improve[${index}]`, errors));
    if (!Array.isArray(guidance.critical_items)) errors.push("regenerationGuidance.critical_items must be an array");
    else guidance.critical_items.forEach((item, index) =>
      validateImprovementGuidanceItem(item, `regenerationGuidance.critical_items[${index}]`, errors));
  }

  const summary = validateRequiredObject(payload.deltaSummary, "deltaSummary", errors);
  if (!summary) return;
  for (const key of ["totalImprovements", "critical", "high", "medium", "low"]) {
    if (!Number.isInteger(summary[key]) || Number(summary[key]) < 0) {
      errors.push(`deltaSummary.${key} must be a non-negative integer`);
    }
  }
  validateStringArray(summary.affectedCategories, "deltaSummary.affectedCategories", errors);
  if (!isNonEmptyString(summary.recommendedRegenerationStrategy)) {
    errors.push("deltaSummary.recommendedRegenerationStrategy is required");
  }
  const counted = Number(summary.critical ?? 0) + Number(summary.high ?? 0) +
    Number(summary.medium ?? 0) + Number(summary.low ?? 0);
  if (Number.isInteger(summary.totalImprovements) && counted !== summary.totalImprovements) {
    errors.push("deltaSummary priority counts must equal totalImprovements");
  }
}

export function validateProviderGenerationPayload(
  validationInput: ProviderGenerationPayloadValidationInput | ProviderGenerationPayload,
): ProviderGenerationPayloadValidationResult {
  const input = isObject(validationInput) && "payload" in validationInput
    ? validationInput as ProviderGenerationPayloadValidationInput
    : { payload: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.payload)) {
    return {
      valid: false,
      errors: ["Provider Generation Payload must be an object"],
      warnings,
    };
  }

  const payload = input.payload;
  validateForbiddenFields(payload, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(payload.providerGenerationPayloadId)) errors.push("providerGenerationPayloadId is required");
  if (!PROVIDER_GENERATION_PAYLOAD_STATUSES.includes(payload.status as never)) {
    errors.push("status is not an allowed Provider Generation Payload status");
  }
  if (payload.providerType !== "codex") errors.push("providerType must be codex");
  if (payload.payloadKind !== "codex_task") errors.push("payloadKind must be codex_task");
  if (!isNonEmptyString(payload.sourceWebsiteGenerationPackageId)) {
    errors.push("sourceWebsiteGenerationPackageId is required");
  }
  if (!isNonEmptyString(payload.sourceWebsiteGenerationPackageArtifactId)) {
    errors.push("sourceWebsiteGenerationPackageArtifactId is required");
  }
  validateOptionalString(payload.sourceGenerationImprovementPlanId, "sourceGenerationImprovementPlanId", errors);
  validateOptionalString(payload.sourceGenerationImprovementPlanArtifactId, "sourceGenerationImprovementPlanArtifactId", errors);
  if (!isNonEmptyString(payload.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(payload.dryRunId)) errors.push("dryRunId is required");
  if (!isTimestamp(payload.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (payload.contractVersion !== PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION}`);
  }

  validateLineage(payload.lineage, payload, errors);
  validateSourcePackage({
    payload,
    sourceWebsiteGenerationPackage: input.sourceWebsiteGenerationPackage,
    errors,
    warnings,
  });
  validateEnvelope(payload.codexTaskEnvelope, errors);
  validatePreservedArrays(payload, errors);
  validateRequiredObject(payload.confidence, "confidence", errors);
  validateStringArray(payload.limitations, "limitations", errors);
  validateStringArray(payload.diagnostics, "diagnostics", errors);
  validateSafety(payload.safetyClassification, errors);
  validateRegenerationGuidance(payload, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
