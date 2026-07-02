/**
 * Phase MVP-1B Digital Business Twin deterministic builder.
 *
 * Builds the first DBT runtime artifact only from a Business Discovery
 * artifact. No AI, external services, provider adapters, generation, approval,
 * publishing, UI, or API behavior is invoked here.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type {
  BusinessDiscoveryArtifact,
  BusinessDiscoveryDomain,
  BusinessDiscoveryDomainSummary,
  BusinessDiscoveryEvidenceRef,
  BusinessDiscoveryFinding,
  BusinessDiscoveryLimitation,
} from "./business-discovery-contract";
import { validateBusinessDiscoveryArtifact } from "./business-discovery-contract";
import {
  DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
  DIGITAL_BUSINESS_TWIN_DOMAINS,
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinConfidence,
  type DigitalBusinessTwinDomain,
  type DigitalBusinessTwinDomainSummary,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinKnowledgeItem,
  type DigitalBusinessTwinMissingKnowledge,
  type DigitalBusinessTwinStatus,
} from "./digital-business-twin-contract";

export const DIGITAL_BUSINESS_TWIN_BUILDER_VERSION = "MVP-1B" as const;

export type DigitalBusinessTwinBuilderInput = {
  sourceBusinessDiscoveryArtifactId: string;
  businessDiscoveryArtifact: BusinessDiscoveryArtifact;
  createdAt?: string;
};

function escapeIdentity(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function confidence(level: DigitalBusinessTwinConfidence["level"], reasons: string[]): DigitalBusinessTwinConfidence {
  return {
    level,
    reasons: [...new Set(reasons)].sort(),
  };
}

function toEvidenceRef(ref: BusinessDiscoveryEvidenceRef): DigitalBusinessTwinEvidenceRef {
  return {
    refId: ref.refId,
    sourceKind: ref.sourceKind,
    ...(ref.routePath ? { routePath: ref.routePath } : {}),
    ...(ref.description ? { description: ref.description } : {}),
  };
}

function toDomain(domain: BusinessDiscoveryDomain): DigitalBusinessTwinDomain {
  return domain as DigitalBusinessTwinDomain;
}

function knowledgeItemId(finding: BusinessDiscoveryFinding): string {
  return `dbt-knowledge:${finding.domain}:${sha256Hex(stableStringify({
    findingId: finding.findingId,
    kind: finding.kind,
    summary: finding.summary,
  })).slice(0, 24)}`;
}

function limitationText(limitation: BusinessDiscoveryLimitation): string {
  return `${limitation.code}: ${limitation.message}`;
}

function knowledgeStatus(input: {
  discoveryStatus: BusinessDiscoveryArtifact["status"];
  finding: BusinessDiscoveryFinding;
}): DigitalBusinessTwinKnowledgeItem["status"] {
  if (input.discoveryStatus === "blocked" || input.finding.limitations.some((item) => item.severity === "blocker")) {
    return "blocked";
  }
  if (input.discoveryStatus === "partial" || input.finding.limitations.length > 0) {
    return "partial";
  }
  return "observed";
}

function toKnowledgeItem(input: {
  discoveryStatus: BusinessDiscoveryArtifact["status"];
  finding: BusinessDiscoveryFinding;
}): DigitalBusinessTwinKnowledgeItem {
  const finding = input.finding;
  return {
    knowledgeItemId: knowledgeItemId(finding),
    domain: toDomain(finding.domain),
    status: knowledgeStatus(input),
    kind: finding.kind,
    statement: finding.summary,
    sourceFindingIds: [finding.findingId],
    evidenceRefs: finding.evidenceRefs.map(toEvidenceRef),
    confidence: confidence(finding.confidence.level, [
      ...finding.confidence.reasons,
      "business_discovery_finding",
    ]),
    limitations: finding.limitations.map(limitationText).sort(),
    diagnostics: [
      "DBT_KNOWLEDGE_FROM_BUSINESS_DISCOVERY_FINDING",
      `SOURCE_FINDING_KIND:${finding.kind}`,
      ...finding.diagnostics,
    ].sort(),
  };
}

function sourceLimitationsForDomain(input: {
  discovery: BusinessDiscoveryArtifact;
  domain: DigitalBusinessTwinDomain;
}): BusinessDiscoveryLimitation[] {
  const domainSummary = input.discovery.domainSummaries.find((summary) => summary.domain === input.domain);
  const domainLimitationIds = new Set(domainSummary?.limitations.map((item) => item.limitationId) ?? []);
  return input.discovery.limitations.filter((limitation) =>
    limitation.message.includes(input.domain) ||
    limitation.code === "DOMAIN_SIGNAL_MISSING" ||
    domainLimitationIds.has(limitation.limitationId));
}

function missingKnowledgeForDomain(input: {
  discovery: BusinessDiscoveryArtifact;
  domain: DigitalBusinessTwinDomain;
}): DigitalBusinessTwinMissingKnowledge | null {
  const domainSummary = input.discovery.domainSummaries.find((summary) => summary.domain === input.domain);
  const hasFinding = input.discovery.findings.some((finding) => finding.domain === input.domain);
  const isFailClosed = input.discovery.status === "blocked" ||
    input.discovery.status === "invalid" ||
    input.discovery.status === "stale";
  if (hasFinding && !isFailClosed) return null;

  const limitations = sourceLimitationsForDomain(input);
  const reason = isFailClosed
    ? `Business Discovery status ${input.discovery.status} prevents current DBT knowledge for ${input.domain}.`
    : `Business Discovery did not provide deterministic knowledge for ${input.domain}.`;
  return {
    missingKnowledgeId: `dbt-missing:${input.domain}`,
    domain: input.domain,
    reason,
    ...(domainSummary ? { sourceBusinessDiscoveryDomainStatus: domainSummary.status } : {}),
    sourceLimitationIds: limitations.map((limitation) => limitation.limitationId).sort(),
    diagnostics: [
      isFailClosed ? "SOURCE_BUSINESS_DISCOVERY_NOT_CURRENT" : "BUSINESS_DISCOVERY_DOMAIN_MISSING",
    ],
  };
}

function domainStatus(input: {
  artifactStatus: DigitalBusinessTwinStatus;
  domain: DigitalBusinessTwinDomain;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): DigitalBusinessTwinDomainSummary["status"] {
  if (input.artifactStatus === "invalid" || input.artifactStatus === "stale") return input.artifactStatus;
  if (input.artifactStatus === "blocked") return "blocked";
  const items = input.knowledgeItems.filter((item) => item.domain === input.domain);
  if (items.length === 0) return "partial";
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "partial") || input.missingKnowledge.some((item) => item.domain === input.domain)) {
    return "partial";
  }
  return "observed";
}

function domainSummary(input: {
  artifactStatus: DigitalBusinessTwinStatus;
  domain: DigitalBusinessTwinDomain;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
  sourceDomain?: BusinessDiscoveryDomainSummary;
}): DigitalBusinessTwinDomainSummary {
  const items = input.knowledgeItems.filter((item) => item.domain === input.domain);
  const missing = input.missingKnowledge.filter((item) => item.domain === input.domain);
  const status = domainStatus({ ...input, knowledgeItems: items, missingKnowledge: missing });
  const summary = items.length > 0
    ? `${items.length} Business Discovery knowledge item${items.length === 1 ? "" : "s"} currently inform ${input.domain}.`
    : `No current Business Discovery knowledge is available for ${input.domain}.`;
  return {
    domain: input.domain,
    status,
    summary,
    knowledgeItemIds: items.map((item) => item.knowledgeItemId).sort(),
    missingKnowledgeIds: missing.map((item) => item.missingKnowledgeId).sort(),
    confidence: input.sourceDomain
      ? confidence(input.sourceDomain.confidence.level, [
          ...input.sourceDomain.confidence.reasons,
          "business_discovery_domain_summary",
        ])
      : confidence("LOW", ["business_discovery_domain_missing"]),
    diagnostics: [
      `DBT_DOMAIN_STATUS:${status}`,
      `DBT_DOMAIN_KNOWLEDGE_COUNT:${items.length}`,
      `DBT_DOMAIN_MISSING_KNOWLEDGE_COUNT:${missing.length}`,
    ],
  };
}

function artifactStatus(input: {
  discovery: BusinessDiscoveryArtifact;
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  sourceValidationValid: boolean;
}): DigitalBusinessTwinStatus {
  if (!input.sourceValidationValid || input.discovery.status === "invalid") return "invalid";
  if (input.discovery.status === "stale") return "stale";
  if (input.discovery.status === "blocked") return "blocked";
  if (input.knowledgeItems.length === 0 || input.missingKnowledge.length > 0 || input.discovery.status === "partial") {
    return "partial";
  }
  return "observed";
}

function artifactConfidence(input: {
  status: DigitalBusinessTwinStatus;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): DigitalBusinessTwinConfidence {
  if (input.status === "blocked") return confidence("LOW", ["source_business_discovery_blocked"]);
  if (input.status === "invalid") return confidence("LOW", ["source_business_discovery_invalid"]);
  if (input.status === "stale") return confidence("LOW", ["source_business_discovery_stale"]);
  if (input.missingKnowledge.length > 0) {
    return confidence("LOW", ["missing_business_knowledge", "website_only_business_discovery"]);
  }
  const highCount = input.knowledgeItems.filter((item) => item.confidence.level === "HIGH").length;
  if (highCount >= 2) return confidence("MEDIUM", ["multiple_business_discovery_findings"]);
  return confidence("LOW", ["limited_business_discovery_findings"]);
}

export function buildDigitalBusinessTwinFromBusinessDiscovery(
  input: DigitalBusinessTwinBuilderInput,
): DigitalBusinessTwinArtifact {
  const discovery = input.businessDiscoveryArtifact;
  const sourceValidation = validateBusinessDiscoveryArtifact(discovery);
  const currentDiscovery = sourceValidation.valid &&
    discovery.status !== "blocked" &&
    discovery.status !== "invalid" &&
    discovery.status !== "stale";
  const knowledgeItems = currentDiscovery
    ? discovery.findings.map((finding) => toKnowledgeItem({ discoveryStatus: discovery.status, finding }))
      .sort((left, right) => left.knowledgeItemId.localeCompare(right.knowledgeItemId))
    : [];
  const missingKnowledge = DIGITAL_BUSINESS_TWIN_DOMAINS
    .map((domain) => missingKnowledgeForDomain({ discovery, domain }))
    .filter((item): item is DigitalBusinessTwinMissingKnowledge => item !== null)
    .sort((left, right) => left.missingKnowledgeId.localeCompare(right.missingKnowledgeId));
  const status = artifactStatus({
    discovery,
    missingKnowledge,
    knowledgeItems,
    sourceValidationValid: sourceValidation.valid,
  });
  const domains = DIGITAL_BUSINESS_TWIN_DOMAINS.map((domain) =>
    domainSummary({
      artifactStatus: status,
      domain,
      knowledgeItems,
      missingKnowledge,
      sourceDomain: discovery.domainSummaries.find((summary) => summary.domain === domain),
    }));
  const limitations = [
    ...discovery.limitations.map(limitationText),
    ...(sourceValidation.valid ? [] : sourceValidation.errors.map((error) => `SOURCE_BUSINESS_DISCOVERY_INVALID: ${error}`)),
  ].sort();

  const artifact: DigitalBusinessTwinArtifact = {
    digitalBusinessTwinId: `digital-business-twin:${escapeIdentity(discovery.siteVersionId)}:${escapeIdentity(discovery.dryRunId)}:${escapeIdentity(input.sourceBusinessDiscoveryArtifactId)}`,
    status,
    siteVersionId: discovery.siteVersionId,
    dryRunId: discovery.dryRunId,
    sourceBusinessDiscoveryArtifactId: input.sourceBusinessDiscoveryArtifactId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    contractVersion: DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
    lineage: {
      siteVersionId: discovery.siteVersionId,
      dryRunId: discovery.dryRunId,
      sourceBusinessDiscoveryArtifactId: input.sourceBusinessDiscoveryArtifactId,
      sourceBusinessDiscoveryId: discovery.businessDiscoveryId,
      sourceBusinessDiscoveryStatus: discovery.status,
      sourceBusinessDiscoveryContractVersion: discovery.contractVersion,
      evidenceRefs: discovery.lineage.evidenceRefs.map(toEvidenceRef),
      upstreamArtifactRefs: [
        {
          refId: input.sourceBusinessDiscoveryArtifactId,
          sourceKind: "business_discovery",
          description: "Persisted Business Discovery artifact consumed by DBT MVP-1B.",
        },
        ...discovery.lineage.upstreamArtifactRefs.map(toEvidenceRef),
      ],
    },
    domains,
    knowledgeItems,
    confidence: artifactConfidence({ status, knowledgeItems, missingKnowledge }),
    missingKnowledge,
    limitations,
    diagnostics: [
      `DIGITAL_BUSINESS_TWIN_BUILDER_VERSION:${DIGITAL_BUSINESS_TWIN_BUILDER_VERSION}`,
      `DIGITAL_BUSINESS_TWIN_STATUS:${status}`,
      `DBT_KNOWLEDGE_ITEM_COUNT:${knowledgeItems.length}`,
      `DBT_MISSING_KNOWLEDGE_COUNT:${missingKnowledge.length}`,
      `SOURCE_BUSINESS_DISCOVERY_STATUS:${discovery.status}`,
    ],
  };

  const validation = validateDigitalBusinessTwinArtifact(artifact);
  if (!validation.valid) {
    return {
      ...artifact,
      status: "invalid",
      limitations: [
        ...artifact.limitations,
        ...validation.errors.map((error) => `DIGITAL_BUSINESS_TWIN_CONTRACT_VALIDATION_FAILED: ${error}`),
      ].sort(),
      diagnostics: [
        ...artifact.diagnostics,
        "DIGITAL_BUSINESS_TWIN_ARTIFACT_INVALID",
      ],
    };
  }

  return {
    ...artifact,
    diagnostics: [
      ...artifact.diagnostics,
      "DIGITAL_BUSINESS_TWIN_ARTIFACT_VALID",
    ],
  };
}
