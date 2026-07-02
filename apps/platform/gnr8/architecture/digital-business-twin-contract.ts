/**
 * Phase MVP-1B Digital Business Twin runtime contract.
 *
 * The Digital Business Twin is the first durable runtime answer to what GNR8
 * currently understands about a business. MVP-1B is deterministic and starts
 * only from persisted Business Discovery artifacts. It does not create a
 * Business Understanding Report, Business Alignment, Website Design Brief,
 * Website Generation Package, provider payload, generated output, approval, or
 * publishing artifact.
 */

export const DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION = "MVP-1B" as const;

export const DIGITAL_BUSINESS_TWIN_STATUSES = [
  "observed",
  "partial",
  "aligned",
  "confirmed",
  "invalid",
  "blocked",
  "stale",
] as const;
export type DigitalBusinessTwinStatus = (typeof DIGITAL_BUSINESS_TWIN_STATUSES)[number];

export const DIGITAL_BUSINESS_TWIN_DOMAINS = [
  "business_identity",
  "offerings",
  "audience",
  "brand",
  "digital_presence",
  "goals",
  "trust",
  "content",
  "constraints",
] as const;
export type DigitalBusinessTwinDomain = (typeof DIGITAL_BUSINESS_TWIN_DOMAINS)[number];

export const DIGITAL_BUSINESS_TWIN_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type DigitalBusinessTwinConfidence = {
  level: (typeof DIGITAL_BUSINESS_TWIN_CONFIDENCE_LEVELS)[number];
  reasons: string[];
};

export type DigitalBusinessTwinEvidenceRef = {
  refId: string;
  sourceKind: string;
  routePath?: string;
  description?: string;
};

export type DigitalBusinessTwinLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceBusinessDiscoveryArtifactId: string;
  sourceBusinessDiscoveryId: string;
  sourceBusinessDiscoveryStatus: string;
  sourceBusinessDiscoveryContractVersion: string;
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  upstreamArtifactRefs: DigitalBusinessTwinEvidenceRef[];
};

export type DigitalBusinessTwinKnowledgeItem = {
  knowledgeItemId: string;
  domain: DigitalBusinessTwinDomain;
  status: Extract<DigitalBusinessTwinStatus, "observed" | "partial" | "blocked">;
  kind: string;
  statement: string;
  sourceFindingIds: string[];
  evidenceRefs: DigitalBusinessTwinEvidenceRef[];
  confidence: DigitalBusinessTwinConfidence;
  limitations: string[];
  diagnostics: string[];
};

export type DigitalBusinessTwinDomainSummary = {
  domain: DigitalBusinessTwinDomain;
  status: Extract<DigitalBusinessTwinStatus, "observed" | "partial" | "blocked" | "invalid" | "stale">;
  summary: string;
  knowledgeItemIds: string[];
  missingKnowledgeIds: string[];
  confidence: DigitalBusinessTwinConfidence;
  diagnostics: string[];
};

export type DigitalBusinessTwinMissingKnowledge = {
  missingKnowledgeId: string;
  domain: DigitalBusinessTwinDomain;
  reason: string;
  sourceBusinessDiscoveryDomainStatus?: string;
  sourceLimitationIds: string[];
  diagnostics: string[];
};

export type DigitalBusinessTwinArtifact = {
  digitalBusinessTwinId: string;
  status: DigitalBusinessTwinStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceBusinessDiscoveryArtifactId: string;
  createdAt: string;
  contractVersion: typeof DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION;
  lineage: DigitalBusinessTwinLineage;
  domains: DigitalBusinessTwinDomainSummary[];
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  confidence: DigitalBusinessTwinConfidence;
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
  limitations: string[];
  diagnostics: string[];
};

