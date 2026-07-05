/**
 * Phase MVP-1K-3 Observed Website Model contract.
 *
 * Observed Website Model records what exists in quarantined Generated Website
 * Proposal metadata. It does not compare to the Website Generation Package,
 * judge compliance, approve business changes, publish, deploy, call providers,
 * execute AI, render generated output, or mutate runtime/canonical truth.
 */

import {
  validateGeneratedWebsiteProposal,
  type GeneratedWebsiteProposalArtifact,
} from "./generated-website-proposal-contract";

export const OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION = "MVP-1K-3" as const;

export const OBSERVED_WEBSITE_STATUSES = [
  "not_observable",
  "partially_observable",
  "observable",
  "blocked",
  "invalid",
  "stale",
] as const;
export type ObservedWebsiteStatus = (typeof OBSERVED_WEBSITE_STATUSES)[number];

export type ObservedWebsiteEvidenceSource =
  | "generated_website_proposal"
  | "output_bundle_metadata"
  | "route_metadata"
  | "file_tree_metadata"
  | "navigation_metadata"
  | "section_metadata"
  | "message_metadata"
  | "asset_metadata"
  | "technical_metadata"
  | "provider_note"
  | "operator_note"
  | "limitation";

export type ObservedWebsiteLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceGeneratedWebsiteProposalId: string;
  sourceGeneratedWebsiteProposalArtifactId?: string;
  sourceGeneratedWebsiteProposalStatus: GeneratedWebsiteProposalArtifact["status"];
  sourceGeneratedWebsiteProposalContractVersion: string;
  sourceProviderGenerationPayloadId: string;
  sourceProviderGenerationPayloadArtifactId?: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId?: string;
  outputBundleId: string;
  operatorAttestationId: string;
  observedAt: string;
  upstreamArtifactRefs: ObservedEvidence[];
};

