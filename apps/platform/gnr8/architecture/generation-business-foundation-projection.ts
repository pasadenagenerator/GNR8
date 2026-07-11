import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeImportProvenanceSummary } from "../runtime/types";

export type BusinessFoundationAttentionState =
  | "low_confidence"
  | "missing_audience"
  | "missing_offerings"
  | "missing_evidence"
  | "large_limitation_count"
  | "business_partially_understood";

export type BusinessFoundationArtifactLinkProjection = {
  label: string;
  kind: string;
  artifactId: string | null;
  canonicalId: string | null;
  status: string | null;
  href: string | null;
  referenceOnly: boolean;
  missing: boolean;
};

export type BusinessFoundationConfidenceProjection = {
  level: string | null;
  reasons: string[];
};

export type BusinessFoundationKnowledgeItemProjection = {
  id: string | null;
  domain: string;
  kind: string | null;
  statement: string;
  confidence: BusinessFoundationConfidenceProjection;
  evidenceCount: number;
  limitations: string[];
  status: string | null;
};

export type BusinessFoundationKnowledgeGroupProjection = {
  key: string;
  label: string;
  confidence: BusinessFoundationConfidenceProjection;
  evidenceCount: number;
  limitations: string[];
  statements: BusinessFoundationKnowledgeItemProjection[];
  missing: string[];
};

export type BusinessFoundationSummaryProjection = {
  businessName: string | null;
  businessIdentity: string | null;
  businessPurpose: string | null;
  businessGoals: string[];
  businessConfidence: BusinessFoundationConfidenceProjection;
  businessTone: string | null;
  trustStrategy: string | null;
  digitalPresence: string | null;
};

export type BusinessFoundationOfferingsProjection = {
  knownOfferings: BusinessFoundationKnowledgeItemProjection[];
  knownServices: BusinessFoundationKnowledgeItemProjection[];
  knownProducts: BusinessFoundationKnowledgeItemProjection[];
  evidenceCount: number;
  unknownOfferings: string[];
  lowConfidenceMarkers: string[];
};

export type BusinessFoundationAudienceProjection = {
  knownAudience: BusinessFoundationKnowledgeItemProjection[];
  unknownAudience: string[];
  missingAudienceKnowledge: string[];
  confidence: BusinessFoundationConfidenceProjection;
};

export type BusinessFoundationMissingKnowledgeProjection = {
  known: BusinessFoundationKnowledgeItemProjection[];
  unknown: string[];
  assumed: string[];
};

export type BusinessFoundationTimelineStepProjection = {
  label: string;
  artifactKind: string;
  artifactId: string | null;
  contributes: string;
};

export type BusinessFoundationHealthProjection = {
  businessConfidence: BusinessFoundationConfidenceProjection;
  knownKnowledgeCount: number;
  missingKnowledgeCount: number;
  limitationCount: number;
  evidenceQuality: string;
  readinessForWebsiteGeneration: string;
};

export type GenerationBusinessFoundationProjection = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  summary: BusinessFoundationSummaryProjection;
  offerings: BusinessFoundationOfferingsProjection;
  audience: BusinessFoundationAudienceProjection;
  knowledgeGroups: BusinessFoundationKnowledgeGroupProjection[];
  missingKnowledge: BusinessFoundationMissingKnowledgeProjection;
  transformationStory: BusinessFoundationTimelineStepProjection[];
  businessHealth: BusinessFoundationHealthProjection;
  artifactExplorer: BusinessFoundationArtifactLinkProjection[];
  attentionStates: BusinessFoundationAttentionState[];
  diagnostics: string[];
};

type SiteVersionLoader = (siteVersionId: string) => Promise<Pick<CanonicalSiteVersionSnapshot, "id" | "siteId" | "versionNo" | "state" | "importProvenanceSummary"> | null>;

type ProjectionRecord = {
  artifactId?: string;
  status?: string;
  createdAt?: string;
  persistedAt?: string;
  dryRunId?: string;
  artifact?: Record<string, unknown>;
  [key: string]: unknown;
};

