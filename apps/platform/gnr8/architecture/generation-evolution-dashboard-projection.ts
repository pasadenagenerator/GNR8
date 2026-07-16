import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  getGenerationPreviewBundleAvailability,
  type GenerationPreviewBundleAvailability,
} from "./generation-evolution-preview-boundary";
import {
  loadGeneratedWebsiteVersionThumbnail,
} from "./website-version-thumbnail-persistence";
import type { WebsiteVersionThumbnailArtifact } from "./website-version-thumbnail-contract";
import type { ComplianceCategory, GenerationContractComplianceStatus } from "./generation-contract-compliance-contract";
import type {
  GenerationEvolutionOverallAssessment,
  GenerationEvolutionRecommendedNextAction,
  GenerationEvolutionStatus,
} from "./generation-evolution-analysis-contract";

export type GenerationDashboardAttentionState =
  | "missing_generation_cycle_data"
  | "missing_iteration_artifact"
  | "missing_proposal_bundle"
  | "preview_unavailable"
  | "compliance_non_compliant"
  | "compliance_partial"
  | "improvement_available"
  | "evolution_improved"
  | "unresolved_knowledge_present"
  | "limitations_present"
  | "lineage_ambiguity";

export type GenerationArtifactLinkProjection = {
  label: string;
  kind: string;
  artifactId: string | null;
  canonicalId: string | null;
  status: string | null;
  href: string | null;
  referenceOnly: boolean;
  missing: boolean;
};

export type GenerationPreviewProjection = {
  iteration: number;
  available: boolean;
  route: string;
  sourceProposalReference: string;
  outputBundleId: string | null;
  bundleLabel: string | null;
  entryFile: "source/index.html";
  unavailableReason: string | null;
};

export type GenerationThumbnailProjection = {
  available: boolean;
  href: string | null;
  artifactId: string | null;
  sourceKind: "generated_proposal_thumbnail";
  sourceLineage: string[];
  unavailableReason: string | null;
};

export type GenerationComplianceSummaryProjection = {
  artifactId: string | null;
  complianceId: string | null;
  status: string | null;
  compliantCategoryCount: number;
  partialCategoryCount: number;
  nonCompliantCategoryCount: number;
  blockedCategoryCount: number;
  categoryCount: number;
  evidenceCount: number;
  limitationCount: number;
  recommendation: string | null;
};

export type GenerationEvolutionSummaryProjection = {
  artifactId: string | null;
  analysisId: string | null;
  status: GenerationEvolutionStatus | null;
  overallAssessment: GenerationEvolutionOverallAssessment | null;
  recommendedNextAction: GenerationEvolutionRecommendedNextAction | null;
  meaningfulImprovement: boolean;
  newlyCompliantCategories: ComplianceCategory[];
  improvedCategories: ComplianceCategory[];
  unresolvedCategories: ComplianceCategory[];
  noRegressions: boolean;
  regressionCount: number;
  limitations: string[];
};

export type GenerationIterationProjection = {
  iteration: number;
  label: string;
  generatedAt: string | null;
  status: string;
  generatedProposalStatus: string | null;
  observedWebsiteReadiness: string | null;
  compliance: GenerationComplianceSummaryProjection;
  preview: GenerationPreviewProjection;
  thumbnail: GenerationThumbnailProjection;
  artifacts: GenerationArtifactLinkProjection[];
  evolution: GenerationEvolutionSummaryProjection | null;
  attentionStates: GenerationDashboardAttentionState[];
};

export type GenerationCycleSummaryProjection = {
  websiteIdentity: string;
  projectIdentity: string;
  siteVersionId: string;
  dryRunId: string | null;
  generationCycleLabel: string;
  currentIteration: number;
  cycleState: string;
  overallTrajectory: string;
  latestComplianceStatus: string | null;
  latestEvolutionAssessment: string | null;
  latestRecommendation: string | null;
  businessConfidence: string;
  unresolvedKnowledgeSummary: string;
};

