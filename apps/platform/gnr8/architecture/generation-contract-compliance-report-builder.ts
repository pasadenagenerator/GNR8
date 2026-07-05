/**
 * Phase MVP-1K-5 deterministic Generation Contract Compliance Report builder.
 *
 * Consumes only a GenerationContractComplianceArtifact and explains the
 * persisted compliance result. It does not recompute compliance, decide
 * approval, grant publishing permission, call providers, execute AI, add
 * API/UI/worker behavior, or mutate runtime state.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  validateGenerationContractCompliance,
  type ComplianceCategory,
  type ComplianceCategoryResult,
  type ComplianceDeviation,
  type ComplianceFinding,
  type ComplianceLimitation,
  type GenerationContractComplianceArtifact,
  type GenerationContractComplianceStatus,
  type ComplianceValidationResult,
} from "./generation-contract-compliance-contract";
import {
  GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION,
  validateGenerationContractComplianceReport,
  type GenerationContractComplianceReportArtifact,
  type GenerationContractComplianceReportBusinessRisk,
  type GenerationContractComplianceReportCategoryResult,
  type GenerationContractComplianceReportDeviation,
  type GenerationContractComplianceReportItem,
  type GenerationContractComplianceReportItemStatus,
  type GenerationContractComplianceReportMissingRequirement,
  type GenerationContractComplianceReportOverallCompliance,
  type GenerationContractComplianceReportReadiness,
  type GenerationContractComplianceReportRecommendation,
  type GenerationContractComplianceReportRecommendationKind,
  type GenerationContractComplianceReportSection,
  type GenerationContractComplianceReportSectionKind,
  type GenerationContractComplianceReportStatus,
} from "./generation-contract-compliance-report-contract";

export const GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION = "MVP-1K-5" as const;

export type GenerationContractComplianceReportBuildInput = {
  generationContractCompliance: GenerationContractComplianceArtifact;
  createdAt?: string;
};

export class GenerationContractComplianceReportBuildValidationError extends Error {
  readonly validation: ComplianceValidationResult;

  constructor(validation: ComplianceValidationResult) {
    super("Generation Contract Compliance Report build input is invalid.");
    this.name = "GenerationContractComplianceReportBuildValidationError";
    this.validation = validation;
  }
}

const BUSINESS_CATEGORIES = new Set<ComplianceCategory>([
  "objectives_represented",
  "message_coverage",
  "trust_signal_presence",
  "constraints_preserved",
]);

const EXPERIENCE_CATEGORIES = new Set<ComplianceCategory>([
  "navigation_obligations",
  "page_obligations",
  "section_obligations",
  "message_coverage",
  "accessibility_expectations_observable",
  "seo_expectations_observable",
]);

const IMPLEMENTATION_CATEGORIES = new Set<ComplianceCategory>([
  "asset_presence",
  "constraints_preserved",
  "accessibility_expectations_observable",
  "seo_expectations_observable",
]);

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function itemHash(input: unknown): string {
  return sha256Hex(stableStringify(input)).slice(0, 24);
}

function reportId(compliance: GenerationContractComplianceArtifact): string {
  return `generation-contract-compliance-report:${sha256Hex(stableStringify({
    sourceGenerationContractComplianceId: compliance.generationContractComplianceId,
    sourceGenerationContractComplianceStatus: compliance.status,
    contractVersion: GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function sectionId(kind: GenerationContractComplianceReportSectionKind, sourceId: string): string {
  return `gcc-report-section:${kind}:${itemHash(sourceId)}`;
}

function riskId(input: unknown): string {
  return `gcc-report-risk:${itemHash(input)}`;
}

function reportStatus(sourceStatus: GenerationContractComplianceStatus): GenerationContractComplianceReportStatus {
  if (sourceStatus === "invalid") return "invalid";
  if (sourceStatus === "stale") return "stale";
  if (sourceStatus === "blocked" || sourceStatus === "non_compliant") return "blocked";
  if (sourceStatus === "partial" || sourceStatus === "incomplete") return "partial";
  return "ready";
}

function itemStatus(sourceStatus: GenerationContractComplianceStatus): GenerationContractComplianceReportItemStatus {
  if (sourceStatus === "compliant") return "pass";
  if (sourceStatus === "partial" || sourceStatus === "incomplete") return "partial";
  if (sourceStatus === "non_compliant") return "fail";
  if (sourceStatus === "blocked") return "blocked";
  if (sourceStatus === "invalid" || sourceStatus === "stale") return "not_observable";
  return "info";
}

function countFindings(findings: ComplianceFinding[], result: ComplianceFinding["result"]): number {
  return findings.filter((finding) => finding.result === result).length;
}

function categoryStatusCounts(categoryResults: ComplianceCategoryResult[]): Record<GenerationContractComplianceStatus, number> {
  return {
    incomplete: categoryResults.filter((item) => item.status === "incomplete").length,
    partial: categoryResults.filter((item) => item.status === "partial").length,
    compliant: categoryResults.filter((item) => item.status === "compliant").length,
    non_compliant: categoryResults.filter((item) => item.status === "non_compliant").length,
    blocked: categoryResults.filter((item) => item.status === "blocked").length,
    invalid: categoryResults.filter((item) => item.status === "invalid").length,
    stale: categoryResults.filter((item) => item.status === "stale").length,
  };
}

function categoryLabel(category: ComplianceCategory): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categorySummary(result: ComplianceCategoryResult): string {
  if (result.status === "compliant") {
    return `${categoryLabel(result.category)} is represented as compliant in the persisted compliance artifact.`;
  }
  if (result.status === "non_compliant") {
    return `${categoryLabel(result.category)} has deviations in the persisted compliance artifact.`;
  }
  if (result.status === "partial" || result.status === "incomplete") {
    return `${categoryLabel(result.category)} has partial or incomplete observable evidence.`;
  }
  if (result.status === "blocked") {
    return `${categoryLabel(result.category)} is blocked by source compliance conditions.`;
  }
  return `${categoryLabel(result.category)} is ${result.status} in the persisted compliance artifact.`;
}

function evidenceIdsForFindings(
  category: ComplianceCategory,
  findings: ComplianceFinding[],
): string[] {
  return uniqueSorted(findings
    .filter((finding) => finding.category === category)
    .flatMap((finding) => finding.evidenceIds));
}

function toCategoryResults(
  compliance: GenerationContractComplianceArtifact,
): GenerationContractComplianceReportCategoryResult[] {
  return compliance.categoryResults.map((result) => ({
    category: result.category,
    sourceStatus: result.status,
    reportItemStatus: itemStatus(result.status),
    sourceRequirementIds: [...result.sourceRequirementIds].sort(),
    findingIds: [...result.findingIds].sort(),
    deviationIds: [...result.deviationIds].sort(),
    limitationIds: [...result.limitationIds].sort(),
    evidenceIds: evidenceIdsForFindings(result.category, compliance.findings),
    summary: categorySummary(result),
    diagnostics: uniqueSorted([
      ...result.diagnostics,
      `GCCR_CATEGORY_SOURCE_STATUS:${result.status}`,
    ]),
  }));
}

function deviationImpact(deviation: ComplianceDeviation): string {
  if (deviation.category === "constraints_preserved") {
    return "A required generation constraint appears violated, which can block approval until regenerated or explicitly reviewed.";
  }
  if (deviation.category === "objectives_represented" || deviation.category === "message_coverage") {
    return "A required business meaning or message is not fully represented, which can change stakeholder understanding.";
  }
  if (deviation.category === "navigation_obligations" || deviation.category === "page_obligations" || deviation.category === "section_obligations") {
    return "A required experience path is missing or incomplete, which can prevent users from reaching intended content.";
  }
  if (deviation.category === "trust_signal_presence") {
    return "A required trust signal is absent or incomplete, which can weaken business credibility.";
  }
  return "The generated result diverges from the persisted generation contract and requires review before approval.";
}

function toReportDeviation(deviation: ComplianceDeviation): GenerationContractComplianceReportDeviation {
  return {
    deviationId: deviation.deviationId,
    category: deviation.category,
    sourceRequirementId: deviation.sourceRequirementId,
    severity: deviation.severity,
    description: deviation.description,
    businessImpact: deviationImpact(deviation),
    evidenceIds: [...deviation.evidenceIds].sort(),
    diagnostics: [`GCCR_DEVIATION_FROM_PERSISTED_COMPLIANCE:${deviation.deviationId}`],
  };
}

function missingRequirements(findings: ComplianceFinding[]): GenerationContractComplianceReportMissingRequirement[] {
  return findings
    .filter((finding): finding is ComplianceFinding & { result: "partial" | "deviation" } =>
      finding.result === "partial" || finding.result === "deviation")
    .map((finding) => ({
      requirementId: finding.sourceRequirementId,
      category: finding.category,
      findingId: finding.findingId,
      result: finding.result,
      summary: finding.statement,
      evidenceIds: [...finding.evidenceIds].sort(),
      diagnostics: uniqueSorted([
        ...finding.diagnostics,
        `GCCR_MISSING_OR_INCOMPLETE_REQUIREMENT:${finding.sourceRequirementId}`,
      ]),
    }))
    .sort((left, right) =>
      left.category.localeCompare(right.category) ||
      left.requirementId.localeCompare(right.requirementId) ||
      left.findingId.localeCompare(right.findingId));
}

function riskSeverity(input: ComplianceDeviation | ComplianceLimitation): GenerationContractComplianceReportBusinessRisk["severity"] {
  if ("severity" in input && input.severity === "required") return "high";
  if ("severity" in input && input.severity === "blocked") return "blocked";
  if ("severity" in input && input.severity === "warning") return "medium";
  if ("severity" in input && input.severity === "recommended") return "medium";
  return "low";
}

function businessRisks(
  deviations: ComplianceDeviation[],
  limitations: ComplianceLimitation[],
): GenerationContractComplianceReportBusinessRisk[] {
  return [
    ...deviations.map((deviation) => ({
      riskId: riskId({ kind: "deviation", deviationId: deviation.deviationId }),
      category: deviation.category,
      severity: riskSeverity(deviation),
      summary: deviationImpact(deviation),
      sourceIds: [deviation.deviationId, deviation.sourceRequirementId],
      evidenceIds: [...deviation.evidenceIds].sort(),
    })),
    ...limitations
      .filter((limitation) => limitation.severity !== "info")
      .map((limitation) => ({
        riskId: riskId({ kind: "limitation", limitationId: limitation.limitationId }),
        category: limitation.category,
        severity: riskSeverity(limitation),
        summary: limitation.message,
        sourceIds: uniqueSorted([limitation.limitationId, limitation.sourceRequirementId ?? ""]),
        evidenceIds: [],
      })),
  ].sort((left, right) => left.riskId.localeCompare(right.riskId));
}

function recommendationKind(compliance: GenerationContractComplianceArtifact): GenerationContractComplianceReportRecommendationKind {
  if (compliance.status === "compliant" && compliance.limitations.length === 0 && compliance.deviations.length === 0) {
    return "proceed_to_approval";
  }
  if (compliance.status === "stale") return "repeat_business_alignment";
  if (compliance.status === "partial" || compliance.status === "incomplete" || compliance.status === "blocked" || compliance.status === "invalid") {
    return "insufficient_evidence";
  }
  if (compliance.status === "non_compliant") {
    const hasRequiredDeviation = compliance.deviations.some((deviation) => deviation.severity === "required");
    return hasRequiredDeviation ? "regenerate" : "human_review_required";
  }
  return "human_review_required";
}

function recommendationRationale(
  recommendation: GenerationContractComplianceReportRecommendationKind,
  compliance: GenerationContractComplianceArtifact,
): string {
  if (recommendation === "proceed_to_approval") {
    return "The persisted compliance artifact is compliant, has no deviations, and has no reportable limitations.";
  }
  if (recommendation === "regenerate") {
    return "The persisted compliance artifact contains required deviations that block approval readiness and point to regeneration.";
  }
  if (recommendation === "improve_wgp") {
    return "The persisted compliance artifact indicates the generation contract needs clearer or stronger requirements before another review.";
  }
  if (recommendation === "repeat_business_alignment") {
    return "The persisted compliance artifact is stale, so upstream business understanding or alignment must be refreshed before approval review.";
  }
  if (recommendation === "insufficient_evidence") {
    return "The persisted compliance artifact is not complete enough to support approval readiness without more evidence or an unblocked evaluation.";
  }
  return `The persisted compliance status is ${compliance.status}, and deterministic reporting cannot decide business acceptability.`;
}

function recommendation(compliance: GenerationContractComplianceArtifact): GenerationContractComplianceReportRecommendation {
  const value = recommendationKind(compliance);
  return {
    recommendation: value,
    rationale: recommendationRationale(value, compliance),
    sourceComplianceStatus: compliance.status,
    relatedDeviationIds: compliance.deviations.map((deviation) => deviation.deviationId).sort(),
    relatedLimitationIds: compliance.limitations.map((limitation) => limitation.limitationId).sort(),
    diagnostics: uniqueSorted([
      `GCCR_RECOMMENDATION:${value}`,
      "GCCR_RECOMMENDATION_IS_NOT_APPROVAL",
      "GCCR_RECOMMENDATION_GRANTS_NO_PUBLISHING_PERMISSION",
    ]),
  };
}

function readiness(compliance: GenerationContractComplianceArtifact): GenerationContractComplianceReportReadiness {
  const blockers = uniqueSorted([
    ...compliance.deviations
      .filter((deviation) => deviation.severity === "required")
      .map((deviation) => deviation.description),
    ...compliance.limitations
      .filter((limitation) => limitation.severity === "blocked")
      .map((limitation) => limitation.message),
  ]);
  if (compliance.status === "compliant" && compliance.limitations.length === 0 && blockers.length === 0) {
    return {
      status: "ready",
      rationale: "The persisted compliance artifact supports human approval review with no known compliance blocker.",
      blockers: [],
      deviationIds: [],
      limitationIds: [],
      diagnostics: ["GCCR_READINESS_READY"],
    };
  }
  if (compliance.status === "compliant" || compliance.status === "partial" || compliance.status === "incomplete") {
    return {
      status: "ready_with_limitations",
      rationale: "The report can be reviewed, but limitations or partial evidence must remain visible to the human reviewer.",
      blockers,
      deviationIds: compliance.deviations.map((deviation) => deviation.deviationId).sort(),
      limitationIds: compliance.limitations.map((limitation) => limitation.limitationId).sort(),
      diagnostics: ["GCCR_READINESS_READY_WITH_LIMITATIONS"],
    };
  }
  if (compliance.status === "stale") {
    return {
      status: "requires_alignment",
      rationale: "The source compliance artifact is stale and cannot support approval review until upstream alignment is refreshed.",
      blockers: ["Source compliance artifact is stale."],
      deviationIds: compliance.deviations.map((deviation) => deviation.deviationId).sort(),
      limitationIds: compliance.limitations.map((limitation) => limitation.limitationId).sort(),
      diagnostics: ["GCCR_READINESS_REQUIRES_ALIGNMENT"],
    };
  }
  if (compliance.status === "non_compliant") {
    return {
      status: "requires_regeneration",
      rationale: "The persisted compliance artifact contains deviations that prevent approval readiness.",
      blockers,
      deviationIds: compliance.deviations.map((deviation) => deviation.deviationId).sort(),
      limitationIds: compliance.limitations.map((limitation) => limitation.limitationId).sort(),
      diagnostics: ["GCCR_READINESS_REQUIRES_REGENERATION"],
    };
  }
  return {
    status: "blocked",
    rationale: "The persisted compliance artifact is blocked or invalid, so the report cannot support approval readiness.",
    blockers: blockers.length > 0 ? blockers : [`Source compliance status is ${compliance.status}.`],
    deviationIds: compliance.deviations.map((deviation) => deviation.deviationId).sort(),
    limitationIds: compliance.limitations.map((limitation) => limitation.limitationId).sort(),
    diagnostics: ["GCCR_READINESS_BLOCKED"],
  };
}

function overallCompliance(
  compliance: GenerationContractComplianceArtifact,
  status: GenerationContractComplianceReportStatus,
): GenerationContractComplianceReportOverallCompliance {
  return {
    sourceComplianceStatus: compliance.status,
    reportStatus: status,
    fulfilledFindingCount: countFindings(compliance.findings, "fulfilled"),
    partialFindingCount: countFindings(compliance.findings, "partial"),
    deviationFindingCount: countFindings(compliance.findings, "deviation"),
    deviationCount: compliance.deviations.length,
    limitationCount: compliance.limitations.length,
    evidenceCount: compliance.evidence.length,
    categoryStatusCounts: categoryStatusCounts(compliance.categoryResults),
    summary: `Persisted compliance status is ${compliance.status}; report status is ${status}.`,
  };
}

function sectionStatus(results: ComplianceCategoryResult[], fallback: GenerationContractComplianceReportStatus): GenerationContractComplianceReportStatus {
  if (results.some((result) => result.status === "invalid")) return "invalid";
  if (results.some((result) => result.status === "stale")) return "stale";
  if (results.some((result) => result.status === "blocked" || result.status === "non_compliant")) return "blocked";
  if (results.some((result) => result.status === "partial" || result.status === "incomplete")) return "partial";
  if (results.length > 0) return "ready";
  return fallback;
}

function resultItems(results: ComplianceCategoryResult[], findings: ComplianceFinding[]): GenerationContractComplianceReportItem[] {
  return results.map((result) => ({
    itemId: `gcc-report-item:${result.category}:${itemHash(result)}`,
    label: categoryLabel(result.category),
    status: itemStatus(result.status),
    summary: categorySummary(result),
    sourceIds: [...result.sourceRequirementIds].sort(),
    evidenceIds: evidenceIdsForFindings(result.category, findings),
    diagnostics: uniqueSorted([
      ...result.diagnostics,
      `GCCR_SECTION_ITEM_SOURCE_STATUS:${result.status}`,
    ]),
  }));
}

function section(input: {
  kind: GenerationContractComplianceReportSectionKind;
  title: string;
  status: GenerationContractComplianceReportStatus;
  summary: string;
  items: GenerationContractComplianceReportItem[];
  sourceId: string;
  diagnostics?: string[];
}): GenerationContractComplianceReportSection {
  return {
    sectionId: sectionId(input.kind, input.sourceId),
    kind: input.kind,
    title: input.title,
    status: input.status,
    summary: input.summary,
    items: input.items,
    diagnostics: uniqueSorted(input.diagnostics ?? []),
  };
}

function groupedSection(input: {
  compliance: GenerationContractComplianceArtifact;
  categories: Set<ComplianceCategory>;
  kind: GenerationContractComplianceReportSectionKind;
  title: string;
  summary: string;
  fallbackStatus: GenerationContractComplianceReportStatus;
}): GenerationContractComplianceReportSection {
  const results = input.compliance.categoryResults.filter((result) => input.categories.has(result.category));
  return section({
    kind: input.kind,
    title: input.title,
    status: sectionStatus(results, input.fallbackStatus),
    summary: input.summary,
    items: resultItems(results, input.compliance.findings),
    sourceId: `${input.compliance.generationContractComplianceId}:${input.kind}`,
    diagnostics: [`GCCR_SECTION_FROM_PERSISTED_COMPLIANCE:${input.kind}`],
  });
}

function limitationsSection(
  compliance: GenerationContractComplianceArtifact,
  status: GenerationContractComplianceReportStatus,
): GenerationContractComplianceReportSection {
  return section({
    kind: "limitations",
    title: "Limitations",
    status: compliance.limitations.length > 0 ? "partial" : status,
    summary: compliance.limitations.length > 0
      ? "The report preserves limitations from the persisted compliance artifact."
      : "No limitations were recorded in the persisted compliance artifact.",
    items: compliance.limitations.map((limitation) => ({
      itemId: `gcc-report-limitation:${limitation.limitationId}`,
      label: categoryLabel(limitation.category),
      status: limitation.severity === "blocked" ? "blocked" : limitation.severity === "warning" ? "partial" : "info",
      summary: limitation.message,
      sourceIds: uniqueSorted([limitation.limitationId, limitation.sourceRequirementId ?? ""]),
      evidenceIds: [],
      diagnostics: [`GCCR_LIMITATION_FROM_PERSISTED_COMPLIANCE:${limitation.limitationId}`],
    })),
    sourceId: `${compliance.generationContractComplianceId}:limitations`,
    diagnostics: ["GCCR_LIMITATIONS_FROM_PERSISTED_COMPLIANCE"],
  });
}

export function buildGenerationContractComplianceReport(
  input: GenerationContractComplianceReportBuildInput,
): GenerationContractComplianceReportArtifact {
  const sourceValidation = validateGenerationContractCompliance(input.generationContractCompliance);
  if (!sourceValidation.valid) throw new GenerationContractComplianceReportBuildValidationError(sourceValidation);

  const compliance = input.generationContractCompliance;
  const createdAt = input.createdAt ?? compliance.createdAt;
  const status = reportStatus(compliance.status);
  const categories = toCategoryResults(compliance);
  const deviations = compliance.deviations.map(toReportDeviation).sort((left, right) =>
    left.category.localeCompare(right.category) ||
    left.deviationId.localeCompare(right.deviationId));
  const missing = missingRequirements(compliance.findings);
  const constraintViolations = deviations.filter((deviation) => deviation.category === "constraints_preserved");
  const risks = businessRisks(compliance.deviations, compliance.limitations);
  const recommended = recommendation(compliance);
  const ready = readiness(compliance);
  const evidenceIds = compliance.evidence.map((evidence) => evidence.complianceEvidenceId).sort();
  const observedEvidenceRefIds = uniqueSorted(compliance.evidence.flatMap((evidence) => evidence.observedEvidenceRefIds));

  const artifact: GenerationContractComplianceReportArtifact = {
    generationContractComplianceReportId: reportId(compliance),
    status,
    siteVersionId: compliance.siteVersionId,
    dryRunId: compliance.dryRunId,
    sourceGenerationContractComplianceId: compliance.generationContractComplianceId,
    sourceWebsiteGenerationPackageId: compliance.sourceWebsiteGenerationPackageId,
    sourceObservedWebsiteModelId: compliance.sourceObservedWebsiteModelId,
    createdAt,
    contractVersion: GENERATION_CONTRACT_COMPLIANCE_REPORT_CONTRACT_VERSION,
    executiveSummary: section({
      kind: "executive_summary",
      title: "Executive Summary",
      status,
      summary: `${recommended.recommendation} because ${recommended.rationale}`,
      items: [{
        itemId: `gcc-report-executive:${itemHash(compliance.generationContractComplianceId)}`,
        label: "Compliance outcome",
        status: itemStatus(compliance.status),
        summary: `Source compliance status is ${compliance.status}; generation readiness is ${ready.status}.`,
        sourceIds: [compliance.generationContractComplianceId],
        evidenceIds,
        diagnostics: ["GCCR_EXECUTIVE_SUMMARY_FROM_SOURCE_COMPLIANCE"],
      }],
      sourceId: `${compliance.generationContractComplianceId}:executive_summary`,
      diagnostics: ["GCCR_EXECUTIVE_SUMMARY_DETERMINISTIC"],
    }),
    overallCompliance: overallCompliance(compliance, status),
    businessCompliance: groupedSection({
      compliance,
      categories: BUSINESS_CATEGORIES,
      kind: "business_compliance",
      title: "Business Compliance",
      summary: "Business compliance explains objectives, messages, trust signals, and business-sensitive constraints from the persisted compliance artifact.",
      fallbackStatus: status,
    }),
    experienceCompliance: groupedSection({
      compliance,
      categories: EXPERIENCE_CATEGORIES,
      kind: "experience_compliance",
      title: "Experience Compliance",
      summary: "Experience compliance explains navigation, page, section, message, accessibility, and SEO outcomes from the persisted compliance artifact.",
      fallbackStatus: status,
    }),
    implementationObservability: groupedSection({
      compliance,
      categories: IMPLEMENTATION_CATEGORIES,
      kind: "implementation_observability",
      title: "Implementation Observability",
      summary: "Implementation observability explains observable assets, constraints, and technical expectations without grading provider craft or code style.",
      fallbackStatus: status,
    }),
    categoryResults: categories,
    deviations,
    missingRequirements: missing,
    constraintViolations,
    businessRisks: risks,
    recommendation: recommended,
    generationReadiness: ready,
    limitations: limitationsSection(compliance, status),
    evidenceSummary: {
      evidenceCount: compliance.evidence.length,
      evidenceIds,
      observedEvidenceRefIds,
      summary: `${compliance.evidence.length} compliance evidence records and ${observedEvidenceRefIds.length} observed evidence references support this report.`,
    },
    lineage: {
      siteVersionId: compliance.siteVersionId,
      dryRunId: compliance.dryRunId,
      sourceGenerationContractComplianceId: compliance.generationContractComplianceId,
      sourceGenerationContractComplianceStatus: compliance.status,
      sourceGenerationContractComplianceContractVersion: compliance.contractVersion,
      sourceWebsiteGenerationPackageId: compliance.sourceWebsiteGenerationPackageId,
      sourceObservedWebsiteModelId: compliance.sourceObservedWebsiteModelId,
      upstreamArtifactRefIds: compliance.lineage.upstreamArtifactRefs.map((ref) => ref.observedEvidenceId).sort(),
    },
    diagnostics: uniqueSorted([
      `GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION:${GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_VERSION}`,
      `GENERATION_CONTRACT_COMPLIANCE_REPORT_STATUS:${status}`,
      "GENERATION_CONTRACT_COMPLIANCE_REPORT_SOURCE_ONLY",
      "GENERATION_CONTRACT_COMPLIANCE_REPORT_NO_COMPLIANCE_RECOMPUTATION",
      "GENERATION_CONTRACT_COMPLIANCE_REPORT_NO_APPROVAL_DECISION",
      "GENERATION_CONTRACT_COMPLIANCE_REPORT_NO_PUBLISHING_PERMISSION",
      "GENERATION_CONTRACT_COMPLIANCE_REPORT_NO_PROVIDER_OR_AI_EXECUTION",
      "GENERATION_CONTRACT_COMPLIANCE_REPORT_NO_UI_API_SCHEMA_OR_WORKERS",
    ]),
  };

  const validation = validateGenerationContractComplianceReport({
    artifact,
    sourceGenerationContractCompliance: compliance,
  });
  if (!validation.valid) {
    throw new GenerationContractComplianceReportBuildValidationError({
      valid: false,
      errors: validation.errors,
      warnings: validation.warnings,
    });
  }
  return cloneJson(artifact);
}