export type GenerationBusinessFoundationProjectionOptions = RuntimeStoreDbOptions & {
  getSiteVersion?: SiteVersionLoader;
};

const KNOWLEDGE_GROUPS = [
  ["business_identity", "Identity"],
  ["offerings", "Offerings"],
  ["goals", "Goals"],
  ["brand", "Brand"],
  ["content", "Content"],
  ["trust", "Trust"],
  ["digital_presence", "Digital Presence"],
  ["constraints", "Constraints"],
] as const;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): ProjectionRecord[] {
  return Array.isArray(value) ? value.filter((item): item is ProjectionRecord => asRecord(item) !== null) : [];
}

function text(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter((item): item is string => item !== null)
    : [];
}

function artifactBody(record: ProjectionRecord | null): Record<string, unknown> | null {
  return asRecord(record?.artifact) ?? null;
}

function confidence(value: unknown): BusinessFoundationConfidenceProjection {
  const record = asRecord(value);
  return {
    level: text(record?.level),
    reasons: strings(record?.reasons),
  };
}

function evidenceCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function limitationsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      const record = asRecord(item);
      return text(record?.message ?? record?.code ?? record?.limitationId);
    })
    .filter((item): item is string => item !== null);
}

function summaryRecords(summary: RuntimeImportProvenanceSummary | null | undefined, key: string): ProjectionRecord[] {
  return asArray((summary as Record<string, unknown> | null | undefined)?.[key]);
}

function latest(records: ProjectionRecord[]): ProjectionRecord | null {
  return records.slice().sort((left, right) =>
    text(left.persistedAt)?.localeCompare(text(right.persistedAt) ?? "") ||
    text(left.artifactId)?.localeCompare(text(right.artifactId) ?? "") ||
    0).at(-1) ?? null;
}

function findRecord(records: ProjectionRecord[], predicate: (record: ProjectionRecord, artifact: Record<string, unknown> | null) => boolean): ProjectionRecord | null {
  return records.find((record) => predicate(record, artifactBody(record))) ?? null;
}

function artifactLink(input: {
  label: string;
  kind: string;
  record?: ProjectionRecord | null;
  canonicalIdKey?: string;
}): BusinessFoundationArtifactLinkProjection {
  const record = input.record ?? null;
  const artifact = artifactBody(record);
  const artifactId = text(record?.artifactId);
  return {
    label: input.label,
    kind: input.kind,
    artifactId,
    canonicalId: text(input.canonicalIdKey ? record?.[input.canonicalIdKey] ?? artifact?.[input.canonicalIdKey] : null),
    status: text(record?.status ?? artifact?.status),
    href: artifactId ? `#artifact-${artifactId}` : null,
    referenceOnly: true,
    missing: !artifactId,
  };
}

function itemProjection(item: unknown): BusinessFoundationKnowledgeItemProjection | null {
  const record = asRecord(item);
  const statement = text(record?.statement ?? record?.summary ?? record?.reason);
  const domain = text(record?.domain);
  if (!record || !statement || !domain) return null;
  return {
    id: text(record.knowledgeItemId ?? record.findingId ?? record.missingKnowledgeId ?? record.textItemId),
    domain,
    kind: text(record.kind ?? record.itemType),
    statement,
    confidence: confidence(record.confidence),
    evidenceCount: evidenceCount(record.evidenceRefs),
    limitations: limitationsFrom(record.limitations),
    status: text(record.status),
  };
}

function dbtKnowledge(dbtArtifact: Record<string, unknown> | null): BusinessFoundationKnowledgeItemProjection[] {
  return Array.isArray(dbtArtifact?.knowledgeItems)
    ? dbtArtifact.knowledgeItems.map(itemProjection).filter((item): item is BusinessFoundationKnowledgeItemProjection => item !== null)
    : [];
}