export type DigitalBusinessTwinValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const DIGITAL_BUSINESS_TWIN_FORBIDDEN_FIELDS = [
  "businessUnderstandingReport",
  "businessAlignment",
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "providerPayload",
  "prompt",
  "aiOutput",
  "generatedContent",
  "generatedHtml",
  "generatedReact",
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
    if (DIGITAL_BUSINESS_TWIN_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Digital Business Twin artifacts`);
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
  if (!DIGITAL_BUSINESS_TWIN_CONFIDENCE_LEVELS.includes(value.level as never)) {
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
  if (!isNonEmptyString(value.sourceBusinessDiscoveryArtifactId)) {
    errors.push("lineage.sourceBusinessDiscoveryArtifactId is required");
  }
  if (!isNonEmptyString(value.sourceBusinessDiscoveryId)) {
    errors.push("lineage.sourceBusinessDiscoveryId is required");
  }
  if (!isNonEmptyString(value.sourceBusinessDiscoveryStatus)) {
    errors.push("lineage.sourceBusinessDiscoveryStatus is required");
  }
  if (!isNonEmptyString(value.sourceBusinessDiscoveryContractVersion)) {
    errors.push("lineage.sourceBusinessDiscoveryContractVersion is required");
  }
  if (value.siteVersionId !== artifact.siteVersionId) {
    errors.push("lineage.siteVersionId must match siteVersionId");
  }
  if (value.dryRunId !== artifact.dryRunId) {
    errors.push("lineage.dryRunId must match dryRunId");
  }
  if (value.sourceBusinessDiscoveryArtifactId !== artifact.sourceBusinessDiscoveryArtifactId) {
    errors.push("lineage.sourceBusinessDiscoveryArtifactId must match sourceBusinessDiscoveryArtifactId");
  }
  validateEvidenceRefs(value.evidenceRefs, "lineage.evidenceRefs", errors);
  validateEvidenceRefs(value.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateKnowledgeItem(
  value: unknown,
  path: string,
  errors: string[],
): DigitalBusinessTwinKnowledgeItem | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.knowledgeItemId)) errors.push(`${path}.knowledgeItemId is required`);
  if (!DIGITAL_BUSINESS_TWIN_DOMAINS.includes(value.domain as never)) {
    errors.push(`${path}.domain is not an allowed Digital Business Twin domain`);
  }
  if (value.status !== "observed" && value.status !== "partial" && value.status !== "blocked") {
    errors.push(`${path}.status must be observed, partial, or blocked`);
  }
  if (!isNonEmptyString(value.kind)) errors.push(`${path}.kind is required`);
  if (!isNonEmptyString(value.statement)) errors.push(`${path}.statement is required`);
  validateStringArray(value.sourceFindingIds, `${path}.sourceFindingIds`, errors);
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as DigitalBusinessTwinKnowledgeItem;
}

function validateMissingKnowledge(
  value: unknown,
  path: string,
  errors: string[],
): DigitalBusinessTwinMissingKnowledge | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.missingKnowledgeId)) errors.push(`${path}.missingKnowledgeId is required`);
  if (!DIGITAL_BUSINESS_TWIN_DOMAINS.includes(value.domain as never)) {
    errors.push(`${path}.domain is not an allowed Digital Business Twin domain`);
  }
  if (!isNonEmptyString(value.reason)) errors.push(`${path}.reason is required`);
  if (value.sourceBusinessDiscoveryDomainStatus !== undefined && !isNonEmptyString(value.sourceBusinessDiscoveryDomainStatus)) {
    errors.push(`${path}.sourceBusinessDiscoveryDomainStatus must be a non-empty string when present`);
  }
  validateStringArray(value.sourceLimitationIds, `${path}.sourceLimitationIds`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as DigitalBusinessTwinMissingKnowledge;
}

function validateDomainSummary(
  value: unknown,
  path: string,
  knowledgeItemIds: Set<string>,
  missingKnowledgeIds: Set<string>,
  errors: string[],
): DigitalBusinessTwinDomainSummary | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!DIGITAL_BUSINESS_TWIN_DOMAINS.includes(value.domain as never)) {
    errors.push(`${path}.domain is not an allowed Digital Business Twin domain`);
  }
  if (
    value.status !== "observed" &&
    value.status !== "partial" &&
    value.status !== "blocked" &&
    value.status !== "invalid" &&
    value.status !== "stale"
  ) {
    errors.push(`${path}.status must be observed, partial, blocked, invalid, or stale`);
  }
  if (!isNonEmptyString(value.summary)) errors.push(`${path}.summary is required`);
  const summaryKnowledgeItemIds = validateStringArray(value.knowledgeItemIds, `${path}.knowledgeItemIds`, errors);
  for (const [index, knowledgeItemId] of summaryKnowledgeItemIds.entries()) {
    if (!knowledgeItemIds.has(knowledgeItemId)) {
      errors.push(`${path}.knowledgeItemIds[${index}] must reference an existing knowledge item`);
    }
  }
  const summaryMissingKnowledgeIds = validateStringArray(
    value.missingKnowledgeIds,
    `${path}.missingKnowledgeIds`,
    errors,
  );
  for (const [index, missingKnowledgeId] of summaryMissingKnowledgeIds.entries()) {
    if (!missingKnowledgeIds.has(missingKnowledgeId)) {
      errors.push(`${path}.missingKnowledgeIds[${index}] must reference existing missing knowledge`);
    }
  }
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as DigitalBusinessTwinDomainSummary;
}

export function validateDigitalBusinessTwinArtifact(
  artifact: unknown,
): DigitalBusinessTwinValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(artifact)) {
    return {
      valid: false,
      errors: ["Digital Business Twin artifact must be an object"],
      warnings,
    };
  }

  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.digitalBusinessTwinId)) errors.push("digitalBusinessTwinId is required");
  if (!DIGITAL_BUSINESS_TWIN_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Digital Business Twin status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!isNonEmptyString(artifact.sourceBusinessDiscoveryArtifactId)) {
    errors.push("sourceBusinessDiscoveryArtifactId is required");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION}`);
  }
  validateLineage(artifact.lineage, artifact, errors);

  const knowledgeItems: DigitalBusinessTwinKnowledgeItem[] = [];
  if (!Array.isArray(artifact.knowledgeItems)) {
    errors.push("knowledgeItems must be an array");
  } else {
    const ids = new Set<string>();
    for (const [index, item] of artifact.knowledgeItems.entries()) {
      const validItem = validateKnowledgeItem(item, `knowledgeItems[${index}]`, errors);
      if (!validItem) continue;
      if (ids.has(validItem.knowledgeItemId)) {
        errors.push(`knowledgeItems[${index}].knowledgeItemId must be unique`);
      }
      ids.add(validItem.knowledgeItemId);
      knowledgeItems.push(validItem);
    }
  }

  const missingKnowledge: DigitalBusinessTwinMissingKnowledge[] = [];
  if (!Array.isArray(artifact.missingKnowledge)) {
    errors.push("missingKnowledge must be an array");
  } else {
    const ids = new Set<string>();
    for (const [index, item] of artifact.missingKnowledge.entries()) {
      const validItem = validateMissingKnowledge(item, `missingKnowledge[${index}]`, errors);
      if (!validItem) continue;
      if (ids.has(validItem.missingKnowledgeId)) {
        errors.push(`missingKnowledge[${index}].missingKnowledgeId must be unique`);
      }
      ids.add(validItem.missingKnowledgeId);
      missingKnowledge.push(validItem);
    }
  }

  const knowledgeItemIds = new Set(knowledgeItems.map((item) => item.knowledgeItemId));
  const missingKnowledgeIds = new Set(missingKnowledge.map((item) => item.missingKnowledgeId));
  const domainSummaries: DigitalBusinessTwinDomainSummary[] = [];
  if (!Array.isArray(artifact.domains)) {
    errors.push("domains must be an array");
  } else {
    const domains = new Set<string>();
    for (const [index, domain] of artifact.domains.entries()) {
      const validDomain = validateDomainSummary(
        domain,
        `domains[${index}]`,
        knowledgeItemIds,
        missingKnowledgeIds,
        errors,
      );
      if (!validDomain) continue;
      if (domains.has(validDomain.domain)) {
        errors.push(`domains[${index}].domain must be unique`);
      }
      domains.add(validDomain.domain);
      domainSummaries.push(validDomain);
    }
  }

  const domainSet = new Set(domainSummaries.map((domain) => domain.domain));
  for (const domain of DIGITAL_BUSINESS_TWIN_DOMAINS) {
    if (!domainSet.has(domain)) errors.push(`domains must include ${domain}`);
  }

  const knowledgeByDomain = new Map<DigitalBusinessTwinDomain, DigitalBusinessTwinKnowledgeItem[]>();
  for (const item of knowledgeItems) {
    knowledgeByDomain.set(item.domain, [...(knowledgeByDomain.get(item.domain) ?? []), item]);
  }
  const missingByDomain = new Map<DigitalBusinessTwinDomain, DigitalBusinessTwinMissingKnowledge[]>();
  for (const item of missingKnowledge) {
    missingByDomain.set(item.domain, [...(missingByDomain.get(item.domain) ?? []), item]);
  }
  for (const domain of domainSummaries) {
    const domainKnowledge = knowledgeByDomain.get(domain.domain) ?? [];
    const domainMissing = missingByDomain.get(domain.domain) ?? [];
    if (domain.knowledgeItemIds.length !== domainKnowledge.length) {
      errors.push(`domains.${domain.domain}.knowledgeItemIds must match knowledgeItems for the domain`);
    }
    if (domain.missingKnowledgeIds.length !== domainMissing.length) {
      errors.push(`domains.${domain.domain}.missingKnowledgeIds must match missingKnowledge for the domain`);
    }
    if (domainKnowledge.length === 0 && domainMissing.length === 0 && artifact.status !== "invalid" && artifact.status !== "stale") {
      errors.push(`missingKnowledge must include ${domain.domain} when the domain has no knowledge items`);
    }
    if (domainKnowledge.length > 0 && domain.status === "blocked") {
      errors.push(`domains.${domain.domain}.status must not be blocked when knowledge items exist`);
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