export type GenerationEvolutionDashboardProjection = {
  siteVersionId: string;
  dryRunId: string | null;
  cycle: GenerationCycleSummaryProjection;
  sharedBusinessArtifacts: GenerationArtifactLinkProjection[];
  iterations: GenerationIterationProjection[];
  evolution: GenerationEvolutionSummaryProjection | null;
  timeline: string[];
  artifactLineage: GenerationArtifactLinkProjection[];
  attentionStates: GenerationDashboardAttentionState[];
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

export type GenerationEvolutionDashboardProjectionOptions = RuntimeStoreDbOptions & {
  getSiteVersion?: SiteVersionLoader;
  getPreviewBundleAvailability?: (input: { siteVersionId: string; iteration: number }) => Promise<GenerationPreviewBundleAvailability | null>;
  loadGeneratedThumbnail?: typeof loadGeneratedWebsiteVersionThumbnail;
};

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

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function artifactBody(record: ProjectionRecord | null): Record<string, unknown> | null {
  return asRecord(record?.artifact) ?? null;
}

function artifactLink(input: {
  label: string;
  kind: string;
  record?: ProjectionRecord | null;
  canonicalIdKey?: string;
}): GenerationArtifactLinkProjection {
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

function latest(records: ProjectionRecord[]): ProjectionRecord | null {
  return records.slice().sort((left, right) =>
    text(left.persistedAt)?.localeCompare(text(right.persistedAt) ?? "") ||
    text(left.artifactId)?.localeCompare(text(right.artifactId) ?? "") ||
    0).at(-1) ?? null;
}

function findBy(records: ProjectionRecord[], key: string, value: unknown): ProjectionRecord | null {
  const wanted = text(value);
  if (!wanted) return null;
  return records.find((record) => text(record[key]) === wanted || text(artifactBody(record)?.[key]) === wanted) ?? null;
}

function findByArtifactId(records: ProjectionRecord[], artifactId: unknown): ProjectionRecord | null {
  return findBy(records, "artifactId", artifactId);
}

function summaryRecords(summary: RuntimeImportProvenanceSummary | null | undefined, key: string): ProjectionRecord[] {
  return asArray((summary as Record<string, unknown> | null | undefined)?.[key]);
}

function categoryCounts(record: ProjectionRecord | null): GenerationComplianceSummaryProjection {
  const artifact = artifactBody(record);
  const categories = Array.isArray(artifact?.categoryResults) ? artifact.categoryResults : [];
  const statuses = categories
    .map((category) => text(asRecord(category)?.status))
    .filter((status): status is string => status !== null);
  const compliantCategoryCount = statuses.filter((status) => status === "compliant").length;
  const partialCategoryCount = statuses.filter((status) => status === "partial" || status === "incomplete").length;
  const nonCompliantCategoryCount = statuses.filter((status) => status === "non_compliant").length;
  const blockedCategoryCount = statuses.filter((status) => status === "blocked").length;
  const reportRecommendation = text(asRecord(asRecord(record?.report)?.recommendation)?.recommendation);

  return {
    artifactId: text(record?.artifactId),
    complianceId: text(record?.generationContractComplianceId ?? artifact?.generationContractComplianceId),
    status: text(record?.status ?? artifact?.status),
    compliantCategoryCount,
    partialCategoryCount,
    nonCompliantCategoryCount,
    blockedCategoryCount,
    categoryCount: categories.length || numberValue(record?.categoryCount) || 0,
    evidenceCount: numberValue(record?.evidenceCount) ?? (Array.isArray(artifact?.evidence) ? artifact.evidence.length : 0),
    limitationCount: numberValue(record?.limitationCount) ?? (Array.isArray(artifact?.limitations) ? artifact.limitations.length : 0),
    recommendation: reportRecommendation,
  };
}

function evolutionSummary(record: ProjectionRecord | null): GenerationEvolutionSummaryProjection | null {
  if (!record) return null;
  const artifact = artifactBody(record);
  const categoryEvolution = Array.isArray(artifact?.categoryEvolution) ? artifact.categoryEvolution : [];
  const categoriesFor = (transitions: string[]) =>
    categoryEvolution
      .filter((item) => transitions.includes(text(asRecord(item)?.transition) ?? ""))
      .map((item) => text(asRecord(item)?.category))
      .filter((category): category is ComplianceCategory => category !== null);
  const regressions = Array.isArray(artifact?.regressions) ? artifact.regressions : [];
  const limitations = Array.isArray(artifact?.limitations)
    ? artifact.limitations.map((item) => String(item))
    : [];
  return {
    artifactId: text(record.artifactId),
    analysisId: text(record.generationEvolutionAnalysisId ?? artifact?.generationEvolutionAnalysisId),
    status: text(record.status ?? artifact?.status) as GenerationEvolutionStatus | null,
    overallAssessment: text(record.overallAssessment ?? artifact?.overallAssessment) as GenerationEvolutionOverallAssessment | null,
    recommendedNextAction: text(record.recommendedNextAction ?? artifact?.recommendedNextAction) as GenerationEvolutionRecommendedNextAction | null,
    meaningfulImprovement: text(record.overallAssessment ?? artifact?.overallAssessment) === "meaningful_improvement",
    newlyCompliantCategories: categoriesFor(["newly_compliant"]),
    improvedCategories: categoriesFor(["improved", "evidence_improved"]),
    unresolvedCategories: Array.isArray(artifact?.unresolvedAreas)
      ? artifact.unresolvedAreas.map((item) => String(item)).filter(Boolean) as ComplianceCategory[]
      : [],
    noRegressions: regressions.length === 0,
    regressionCount: regressions.length,
    limitations,
  };
}

function attentionForCompliance(compliance: GenerationComplianceSummaryProjection): GenerationDashboardAttentionState[] {
  if (compliance.status === "non_compliant") return ["compliance_non_compliant"];
  if (compliance.status === "partial" || compliance.status === "incomplete") return ["compliance_partial"];
  return [];
}

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions) {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function previewProjection(input: {
  siteVersionId: string;
  iteration: number;
  proposal: ProjectionRecord | null;
  getPreviewBundleAvailability: (input: { siteVersionId: string; iteration: number }) => Promise<GenerationPreviewBundleAvailability | null>;
}): Promise<GenerationPreviewProjection> {
  const availability = await input.getPreviewBundleAvailability({
    siteVersionId: input.siteVersionId,
    iteration: input.iteration,
  });
  return {
    iteration: input.iteration,
    available: availability?.available ?? false,
    route: `/gnr8/admin/evolution/${input.siteVersionId}/iterations/${input.iteration}/preview/`,
    sourceProposalReference: text(input.proposal?.artifactId) ?? "missing generated proposal",
    outputBundleId: text(input.proposal?.outputBundleId) ?? availability?.outputBundleId ?? null,
    bundleLabel: availability?.bundleLabel ?? null,
    entryFile: "source/index.html",
    unavailableReason: availability?.unavailableReason ?? (availability ? null : "No allowlisted proposal bundle exists for this iteration."),
  };
}

function thumbnailProjection(input: {
  siteVersionId: string;
  iteration: number;
  thumbnail: WebsiteVersionThumbnailArtifact | null;
  preview: GenerationPreviewProjection;
}): GenerationThumbnailProjection {
  if (input.thumbnail) {
    return {
      available: true,
      href: `/gnr8/admin/workspace/${input.siteVersionId}/thumbnails/iterations/${input.iteration}`,
      artifactId: input.thumbnail.artifactId,
      sourceKind: "generated_proposal_thumbnail",
      sourceLineage: [
        input.thumbnail.sourceArtifactId,
        input.thumbnail.generatedProposalBundleId ?? "",
        input.thumbnail.lineage.generatedProposalBundleSha256 ?? "",
      ].filter(Boolean),
      unavailableReason: null,
    };
  }
  return {
    available: false,
    href: null,
    artifactId: null,
    sourceKind: "generated_proposal_thumbnail",
    sourceLineage: [],
    unavailableReason: input.preview.available
      ? "Persisted generated thumbnail is unavailable; live durable preview remains available."
      : input.preview.unavailableReason ?? "Generated thumbnail and live preview are unavailable.",
  };
}

export async function loadGenerationEvolutionDashboardProjection(input: {
  siteVersionId: string;
  options?: GenerationEvolutionDashboardProjectionOptions;
}): Promise<GenerationEvolutionDashboardProjection> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  const summary = siteVersion?.importProvenanceSummary ?? null;
  const diagnostics: string[] = [];
  const attention = new Set<GenerationDashboardAttentionState>();

  if (!summary) {
    attention.add("missing_generation_cycle_data");
  }

  const proposals = summaryRecords(summary, "generatedWebsiteProposalArtifacts");
  const observations = summaryRecords(summary, "observedWebsiteModelArtifacts");
  const complianceRecords = summaryRecords(summary, "generationContractComplianceArtifacts");
  const complianceReports = summaryRecords(summary, "generationContractComplianceReportArtifacts");
  const improvementPlans = summaryRecords(summary, "generationImprovementPlanArtifacts");
  const providerPayloads = summaryRecords(summary, "providerGenerationPayloadArtifacts");
  const evolutionRecords = summaryRecords(summary, "generationEvolutionAnalysisArtifacts");

  const latestEvolution = latest(evolutionRecords);
  const evolution = evolutionSummary(latestEvolution);

  const iterationComplianceIds = [
    text(asRecord(artifactBody(latestEvolution)?.previousIteration)?.complianceArtifactId),
    text(asRecord(artifactBody(latestEvolution)?.currentIteration)?.complianceArtifactId),
  ];
  const iterationRecords = [1, 2].map((iteration, index) => {
    const compliance = findByArtifactId(complianceRecords, iterationComplianceIds[index]) ??
      complianceRecords.filter((record) => text(record.siteVersionId) === input.siteVersionId).at(index) ??
      null;
    const observed = findBy(observations, "observedWebsiteModelId", compliance?.sourceObservedWebsiteModelId) ??
      findBy(observations, "sourceObservedWebsiteModelId", compliance?.sourceObservedWebsiteModelId);
    const proposal = findBy(proposals, "generatedWebsiteProposalId", observed?.sourceGeneratedWebsiteProposalId) ??
      findByArtifactId(proposals, observed?.sourceGeneratedWebsiteProposalArtifactId) ??
      proposals.filter((record) => text(record.siteVersionId) === input.siteVersionId).at(index) ??
      null;
    const provider = findBy(providerPayloads, "providerGenerationPayloadId", proposal?.sourceProviderGenerationPayloadId) ??
      findByArtifactId(providerPayloads, proposal?.sourceProviderGenerationPayloadArtifactId);
    const report = complianceReports.find((record) =>
      text(record.sourceGenerationContractComplianceId) === text(compliance?.generationContractComplianceId)) ?? null;
    const plan = improvementPlans.find((record) =>
      text(record.sourceGenerationContractComplianceId) === text(compliance?.generationContractComplianceId)) ?? null;
    return { iteration, proposal, observed, compliance, provider, report, plan };
  });

  const assignedProposalIds = iterationRecords.map((record) => text(record.proposal?.artifactId)).filter(Boolean);
  if (new Set(assignedProposalIds).size !== assignedProposalIds.length) {
    attention.add("lineage_ambiguity");
    diagnostics.push("LINEAGE_AMBIGUITY: proposal artifacts could not be assigned uniquely to iterations.");
  }

  const getPreviewBundleAvailability = options.getPreviewBundleAvailability ??
    ((value: { siteVersionId: string; iteration: number }) => getGenerationPreviewBundleAvailability(value));
  const loadGeneratedThumbnail = options.loadGeneratedThumbnail ?? loadGeneratedWebsiteVersionThumbnail;

  const iterations: GenerationIterationProjection[] = [];
  for (const record of iterationRecords) {
    const compliance = categoryCounts(record.compliance);
    const preview = await previewProjection({
      siteVersionId: input.siteVersionId,
      iteration: record.iteration,
      proposal: record.proposal,
      getPreviewBundleAvailability,
    });
    const thumbnailArtifact = await loadGeneratedThumbnail({
      siteVersionId: input.siteVersionId,
      iteration: record.iteration,
      options,
    });
    const thumbnail = thumbnailProjection({
      siteVersionId: input.siteVersionId,
      iteration: record.iteration,
      thumbnail: thumbnailArtifact,
      preview,
    });
    const iterationAttention = new Set<GenerationDashboardAttentionState>(attentionForCompliance(compliance));
    if (!record.proposal || !record.observed || !record.compliance) iterationAttention.add("missing_iteration_artifact");
    if (!preview.available) iterationAttention.add("preview_unavailable");
    if (preview.unavailableReason) iterationAttention.add("missing_proposal_bundle");
    if (compliance.limitationCount > 0 || text(record.proposal?.limitationCount)) iterationAttention.add("limitations_present");
    for (const state of iterationAttention) attention.add(state);
    iterations.push({
      iteration: record.iteration,
      label: `Iteration ${record.iteration}`,
      generatedAt: text(record.proposal?.createdAt ?? artifactBody(record.proposal)?.createdAt),
      status: record.proposal && record.observed && record.compliance ? "complete" : "incomplete",
      generatedProposalStatus: text(record.proposal?.status),
      observedWebsiteReadiness: text(record.observed?.status),
      compliance,
      preview,
      thumbnail,
      artifacts: [
        artifactLink({ label: "Provider Payload", kind: "provider_generation_payload", record: record.provider, canonicalIdKey: "providerGenerationPayloadId" }),
        artifactLink({ label: "Generated Proposal", kind: "generated_website_proposal", record: record.proposal, canonicalIdKey: "generatedWebsiteProposalId" }),
        artifactLink({ label: "Observed Website Model", kind: "observed_website_model", record: record.observed, canonicalIdKey: "observedWebsiteModelId" }),
        artifactLink({ label: "Compliance", kind: "generation_contract_compliance", record: record.compliance, canonicalIdKey: "generationContractComplianceId" }),
        artifactLink({ label: "Compliance Report", kind: "generation_contract_compliance_report", record: record.report, canonicalIdKey: "generationContractComplianceReportId" }),
        artifactLink({ label: "Improvement Plan", kind: "generation_improvement_plan", record: record.plan, canonicalIdKey: "generationImprovementPlanId" }),
        ...(record.iteration === 2 ? [artifactLink({ label: "Evolution Analysis", kind: "generation_evolution_analysis", record: latestEvolution, canonicalIdKey: "generationEvolutionAnalysisId" })] : []),
      ],
      evolution: record.iteration === 2 ? evolution : null,
      attentionStates: [...iterationAttention],
    });
  }

  if (evolution?.meaningfulImprovement) attention.add("evolution_improved");
  if (evolution && evolution.improvedCategories.length + evolution.newlyCompliantCategories.length > 0) attention.add("improvement_available");
  if (evolution && evolution.unresolvedCategories.length > 0) attention.add("unresolved_knowledge_present");
  if (evolution && evolution.limitations.length > 0) attention.add("limitations_present");

  const latestCompliance = iterations.at(-1)?.compliance ?? null;
  const dryRunId = text(latestEvolution?.dryRunId) ?? text(iterationRecords.at(-1)?.proposal?.dryRunId) ?? null;
  const sharedBusinessArtifacts = [
    artifactLink({ label: "Business Discovery", kind: "business_discovery", record: latest(summaryRecords(summary, "businessDiscoveryArtifacts")), canonicalIdKey: "businessDiscoveryId" }),
    artifactLink({ label: "Digital Business Twin", kind: "digital_business_twin", record: latest(summaryRecords(summary, "digitalBusinessTwinArtifacts")), canonicalIdKey: "digitalBusinessTwinId" }),
    artifactLink({ label: "Business Understanding Report", kind: "business_understanding_report", record: latest(summaryRecords(summary, "businessUnderstandingReportArtifacts")), canonicalIdKey: "businessUnderstandingReportId" }),
    artifactLink({ label: "Business Alignment", kind: "business_alignment", record: latest(summaryRecords(summary, "businessAlignmentArtifacts")), canonicalIdKey: "businessAlignmentId" }),
    artifactLink({ label: "Website Design Brief", kind: "website_design_brief", record: latest(summaryRecords(summary, "websiteDesignBriefArtifacts")), canonicalIdKey: "websiteDesignBriefId" }),
    artifactLink({ label: "Website Generation Package", kind: "website_generation_package", record: latest(summaryRecords(summary, "websiteGenerationPackageArtifacts")), canonicalIdKey: "websiteGenerationPackageId" }),
  ];

  const cycle: GenerationCycleSummaryProjection = {
    websiteIdentity: siteVersion?.siteId ? `site ${siteVersion.siteId}` : "ODV",
    projectIdentity: "ODV",
    siteVersionId: input.siteVersionId,
    dryRunId,
    generationCycleLabel: "ODV Generation Cycle",
    currentIteration: iterations.length > 0 ? Math.max(...iterations.map((iteration) => iteration.iteration)) : 0,
    cycleState: latestEvolution ? "improving" : summary ? "active" : "missing",
    overallTrajectory: evolution?.status ?? "insufficient_evidence",
    latestComplianceStatus: latestCompliance?.status ?? null,
    latestEvolutionAssessment: evolution?.overallAssessment ?? null,
    latestRecommendation: evolution?.recommendedNextAction ?? latestCompliance?.recommendation ?? null,
    businessConfidence: evolution?.status ? `${artifactBody(latestEvolution)?.confidence ? text(asRecord(artifactBody(latestEvolution)?.confidence)?.level) ?? "traceable" : "traceable"} from persisted artifacts` : "not available",
    unresolvedKnowledgeSummary: evolution?.unresolvedCategories.length
      ? `${evolution.unresolvedCategories.length} unresolved categories: ${evolution.unresolvedCategories.join(", ")}`
      : "No unresolved categories reported by the latest Evolution Analysis.",
  };

  return cloneJson({
    siteVersionId: input.siteVersionId,
    dryRunId,
    cycle,
    sharedBusinessArtifacts,
    iterations,
    evolution,
    timeline: [
      "Business Foundation",
      "Iteration 1",
      "Compliance v1",
      "Improvement Plan",
      "Iteration 2",
      "Compliance v2",
      "Evolution Analysis",
    ],
    artifactLineage: [
      ...sharedBusinessArtifacts,
      ...iterations.flatMap((iteration) => iteration.artifacts),
    ],
    attentionStates: [...attention],
    diagnostics,
  });
}