function dbtMissing(dbtArtifact: Record<string, unknown> | null): string[] {
  if (!Array.isArray(dbtArtifact?.missingKnowledge)) return [];
  return dbtArtifact.missingKnowledge
    .map((item) => {
      const record = asRecord(item);
      const domain = text(record?.domain);
      const reason = text(record?.reason);
      return reason ? `${domain ?? "unknown"}: ${reason}` : null;
    })
    .filter((item): item is string => item !== null);
}

function groupConfidence(items: BusinessFoundationKnowledgeItemProjection[], fallback: BusinessFoundationConfidenceProjection): BusinessFoundationConfidenceProjection {
  const levels = items.map((item) => item.confidence.level).filter(Boolean);
  if (levels.includes("LOW")) return { level: "LOW", reasons: [...new Set(items.flatMap((item) => item.confidence.reasons))] };
  if (levels.includes("MEDIUM")) return { level: "MEDIUM", reasons: [...new Set(items.flatMap((item) => item.confidence.reasons))] };
  return {
    level: levels.includes("HIGH") ? "HIGH" : fallback.level,
    reasons: [...new Set(items.flatMap((item) => item.confidence.reasons).concat(fallback.reasons))],
  };
}

function firstStatement(items: BusinessFoundationKnowledgeItemProjection[], domain: string): string | null {
  return items.find((item) => item.domain === domain)?.statement ?? null;
}

function statements(items: BusinessFoundationKnowledgeItemProjection[], domain: string): string[] {
  return items.filter((item) => item.domain === domain).map((item) => item.statement);
}

function splitOfferingItems(items: BusinessFoundationKnowledgeItemProjection[], kindPart: string): BusinessFoundationKnowledgeItemProjection[] {
  return items.filter((item) => `${item.kind ?? ""} ${item.statement}`.toLowerCase().includes(kindPart));
}

