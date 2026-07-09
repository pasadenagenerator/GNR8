/**
 * Phase MVP-2.0-F deterministic Generation Improvement Plan builder.
 *
 * Consumes only a GenerationContractComplianceReportArtifact and translates
 * persisted compliance findings into provider-neutral, business-governed
 * regeneration instructions. It does not create prompts, code instructions,
 * provider payloads, AI execution, regeneration, approval, publishing, or
 * upstream artifact mutations.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  validateGenerationContractComplianceReport,
  type GenerationContractComplianceReportArtifact,
  type GenerationContractComplianceReportBusinessRisk,
  type GenerationContractComplianceReportDeviation,
  type GenerationContractComplianceReportMissingRequirement,
  type GenerationContractComplianceReportValidationResult,
} from "./generation-contract-compliance-report-contract";
import type { ComplianceCategory } from "./generation-contract-compliance-contract";
import {
  GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION,
  validateGenerationImprovementPlan,
  type GenerationImprovementAction,
  type GenerationImprovementCategory,
  type GenerationImprovementCategorySummary,
  type GenerationImprovementEvidenceReference,
  type GenerationImprovementPlanArtifact,
  type GenerationImprovementPlanSummary,
  type GenerationImprovementPriority,
  type GenerationImprovementRecommendedNextAction,
  type GenerationImprovementRegenerationReadiness,
  type GenerationImprovementStatus,
} from "./generation-improvement-plan-contract";

export const GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION = "MVP-2.0-F" as const;

export type GenerationImprovementPlanBuildInput = {
  generationContractComplianceReport: GenerationContractComplianceReportArtifact;
  createdAt?: string;
};

export class GenerationImprovementPlanBuildValidationError extends Error {
  readonly validation: GenerationContractComplianceReportValidationResult;

  constructor(validation: GenerationContractComplianceReportValidationResult) {
    super("Generation Improvement Plan build input is invalid.");
    this.name = "GenerationImprovementPlanBuildValidationError";
    this.validation = validation;
  }
}

type ActionSeed = {
  category: GenerationImprovementCategory;
  requirementId: string;
  deviations: GenerationContractComplianceReportDeviation[];
  missingRequirements: GenerationContractComplianceReportMissingRequirement[];
  risks: GenerationContractComplianceReportBusinessRisk[];
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

function planId(report: GenerationContractComplianceReportArtifact): string {
  return `generation-improvement-plan:${sha256Hex(stableStringify({
    sourceGenerationContractComplianceReportId: report.generationContractComplianceReportId,
    sourceRecommendation: report.recommendation.recommendation,
    sourceReadiness: report.generationReadiness.status,
    contractVersion: GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function actionId(seed: ActionSeed): string {
  return `generation-improvement-action:${itemHash({
    category: seed.category,
    requirementId: seed.requirementId,
    deviations: seed.deviations.map((deviation) => deviation.deviationId).sort(),
    missing: seed.missingRequirements.map((missing) => missing.findingId).sort(),
  })}`;
}

function improvementCategory(category: ComplianceCategory, requirementText = ""): GenerationImprovementCategory {
  const normalizedRequirement = requirementText.toLowerCase();
  if (category === "objectives_represented") {
    return normalizedRequirement.includes("audience") ||
      normalizedRequirement.includes("client") ||
      normalizedRequirement.includes("customer")
      ? "Audience"
      : "Business Positioning";
  }
  if (category === "navigation_obligations") return "Navigation";
  if (category === "page_obligations" || category === "section_obligations") return "Sections";
  if (category === "message_coverage") return "Messages";
  if (category === "asset_presence") return "Assets";
  if (category === "trust_signal_presence") return "Trust";
  if (category === "constraints_preserved") return "Constraints";
  if (category === "accessibility_expectations_observable") return "Accessibility";
  if (category === "seo_expectations_observable") return "SEO";
  return "Other";
}

function categoryVerb(category: GenerationImprovementCategory): string {
  if (category === "Business Positioning") return "Clarify the business positioning";
  if (category === "Audience") return "Clarify the intended audience";
  if (category === "Navigation") return "Repair the navigation path";
  if (category === "Messages") return "Restore the required business message";
  if (category === "Sections") return "Restore the required page or section obligation";
  if (category === "Trust") return "Restore the required trust signal";
  if (category === "Assets") return "Restore the required asset evidence";
  if (category === "Accessibility") return "Restore the observable accessibility expectation";
  if (category === "SEO") return "Restore the observable SEO expectation";
  if (category === "Constraints") return "Preserve the required generation constraint";
  return "Address the unresolved compliance finding";
}

function evidenceReferences(evidenceIds: string[]): GenerationImprovementEvidenceReference[] {
  return uniqueSorted(evidenceIds).map((evidenceId) => ({
    evidenceId,
    source: "compliance_report",
  }));
}

function seedKey(category: GenerationImprovementCategory, requirementId: string): string {
  return `${category}:${requirementId}`;
}

function actionSeeds(report: GenerationContractComplianceReportArtifact): ActionSeed[] {
  const seeds = new Map<string, ActionSeed>();

  function ensureSeed(category: GenerationImprovementCategory, requirementId: string): ActionSeed {
    const key = seedKey(category, requirementId);
    const existing = seeds.get(key);
    if (existing) return existing;
    const created: ActionSeed = {
      category,
      requirementId,
      deviations: [],
      missingRequirements: [],
      risks: [],
      evidenceIds: [],
    };
    seeds.set(key, created);
    return created;
  }

  for (const deviation of report.deviations) {
    const category = improvementCategory(deviation.category, deviation.description);
    const seed = ensureSeed(category, deviation.sourceRequirementId);
    seed.deviations.push(deviation);
    seed.evidenceIds.push(...deviation.evidenceIds);
  }

  for (const missing of report.missingRequirements) {
    const category = improvementCategory(missing.category, missing.summary);
    const seed = ensureSeed(category, missing.requirementId);
    seed.missingRequirements.push(missing);
    seed.evidenceIds.push(...missing.evidenceIds);
  }

  for (const risk of report.businessRisks) {
    const category = improvementCategory(risk.category, risk.summary);
    for (const sourceId of risk.sourceIds) {
      const relatedDeviation = report.deviations.find((deviation) =>
        deviation.deviationId === sourceId || deviation.sourceRequirementId === sourceId);
      const relatedMissing = report.missingRequirements.find((missing) =>
        missing.requirementId === sourceId || missing.findingId === sourceId);
      const requirementId = relatedDeviation?.sourceRequirementId ?? relatedMissing?.requirementId ?? sourceId;
      const seed = ensureSeed(category, requirementId);
      seed.risks.push(risk);
      seed.evidenceIds.push(...risk.evidenceIds);
    }
  }

  return [...seeds.values()].sort((left, right) =>
    left.category.localeCompare(right.category) ||
    left.requirementId.localeCompare(right.requirementId));
}

function priority(input: {
  seed: ActionSeed;
  report: GenerationContractComplianceReportArtifact;
}): GenerationImprovementPriority {
  const hasRequiredDeviation = input.seed.deviations.some((deviation) => deviation.severity === "required");
  const hasBlockedRisk = input.seed.risks.some((risk) => risk.severity === "blocked");
  const hasHighRisk = input.seed.risks.some((risk) => risk.severity === "high");
  const hasDeviationFinding = input.seed.missingRequirements.some((missing) => missing.result === "deviation");
  const hasRecommendedDeviation = input.seed.deviations.some((deviation) => deviation.severity === "recommended");
  if (
    input.report.recommendation.recommendation === "regenerate" &&
    (hasRequiredDeviation || hasBlockedRisk || input.seed.category === "Constraints")
  ) return "critical";
  if (hasRequiredDeviation || hasBlockedRisk || hasHighRisk || hasDeviationFinding) return "high";
  if (hasRecommendedDeviation || input.seed.missingRequirements.length > 0 || input.seed.risks.length > 0) return "medium";
  return "low";
}

function actionExplanation(seed: ActionSeed): string {
  const evidenceCount = uniqueSorted(seed.evidenceIds).length;
  const deviationCount = seed.deviations.length;
  const missingCount = seed.missingRequirements.length;
  const riskCount = seed.risks.length;
  return `${categoryVerb(seed.category)} for requirement ${seed.requirementId} because the compliance report recorded ${deviationCount} deviations, ${missingCount} missing or incomplete requirements, ${riskCount} business risks, and ${evidenceCount} evidence references.`;
}

function expectedOutcome(seed: ActionSeed): string {
  if (seed.category === "Navigation") {
    return "The regenerated experience should make the required route or destination observable to users and compliance review.";
  }
  if (seed.category === "Messages") {
    return "The regenerated experience should visibly preserve the required business message from the generation contract.";
  }
  if (seed.category === "Trust") {
    return "The regenerated experience should make the required trust signal observable without changing the underlying business truth.";
  }
  if (seed.category === "Constraints") {
    return "The regenerated experience should satisfy the persisted constraint while preserving the approved generation contract.";
  }
  if (seed.category === "Accessibility") {
    return "The regenerated experience should make the accessibility expectation observable to deterministic compliance checks.";
  }
  if (seed.category === "SEO") {
    return "The regenerated experience should make the SEO expectation observable to deterministic compliance checks.";
  }
  if (seed.category === "Assets") {
    return "The regenerated experience should expose the required asset signal in a way the compliance report can verify.";
  }
  return "The regenerated experience should close the originating compliance finding while preserving the existing business-governed source artifacts.";
}

function toAction(seed: ActionSeed, report: GenerationContractComplianceReportArtifact): GenerationImprovementAction {
  return {
    actionId: actionId(seed),
    category: seed.category,
    priority: priority({ seed, report }),
    businessExplanation: actionExplanation(seed),
    originatingDeviationIds: uniqueSorted(seed.deviations.map((deviation) => deviation.deviationId)),
    originatingRequirementIds: uniqueSorted([
      seed.requirementId,
      ...seed.deviations.map((deviation) => deviation.sourceRequirementId),
      ...seed.missingRequirements.map((missing) => missing.requirementId),
    ]),
    expectedImprovementOutcome: expectedOutcome(seed),
    evidenceReferences: evidenceReferences(seed.evidenceIds),
    diagnostics: uniqueSorted([
      `GENERATION_IMPROVEMENT_ACTION_CATEGORY:${seed.category}`,
      `GENERATION_IMPROVEMENT_ACTION_PRIORITY:${priority({ seed, report })}`,
      "GENERATION_IMPROVEMENT_ACTION_PROVIDER_NEUTRAL",
    ]),
  };
}

function categorySummary(actions: GenerationImprovementAction[]): GenerationImprovementCategorySummary {
  const summary: GenerationImprovementCategorySummary = {};
  for (const action of actions) {
    summary[action.category] = (summary[action.category] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(summary).sort(([left], [right]) => left.localeCompare(right))) as GenerationImprovementCategorySummary;
}

function recommendedNextAction(input: {
  report: GenerationContractComplianceReportArtifact;
  actions: GenerationImprovementAction[];
}): GenerationImprovementRecommendedNextAction {
  if (input.report.status === "invalid" || input.report.status === "stale") return "stop";
  if (input.report.recommendation.recommendation === "regenerate") return "regenerate";
  if (input.report.recommendation.recommendation === "insufficient_evidence") return "collect_more_information";
  if (input.actions.some((action) => action.priority === "critical" || action.priority === "high")) return "regenerate";
  if (input.actions.length === 0) return "human_review";
  return "human_review";
}

function regenerationReadiness(input: {
  status: GenerationImprovementStatus;
  recommendedNextAction: GenerationImprovementRecommendedNextAction;
  actions: GenerationImprovementAction[];
}): GenerationImprovementRegenerationReadiness {
  if (input.status === "invalid" || input.status === "stale" || input.recommendedNextAction === "stop") return "blocked";
  if (input.recommendedNextAction === "collect_more_information") return "needs_information";
  if (input.recommendedNextAction === "human_review") return "human_review_required";
  return input.actions.length > 0 ? "ready" : "blocked";
}

function planStatus(report: GenerationContractComplianceReportArtifact, actions: GenerationImprovementAction[]): GenerationImprovementStatus {
  if (report.status === "invalid") return "invalid";
  if (report.status === "stale") return "stale";
  if (report.status === "draft") return "draft";
  if (actions.length > 0) return "ready";
  if (report.status === "blocked" || report.status === "partial") return "blocked";
  return "ready";
}

function summary(input: {
  report: GenerationContractComplianceReportArtifact;
  actions: GenerationImprovementAction[];
  status: GenerationImprovementStatus;
}): GenerationImprovementPlanSummary {
  const criticalCount = input.actions.filter((action) => action.priority === "critical").length;
  const highCount = input.actions.filter((action) => action.priority === "high").length;
  const mediumCount = input.actions.filter((action) => action.priority === "medium").length;
  const lowCount = input.actions.filter((action) => action.priority === "low").length;
  const nextAction = recommendedNextAction({ report: input.report, actions: input.actions });
  return {
    summary: `Generation Improvement Plan derived ${input.actions.length} provider-neutral improvement actions from source report status ${input.report.status} and recommendation ${input.report.recommendation.recommendation}.`,
    improvementCount: input.actions.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    categorySummary: categorySummary(input.actions),
    estimatedRegenerationReadiness: regenerationReadiness({
      status: input.status,
      recommendedNextAction: nextAction,
      actions: input.actions,
    }),
    recommendedNextAction: nextAction,
  };
}

export function buildGenerationImprovementPlan(
  input: GenerationImprovementPlanBuildInput,
): GenerationImprovementPlanArtifact {
  const sourceValidation = validateGenerationContractComplianceReport(input.generationContractComplianceReport);
  if (!sourceValidation.valid) throw new GenerationImprovementPlanBuildValidationError(sourceValidation);

  const report = input.generationContractComplianceReport;
  const createdAt = input.createdAt ?? report.createdAt;
  const actions = actionSeeds(report).map((seed) => toAction(seed, report));
  const status = planStatus(report, actions);
  const planSummary = summary({ report, actions, status });

  const artifact: GenerationImprovementPlanArtifact = {
    generationImprovementPlanId: planId(report),
    status,
    siteVersionId: report.siteVersionId,
    dryRunId: report.dryRunId,
    sourceGenerationContractComplianceReportId: report.generationContractComplianceReportId,
    sourceGenerationContractComplianceId: report.sourceGenerationContractComplianceId,
    sourceWebsiteGenerationPackageId: report.sourceWebsiteGenerationPackageId,
    sourceObservedWebsiteModelId: report.sourceObservedWebsiteModelId,
    createdAt,
    contractVersion: GENERATION_IMPROVEMENT_PLAN_CONTRACT_VERSION,
    summary: planSummary,
    actions,
    lineage: {
      siteVersionId: report.siteVersionId,
      dryRunId: report.dryRunId,
      sourceGenerationContractComplianceReportId: report.generationContractComplianceReportId,
      sourceGenerationContractComplianceReportStatus: report.status,
      sourceGenerationContractComplianceReportContractVersion: report.contractVersion,
      sourceGenerationContractComplianceId: report.sourceGenerationContractComplianceId,
      sourceWebsiteGenerationPackageId: report.sourceWebsiteGenerationPackageId,
      sourceObservedWebsiteModelId: report.sourceObservedWebsiteModelId,
      upstreamArtifactRefIds: uniqueSorted([
        report.sourceGenerationContractComplianceId,
        report.sourceWebsiteGenerationPackageId,
        report.sourceObservedWebsiteModelId,
        ...report.lineage.upstreamArtifactRefIds,
      ]),
    },
    sourceReportIntegrity: {
      valid: true,
      status: report.status,
      recommendation: report.recommendation.recommendation,
      generationReadiness: report.generationReadiness.status,
      deviationCount: report.deviations.length,
      missingRequirementCount: report.missingRequirements.length,
      businessRiskCount: report.businessRisks.length,
      evidenceCount: report.evidenceSummary.evidenceCount,
      limitationCount: report.limitations.items.length,
    },
    diagnostics: uniqueSorted([
      `GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION:${GENERATION_IMPROVEMENT_PLAN_RUNTIME_VERSION}`,
      `GENERATION_IMPROVEMENT_PLAN_STATUS:${status}`,
      `GENERATION_IMPROVEMENT_PLAN_RECOMMENDED_NEXT_ACTION:${planSummary.recommendedNextAction}`,
      "GENERATION_IMPROVEMENT_PLAN_SOURCE_REPORT_ONLY",
      "GENERATION_IMPROVEMENT_PLAN_PROVIDER_NEUTRAL",
      "GENERATION_IMPROVEMENT_PLAN_NO_WGP_MUTATION",
      "GENERATION_IMPROVEMENT_PLAN_NO_COMPLIANCE_MUTATION",
      "GENERATION_IMPROVEMENT_PLAN_NO_REPORT_MUTATION",
      "GENERATION_IMPROVEMENT_PLAN_NO_PROVIDER_PAYLOAD",
      "GENERATION_IMPROVEMENT_PLAN_NO_PROVIDER_OR_AI_EXECUTION",
      "GENERATION_IMPROVEMENT_PLAN_NO_REGENERATION",
      "GENERATION_IMPROVEMENT_PLAN_NO_BUSINESS_APPROVAL_OR_PUBLISHING",
    ]),
  };

  const validation = validateGenerationImprovementPlan({
    artifact,
    sourceGenerationContractComplianceReport: report,
  });
  if (!validation.valid) {
    throw new GenerationImprovementPlanBuildValidationError({
      valid: false,
      errors: validation.errors,
      warnings: validation.warnings,
    });
  }
  return cloneJson(artifact);
}