export type ObservedPage = {
  observedPageId: string;
  routePath: string;
  title?: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedNavigation = {
  observedNavigationId: string;
  label?: string;
  href?: string;
  sourcePageId?: string;
  targetPageId?: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedSection = {
  observedSectionId: string;
  pageId?: string;
  routePath?: string;
  sectionType?: string;
  label?: string;
  contentSummary?: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedMessage = {
  observedMessageId: string;
  pageId?: string;
  routePath?: string;
  messageKind: "declared_content" | "provider_note" | "operator_note" | "bundle_note";
  textSummary: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedAsset = {
  observedAssetId: string;
  path: string;
  assetKind?: string;
  contentType?: string;
  byteSize?: number;
  contentHash?: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedConstraint = {
  observedConstraintId: string;
  statement: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedTechnicalSignal = {
  observedTechnicalSignalId: string;
  signalType: string;
  value: string;
  source: ObservedWebsiteEvidenceSource;
  evidenceRefIds: string[];
  limitations: string[];
  diagnostics: string[];
};

export type ObservedEvidence = {
  observedEvidenceId: string;
  sourceKind: ObservedWebsiteEvidenceSource;
  refId: string;
  description: string;
};

export type ObservedLimitation = {
  observedLimitationId: string;
  severity: "info" | "warning" | "blocked";
  message: string;
  source: ObservedWebsiteEvidenceSource;
};

export type ObservedWebsiteReadiness = {
  status: Exclude<ObservedWebsiteStatus, "invalid" | "stale">;
  observable: boolean;
  pageInventoryObserved: boolean;
  fileInventoryObserved: boolean;
  navigationObserved: boolean;
  sectionMetadataObserved: boolean;
  messageMetadataObserved: boolean;
  assetMetadataObserved: boolean;
  technicalSignalsObserved: boolean;
  blockers: string[];
  diagnostics: string[];
};

export type ObservedWebsiteModelArtifact = {
  observedWebsiteModelId: string;
  status: ObservedWebsiteStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceGeneratedWebsiteProposalId: string;
  sourceProviderGenerationPayloadId: string;
  sourceWebsiteGenerationPackageId: string;
  createdAt: string;
  contractVersion: typeof OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION;
  lineage: ObservedWebsiteLineage;
  pages: ObservedPage[];
  navigation: ObservedNavigation[];
  sections: ObservedSection[];
  messages: ObservedMessage[];
  assets: ObservedAsset[];
  constraints: ObservedConstraint[];
  technicalSignals: ObservedTechnicalSignal[];
  evidence: ObservedEvidence[];
  readiness: ObservedWebsiteReadiness;
  limitations: ObservedLimitation[];
  diagnostics: string[];
};

export type ObservedWebsiteValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ObservedWebsiteValidationInput = {
  artifact: unknown;
  sourceGeneratedWebsiteProposal?: GeneratedWebsiteProposalArtifact;
};

export const OBSERVED_WEBSITE_FORBIDDEN_FIELDS = [
  "complianceReport",
  "complianceScore",
  "complianceResult",
  "businessApproval",
  "publishingArtifact",
  "deploymentArtifact",
  "dnsMutation",
  "productionMutation",
  "runtimeMutation",
  "providerPayloadMutation",
  "canonicalTruthUpdate",
  "websiteGenerationPackageMutation",
  "digitalBusinessTwinMutation",
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
    if (OBSERVED_WEBSITE_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Observed Website Model artifacts`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateRequiredObject(value: unknown, path: string, errors: string[]): Record<string, unknown> | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  return value;
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

function validateEvidenceRefIds(value: unknown, path: string, errors: string[]): void {
  validateStringArray(value, path, errors);
}

function validateEvidenceArray(value: unknown, path: string, errors: string[], ids: string[]): void {
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
    if (!isNonEmptyString(item.observedEvidenceId)) errors.push(`${itemPath}.observedEvidenceId is required`);
    else ids.push(item.observedEvidenceId);
    if (!isNonEmptyString(item.sourceKind)) errors.push(`${itemPath}.sourceKind is required`);
    if (!isNonEmptyString(item.refId)) errors.push(`${itemPath}.refId is required`);
    if (!isNonEmptyString(item.description)) errors.push(`${itemPath}.description is required`);
  }
}

function validateLineage(value: unknown, artifact: Record<string, unknown>, errors: string[]): void {
  const lineage = validateRequiredObject(value, "lineage", errors);
  if (!lineage) return;
  for (const key of [
    "siteVersionId",
    "dryRunId",
    "sourceGeneratedWebsiteProposalId",
    "sourceGeneratedWebsiteProposalStatus",
    "sourceGeneratedWebsiteProposalContractVersion",
    "sourceProviderGenerationPayloadId",
    "sourceWebsiteGenerationPackageId",
    "outputBundleId",
    "operatorAttestationId",
  ]) {
    if (!isNonEmptyString(lineage[key])) errors.push(`lineage.${key} is required`);
  }
  for (const key of [
    "sourceGeneratedWebsiteProposalArtifactId",
    "sourceProviderGenerationPayloadArtifactId",
    "sourceWebsiteGenerationPackageArtifactId",
  ]) {
    if (lineage[key] !== undefined && !isNonEmptyString(lineage[key])) {
      errors.push(`lineage.${key} must be a non-empty string when provided`);
    }
  }
  if (!isTimestamp(lineage.observedAt)) errors.push("lineage.observedAt must be a valid timestamp");
  if (lineage.siteVersionId !== artifact.siteVersionId) errors.push("lineage.siteVersionId must match siteVersionId");
  if (lineage.dryRunId !== artifact.dryRunId) errors.push("lineage.dryRunId must match dryRunId");
  if (lineage.sourceGeneratedWebsiteProposalId !== artifact.sourceGeneratedWebsiteProposalId) {
    errors.push("lineage.sourceGeneratedWebsiteProposalId must match sourceGeneratedWebsiteProposalId");
  }
  if (lineage.sourceProviderGenerationPayloadId !== artifact.sourceProviderGenerationPayloadId) {
    errors.push("lineage.sourceProviderGenerationPayloadId must match sourceProviderGenerationPayloadId");
  }
  if (lineage.sourceWebsiteGenerationPackageId !== artifact.sourceWebsiteGenerationPackageId) {
    errors.push("lineage.sourceWebsiteGenerationPackageId must match sourceWebsiteGenerationPackageId");
  }
  validateEvidenceArray(lineage.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors, []);
}

function validateEntityArray(input: {
  value: unknown;
  path: string;
  idKey: string;
  requiredStringKeys?: string[];
  optionalStringKeys?: string[];
  optionalNumberKeys?: string[];
  ids: string[];
  errors: string[];
}): void {
  if (!Array.isArray(input.value)) {
    input.errors.push(`${input.path} must be an array`);
    return;
  }
  for (const [index, item] of input.value.entries()) {
    const itemPath = `${input.path}[${index}]`;
    if (!isObject(item)) {
      input.errors.push(`${itemPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item[input.idKey])) input.errors.push(`${itemPath}.${input.idKey} is required`);
    else input.ids.push(item[input.idKey] as string);
    if (!isNonEmptyString(item.source)) input.errors.push(`${itemPath}.source is required`);
    validateEvidenceRefIds(item.evidenceRefIds, `${itemPath}.evidenceRefIds`, input.errors);
    validateStringArray(item.limitations, `${itemPath}.limitations`, input.errors);
    validateStringArray(item.diagnostics, `${itemPath}.diagnostics`, input.errors);
    for (const key of input.requiredStringKeys ?? []) {
      if (!isNonEmptyString(item[key])) input.errors.push(`${itemPath}.${key} is required`);
    }
    for (const key of input.optionalStringKeys ?? []) {
      if (item[key] !== undefined && !isNonEmptyString(item[key])) {
        input.errors.push(`${itemPath}.${key} must be a non-empty string when provided`);
      }
    }
    for (const key of input.optionalNumberKeys ?? []) {
      if (item[key] !== undefined && (typeof item[key] !== "number" || item[key] < 0)) {
        input.errors.push(`${itemPath}.${key} must be a non-negative number when provided`);
      }
    }
  }
}

function validateReadiness(value: unknown, status: unknown, errors: string[]): void {
  const readiness = validateRequiredObject(value, "readiness", errors);
  if (!readiness) return;
  if (
    readiness.status !== "not_observable" &&
    readiness.status !== "partially_observable" &&
    readiness.status !== "observable" &&
    readiness.status !== "blocked"
  ) {
    errors.push("readiness.status is not allowed");
  }
  if (status === "invalid" || status === "stale") {
    if (readiness.status !== "blocked" && readiness.status !== "not_observable") {
      errors.push("invalid or stale Observed Website Model readiness must be blocked or not_observable");
    }
  } else if (status !== readiness.status) {
    errors.push("readiness.status must match status for observable states");
  }
  for (const key of [
    "observable",
    "pageInventoryObserved",
    "fileInventoryObserved",
    "navigationObserved",
    "sectionMetadataObserved",
    "messageMetadataObserved",
    "assetMetadataObserved",
    "technicalSignalsObserved",
  ]) {
    if (typeof readiness[key] !== "boolean") errors.push(`readiness.${key} must be boolean`);
  }
  validateStringArray(readiness.blockers, "readiness.blockers", errors);
  validateStringArray(readiness.diagnostics, "readiness.diagnostics", errors);
}

function validateLimitations(value: unknown, errors: string[], ids: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("limitations must be an array");
    return;
  }
  for (const [index, item] of value.entries()) {
    const itemPath = `limitations[${index}]`;
    if (!isObject(item)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(item.observedLimitationId)) errors.push(`${itemPath}.observedLimitationId is required`);
    else ids.push(item.observedLimitationId);
    if (item.severity !== "info" && item.severity !== "warning" && item.severity !== "blocked") {
      errors.push(`${itemPath}.severity is not allowed`);
    }
    if (!isNonEmptyString(item.message)) errors.push(`${itemPath}.message is required`);
    if (!isNonEmptyString(item.source)) errors.push(`${itemPath}.source is required`);
  }
}

function validateUniqueIds(ids: string[], errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`observed id must be unique: ${id}`);
    seen.add(id);
  }
}

function validateSourceProposal(input: {
  artifact: Record<string, unknown>;
  sourceGeneratedWebsiteProposal?: GeneratedWebsiteProposalArtifact;
  errors: string[];
  warnings: string[];
}): void {
  if (!input.sourceGeneratedWebsiteProposal) return;
  const proposalValidation = validateGeneratedWebsiteProposal(input.sourceGeneratedWebsiteProposal);
  input.errors.push(...proposalValidation.errors.map((error) => `sourceGeneratedWebsiteProposal.${error}`));
  input.warnings.push(...proposalValidation.warnings.map((warning) => `sourceGeneratedWebsiteProposal.${warning}`));
  if (input.sourceGeneratedWebsiteProposal.generatedWebsiteProposalId !== input.artifact.sourceGeneratedWebsiteProposalId) {
    input.errors.push("sourceGeneratedWebsiteProposal.generatedWebsiteProposalId must match sourceGeneratedWebsiteProposalId");
  }
  if (input.sourceGeneratedWebsiteProposal.siteVersionId !== input.artifact.siteVersionId) {
    input.errors.push("sourceGeneratedWebsiteProposal.siteVersionId must match siteVersionId");
  }
  if (input.sourceGeneratedWebsiteProposal.dryRunId !== input.artifact.dryRunId) {
    input.errors.push("sourceGeneratedWebsiteProposal.dryRunId must match dryRunId");
  }
}

export function validateObservedWebsiteModel(
  validationInput: ObservedWebsiteValidationInput | ObservedWebsiteModelArtifact,
): ObservedWebsiteValidationResult {
  const input = isObject(validationInput) && "artifact" in validationInput
    ? validationInput as ObservedWebsiteValidationInput
    : { artifact: validationInput };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input.artifact)) {
    return {
      valid: false,
      errors: ["Observed Website Model must be an object"],
      warnings,
    };
  }

  const artifact = input.artifact;
  const observedIds: string[] = [];
  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.observedWebsiteModelId)) errors.push("observedWebsiteModelId is required");
  if (!OBSERVED_WEBSITE_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Observed Website Model status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceGeneratedWebsiteProposalId)) {
    errors.push("sourceGeneratedWebsiteProposalId is required");
  }
  if (!isNonEmptyString(artifact.sourceProviderGenerationPayloadId)) {
    errors.push("sourceProviderGenerationPayloadId is required");
  }
  if (!isNonEmptyString(artifact.sourceWebsiteGenerationPackageId)) {
    errors.push("sourceWebsiteGenerationPackageId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION}`);
  }

  validateLineage(artifact.lineage, artifact, errors);
  validateEntityArray({
    value: artifact.pages,
    path: "pages",
    idKey: "observedPageId",
    requiredStringKeys: ["routePath"],
    optionalStringKeys: ["title"],
    ids: observedIds,
    errors,
  });
  validateEntityArray({
    value: artifact.navigation,
    path: "navigation",
    idKey: "observedNavigationId",
    optionalStringKeys: ["label", "href", "sourcePageId", "targetPageId"],
    ids: observedIds,
    errors,
  });
  validateEntityArray({
    value: artifact.sections,
    path: "sections",
    idKey: "observedSectionId",
    optionalStringKeys: ["pageId", "routePath", "sectionType", "label", "contentSummary"],
    ids: observedIds,
    errors,
  });
  validateEntityArray({
    value: artifact.messages,
    path: "messages",
    idKey: "observedMessageId",
    requiredStringKeys: ["messageKind", "textSummary"],
    optionalStringKeys: ["pageId", "routePath"],
    ids: observedIds,
    errors,
  });
  validateEntityArray({
    value: artifact.assets,
    path: "assets",
    idKey: "observedAssetId",
    requiredStringKeys: ["path"],
    optionalStringKeys: ["assetKind", "contentType", "contentHash"],
    optionalNumberKeys: ["byteSize"],
    ids: observedIds,
    errors,
  });
  validateEntityArray({
    value: artifact.constraints,
    path: "constraints",
    idKey: "observedConstraintId",
    requiredStringKeys: ["statement"],
    ids: observedIds,
    errors,
  });
  validateEntityArray({
    value: artifact.technicalSignals,
    path: "technicalSignals",
    idKey: "observedTechnicalSignalId",
    requiredStringKeys: ["signalType", "value"],
    ids: observedIds,
    errors,
  });
  validateEvidenceArray(artifact.evidence, "evidence", errors, observedIds);
  validateReadiness(artifact.readiness, artifact.status, errors);
  validateLimitations(artifact.limitations, errors, observedIds);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);
  validateUniqueIds(observedIds, errors);
  validateSourceProposal({
    artifact,
    sourceGeneratedWebsiteProposal: input.sourceGeneratedWebsiteProposal,
    errors,
    warnings,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