function assumedKnowledge(items: BusinessFoundationKnowledgeItemProjection[]): string[] {
  return items
    .filter((item) => {
      const marker = `${item.kind ?? ""} ${item.statement} ${item.confidence.reasons.join(" ")}`.toLowerCase();
      return marker.includes("assum");
    })
    .map((item) => item.statement);
}

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions) {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

export async function loadGenerationBusinessFoundationProjection(input: {
  siteVersionId: string;
  options?: GenerationBusinessFoundationProjectionOptions;
}): Promise<GenerationBusinessFoundationProjection> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  const summary = siteVersion?.importProvenanceSummary ?? null;
  const diagnostics: string[] = [];
  const attention = new Set<BusinessFoundationAttentionState>();

  if (!summary) diagnostics.push("BUSINESS_FOUNDATION_PROVENANCE_MISSING");

  const businessDiscovery = latest(summaryRecords(summary, "businessDiscoveryArtifacts"));
  const dbtRecords = summaryRecords(summary, "digitalBusinessTwinArtifacts");
  const businessUnderstanding = latest(summaryRecords(summary, "businessUnderstandingReportArtifacts"));
  const businessAlignment = latest(summaryRecords(summary, "businessAlignmentArtifacts"));
  const websiteDesignBrief = latest(summaryRecords(summary, "websiteDesignBriefArtifacts"));
  const websiteGenerationPackage = latest(summaryRecords(summary, "websiteGenerationPackageArtifacts"));

  const alignmentArtifact = artifactBody(businessAlignment);
  const outputDbtId = text(asRecord(alignmentArtifact?.lineage)?.outputDigitalBusinessTwinId);
  const alignedDbt = findRecord(dbtRecords, (record, artifact) =>
    text(record.digitalBusinessTwinId ?? artifact?.digitalBusinessTwinId) === outputDbtId) ??
    dbtRecords.slice().reverse().find((record) => ["aligned", "confirmed"].includes(text(record.status ?? artifactBody(record)?.status) ?? "")) ??
    latest(dbtRecords);
  const sourceDbt = findRecord(dbtRecords, (record, artifact) =>
    text(record.digitalBusinessTwinId ?? artifact?.digitalBusinessTwinId) === text(asRecord(artifactBody(businessUnderstanding)?.lineage)?.sourceDigitalBusinessTwinId)) ??
    dbtRecords.find((record) => record !== alignedDbt) ??
    alignedDbt;

  const alignedDbtArtifact = artifactBody(alignedDbt);
  const knowledge = dbtKnowledge(alignedDbtArtifact);
  const missing = dbtMissing(alignedDbtArtifact);
  const topConfidence = confidence(alignedDbtArtifact?.confidence);
  const topLimitations = [
    ...limitationsFrom(alignedDbtArtifact?.limitations),
    ...limitationsFrom(artifactBody(businessDiscovery)?.limitations),
    ...limitationsFrom(artifactBody(businessUnderstanding)?.limitations),
    ...limitationsFrom(artifactBody(businessAlignment)?.limitations),
    ...limitationsFrom(artifactBody(websiteDesignBrief)?.limitations),
    ...limitationsFrom(artifactBody(websiteGenerationPackage)?.limitations),
  ];

  const knowledgeGroups = KNOWLEDGE_GROUPS.map(([key, label]) => {
    const groupItems = knowledge.filter((item) => item.domain === key);
    const groupMissing = missing.filter((item) => item.startsWith(`${key}:`));
    const limitations = [...new Set(groupItems.flatMap((item) => item.limitations))];
    return {
      key,
      label,
      confidence: groupConfidence(groupItems, topConfidence),
      evidenceCount: groupItems.reduce((total, item) => total + item.evidenceCount, 0),
      limitations,
      statements: groupItems,
      missing: groupMissing,
    };
  });

  const offeringItems = knowledge.filter((item) => item.domain === "offerings");
  const audienceItems = knowledge.filter((item) => item.domain === "audience");
  const lowConfidenceMarkers = offeringItems
    .filter((item) => item.confidence.level === "LOW" || item.confidence.level === "MEDIUM")
    .map((item) => item.id ?? item.statement);
  const unknownOfferings = missing.filter((item) => item.startsWith("offerings:"));
  const unknownAudience = missing.filter((item) => item.startsWith("audience:"));
  const assumed = assumedKnowledge(knowledge);

  if (topConfidence.level === "LOW" || knowledge.some((item) => item.confidence.level === "LOW")) attention.add("low_confidence");
  if (audienceItems.length === 0 || unknownAudience.length > 0) attention.add("missing_audience");
  if (offeringItems.length === 0 || unknownOfferings.length > 0) attention.add("missing_offerings");
  if (knowledge.reduce((total, item) => total + item.evidenceCount, 0) === 0) attention.add("missing_evidence");
  if (topLimitations.length >= 10) attention.add("large_limitation_count");
  if (
    missing.length > 0 ||
    ["partial", "blocked"].includes(text(alignedDbt?.status ?? alignedDbtArtifact?.status) ?? "") ||
    ["partial", "blocked"].includes(text(websiteDesignBrief?.status ?? artifactBody(websiteDesignBrief)?.status) ?? "") ||
    ["partial", "blocked"].includes(text(websiteGenerationPackage?.status ?? artifactBody(websiteGenerationPackage)?.status) ?? "")
  ) {
    attention.add("business_partially_understood");
  }

  const artifactExplorer = [
    artifactLink({ label: "Business Discovery", kind: "business_discovery", record: businessDiscovery, canonicalIdKey: "businessDiscoveryId" }),
    artifactLink({ label: "Digital Business Twin", kind: "digital_business_twin", record: sourceDbt, canonicalIdKey: "digitalBusinessTwinId" }),
    artifactLink({ label: "Business Understanding Report", kind: "business_understanding_report", record: businessUnderstanding, canonicalIdKey: "businessUnderstandingReportId" }),
    artifactLink({ label: "Business Alignment", kind: "business_alignment", record: businessAlignment, canonicalIdKey: "businessAlignmentId" }),
    artifactLink({ label: "Aligned Digital Business Twin", kind: "aligned_digital_business_twin", record: alignedDbt, canonicalIdKey: "digitalBusinessTwinId" }),
    artifactLink({ label: "Website Design Brief", kind: "website_design_brief", record: websiteDesignBrief, canonicalIdKey: "websiteDesignBriefId" }),
    artifactLink({ label: "Website Generation Package", kind: "website_generation_package", record: websiteGenerationPackage, canonicalIdKey: "websiteGenerationPackageId" }),
  ];

  return cloneJson({
    siteVersionId: input.siteVersionId,
    sourceSiteId: text(siteVersion?.siteId ?? businessDiscovery?.sourceSiteId ?? artifactBody(businessDiscovery)?.sourceSiteId),
    dryRunId: text(alignedDbt?.dryRunId ?? websiteGenerationPackage?.dryRunId ?? businessDiscovery?.dryRunId),
    summary: {
      businessName: text(siteVersion?.siteId ?? businessDiscovery?.sourceSiteId ?? artifactBody(businessDiscovery)?.sourceSiteId),
      businessIdentity: firstStatement(knowledge, "business_identity"),
      businessPurpose: firstStatement(knowledge, "content") ?? firstStatement(knowledge, "digital_presence"),
      businessGoals: statements(knowledge, "goals"),
      businessConfidence: topConfidence,
      businessTone: firstStatement(knowledge, "brand"),
      trustStrategy: firstStatement(knowledge, "trust"),
      digitalPresence: firstStatement(knowledge, "digital_presence"),
    },
    offerings: {
      knownOfferings: offeringItems,
      knownServices: splitOfferingItems(offeringItems, "service"),
      knownProducts: splitOfferingItems(offeringItems, "product"),
      evidenceCount: offeringItems.reduce((total, item) => total + item.evidenceCount, 0),
      unknownOfferings,
      lowConfidenceMarkers,
    },
    audience: {
      knownAudience: audienceItems,
      unknownAudience,
      missingAudienceKnowledge: unknownAudience,
      confidence: groupConfidence(audienceItems, topConfidence),
    },
    knowledgeGroups,
    missingKnowledge: {
      known: knowledge,
      unknown: missing,
      assumed: assumed.length > 0 ? assumed : ["No persisted assumptions were found in the business foundation artifacts."],
    },
    transformationStory: [
      {
        label: "Business Discovery",
        artifactKind: "business_discovery",
        artifactId: artifactExplorer[0].artifactId,
        contributes: "Captures deterministic website-derived business signals and limitations.",
      },
      {
        label: "Digital Business Twin",
        artifactKind: "digital_business_twin",
        artifactId: artifactExplorer[1].artifactId,
        contributes: "Turns discovery findings into structured business knowledge and missing knowledge.",
      },
      {
        label: "Business Understanding",
        artifactKind: "business_understanding_report",
        artifactId: artifactExplorer[2].artifactId,
        contributes: "Projects the Digital Business Twin into a readable business report.",
      },
      {
        label: "Business Alignment",
        artifactKind: "business_alignment",
        artifactId: artifactExplorer[3].artifactId,
        contributes: "Records governed corrections or confirmations and identifies the aligned DBT.",
      },
      {
        label: "Website Design Brief",
        artifactKind: "website_design_brief",
        artifactId: artifactExplorer[5].artifactId,
        contributes: "Transforms aligned business knowledge into website experience intent.",
      },
      {
        label: "Website Generation Package",
        artifactKind: "website_generation_package",
        artifactId: artifactExplorer[6].artifactId,
        contributes: "Transforms website intent into provider-neutral generation requirements.",
      },
    ],
    businessHealth: {
      businessConfidence: topConfidence,
      knownKnowledgeCount: knowledge.length,
      missingKnowledgeCount: missing.length,
      limitationCount: topLimitations.length,
      evidenceQuality: knowledge.some((item) => item.evidenceCount > 0) ? "evidence-linked persisted knowledge" : "missing persisted evidence references",
      readinessForWebsiteGeneration: text(websiteGenerationPackage?.status ?? artifactBody(websiteGenerationPackage)?.status) ?? "missing Website Generation Package",
    },
    artifactExplorer,
    attentionStates: [...attention],
    diagnostics,
  });
}
