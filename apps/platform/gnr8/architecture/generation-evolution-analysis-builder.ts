/**
 * Phase MVP-2.0-M deterministic Generation Evolution Analysis builder.
 *
 * Compares only two stored GenerationContractComplianceArtifact records. It
 * does not recompute compliance, inspect website output, create reports or
 * improvement plans, call providers, execute AI, regenerate, approve, publish,
 * deploy, mutate DNS/production/runtime state, or update canonical truth.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  COMPLIANCE_CATEGORIES,
  validateGenerationContractCompliance,
  type ComplianceCategory,
  type ComplianceCategoryResult,
  type GenerationContractComplianceArtifact,
  type GenerationContractComplianceStatus,
} from "./generation-contract-compliance-contract";
import type { GenerationImprovementPlanArtifact } from "./generation-improvement-plan-contract";
import {
  GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION,
  validateGenerationEvolutionAnalysis,
  type GenerationCategoryEvolution,
  type GenerationCategoryEvolutionTransition,
  type GenerationEvolutionAnalysisArtifact,
  type GenerationEvolutionConfidence,
  type GenerationEvolutionOverallAssessment,
  type GenerationEvolutionRecommendedNextAction,
  type GenerationEvolutionStatus,
  type GenerationEvolutionValidationResult,
  type GenerationImprovementOutcome,
  type GenerationMetricDelta,
  type GenerationRegression,
} from "./generation-evolution-analysis-contract";

export const GENERATION_EVOLUTION_ANALYSIS_RUNTIME_VERSION = "MVP-2.0-M" as const;

export type GenerationEvolutionAnalysisBuildInput = {
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  previousCompliance: GenerationContractComplianceArtifact;
  currentCompliance: GenerationContractComplianceArtifact;
  previousIteration?: number;
  currentIteration?: number;
  generationImprovementPlan?: GenerationImprovementPlanArtifact;
  generationImprovementPlanArtifactId?: string;
  createdAt?: string;
};

export class GenerationEvolutionAnalysisBuildValidationError extends Error {
  readonly validation: GenerationEvolutionValidationResult;

  constructor(validation: GenerationEvolutionValidationResult) {
    super("Generation Evolution Analysis build input is invalid.");
    this.name = "GenerationEvolutionAnalysisBuildValidationError";
    this.validation = validation;
  }
}

type BuildInputValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

type CategoryEvidence = {
  category: ComplianceCategory;
  result: ComplianceCategoryResult;
  evidenceIds: string[];
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function itemHash(input: unknown): string {
  return sha256Hex(stableStringify(input)).slice(0, 24);
}

function analysisId(input: {
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  previousCompliance: GenerationContractComplianceArtifact;
  currentCompliance: GenerationContractComplianceArtifact;
  previousIteration: number;
  currentIteration: number;
}): string {
  return `generation-evolution-analysis:${sha256Hex(stableStringify({
    previousComplianceArtifactId: input.previousComplianceArtifactId,
    currentComplianceArtifactId: input.currentComplianceArtifactId,
    previousGenerationContractComplianceId: input.previousCompliance.generationContractComplianceId,
    currentGenerationContractComplianceId: input.currentCompliance.generationContractComplianceId,
    sourceWebsiteGenerationPackageId: input.currentCompliance.sourceWebsiteGenerationPackageId,
    previousIteration: input.previousIteration,
    currentIteration: input.currentIteration,
    contractVersion: GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function regressionId(input: unknown): string {
  return `generation-evolution-regression:${itemHash(input)}`;
}

function categoryEvidence(artifact: GenerationContractComplianceArtifact, category: ComplianceCategory): CategoryEvidence {
  const result = artifact.categoryResults.find((candidate) => candidate.category === category);
  if (!result) {
    throw new Error(`Source compliance artifact is missing canonical category ${category}`);
  }
  const findingEvidenceIds = artifact.findings
    .filter((finding) => finding.category === category)
    .flatMap((finding) => finding.evidenceIds);
  const deviationEvidenceIds = artifact.deviations
    .filter((deviation) => deviation.category === category)
    .flatMap((deviation) => deviation.evidenceIds);
  const directEvidenceIds = artifact.evidence
    .filter((evidence) => evidence.category === category)
    .map((evidence) => evidence.complianceEvidenceId);
  return {
    category,
    result,
    evidenceIds: uniqueSorted([...findingEvidenceIds, ...deviationEvidenceIds, ...directEvidenceIds]),
  };
}

function statusRank(status: GenerationContractComplianceStatus): number | null {
  if (status === "compliant") return 3;
  if (status === "partial") return 2;
  if (status === "non_compliant") return 1;
  return null;
}

function confidenceRank(level: GenerationContractComplianceArtifact["confidence"]["level"]): number {
  if (level === "HIGH") return 3;
  if (level === "MEDIUM") return 2;
  return 1;
}

function classifyCategory(input: {
  previous: CategoryEvidence;
  current: CategoryEvidence;
}): GenerationCategoryEvolutionTransition {
  const previousStatus = input.previous.result.status;
  const currentStatus = input.current.result.status;
  const previousRank = statusRank(previousStatus);
  const currentRank = statusRank(currentStatus);
  if (previousRank === null || currentRank === null) return "not_comparable";
  if (previousStatus !== "compliant" && currentStatus === "compliant") return "newly_compliant";
  if (previousStatus === "compliant" && currentStatus !== "compliant") return "newly_non_compliant";
  if (currentRank > previousRank) return "improved";
  if (currentRank < previousRank) return "regressed";

  const deviationDelta = input.current.result.deviationIds.length - input.previous.result.deviationIds.length;
  const limitationDelta = input.current.result.limitationIds.length - input.previous.result.limitationIds.length;
  const evidenceDelta = input.current.evidenceIds.length - input.previous.evidenceIds.length;
  if ((deviationDelta < 0 || limitationDelta < 0 || evidenceDelta > 0) &&
    deviationDelta <= 0 &&
    limitationDelta <= 0) {
    return "evidence_improved";
  }
  if (currentStatus === "partial") return "still_partial";
  if (currentStatus === "non_compliant") return "still_non_compliant";
  return "unchanged";
}

function categoryEvolution(input: {
  previousCompliance: GenerationContractComplianceArtifact;
  currentCompliance: GenerationContractComplianceArtifact;
}): GenerationCategoryEvolution[] {
  return COMPLIANCE_CATEGORIES.map((category) => {
    const previous = categoryEvidence(input.previousCompliance, category);
    const current = categoryEvidence(input.currentCompliance, category);
    const transition = classifyCategory({ previous, current });
    return {
      category,
      transition,
      previousStatus: previous.result.status,
      currentStatus: current.result.status,
      previousFindingCount: previous.result.findingIds.length,
      currentFindingCount: current.result.findingIds.length,
      previousDeviationCount: previous.result.deviationIds.length,
      currentDeviationCount: current.result.deviationIds.length,
      previousEvidenceCount: previous.evidenceIds.length,
      currentEvidenceCount: current.evidenceIds.length,
      previousLimitationCount: previous.result.limitationIds.length,
      currentLimitationCount: current.result.limitationIds.length,
      previousFindingIds: [...previous.result.findingIds].sort(),
      currentFindingIds: [...current.result.findingIds].sort(),
      previousDeviationIds: [...previous.result.deviationIds].sort(),
      currentDeviationIds: [...current.result.deviationIds].sort(),
      previousEvidenceIds: previous.evidenceIds,
      currentEvidenceIds: current.evidenceIds,
      previousLimitationIds: [...previous.result.limitationIds].sort(),
      currentLimitationIds: [...current.result.limitationIds].sort(),
      diagnostics: [
        "CATEGORY_EVOLUTION_DERIVED_FROM_STORED_COMPLIANCE_RESULTS",
        `PREVIOUS_STATUS:${previous.result.status}`,
        `CURRENT_STATUS:${current.result.status}`,
      ],
    };
  });
}

function countCategories(
  artifact: GenerationContractComplianceArtifact,
  status: GenerationContractComplianceStatus,
): number {
  return artifact.categoryResults.filter((category) => category.status === status).length;
}

function metric(input: {
  metric: GenerationMetricDelta["metric"];
  previous: number | null;
  current: number | null;
  comparable?: boolean;
  diagnostics?: string[];
}): GenerationMetricDelta {
  const comparable = input.comparable ?? (input.previous !== null && input.current !== null);
  return {
    metric: input.metric,
    previous: input.previous,
    current: input.current,
    delta: comparable && input.previous !== null && input.current !== null
      ? input.current - input.previous
      : null,
    comparable,
    diagnostics: input.diagnostics ?? ["METRIC_DELTA_IS_NOT_A_BUSINESS_CONCLUSION"],
  };
}

function metricDeltas(input: {
  previousCompliance: GenerationContractComplianceArtifact;
  currentCompliance: GenerationContractComplianceArtifact;
}): GenerationMetricDelta[] {
  return [
    metric({
      metric: "compliant_category_count",
      previous: countCategories(input.previousCompliance, "compliant"),
      current: countCategories(input.currentCompliance, "compliant"),
    }),
    metric({
      metric: "partial_category_count",
      previous: countCategories(input.previousCompliance, "partial"),
      current: countCategories(input.currentCompliance, "partial"),
    }),
    metric({
      metric: "non_compliant_category_count",
      previous: countCategories(input.previousCompliance, "non_compliant"),
      current: countCategories(input.currentCompliance, "non_compliant"),
    }),
    metric({
      metric: "finding_count",
      previous: input.previousCompliance.findings.length,
      current: input.currentCompliance.findings.length,
    }),
    metric({
      metric: "deviation_count",
      previous: input.previousCompliance.deviations.length,
      current: input.currentCompliance.deviations.length,
    }),
    metric({
      metric: "evidence_record_count",
      previous: input.previousCompliance.evidence.length,
      current: input.currentCompliance.evidence.length,
    }),
    metric({
      metric: "limitation_count",
      previous: input.previousCompliance.limitations.length,
      current: input.currentCompliance.limitations.length,
    }),
    metric({
      metric: "confidence",
      previous: confidenceRank(input.previousCompliance.confidence.level),
      current: confidenceRank(input.currentCompliance.confidence.level),
      diagnostics: [
        "CONFIDENCE_DELTA_USES_LOW_1_MEDIUM_2_HIGH_3_FOR_COMPARISON_ONLY",
        "METRIC_DELTA_IS_NOT_A_BUSINESS_CONCLUSION",
      ],
    }),
  ];
}

function regressions(input: {
  previousComplianceArtifactId: string;
  currentComplianceArtifactId: string;
  categories: GenerationCategoryEvolution[];
}): GenerationRegression[] {
  return input.categories.flatMap((category) => {
    const categoryRegressions: GenerationRegression[] = [];
    if (category.transition === "regressed" || category.transition === "newly_non_compliant") {
      categoryRegressions.push({
        regressionId: regressionId({
          category: category.category,
          previousStatus: category.previousStatus,
          currentStatus: category.currentStatus,
          severity: "category_status",
        }),
        category: category.category,
        previousStatus: category.previousStatus,
        currentStatus: category.currentStatus,
        previousComplianceArtifactId: input.previousComplianceArtifactId,
        currentComplianceArtifactId: input.currentComplianceArtifactId,
        severity: "category_status",
        evidenceIds: category.currentEvidenceIds,
        diagnostics: ["CATEGORY_STATUS_REGRESSION_FROM_STORED_COMPLIANCE_RESULTS"],
      });
    }
    if (category.currentDeviationCount > category.previousDeviationCount) {
      categoryRegressions.push({
        regressionId: regressionId({
          category: category.category,
          previousDeviationCount: category.previousDeviationCount,
          currentDeviationCount: category.currentDeviationCount,
          severity: "deviation_increase",
        }),
        category: category.category,
        previousStatus: category.previousStatus,
        currentStatus: category.currentStatus,
        previousComplianceArtifactId: input.previousComplianceArtifactId,
        currentComplianceArtifactId: input.currentComplianceArtifactId,
        severity: "deviation_increase",
        evidenceIds: category.currentEvidenceIds,
        diagnostics: ["DEVIATION_COUNT_INCREASE_FROM_STORED_COMPLIANCE_RESULTS"],
      });
    }
    if (category.currentLimitationCount > category.previousLimitationCount) {
      categoryRegressions.push({
        regressionId: regressionId({
          category: category.category,
          previousLimitationCount: category.previousLimitationCount,
          currentLimitationCount: category.currentLimitationCount,
          severity: "limitation_increase",
        }),
        category: category.category,
        previousStatus: category.previousStatus,
        currentStatus: category.currentStatus,
        previousComplianceArtifactId: input.previousComplianceArtifactId,
        currentComplianceArtifactId: input.currentComplianceArtifactId,
        severity: "limitation_increase",
        evidenceIds: category.currentEvidenceIds,
        diagnostics: ["LIMITATION_COUNT_INCREASE_FROM_STORED_COMPLIANCE_RESULTS"],
      });
    }
    return categoryRegressions;
  });
}

const IMPROVEMENT_CATEGORY_TO_COMPLIANCE_CATEGORY: Record<string, ComplianceCategory | undefined> = {
  "Business Positioning": "objectives_represented",
  Audience: "objectives_represented",
  Navigation: "navigation_obligations",
  Messages: "message_coverage",
  Sections: "section_obligations",
  Trust: "trust_signal_presence",
  Assets: "asset_presence",
  Accessibility: "accessibility_expectations_observable",
  SEO: "seo_expectations_observable",
  Constraints: "constraints_preserved",
  Other: undefined,
};

function planEffectiveness(input: {
  categories: GenerationCategoryEvolution[];
  generationImprovementPlan?: GenerationImprovementPlanArtifact;
  generationImprovementPlanArtifactId?: string;
}): GenerationImprovementOutcome[] {
  const plan = input.generationImprovementPlan;
  if (!plan) return [];
  const actionsByCategory = new Map<string, GenerationImprovementPlanArtifact["actions"]>();
  for (const action of plan.actions) {
    actionsByCategory.set(action.category, [
      ...(actionsByCategory.get(action.category) ?? []),
      action,
    ]);
  }
  const categories = uniqueSorted([
    ...Object.keys(plan.summary.categorySummary),
    ...plan.actions.map((action) => action.category),
  ]);
  return categories.map((category): GenerationImprovementOutcome => {
    const relatedComplianceCategory = IMPROVEMENT_CATEGORY_TO_COMPLIANCE_CATEGORY[category];
    const related = relatedComplianceCategory
      ? input.categories.find((candidate) => candidate.category === relatedComplianceCategory)
      : undefined;
    const actions = actionsByCategory.get(category) ?? [];
    let outcome: GenerationImprovementOutcome["outcome"] = "insufficient_evidence";
    if (related) {
      if (
        related.transition === "newly_compliant" ||
        related.transition === "improved" ||
        related.transition === "evidence_improved"
      ) outcome = "observed_improvement";
      else if (related.transition === "regressed" || related.transition === "newly_non_compliant") outcome = "regression";
      else if (
        related.transition === "unchanged" ||
        related.transition === "still_partial" ||
        related.transition === "still_non_compliant"
      ) outcome = "no_demonstrated_improvement";
    }
    return {
      sourceGenerationImprovementPlanArtifactId: input.generationImprovementPlanArtifactId,
      sourceGenerationImprovementPlanId: plan.generationImprovementPlanId,
      category,
      outcome,
      actionCount: actions.length,
      actionIds: actions.map((action) => action.actionId).sort(),
      originatingDeviationIds: uniqueSorted(actions.flatMap((action) => action.originatingDeviationIds)),
      ...(relatedComplianceCategory ? { relatedComplianceCategory } : {}),
      ...(related ? { relatedCategoryTransition: related.transition } : {}),
      diagnostics: related
        ? ["IMPROVEMENT_PLAN_EFFECTIVENESS_DERIVED_FROM_CATEGORY_TRANSITION"]
        : ["NO_CANONICAL_COMPLIANCE_CATEGORY_MAPPING_FOR_IMPROVEMENT_CATEGORY"],
    };
  });
}

function assess(input: {
  categories: GenerationCategoryEvolution[];
  regressions: GenerationRegression[];
}): {
  status: GenerationEvolutionStatus;
  overallAssessment: GenerationEvolutionOverallAssessment;
  recommendedNextAction: GenerationEvolutionRecommendedNextAction;
  confidence: GenerationEvolutionConfidence;
} {
  const statusImprovements = input.categories.filter((category) =>
    category.transition === "newly_compliant" || category.transition === "improved");
  const evidenceImprovements = input.categories.filter((category) => category.transition === "evidence_improved");
  const categoryRegressions = input.categories.filter((category) =>
    category.transition === "regressed" || category.transition === "newly_non_compliant");
  const unresolved = input.categories.filter((category) =>
    category.transition === "not_comparable" ||
    category.transition === "still_partial" ||
    category.transition === "still_non_compliant");

  if (input.categories.every((category) => category.transition === "not_comparable")) {
    return {
      status: "blocked",
      overallAssessment: "insufficient_evidence",
      recommendedNextAction: "collect_more_evidence",
      confidence: {
        level: "LOW",
        comparable: false,
        reasons: ["No canonical compliance categories were comparable across the two source artifacts."],
      },
    };
  }
  if (categoryRegressions.length > 0 && (statusImprovements.length > 0 || evidenceImprovements.length > 0)) {
    return {
      status: "mixed",
      overallAssessment: "mixed_result",
      recommendedNextAction: "human_review",
      confidence: {
        level: "MEDIUM",
        comparable: true,
        reasons: ["Stored category outcomes contain both improvement and regression transitions."],
      },
    };
  }
  if (categoryRegressions.length > 0 || input.regressions.length > 0) {
    return {
      status: "regressed",
      overallAssessment: "regression",
      recommendedNextAction: "create_improvement_plan_v2",
      confidence: {
        level: "MEDIUM",
        comparable: true,
        reasons: ["At least one stored category outcome or regression metric worsened."],
      },
    };
  }
  if (statusImprovements.length >= 2 && unresolved.length < input.categories.length) {
    return {
      status: "improved",
      overallAssessment: "meaningful_improvement",
      recommendedNextAction: "create_compliance_report_v2",
      confidence: {
        level: "HIGH",
        comparable: true,
        reasons: ["Multiple canonical compliance categories improved without stored regressions."],
      },
    };
  }
  if (statusImprovements.length > 0) {
    return {
      status: "improved",
      overallAssessment: "limited_improvement",
      recommendedNextAction: "create_compliance_report_v2",
      confidence: {
        level: "MEDIUM",
        comparable: true,
        reasons: ["At least one canonical compliance category improved without stored regressions."],
      },
    };
  }
  if (evidenceImprovements.length > 0) {
    return {
      status: "improved",
      overallAssessment: "limited_improvement",
      recommendedNextAction: "human_review",
      confidence: {
        level: "MEDIUM",
        comparable: true,
        reasons: ["Evidence improved in stored compliance categories, but status transitions did not prove broad business improvement."],
      },
    };
  }
  return {
    status: "unchanged",
    overallAssessment: "no_demonstrated_improvement",
    recommendedNextAction: unresolved.length > 0 ? "create_improvement_plan_v2" : "stop",
    confidence: {
      level: unresolved.length > 0 ? "MEDIUM" : "HIGH",
      comparable: true,
      reasons: ["Stored category outcomes did not demonstrate improvement or regression."],
    },
  };
}

function validateBuildInput(input: GenerationEvolutionAnalysisBuildInput): BuildInputValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.previousComplianceArtifactId) errors.push("previousComplianceArtifactId is required");
  if (!input.currentComplianceArtifactId) errors.push("currentComplianceArtifactId is required");
  if (input.previousComplianceArtifactId === input.currentComplianceArtifactId) {
    errors.push("previousComplianceArtifactId and currentComplianceArtifactId must be distinct");
  }
  const previousValidation = validateGenerationContractCompliance(input.previousCompliance);
  const currentValidation = validateGenerationContractCompliance(input.currentCompliance);
  errors.push(...previousValidation.errors.map((error) => `previousCompliance.${error}`));
  errors.push(...currentValidation.errors.map((error) => `currentCompliance.${error}`));
  warnings.push(...previousValidation.warnings.map((warning) => `previousCompliance.${warning}`));
  warnings.push(...currentValidation.warnings.map((warning) => `currentCompliance.${warning}`));
  if (input.previousCompliance.siteVersionId !== input.currentCompliance.siteVersionId) {
    errors.push("source compliance artifacts must share the same siteVersionId");
  }
  if (input.previousCompliance.dryRunId !== input.currentCompliance.dryRunId) {
    errors.push("source compliance artifacts must share the same dryRunId");
  }
  if (input.previousCompliance.sourceWebsiteGenerationPackageId !== input.currentCompliance.sourceWebsiteGenerationPackageId) {
    errors.push("source compliance artifacts must share the same canonical WGP");
  }
  const previousIteration = input.previousIteration ?? 1;
  const currentIteration = input.currentIteration ?? 2;
  if (!Number.isInteger(previousIteration) || !Number.isInteger(currentIteration)) {
    errors.push("previousIteration and currentIteration must be integers");
  } else if (previousIteration >= currentIteration) {
    errors.push("previousIteration must be less than currentIteration");
  }
  if (input.generationImprovementPlan) {
    if (input.generationImprovementPlan.siteVersionId !== input.currentCompliance.siteVersionId) {
      errors.push("generationImprovementPlan.siteVersionId must match source compliance siteVersionId");
    }
    if (input.generationImprovementPlan.dryRunId !== input.currentCompliance.dryRunId) {
      errors.push("generationImprovementPlan.dryRunId must match source compliance dryRunId");
    }
    if (input.generationImprovementPlan.sourceWebsiteGenerationPackageId !== input.currentCompliance.sourceWebsiteGenerationPackageId) {
      errors.push("generationImprovementPlan.sourceWebsiteGenerationPackageId must match source compliance WGP");
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function buildGenerationEvolutionAnalysis(
  input: GenerationEvolutionAnalysisBuildInput,
): GenerationEvolutionAnalysisArtifact {
  const inputValidation = validateBuildInput(input);
  if (!inputValidation.valid) throw new GenerationEvolutionAnalysisBuildValidationError(inputValidation);

  const previousIteration = input.previousIteration ?? 1;
  const currentIteration = input.currentIteration ?? 2;
  const previousCompliance = cloneJson(input.previousCompliance);
  const currentCompliance = cloneJson(input.currentCompliance);
  const categories = categoryEvolution({ previousCompliance, currentCompliance });
  const deltaMetrics = metricDeltas({ previousCompliance, currentCompliance });
  const regressionRecords = regressions({
    previousComplianceArtifactId: input.previousComplianceArtifactId,
    currentComplianceArtifactId: input.currentComplianceArtifactId,
    categories,
  });
  const assessment = assess({ categories, regressions: regressionRecords });
  const improvementOutcomes = planEffectiveness({
    categories,
    generationImprovementPlan: input.generationImprovementPlan,
    generationImprovementPlanArtifactId: input.generationImprovementPlanArtifactId,
  });
  const limitations = [
    "Generation Evolution Analysis compares stored compliance results only; it does not recompute compliance.",
    "Numerical metric deltas are recorded as diagnostics and are not treated as standalone business conclusions.",
    ...(input.generationImprovementPlan
      ? []
      : ["Generation Improvement Plan effectiveness could not be assessed because no plan artifact was supplied."]),
    ...categories
      .filter((category) => category.transition === "not_comparable")
      .map((category) => `${category.category} was not comparable because at least one stored category status is not comparable.`),
  ];
  const artifact: GenerationEvolutionAnalysisArtifact = {
    generationEvolutionAnalysisId: analysisId({
      previousComplianceArtifactId: input.previousComplianceArtifactId,
      currentComplianceArtifactId: input.currentComplianceArtifactId,
      previousCompliance,
      currentCompliance,
      previousIteration,
      currentIteration,
    }),
    status: assessment.status,
    siteVersionId: currentCompliance.siteVersionId,
    dryRunId: currentCompliance.dryRunId,
    sourceWebsiteGenerationPackageId: currentCompliance.sourceWebsiteGenerationPackageId,
    previousComplianceArtifactId: input.previousComplianceArtifactId,
    currentComplianceArtifactId: input.currentComplianceArtifactId,
    previousIteration: {
      iteration: previousIteration,
      complianceArtifactId: input.previousComplianceArtifactId,
      generationContractComplianceId: previousCompliance.generationContractComplianceId,
      status: previousCompliance.status,
      sourceObservedWebsiteModelId: previousCompliance.sourceObservedWebsiteModelId,
      createdAt: previousCompliance.createdAt,
      categoryCount: previousCompliance.categoryResults.length,
    },
    currentIteration: {
      iteration: currentIteration,
      complianceArtifactId: input.currentComplianceArtifactId,
      generationContractComplianceId: currentCompliance.generationContractComplianceId,
      status: currentCompliance.status,
      sourceObservedWebsiteModelId: currentCompliance.sourceObservedWebsiteModelId,
      createdAt: currentCompliance.createdAt,
      categoryCount: currentCompliance.categoryResults.length,
    },
    createdAt: input.createdAt ?? new Date().toISOString(),
    contractVersion: GENERATION_EVOLUTION_ANALYSIS_CONTRACT_VERSION,
    lineage: {
      siteVersionId: currentCompliance.siteVersionId,
      dryRunId: currentCompliance.dryRunId,
      sourceWebsiteGenerationPackageId: currentCompliance.sourceWebsiteGenerationPackageId,
      previousComplianceArtifactId: input.previousComplianceArtifactId,
      currentComplianceArtifactId: input.currentComplianceArtifactId,
      previousGenerationContractComplianceId: previousCompliance.generationContractComplianceId,
      currentGenerationContractComplianceId: currentCompliance.generationContractComplianceId,
      previousObservedWebsiteModelId: previousCompliance.sourceObservedWebsiteModelId,
      currentObservedWebsiteModelId: currentCompliance.sourceObservedWebsiteModelId,
      previousIteration,
      currentIteration,
      ...(input.generationImprovementPlanArtifactId
        ? { sourceGenerationImprovementPlanArtifactId: input.generationImprovementPlanArtifactId }
        : {}),
      ...(input.generationImprovementPlan
        ? { sourceGenerationImprovementPlanId: input.generationImprovementPlan.generationImprovementPlanId }
        : {}),
      sourceComplianceContractVersion: previousCompliance.contractVersion,
      upstreamArtifactRefIds: uniqueSorted([
        input.previousComplianceArtifactId,
        input.currentComplianceArtifactId,
        previousCompliance.generationContractComplianceId,
        currentCompliance.generationContractComplianceId,
        previousCompliance.sourceObservedWebsiteModelId,
        currentCompliance.sourceObservedWebsiteModelId,
        currentCompliance.sourceWebsiteGenerationPackageId,
        ...(input.generationImprovementPlanArtifactId ? [input.generationImprovementPlanArtifactId] : []),
        ...(input.generationImprovementPlan ? [input.generationImprovementPlan.generationImprovementPlanId] : []),
      ]),
    },
    categoryEvolution: categories,
    metricDeltas: deltaMetrics,
    improvements: improvementOutcomes,
    regressions: regressionRecords,
    unchangedAreas: categories
      .filter((category) => category.transition === "unchanged")
      .map((category) => category.category),
    unresolvedAreas: categories
      .filter((category) =>
        category.transition === "not_comparable" ||
        category.transition === "still_partial" ||
        category.transition === "still_non_compliant")
      .map((category) => category.category),
    overallAssessment: assessment.overallAssessment,
    recommendedNextAction: assessment.recommendedNextAction,
    confidence: assessment.confidence,
    limitations,
    diagnostics: [
      "GENERATION_EVOLUTION_ANALYSIS_BUILT_FROM_STORED_COMPLIANCE_ARTIFACTS_ONLY",
      "NO_COMPLIANCE_RECOMPUTATION",
      "NO_PROVIDER_EXECUTION",
      "NO_AI_EXECUTION",
      ...inputValidation.warnings.map((warning) => `SOURCE_WARNING:${warning}`),
    ],
  };
  const validation = validateGenerationEvolutionAnalysis({
    artifact,
    previousCompliance,
    currentCompliance,
    previousComplianceArtifactId: input.previousComplianceArtifactId,
    currentComplianceArtifactId: input.currentComplianceArtifactId,
  });
  if (!validation.valid) throw new GenerationEvolutionAnalysisBuildValidationError(validation);
  return artifact;
}
