/**
 * Phase MVP-1A Business Discovery runtime contract.
 *
 * Business Discovery is the first deterministic interpretation layer from
 * imported website evidence. It does not create a Digital Business Twin,
 * Business Understanding Report, design brief, generation package, provider
 * payload, generated output, approval, or publishing artifact.
 */

export const BUSINESS_DISCOVERY_CONTRACT_VERSION = "MVP-1A" as const;

export const BUSINESS_DISCOVERY_STATUSES = [
  "observed",
  "partial",
  "valid",
  "invalid",
  "blocked",
  "stale",
] as const;
export type BusinessDiscoveryStatus = (typeof BUSINESS_DISCOVERY_STATUSES)[number];

export const BUSINESS_DISCOVERY_DOMAINS = [
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
export type BusinessDiscoveryDomain = (typeof BUSINESS_DISCOVERY_DOMAINS)[number];

export const BUSINESS_DISCOVERY_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type BusinessDiscoveryConfidence = {
  level: (typeof BUSINESS_DISCOVERY_CONFIDENCE_LEVELS)[number];
  reasons: string[];
};

export const BUSINESS_DISCOVERY_EVIDENCE_SOURCE_KINDS = [
  "site_version",
  "source_url",
  "import_provenance",
  "evidence_capture_baseline",
  "route",
  "navigation_evidence",
  "section_boundary",
  "layout_geometry",
  "candidate_discovery",
  "asset_inventory",
  "diagnostic",
] as const;
export type BusinessDiscoveryEvidenceRef = {
  refId: string;
  sourceKind: (typeof BUSINESS_DISCOVERY_EVIDENCE_SOURCE_KINDS)[number];
  routePath?: string;
  description?: string;
};

export const BUSINESS_DISCOVERY_LIMITATION_SEVERITIES = [
  "note",
  "warning",
  "blocker",
] as const;
export type BusinessDiscoveryLimitation = {
  limitationId: string;
  severity: (typeof BUSINESS_DISCOVERY_LIMITATION_SEVERITIES)[number];
  code: string;
  message: string;
  evidenceRefs?: BusinessDiscoveryEvidenceRef[];
  diagnostics?: string[];
};

export type BusinessDiscoveryLineage = {
  siteVersionId: string;
  dryRunId: string;
  sourceSiteId?: string;
  sourceUrl?: string;
  evidenceRefs: BusinessDiscoveryEvidenceRef[];
  upstreamArtifactRefs: BusinessDiscoveryEvidenceRef[];
};

export type BusinessDiscoveryDomainSummary = {
  domain: BusinessDiscoveryDomain;
  status: BusinessDiscoveryStatus;
  summary: string;
  findingIds: string[];
  evidenceRefs: BusinessDiscoveryEvidenceRef[];
  confidence: BusinessDiscoveryConfidence;
  limitations: BusinessDiscoveryLimitation[];
  diagnostics: string[];
};

export type BusinessDiscoveryFinding = {
  findingId: string;
  domain: BusinessDiscoveryDomain;
  kind: string;
  summary: string;
  evidenceRefs: BusinessDiscoveryEvidenceRef[];
  confidence: BusinessDiscoveryConfidence;
  limitations: BusinessDiscoveryLimitation[];
  diagnostics: string[];
};

export type BusinessDiscoveryArtifact = {
  businessDiscoveryId: string;
  status: BusinessDiscoveryStatus;
  siteVersionId: string;
  dryRunId: string;
  sourceSiteId?: string;
  sourceUrl?: string;
  createdAt: string;
  contractVersion: typeof BUSINESS_DISCOVERY_CONTRACT_VERSION;
  lineage: BusinessDiscoveryLineage;
  domainSummaries: BusinessDiscoveryDomainSummary[];
  findings: BusinessDiscoveryFinding[];
  confidence: BusinessDiscoveryConfidence;
  limitations: BusinessDiscoveryLimitation[];
  diagnostics: string[];
};

export type BusinessDiscoveryValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const BUSINESS_DISCOVERY_FORBIDDEN_FIELDS = [
  "generatedContent",
  "generatedHtml",
  "generatedReact",
  "generatedComponents",
  "generatedBlocks",
  "providerPayload",
  "prompt",
  "aiOutput",
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "publishingArtifact",
  "deploymentArtifact",
  "executionArtifact",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
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

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if ((!isObject(value) && !Array.isArray(value)) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (BUSINESS_DISCOVERY_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Business Discovery artifacts`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateConfidence(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!BUSINESS_DISCOVERY_CONFIDENCE_LEVELS.includes(value.level as never)) {
    errors.push(`${path}.level must be LOW, MEDIUM, or HIGH`);
  }
  validateStringArray(value.reasons, `${path}.reasons`, errors);
}

function validateEvidenceRefs(
  value: unknown,
  path: string,
  errors: string[],
  options: { required?: boolean } = {},
): BusinessDiscoveryEvidenceRef[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  if (options.required && value.length === 0) {
    errors.push(`${path} must contain at least one evidence ref`);
  }

  const refs: BusinessDiscoveryEvidenceRef[] = [];
  for (const [index, ref] of value.entries()) {
    const refPath = `${path}[${index}]`;
    if (!isObject(ref)) {
      errors.push(`${refPath} must be an object`);
      continue;
    }
    if (!isNonEmptyString(ref.refId)) errors.push(`${refPath}.refId is required`);
    if (!BUSINESS_DISCOVERY_EVIDENCE_SOURCE_KINDS.includes(ref.sourceKind as never)) {
      errors.push(`${refPath}.sourceKind is not allowed`);
    }
    if (ref.routePath !== undefined && !isNonEmptyString(ref.routePath)) {
      errors.push(`${refPath}.routePath must be a non-empty string when present`);
    }
    if (ref.description !== undefined && !isNonEmptyString(ref.description)) {
      errors.push(`${refPath}.description must be a non-empty string when present`);
    }
    refs.push(ref as BusinessDiscoveryEvidenceRef);
  }
  return refs;
}

function validateLimitation(
  value: unknown,
  path: string,
  errors: string[],
): BusinessDiscoveryLimitation | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.limitationId)) errors.push(`${path}.limitationId is required`);
  if (!BUSINESS_DISCOVERY_LIMITATION_SEVERITIES.includes(value.severity as never)) {
    errors.push(`${path}.severity must be note, warning, or blocker`);
  }
  if (!isNonEmptyString(value.code)) errors.push(`${path}.code is required`);
  if (!isNonEmptyString(value.message)) errors.push(`${path}.message is required`);
  if (value.evidenceRefs !== undefined) {
    validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  }
  if (value.diagnostics !== undefined) {
    validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  }
  return value as BusinessDiscoveryLimitation;
}

function validateLimitations(
  value: unknown,
  path: string,
  errors: string[],
): BusinessDiscoveryLimitation[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const limitations: BusinessDiscoveryLimitation[] = [];
  for (const [index, limitation] of value.entries()) {
    const validLimitation = validateLimitation(limitation, `${path}[${index}]`, errors);
    if (validLimitation) limitations.push(validLimitation);
  }
  return limitations;
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
  if (value.siteVersionId !== artifact.siteVersionId) {
    errors.push("lineage.siteVersionId must match siteVersionId");
  }
  if (value.dryRunId !== artifact.dryRunId) {
    errors.push("lineage.dryRunId must match dryRunId");
  }
  if (value.sourceSiteId !== undefined && !isNonEmptyString(value.sourceSiteId)) {
    errors.push("lineage.sourceSiteId must be a non-empty string when present");
  }
  if (value.sourceUrl !== undefined && !isNonEmptyString(value.sourceUrl)) {
    errors.push("lineage.sourceUrl must be a non-empty string when present");
  }
  validateEvidenceRefs(value.evidenceRefs, "lineage.evidenceRefs", errors, { required: true });
  validateEvidenceRefs(value.upstreamArtifactRefs, "lineage.upstreamArtifactRefs", errors);
}

function validateFinding(
  value: unknown,
  path: string,
  errors: string[],
): BusinessDiscoveryFinding | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.findingId)) errors.push(`${path}.findingId is required`);
  if (!BUSINESS_DISCOVERY_DOMAINS.includes(value.domain as never)) {
    errors.push(`${path}.domain is not an allowed Business Discovery domain`);
  }
  if (!isNonEmptyString(value.kind)) errors.push(`${path}.kind is required`);
  if (!isNonEmptyString(value.summary)) errors.push(`${path}.summary is required`);
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors, { required: true });
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateLimitations(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as BusinessDiscoveryFinding;
}

function validateDomainSummary(
  value: unknown,
  path: string,
  findingIds: Set<string>,
  errors: string[],
): BusinessDiscoveryDomainSummary | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!BUSINESS_DISCOVERY_DOMAINS.includes(value.domain as never)) {
    errors.push(`${path}.domain is not an allowed Business Discovery domain`);
  }
  if (!BUSINESS_DISCOVERY_STATUSES.includes(value.status as never)) {
    errors.push(`${path}.status is not an allowed Business Discovery status`);
  }
  if (!isNonEmptyString(value.summary)) errors.push(`${path}.summary is required`);
  const summaryFindingIds = validateStringArray(value.findingIds, `${path}.findingIds`, errors);
  for (const [index, findingId] of summaryFindingIds.entries()) {
    if (!findingIds.has(findingId)) {
      errors.push(`${path}.findingIds[${index}] must reference an existing finding`);
    }
  }
  validateEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  validateConfidence(value.confidence, `${path}.confidence`, errors);
  validateLimitations(value.limitations, `${path}.limitations`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as BusinessDiscoveryDomainSummary;
}

export function validateBusinessDiscoveryArtifact(
  artifact: unknown,
): BusinessDiscoveryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(artifact)) {
    return {
      valid: false,
      errors: ["Business Discovery artifact must be an object"],
      warnings,
    };
  }

  validateForbiddenFields(artifact, "", errors, new WeakSet<object>());

  if (!isNonEmptyString(artifact.businessDiscoveryId)) errors.push("businessDiscoveryId is required");
  if (!BUSINESS_DISCOVERY_STATUSES.includes(artifact.status as never)) {
    errors.push("status is not an allowed Business Discovery status");
  }
  if (!isNonEmptyString(artifact.siteVersionId)) errors.push("siteVersionId is required");
  if (!isNonEmptyString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (artifact.sourceSiteId !== undefined && !isNonEmptyString(artifact.sourceSiteId)) {
    errors.push("sourceSiteId must be a non-empty string when present");
  }
  if (artifact.sourceUrl !== undefined && !isNonEmptyString(artifact.sourceUrl)) {
    errors.push("sourceUrl must be a non-empty string when present");
  }
  if (!isTimestamp(artifact.createdAt)) errors.push("createdAt must be a valid timestamp");
  if (artifact.contractVersion !== BUSINESS_DISCOVERY_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${BUSINESS_DISCOVERY_CONTRACT_VERSION}`);
  }
  validateLineage(artifact.lineage, artifact, errors);

  const findings: BusinessDiscoveryFinding[] = [];
  if (!Array.isArray(artifact.findings)) {
    errors.push("findings must be an array");
  } else {
    const ids = new Set<string>();
    for (const [index, finding] of artifact.findings.entries()) {
      const validFinding = validateFinding(finding, `findings[${index}]`, errors);
      if (!validFinding) continue;
      if (ids.has(validFinding.findingId)) {
        errors.push(`findings[${index}].findingId must be unique`);
      }
      ids.add(validFinding.findingId);
      findings.push(validFinding);
    }
  }

  const findingIds = new Set(findings.map((finding) => finding.findingId));
  if (!Array.isArray(artifact.domainSummaries)) {
    errors.push("domainSummaries must be an array");
  } else {
    const domains = new Set<string>();
    for (const [index, summary] of artifact.domainSummaries.entries()) {
      const validSummary = validateDomainSummary(
        summary,
        `domainSummaries[${index}]`,
        findingIds,
        errors,
      );
      if (!validSummary) continue;
      if (domains.has(validSummary.domain)) {
        errors.push(`domainSummaries[${index}].domain must be unique`);
      }
      domains.add(validSummary.domain);
    }
  }

  validateConfidence(artifact.confidence, "confidence", errors);
  validateLimitations(artifact.limitations, "limitations", errors);
  validateStringArray(artifact.diagnostics, "diagnostics", errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
