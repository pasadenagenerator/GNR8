export const BETA_EXPORT_SCORE_VERSION = "1.0.0" as const;
export const PROCEED_WITH_MANUAL_POLISH_SCORE_THRESHOLD = 3.5 as const;

export type ExportScoreAxis = "structuralFidelity" | "visualCoherence" | "assetIntegrity" | "contentCompleteness" | "layoutSemanticCorrectness";

export type ExportScoreAxes = Record<ExportScoreAxis, number>;

export type ExportScoreInput = {
  axes: ExportScoreAxes;
};

export type ExportScore = {
  kind: "beta_export_score_v1";
  scoreVersion: typeof BETA_EXPORT_SCORE_VERSION;
  axes: ExportScoreAxes;
  weightedOverall: number;
  normalizedPercent: number;
};

export type FailureClassification = "HARD_BLOCKER" | "DEGRADED_ACCEPTABLE" | "DEGRADED_UNACCEPTABLE" | "COSMETIC_ONLY";
export type OperatorDecision = "proceed_with_manual_polish" | "engine_improvement_required" | "stop_beta_migration";

export type DegradationIssueCode =
  | "BROKEN_LAYOUT_GRID"
  | "ENTRY_PAGE_NOT_RENDERED"
  | "PRIMARY_CTA_MISSING"
  | "MISSING_HERO_IMAGE"
  | "MISSING_CRITICAL_PRODUCT_IMAGE"
  | "FONT_MISMATCH"
  | "CTA_STYLE_DRIFT"
  | "MISSING_FAVICON"
  | "MINOR_ICON_STYLE_DRIFT"
  | "ANIMATION_DIFFERENCE";

export type DegradationFinding = {
  issueCode: DegradationIssueCode;
  detail: string;
};

const AXIS_WEIGHTS: Record<ExportScoreAxis, number> = {
  structuralFidelity: 0.3,
  visualCoherence: 0.25,
  assetIntegrity: 0.2,
  contentCompleteness: 0.15,
  layoutSemanticCorrectness: 0.1,
};

const DEGRADATION_CLASSIFICATION_BY_ISSUE: Record<DegradationIssueCode, FailureClassification> = {
  BROKEN_LAYOUT_GRID: "HARD_BLOCKER",
  ENTRY_PAGE_NOT_RENDERED: "HARD_BLOCKER",
  PRIMARY_CTA_MISSING: "HARD_BLOCKER",
  MISSING_HERO_IMAGE: "DEGRADED_UNACCEPTABLE",
  MISSING_CRITICAL_PRODUCT_IMAGE: "DEGRADED_UNACCEPTABLE",
  FONT_MISMATCH: "DEGRADED_ACCEPTABLE",
  CTA_STYLE_DRIFT: "DEGRADED_ACCEPTABLE",
  MISSING_FAVICON: "COSMETIC_ONLY",
  MINOR_ICON_STYLE_DRIFT: "COSMETIC_ONLY",
  ANIMATION_DIFFERENCE: "COSMETIC_ONLY",
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampAxisScore(value: number): number {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || Number.isNaN(rounded)) return 0;
  if (rounded < 0) return 0;
  if (rounded > 5) return 5;
  return rounded;
}

export function scoreExportQuality(input: ExportScoreInput): ExportScore {
  const axes: ExportScoreAxes = {
    structuralFidelity: clampAxisScore(input.axes.structuralFidelity),
    visualCoherence: clampAxisScore(input.axes.visualCoherence),
    assetIntegrity: clampAxisScore(input.axes.assetIntegrity),
    contentCompleteness: clampAxisScore(input.axes.contentCompleteness),
    layoutSemanticCorrectness: clampAxisScore(input.axes.layoutSemanticCorrectness),
  };

  const weightedOverall = round2(
    axes.structuralFidelity * AXIS_WEIGHTS.structuralFidelity +
      axes.visualCoherence * AXIS_WEIGHTS.visualCoherence +
      axes.assetIntegrity * AXIS_WEIGHTS.assetIntegrity +
      axes.contentCompleteness * AXIS_WEIGHTS.contentCompleteness +
      axes.layoutSemanticCorrectness * AXIS_WEIGHTS.layoutSemanticCorrectness,
  );

  const normalizedPercent = Math.round((weightedOverall / 5) * 100);

  return {
    kind: "beta_export_score_v1",
    scoreVersion: BETA_EXPORT_SCORE_VERSION,
    axes,
    weightedOverall,
    normalizedPercent,
  };
}

export function classifyDegradationIssue(issueCode: DegradationIssueCode): FailureClassification {
  return DEGRADATION_CLASSIFICATION_BY_ISSUE[issueCode];
}

export function classifyRun(findings: readonly DegradationFinding[]): FailureClassification {
  let hasDegradedUnacceptable = false;
  let hasDegradedAcceptable = false;

  for (const finding of findings) {
    const classification = classifyDegradationIssue(finding.issueCode);
    if (classification === "HARD_BLOCKER") return "HARD_BLOCKER";
    if (classification === "DEGRADED_UNACCEPTABLE") hasDegradedUnacceptable = true;
    if (classification === "DEGRADED_ACCEPTABLE") hasDegradedAcceptable = true;
  }

  if (hasDegradedUnacceptable) return "DEGRADED_UNACCEPTABLE";
  if (hasDegradedAcceptable) return "DEGRADED_ACCEPTABLE";
  return "COSMETIC_ONLY";
}

export function decideOperatorAction(input: {
  classification: FailureClassification;
  weightedOverallScore: number;
}): OperatorDecision {
  if (input.classification === "HARD_BLOCKER") return "stop_beta_migration";
  if (input.classification === "DEGRADED_UNACCEPTABLE") return "engine_improvement_required";
  if (input.weightedOverallScore >= PROCEED_WITH_MANUAL_POLISH_SCORE_THRESHOLD) return "proceed_with_manual_polish";
  return "engine_improvement_required";
}
