/**
 * Phase MVP-1C Business Understanding Report deterministic builder.
 *
 * Builds the first human-readable business understanding artifact only from a
 * persisted Digital Business Twin artifact. No AI, external services, provider
 * adapters, generation, approval, publishing, UI, or API behavior is invoked.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION,
  BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES,
  validateBusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportConfidence,
  type BusinessUnderstandingReportRecommendation,
  type BusinessUnderstandingReportRecommendationType,
  type BusinessUnderstandingReportSection,
  type BusinessUnderstandingReportSectionType,
  type BusinessUnderstandingReportStatus,
} from "./business-understanding-report-contract";
import {
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinDomain,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinKnowledgeItem,
  type DigitalBusinessTwinMissingKnowledge,
} from "./digital-business-twin-contract";

export const BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION = "MVP-1C" as const;

export type BusinessUnderstandingReportBuilderInput = {
  sourceDigitalBusinessTwinArtifactId: string;
  digitalBusinessTwinArtifact: DigitalBusinessTwinArtifact;
  createdAt?: string;
};

const SECTION_TITLES: Record<BusinessUnderstandingReportSectionType, string> = {
  executive_summary: "Executive Summary",
  business_overview: "Business Overview",
  products_and_services: "Products And Services",
  target_audience: "Target Audience",
  business_goals: "Business Goals",
  brand_identity: "Brand Identity",
  current_digital_presence: "Current Digital Presence",
  trust_signals: "Trust Signals",
  missing_knowledge: "Missing Knowledge",
  confidence_overview: "Confidence Overview",
  recommendations: "Recommendations",
  limitations: "Limitations",
  evidence_summary: "Evidence Summary",
  diagnostics: "Diagnostics",
};

const SECTION_DOMAINS: Partial<Record<BusinessUnderstandingReportSectionType, DigitalBusinessTwinDomain[]>> = {
  business_overview: ["business_identity"],
  products_and_services: ["offerings"],
  target_audience: ["audience"],
  business_goals: ["goals"],
  brand_identity: ["brand"],
  current_digital_presence: ["digital_presence", "content", "constraints"],
  trust_signals: ["trust"],
};

const RECOMMENDATION_COPY: Record<BusinessUnderstandingReportRecommendationType, { title: string; rationale: string }> = {
  clarify_positioning: {
    title: "Clarify business positioning",
    rationale: "Make the business identity and value proposition easier for a customer to understand.",
  },
  improve_messaging: {
    title: "Improve business messaging",
    rationale: "Use clearer language around what the business offers, who it serves, and why it matters.",
  },
  strengthen_trust: {
    title: "Strengthen customer trust signals",
    rationale: "Add or clarify credibility signals that help customers evaluate the business with confidence.",
  },
  improve_customer_journey: {
    title: "Improve the customer journey",
    rationale: "Clarify what a customer should understand or do next after learning about the business.",
  },
  expand_content: {
    title: "Expand business content",
    rationale: "Add more business-facing detail where the current understanding is thin or incomplete.",
  },
  improve_digital_presence: {
    title: "Improve digital presence",
    rationale: "Make the business easier to understand across its current digital touchpoints.",
  },
  resolve_missing_audience: {
    title: "Resolve missing audience knowledge",
    rationale: "Clarify who the business primarily serves before downstream planning begins.",
  },
  resolve_missing_offerings: {
    title: "Resolve missing offerings knowledge",
    rationale: "Clarify the products or services before downstream planning begins.",
  },
};

function escapeIdentity(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function confidence(
  level: BusinessUnderstandingReportConfidence["level"],
  reasons: string[],
): BusinessUnderstandingReportConfidence {
  return {
    level,
    reasons: [...new Set(reasons)].sort(),
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function uniqueEvidenceRefs(refs: DigitalBusinessTwinEvidenceRef[]): DigitalBusinessTwinEvidenceRef[] {
  const byKey = new Map<string, DigitalBusinessTwinEvidenceRef>();
  for (const ref of refs) {
    byKey.set(stableStringify(ref), ref);
  }
  return [...byKey.values()].sort((left, right) =>
    (left.refId.localeCompare(right.refId) ||
      left.sourceKind.localeCompare(right.sourceKind) ||
      (left.routePath ?? "").localeCompare(right.routePath ?? "") ||
      (left.description ?? "").localeCompare(right.description ?? "")));
}

function currentDtbAllowsKnowledge(dbt: DigitalBusinessTwinArtifact, sourceValid: boolean): boolean {
  return sourceValid && dbt.status !== "blocked" && dbt.status !== "invalid" && dbt.status !== "stale";
}

function artifactStatus(input: {
  sourceValid: boolean;
  dbt: DigitalBusinessTwinArtifact;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportStatus {
  if (!input.sourceValid || input.dbt.status === "invalid") return "invalid";
  if (input.dbt.status === "stale") return "stale";
  if (input.dbt.status === "blocked") return "blocked";
  if (input.dbt.status === "partial" || input.knowledgeItems.length === 0 || input.missingKnowledge.length > 0) {
    return "partial";
  }
  return "valid";
}

function sectionStatus(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  knowledgeItems?: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge?: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportSection["status"] {
  if (input.artifactStatus === "blocked" || input.artifactStatus === "invalid" || input.artifactStatus === "stale") {
    return "blocked";
  }
  if ((input.knowledgeItems?.length ?? 0) === 0 || (input.missingKnowledge?.length ?? 0) > 0) return "partial";
  return input.artifactStatus === "draft" ? "draft" : "valid";
}

function sectionId(type: BusinessUnderstandingReportSectionType): string {
  return `bur-section:${type}`;
}

function itemsForDomains(
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[],
  domains: DigitalBusinessTwinDomain[],
): DigitalBusinessTwinKnowledgeItem[] {
  const domainSet = new Set(domains);
  return knowledgeItems
    .filter((item) => domainSet.has(item.domain))
    .sort((left, right) => left.knowledgeItemId.localeCompare(right.knowledgeItemId));
}

function missingForDomains(
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[],
  domains: DigitalBusinessTwinDomain[],
): DigitalBusinessTwinMissingKnowledge[] {
  const domainSet = new Set(domains);
  return missingKnowledge
    .filter((item) => domainSet.has(item.domain))
    .sort((left, right) => left.missingKnowledgeId.localeCompare(right.missingKnowledgeId));
}

function statementContent(input: {
  type: BusinessUnderstandingReportSectionType;
  items: DigitalBusinessTwinKnowledgeItem[];
  missing: DigitalBusinessTwinMissingKnowledge[];
  dbtStatus: DigitalBusinessTwinArtifact["status"];
}): string[] {
  if (input.dbtStatus === "blocked") {
    return ["GNR8 cannot currently explain this area because the Digital Business Twin is blocked."];
  }
  if (input.dbtStatus === "invalid" || input.dbtStatus === "stale") {
    return [`GNR8 cannot currently explain this area because the Digital Business Twin is ${input.dbtStatus}.`];
  }
  const statements = input.items.map((item) => item.statement);
  const missing = input.missing.map((item) => `Unknown: ${item.reason}`);
  if (statements.length > 0 || missing.length > 0) return [...statements, ...missing];
  return [`GNR8 does not yet have deterministic business knowledge for ${input.type}.`];
}

function sectionConfidence(input: {
  items: DigitalBusinessTwinKnowledgeItem[];
  missing: DigitalBusinessTwinMissingKnowledge[];
  fallback: BusinessUnderstandingReportConfidence;
}): BusinessUnderstandingReportConfidence {
  if (input.missing.length > 0 || input.items.length === 0) {
    return confidence("LOW", ["missing_or_limited_dbt_knowledge", ...input.fallback.reasons]);
  }
  const highCount = input.items.filter((item) => item.confidence.level === "HIGH").length;
  const mediumCount = input.items.filter((item) => item.confidence.level === "MEDIUM").length;
  if (highCount >= 2) return confidence("HIGH", ["multiple_high_confidence_dbt_items"]);
  if (highCount > 0 || mediumCount > 0) return confidence("MEDIUM", ["dbt_knowledge_present"]);
  return confidence("LOW", ["low_confidence_dbt_knowledge"]);
}

function businessSection(input: {
  type: BusinessUnderstandingReportSectionType;
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportSection {
  const domains = SECTION_DOMAINS[input.type] ?? [];
  const items = itemsForDomains(input.knowledgeItems, domains);
  const missing = missingForDomains(input.missingKnowledge, domains);
  return {
    sectionId: sectionId(input.type),
    type: input.type,
    title: SECTION_TITLES[input.type],
    status: sectionStatus({ artifactStatus: input.artifactStatus, knowledgeItems: items, missingKnowledge: missing }),
    content: statementContent({ type: input.type, items, missing, dbtStatus: input.dbt.status }),
    knowledgeItemIds: items.map((item) => item.knowledgeItemId),
    missingKnowledgeIds: missing.map((item) => item.missingKnowledgeId),
    evidenceRefs: uniqueEvidenceRefs(items.flatMap((item) => item.evidenceRefs)),
    confidence: sectionConfidence({ items, missing, fallback: input.dbt.confidence }),
    limitations: uniqueSorted(items.flatMap((item) => item.limitations)),
    diagnostics: [
      `BUR_SECTION_TYPE:${input.type}`,
      `BUR_SECTION_KNOWLEDGE_ITEM_COUNT:${items.length}`,
      `BUR_SECTION_MISSING_KNOWLEDGE_COUNT:${missing.length}`,
    ],
  };
}

function executiveSummary(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportSection {
  const content = [
    `GNR8 currently explains this business from ${input.knowledgeItems.length} Digital Business Twin knowledge item${input.knowledgeItems.length === 1 ? "" : "s"}.`,
    `The current report status is ${input.artifactStatus}.`,
    input.missingKnowledge.length > 0
      ? `${input.missingKnowledge.length} knowledge gap${input.missingKnowledge.length === 1 ? "" : "s"} remain before the understanding is complete.`
      : "No Digital Business Twin knowledge gaps are currently recorded.",
  ];
  return {
    sectionId: sectionId("executive_summary"),
    type: "executive_summary",
    title: SECTION_TITLES.executive_summary,
    status: sectionStatus({
      artifactStatus: input.artifactStatus,
      knowledgeItems: input.knowledgeItems,
      missingKnowledge: input.missingKnowledge,
    }),
    content,
    knowledgeItemIds: input.knowledgeItems.map((item) => item.knowledgeItemId),
    missingKnowledgeIds: input.missingKnowledge.map((item) => item.missingKnowledgeId),
    evidenceRefs: uniqueEvidenceRefs(input.knowledgeItems.flatMap((item) => item.evidenceRefs)),
    confidence: input.dbt.confidence,
    limitations: [],
    diagnostics: ["BUR_SECTION_TYPE:executive_summary"],
  };
}

function missingKnowledgeSection(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportSection {
  const content = input.missingKnowledge.length > 0
    ? input.missingKnowledge.map((item) => `${item.domain}: ${item.reason}`)
    : ["No missing knowledge is currently recorded in the Digital Business Twin."];
  return {
    sectionId: sectionId("missing_knowledge"),
    type: "missing_knowledge",
    title: SECTION_TITLES.missing_knowledge,
    status: sectionStatus({
      artifactStatus: input.artifactStatus,
      missingKnowledge: input.missingKnowledge,
      knowledgeItems: input.missingKnowledge.length > 0 ? [] : [{} as DigitalBusinessTwinKnowledgeItem],
    }),
    content,
    knowledgeItemIds: [],
    missingKnowledgeIds: input.missingKnowledge.map((item) => item.missingKnowledgeId),
    evidenceRefs: [],
    confidence: input.missingKnowledge.length > 0
      ? confidence("LOW", ["digital_business_twin_missing_knowledge"])
      : input.dbt.confidence,
    limitations: [],
    diagnostics: [
      "BUR_SECTION_TYPE:missing_knowledge",
      `BUR_MISSING_KNOWLEDGE_COUNT:${input.missingKnowledge.length}`,
    ],
  };
}

function confidenceOverviewSection(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportSection {
  const itemLevels = input.knowledgeItems.map((item) => `${item.domain}:${item.confidence.level}`);
  return {
    sectionId: sectionId("confidence_overview"),
    type: "confidence_overview",
    title: SECTION_TITLES.confidence_overview,
    status: sectionStatus({
      artifactStatus: input.artifactStatus,
      knowledgeItems: input.knowledgeItems.length > 0 ? input.knowledgeItems : undefined,
      missingKnowledge: input.missingKnowledge,
    }),
    content: [
      `Overall confidence is ${input.dbt.confidence.level}.`,
      ...input.dbt.confidence.reasons.map((reason) => `Reason: ${reason}`),
      ...(itemLevels.length > 0 ? itemLevels.map((level) => `Knowledge confidence: ${level}`) : ["No knowledge-item confidence is available."]),
    ],
    knowledgeItemIds: input.knowledgeItems.map((item) => item.knowledgeItemId),
    missingKnowledgeIds: input.missingKnowledge.map((item) => item.missingKnowledgeId),
    evidenceRefs: [],
    confidence: input.dbt.confidence,
    limitations: [],
    diagnostics: ["BUR_SECTION_TYPE:confidence_overview"],
  };
}

function recommendationTypeForMissing(domain: DigitalBusinessTwinDomain): BusinessUnderstandingReportRecommendationType {
  if (domain === "audience") return "resolve_missing_audience";
  if (domain === "offerings") return "resolve_missing_offerings";
  if (domain === "trust") return "strengthen_trust";
  if (domain === "digital_presence" || domain === "constraints") return "improve_digital_presence";
  if (domain === "content") return "expand_content";
  if (domain === "goals") return "improve_customer_journey";
  if (domain === "brand") return "improve_messaging";
  return "clarify_positioning";
}

function recommendationId(type: BusinessUnderstandingReportRecommendationType, missingKnowledgeIds: string[]): string {
  return `bur-recommendation:${type}:${sha256Hex(stableStringify({ missingKnowledgeIds, type })).slice(0, 16)}`;
}

function buildRecommendations(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
  dbt: DigitalBusinessTwinArtifact;
}): BusinessUnderstandingReportRecommendation[] {
  if (input.artifactStatus === "blocked" || input.artifactStatus === "invalid" || input.artifactStatus === "stale") {
    return [];
  }
  const byType = new Map<BusinessUnderstandingReportRecommendationType, DigitalBusinessTwinMissingKnowledge[]>();
  for (const missing of input.missingKnowledge) {
    const type = recommendationTypeForMissing(missing.domain);
    byType.set(type, [...(byType.get(type) ?? []), missing]);
  }
  if (byType.size === 0) {
    byType.set("improve_messaging", []);
  }
  return [...byType.entries()]
    .map(([type, missing]) => {
      const copy = RECOMMENDATION_COPY[type];
      const missingKnowledgeIds = missing.map((item) => item.missingKnowledgeId).sort();
      return {
        recommendationId: recommendationId(type, missingKnowledgeIds),
        type,
        title: copy.title,
        rationale: copy.rationale,
        sourceSectionIds: [
          sectionId("recommendations"),
          ...(missing.length > 0 ? [sectionId("missing_knowledge")] : [sectionId("confidence_overview")]),
        ].sort(),
        missingKnowledgeIds,
        confidence: confidence(input.dbt.confidence.level === "HIGH" ? "MEDIUM" : input.dbt.confidence.level, [
          "business_oriented_report_recommendation",
          ...input.dbt.confidence.reasons,
        ]),
        diagnostics: [`BUR_RECOMMENDATION_TYPE:${type}`],
      };
    })
    .sort((left, right) => left.recommendationId.localeCompare(right.recommendationId));
}

function recommendationsSection(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  recommendations: BusinessUnderstandingReportRecommendation[];
}): BusinessUnderstandingReportSection {
  return {
    sectionId: sectionId("recommendations"),
    type: "recommendations",
    title: SECTION_TITLES.recommendations,
    status: input.artifactStatus === "blocked" || input.artifactStatus === "invalid" || input.artifactStatus === "stale"
      ? "blocked"
      : "valid",
    content: input.recommendations.length > 0
      ? input.recommendations.map((item) => `${item.title}: ${item.rationale}`)
      : ["No business recommendation is available while the source understanding is blocked or not current."],
    knowledgeItemIds: [],
    missingKnowledgeIds: uniqueSorted(input.recommendations.flatMap((item) => item.missingKnowledgeIds)),
    evidenceRefs: [],
    confidence: input.recommendations.length > 0
      ? input.recommendations[0].confidence
      : confidence("LOW", ["no_current_business_recommendation"]),
    limitations: [],
    diagnostics: [
      "BUR_SECTION_TYPE:recommendations",
      `BUR_RECOMMENDATION_COUNT:${input.recommendations.length}`,
    ],
  };
}

function limitationsSection(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
}): BusinessUnderstandingReportSection {
  const failClosed = input.artifactStatus === "blocked" || input.artifactStatus === "invalid" || input.artifactStatus === "stale";
  return {
    sectionId: sectionId("limitations"),
    type: "limitations",
    title: SECTION_TITLES.limitations,
    status: failClosed
      ? "blocked"
      : input.dbt.limitations.length > 0 ? "partial" : sectionStatus({ artifactStatus: input.artifactStatus }),
    content: input.dbt.limitations.length > 0
      ? input.dbt.limitations
      : ["No Digital Business Twin limitations are currently recorded."],
    knowledgeItemIds: [],
    missingKnowledgeIds: [],
    evidenceRefs: [],
    confidence: input.dbt.confidence,
    limitations: input.dbt.limitations,
    diagnostics: [
      "BUR_SECTION_TYPE:limitations",
      `BUR_LIMITATION_COUNT:${input.dbt.limitations.length}`,
    ],
  };
}

function evidenceSummarySection(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
}): BusinessUnderstandingReportSection {
  const evidenceRefs = uniqueEvidenceRefs([
    ...input.dbt.lineage.evidenceRefs,
    ...input.knowledgeItems.flatMap((item) => item.evidenceRefs),
  ]);
  const failClosed = input.artifactStatus === "blocked" || input.artifactStatus === "invalid" || input.artifactStatus === "stale";
  return {
    sectionId: sectionId("evidence_summary"),
    type: "evidence_summary",
    title: SECTION_TITLES.evidence_summary,
    status: failClosed
      ? "blocked"
      : evidenceRefs.length > 0 ? sectionStatus({ artifactStatus: input.artifactStatus, knowledgeItems: input.knowledgeItems }) : "partial",
    content: evidenceRefs.length > 0
      ? evidenceRefs.map((ref) => `${ref.sourceKind}: ${ref.description ?? ref.refId}${ref.routePath ? ` (${ref.routePath})` : ""}`)
      : ["No evidence references are available from the Digital Business Twin."],
    knowledgeItemIds: input.knowledgeItems.map((item) => item.knowledgeItemId),
    missingKnowledgeIds: [],
    evidenceRefs,
    confidence: input.dbt.confidence,
    limitations: [],
    diagnostics: [
      "BUR_SECTION_TYPE:evidence_summary",
      `BUR_EVIDENCE_REF_COUNT:${evidenceRefs.length}`,
    ],
  };
}

function diagnosticsSection(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
}): BusinessUnderstandingReportSection {
  return {
    sectionId: sectionId("diagnostics"),
    type: "diagnostics",
    title: SECTION_TITLES.diagnostics,
    status: sectionStatus({ artifactStatus: input.artifactStatus, knowledgeItems: [{} as DigitalBusinessTwinKnowledgeItem] }),
    content: input.dbt.diagnostics.length > 0
      ? input.dbt.diagnostics
      : ["No Digital Business Twin diagnostics are currently recorded."],
    knowledgeItemIds: [],
    missingKnowledgeIds: [],
    evidenceRefs: [],
    confidence: input.dbt.confidence,
    limitations: [],
    diagnostics: [
      "BUR_SECTION_TYPE:diagnostics",
      `BUR_SOURCE_DIAGNOSTIC_COUNT:${input.dbt.diagnostics.length}`,
    ],
  };
}

function buildSections(input: {
  artifactStatus: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
  recommendations: BusinessUnderstandingReportRecommendation[];
}): BusinessUnderstandingReportSection[] {
  const sections: BusinessUnderstandingReportSection[] = [
    executiveSummary(input),
    businessSection({ ...input, type: "business_overview" }),
    businessSection({ ...input, type: "products_and_services" }),
    businessSection({ ...input, type: "target_audience" }),
    businessSection({ ...input, type: "business_goals" }),
    businessSection({ ...input, type: "brand_identity" }),
    businessSection({ ...input, type: "current_digital_presence" }),
    businessSection({ ...input, type: "trust_signals" }),
    missingKnowledgeSection(input),
    confidenceOverviewSection(input),
    recommendationsSection(input),
    limitationsSection(input),
    evidenceSummarySection(input),
    diagnosticsSection(input),
  ];
  return BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES.map((type) =>
    sections.find((section) => section.type === type) as BusinessUnderstandingReportSection);
}

function artifactConfidence(input: {
  status: BusinessUnderstandingReportStatus;
  dbt: DigitalBusinessTwinArtifact;
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): BusinessUnderstandingReportConfidence {
  if (input.status === "blocked") return confidence("LOW", ["source_digital_business_twin_blocked"]);
  if (input.status === "invalid") return confidence("LOW", ["source_digital_business_twin_invalid"]);
  if (input.status === "stale") return confidence("LOW", ["source_digital_business_twin_stale"]);
  if (input.missingKnowledge.length > 0) {
    return confidence("LOW", ["missing_business_knowledge", ...input.dbt.confidence.reasons]);
  }
  return confidence(input.dbt.confidence.level, ["digital_business_twin_projection", ...input.dbt.confidence.reasons]);
}

export function buildBusinessUnderstandingReportFromDigitalBusinessTwin(
  input: BusinessUnderstandingReportBuilderInput,
): BusinessUnderstandingReportArtifact {
  const dbt = input.digitalBusinessTwinArtifact;
  const sourceValidation = validateDigitalBusinessTwinArtifact(dbt);
  const shouldUseKnowledge = currentDtbAllowsKnowledge(dbt, sourceValidation.valid);
  const knowledgeItems = shouldUseKnowledge
    ? [...dbt.knowledgeItems].sort((left, right) => left.knowledgeItemId.localeCompare(right.knowledgeItemId))
    : [];
  const missingKnowledge = [...dbt.missingKnowledge]
    .sort((left, right) => left.missingKnowledgeId.localeCompare(right.missingKnowledgeId));
  const status = artifactStatus({
    sourceValid: sourceValidation.valid,
    dbt,
    knowledgeItems,
    missingKnowledge,
  });
  const recommendations = buildRecommendations({ artifactStatus: status, missingKnowledge, dbt });
  const artifactConfidenceValue = artifactConfidence({ status, dbt, missingKnowledge });
  const limitations = [
    ...dbt.limitations,
    ...(sourceValidation.valid ? [] : sourceValidation.errors.map((error) => `SOURCE_DIGITAL_BUSINESS_TWIN_INVALID: ${error}`)),
  ].sort();

  const artifact: BusinessUnderstandingReportArtifact = {
    businessUnderstandingReportId: `business-understanding-report:${escapeIdentity(dbt.siteVersionId)}:${escapeIdentity(dbt.dryRunId)}:${escapeIdentity(input.sourceDigitalBusinessTwinArtifactId)}`,
    status,
    siteVersionId: dbt.siteVersionId,
    dryRunId: dbt.dryRunId,
    sourceDigitalBusinessTwinArtifactId: input.sourceDigitalBusinessTwinArtifactId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    contractVersion: BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION,
    lineage: {
      siteVersionId: dbt.siteVersionId,
      dryRunId: dbt.dryRunId,
      sourceDigitalBusinessTwinArtifactId: input.sourceDigitalBusinessTwinArtifactId,
      sourceDigitalBusinessTwinId: dbt.digitalBusinessTwinId,
      sourceDigitalBusinessTwinStatus: dbt.status,
      sourceDigitalBusinessTwinContractVersion: dbt.contractVersion,
      sourceBusinessDiscoveryArtifactId: dbt.sourceBusinessDiscoveryArtifactId,
      evidenceRefs: dbt.lineage.evidenceRefs,
      upstreamArtifactRefs: [
        {
          refId: input.sourceDigitalBusinessTwinArtifactId,
          sourceKind: "digital_business_twin",
          description: "Persisted Digital Business Twin artifact consumed by BUR MVP-1C.",
        },
        ...dbt.lineage.upstreamArtifactRefs,
      ],
    },
    sections: [],
    recommendations,
    confidence: artifactConfidenceValue,
    limitations,
    diagnostics: [
      `BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION:${BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION}`,
      `BUSINESS_UNDERSTANDING_REPORT_STATUS:${status}`,
      `BUR_SOURCE_DBT_STATUS:${dbt.status}`,
      `BUR_SECTION_COUNT:${BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES.length}`,
      `BUR_RECOMMENDATION_COUNT:${recommendations.length}`,
      `BUR_MISSING_KNOWLEDGE_COUNT:${missingKnowledge.length}`,
    ],
  };
  artifact.sections = buildSections({
    artifactStatus: status,
    dbt: {
      ...dbt,
      confidence: artifactConfidenceValue,
      limitations,
    },
    knowledgeItems,
    missingKnowledge,
    recommendations,
  });

  const validation = validateBusinessUnderstandingReportArtifact(artifact);
  if (!validation.valid) {
    return {
      ...artifact,
      status: "invalid",
      limitations: [
        ...artifact.limitations,
        ...validation.errors.map((error) => `BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VALIDATION_FAILED: ${error}`),
      ].sort(),
      diagnostics: [
        ...artifact.diagnostics,
        "BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_INVALID",
      ],
    };
  }

  return {
    ...artifact,
    diagnostics: [
      ...artifact.diagnostics,
      "BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_VALID",
    ],
  };
}
